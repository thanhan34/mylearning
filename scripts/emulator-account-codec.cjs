// Explicit integration command; NOT auto-run by the offline test-*.cjs suite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { validateEnvironment, ready } = require('./lib/emulator-safety.cjs');
async function main() {
  const config = validateEnvironment(process.env);
  await ready(config); // Fail closed before loading the SDK.
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: config.projectId, host: config.host === '::1' ? `[::1]:${config.port}` : `${config.host}:${config.port}`,
    ssl: false, credentials: { client_email: 'local@demo.invalid', private_key: 'unused-emulator-only' } });
  function load(file, imports = {}) {
    const exports = {};
    new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText)(exports, name => {
      if (name === 'node:crypto') return require(name);
      assert.ok(Object.hasOwn(imports, name), `Blocked ${name}`); return imports[name];
    }); return exports;
  }
  const access = load('lib/learning-access.ts');
  const dir = load('lib/accounts/directory.ts', { '../learning-access': access });
  const codec = load('lib/accounts/codec.ts');
  const storage = load('lib/accounts/storage.ts', { './codec': codec });
  const generation = `codec-local-${Date.now()}-${process.pid}`;
  const entries = db.collection(`accountDirectoryGenerations/${generation}/entries`);
  const refs = [];
  const outcomes = [];
  try {
    const fixtures = require('./fixtures/account-directory.cjs');
    for (let i = 0; i < fixtures.length; i++) {
      const id = i === 0 ? 'a_b@example_com' : `legacy-random-${i}`;
      const ref = entries.doc(id); refs.push(ref);
      const projection = dir.projectAccount(id, fixtures[i]);
      await ref.set(codec.encodeDirectory(projection));
      const restored = codec.decodeDirectory((await ref.get()).data());
      assert.deepStrictEqual(restored, projection);
      assert.equal(codec.canonicalHash(restored, 1), codec.canonicalHash(projection, 1));
    }
    const ref = entries.doc('nested'); refs.push(ref);
    const value = { nested: [[undefined, null, -0, NaN, Infinity]], text: '\ud800\udc00\ud800' };
    await ref.set(codec.encodeValue(value));
    assert.deepStrictEqual(codec.decodeValue((await ref.get()).data()), value);
    for (const bad of [{ codecVersion: 2, payload: 'n' }, { codecVersion: 1, payload: 'broken' }]) {
      await ref.set(bad);
      const snapshot = await ref.get(); assert.throws(() => codec.decodeValue(snapshot.data()));
    }
    for (const L of [40, 320, 4000]) {
      const p = dir.projectAccount(`size-${L}`, { role: 'student', name: 'a'.repeat(L), email: 'x@y' });
      const dto = codec.encodeDirectory(p);
      const estimate = storage.storagePreflight(dto, { arrayIndexes: [{ scalarFields: ['groupEffective'] }], otherEntries: 0,
        otherIndexBytes: 0, documentNameBytes: 200, parentDocumentNameBytes: 150, maxPayloadBytes: 2000000 });
      const r = entries.doc(`size-${L}`); refs.push(r); await r.set(dto);
      assert.deepStrictEqual((await r.get()).data(), dto);
      outcomes.push({ L, payloadBytes: Buffer.byteLength(dto.payload), estimate });
    }
    // Raw local boundary probes deliberately bypass the codec's smaller processing budget.
    for (const bytes of [1048400, 1048487, 1048488, 1100000]) {
      const r = entries.doc(`boundary-${bytes}`); refs.push(r);
      let accepted = false, code;
      try { await r.set({ payload: 'x'.repeat(bytes) }); accepted = true; assert.equal((await r.get()).data().payload.length, bytes); }
      catch (error) { if (![3, 8].includes(error.code)) throw error; code = error.code; }
      outcomes.push({ boundaryPayloadBytes: bytes, accepted, code });
    }
    console.log(JSON.stringify({ projectId: config.projectId, roundTripFixtures: fixtures.length, outcomes,
      caveat: 'Local emulator behavior only; boundary acceptance is observational, not production index/storage/billing proof.' }, null, 2));
  } finally {
    for (const ref of refs) await ref.delete(); // Only records from this unique local run.
    await db.terminate();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });