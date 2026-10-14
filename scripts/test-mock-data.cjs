const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { execute } = require('../lib/mock/engine');
const { mockSdk: sdk, mockAdminDb: admin } = require('../lib/mock/adapter');
const { Timestamp } = require('firebase/firestore');
const { execFileSync } = require('node:child_process');

(async () => {
  const users = sdk.collection(null, 'users');
  assert.equal((await sdk.getDocs(users)).size, 31);
  const support = (await sdk.getDoc(sdk.doc(null, 'users', 'mock-admin_support'))).data();
  assert.equal(support.role, 'admin_support');
  assert.equal(support.email, 'admin_support@mock.local');
  assert.equal(support.approvalStatus, 'approved');
  const { MOCK_ACCOUNTS } = require('../lib/mock/config');
  assert.ok(MOCK_ACCOUNTS.includes('admin_support'));
  const { isApproved, canFeedback } = require('../lib/learning-access');
  assert.equal(isApproved(support), true);
  assert.equal(canFeedback(support, 'Read aloud'), false);
  const students = await sdk.getDocs(sdk.query(users, sdk.where('role', '==', 'student')));
  assert.equal(students.size, 15);
  const ref = sdk.doc(null, 'users', 'mock-student');
  assert.equal((await sdk.getDoc(ref)).data().name, 'Nguyễn Minh An');
  await sdk.updateDoc(ref, { name: 'Updated locally', tags: sdk.arrayUnion('a') });
  assert.equal((await admin.collection('users').doc(ref.id).get()).data().name, 'Updated locally');
  await sdk.updateDoc(ref, { tags: sdk.arrayRemove('a') });
  assert.deepEqual((await sdk.getDoc(ref)).data().tags, []);
  const added = await sdk.addDoc(sdk.collection(null, 'test'), { timestamp: Timestamp.now(), nested: { count: 1 } });
  assert.ok((await sdk.getDoc(added)).data().timestamp instanceof Timestamp);
  await sdk.updateDoc(added, { 'nested.count': 2 });
  assert.equal((await sdk.getDoc(added)).data().nested.count, 2);
  const batch = sdk.writeBatch();
  batch.update(ref, { name: 'Must roll back' });
  batch.update(sdk.doc(null, 'users', 'missing'), { name: 'Invalid' });
  await assert.rejects(batch.commit());
  assert.equal((await sdk.getDoc(ref)).data().name, 'Updated locally');
  await admin.runTransaction(async tx => {
    const user = await tx.get(admin.collection('users').doc(ref.id));
    assert.equal(user.exists, true);
    tx.update(user.ref, { name: 'Transaction saved' });
  });
  assert.equal((await sdk.getDoc(ref)).data().name, 'Transaction saved');
  const page = await admin.collection('homework').where('userId', '==', 'mock-student').orderBy('date', 'desc').orderBy('__name__', 'desc').limit(2).get();
  const next = await admin.collection('homework').where('userId', '==', 'mock-student').orderBy('date', 'desc').orderBy('__name__', 'desc').startAfter(page.docs[1].data().date, page.docs[1].id).get();
  assert.equal(page.size, 2); assert.equal(next.size, 5);
  const state = execute({ kind: 'read', ref });
  await sdk.updateDoc(ref, { name: 'Conflict test' });
  assert.throws(() => execute({ kind: 'commit', writes: [], revision: state.revision }), /MOCK_CONFLICT/);
  await new Promise((resolve, reject) => {
    let calls = 0;
    const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Listener timed out')); }, 5000);
    const unsubscribe = sdk.onSnapshot(ref, async doc => {
      if (++calls === 1) await sdk.updateDoc(ref, { name: 'Listener saved' });
      else { assert.equal(doc.data().name, 'Listener saved'); unsubscribe(); clearTimeout(timeout); resolve(); }
    }, reject);
  });
  await sdk.deleteDoc(added);
  assert.equal((await sdk.getDoc(added)).exists(), false);
  // New application code must not bypass the data adapter.
  const root = path.resolve(__dirname, '..');
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(file);
      else if (/\.tsx?$/.test(file) && !['config.ts', 'firestore.ts'].includes(entry.name)) {
        assert.ok(!/from ['"]firebase\/firestore['"]/.test(fs.readFileSync(file, 'utf8')), `Direct Firestore import: ${file}`);
      }
    }
  }
  scan(path.join(root, 'app'));
  const checkFlag = "require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node'}}); console.log(require('./lib/mock/config').MOCK_ENABLED)";
  for (const mode of ['development', 'production', 'test']) {
    const enabled = execFileSync(process.execPath, ['-e', checkFlag], { cwd: root, env: { ...process.env, NODE_ENV: mode, NEXT_PUBLIC_USE_MOCK_DATA: 'true' }, encoding: 'utf8' }).trim();
    assert.equal(enabled, mode === 'development' ? 'true' : 'false');
  }
  console.log('PASS: seed, shared SDK/Admin data, timestamps, queries, cursors, writes, rollback, transaction conflicts, listeners, import guard.');
})().catch(error => { console.error(error); process.exitCode = 1; });