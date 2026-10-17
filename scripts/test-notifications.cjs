// Deterministic SDK boundary mocks only. Never load Firebase configuration/credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const servicePath = 'app/firebase/services/notification.ts';
const BASELINE_COMMIT = 'a4872e0a78a0fe67781e6dbc0e22d1859c9eb021';
const quietConsole = { ...console, error() {} };
function load(source, imports) {
  const exports = {};
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, console: quietConsole, AbortController, queueMicrotask,
    require(name) { assert.ok(Object.hasOwn(imports, name), `Unmocked import: ${name}`); return imports[name]; } });
  return exports;
}
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function harness(source) {
  const counters = { accountLookups: 0, getDocs: 0, fetchedDocuments: 0, listenersCreated: 0,
    activeListeners: 0, peakListeners: 0, snapshots: 0, deletes: 0 };
  const streams = [];
  const documents = [{ id: 'n1', message: 'One' }, { id: 'n2', message: 'Two' }, { id: 'n3', message: 'Three' }];
  let resolveLookup;
  let delayLookup = false;
  let deleteSuccess = true;
  const snapshot = rows => ({ size: rows.length, docs: rows.map(row => ({ id: row.id, data: () => row })) });
  const sdk = {
    collection: (_db, name) => name, doc: (_db, name, id) => ({ name, id }),
    query: (name, ...constraints) => ({ name, constraints }), where: (...args) => args, orderBy: (...args) => args,
    getDocs: async () => { counters.getDocs++; counters.fetchedDocuments += documents.length; return snapshot(documents); },
    onSnapshot(query, next, error) {
      counters.listenersCreated++; counters.activeListeners++;
      counters.peakListeners = Math.max(counters.peakListeners, counters.activeListeners);
      const stream = { query, next, error, stopped: false };
      streams.push(stream);
      queueMicrotask(() => { if (!stream.stopped) emit(stream, documents); });
      return () => { if (!stream.stopped) { stream.stopped = true; counters.activeListeners--; } };
    },
    deleteDoc: async ref => { counters.deletes++; assert.equal(ref.name, 'notifications'); if (!deleteSuccess) throw Error('Denied'); },
  };
  function emit(stream, rows) { counters.snapshots++; counters.fetchedDocuments += rows.length; stream.next(snapshot(rows)); }
  const service = load(source, {
    '@/app/firebase/firestore': sdk, '../config': { db: {} },
    './user': { getUserByEmail: async email => { counters.accountLookups++;
      if (delayLookup) await new Promise(resolve => { resolveLookup = resolve; });
      return { id: email }; } },
  });
  const { createNotificationStore } = load(read('lib/notification-store.ts'), {});
  const store = createNotificationStore(service.subscribeToNotifications);
  return { counters, streams, service, store, emit,
    delay() { delayLookup = true; }, resolve() { resolveLookup(); },
    failDelete() { deleteSuccess = false; } };
}
async function main() {
  // Executable baseline from unchanged repository HEAD, not a recreated cost estimate.
  const beforeSource = execFileSync('git', ['show', `${BASELINE_COMMIT}:${servicePath}`], { cwd: root, encoding: 'utf8' });
  const before = harness(beforeSource);
  const beforeStops = await Promise.all([0, 1].map(async () => {
    await before.service.getUnreadNotifications('a', 'teacher');
    return before.service.subscribeToNotifications('a', 'teacher', () => {});
  }));
  await flush();
  const baseline = { ...before.counters };
  beforeStops.forEach(stop => stop());
  assert.equal(before.counters.activeListeners, 0);

  const after = harness(read(servicePath));
  let rendersA = 0, rendersB = 0;
  const stopA = after.store.subscribe('a', 'teacher', () => rendersA++);
  const stopB = after.store.subscribe('a', 'teacher', () => rendersB++);
  await flush();
  assert.equal(after.counters.accountLookups, 1);
  assert.equal(after.counters.getDocs, 0);
  assert.equal(after.counters.activeListeners, 1);
  assert.equal(after.store.getSnapshot('a', 'teacher').notifications.length, 3);
  assert.equal(after.store.getSnapshot('a', 'teacher').isLoading, false);
  assert.ok(rendersA && rendersB, 'Both UI consumers receive initial data');
  const optimized = { ...after.counters };
  const stream = after.streams[0];
  assert.equal(stream.query.constraints[0][0], 'teacher_id');
  assert.equal(stream.query.constraints[1][0], 'is_read');
  assert.equal(stream.query.constraints[2][0], 'created_at');

  assert.equal(await after.service.markNotificationAsRead('n1'), true);
  after.store.remove('a', 'teacher', 'n1');
  assert.equal(after.store.getSnapshot('a', 'teacher').notifications.length, 2);
  after.failDelete();
  assert.equal(await after.service.markNotificationAsRead('n2'), false);
  assert.equal(after.store.getSnapshot('a', 'teacher').notifications.length, 2);
  after.emit(stream, []);
  assert.equal(after.store.getSnapshot('a', 'teacher').notifications.length, 0);
  // Reconnect is an SDK snapshot, not another application subscription.
  after.emit(stream, [{ id: 'new', message: 'Reconnect' }]);
  assert.equal(after.store.getSnapshot('a', 'teacher').notifications[0].id, 'new');
  assert.equal(after.counters.listenersCreated, 1);
  stopA(); await flush(); assert.equal(after.counters.activeListeners, 1);
  stopB(); stopB(); await flush(); assert.equal(after.counters.activeListeners, 0);
  assert.equal(after.store.getSnapshot('a', 'teacher').notifications.length, 0);
  after.emit(stream, [{ id: 'stale' }]);
  assert.equal(after.store.getSnapshot('a', 'teacher').notifications.length, 0);

  const early = harness(read(servicePath)); early.delay();
  const release = early.store.subscribe('a', 'admin', () => {});
  await flush(); release(); await flush(); early.resolve(); await flush();
  assert.equal(early.counters.listenersCreated, 0, 'Aborted lookup must not create a late listener');

  const strict = harness(read(servicePath));
  const first = strict.store.subscribe('a', 'assistant', () => {});
  first();
  const remounted = strict.store.subscribe('a', 'assistant', () => {});
  await flush();
  assert.equal(strict.counters.listenersCreated, 1, 'Strict effect cleanup/remount shares setup');
  assert.equal(strict.streams[0].query.constraints[0][0], 'admin_id', 'Preserve assistant routing');
  remounted();
  const remountedAgain = strict.store.subscribe('a', 'assistant', () => {});
  await flush();
  assert.equal(strict.store.getSnapshot('a', 'assistant').isLoading, false);
  assert.equal(strict.counters.listenersCreated, 1);
  remountedAgain(); await flush(); assert.equal(strict.counters.activeListeners, 0);

  const switched = harness(read(servicePath));
  const old = switched.store.subscribe('old', 'admin', () => {}); await flush();
  old();
  assert.equal(switched.store.getSnapshot('new', 'admin').notifications.length, 0);
  const fresh = switched.store.subscribe('new', 'admin', () => {}); await flush();
  switched.emit(switched.streams[0], [{ id: 'private-old' }]);
  assert.ok(!switched.store.getSnapshot('new', 'admin').notifications.some(n => n.id === 'private-old'));
  assert.equal(switched.counters.activeListeners, 1);
  switched.streams[1].error(new Error('permission-denied'));
  assert.equal(switched.store.getSnapshot('new', 'admin').error, 'permission-denied');
  assert.equal(switched.store.getSnapshot('new', 'admin').isLoading, false);
  assert.equal(switched.store.getSnapshot('new', 'admin').notifications.length, 0);
  fresh(); await flush(); assert.equal(switched.counters.activeListeners, 0);

  // Also defend against a start implementation that ignores AbortSignal entirely.
  const { createNotificationStore } = load(read('lib/notification-store.ts'), {});
  let finishLate, lateStops = 0;
  const lateStore = createNotificationStore(() => new Promise(resolve => { finishLate = resolve; }));
  const lateRelease = lateStore.subscribe('a', 'admin', () => {});
  await flush(); lateRelease(); await flush();
  finishLate(() => lateStops++); await flush();
  assert.equal(lateStops, 1);

  // Execute the actual hook with deterministic React boundary stubs (no renderer/network).
  const hookHarness = harness(read(servicePath));
  const hookCleanups = [];
  const useHook = load(read('components/useNotifications.ts'), {
    react: { useCallback: callback => callback,
      useSyncExternalStore(subscribe, snapshot) { hookCleanups.push(subscribe(() => {})); return snapshot(); } },
    '@/app/firebase/services/notification': hookHarness.service,
    '@/lib/notification-store': { createNotificationStore: () => hookHarness.store,
      EMPTY_NOTIFICATIONS: { notifications: [], isLoading: false, error: null } },
  }).useNotifications;
  useHook('a', 'teacher'); useHook('a', 'teacher'); await flush();
  assert.equal(hookHarness.counters.listenersCreated, 1);
  const currentView = useHook('a', 'teacher');
  assert.equal(currentView.notifications.length, 3);
  await currentView.markAsRead('n1');
  assert.equal(useHook('a', 'teacher').notifications.length, 2);
  hookHarness.failDelete(); await currentView.markAsRead('n2');
  assert.equal(useHook('a', 'teacher').notifications.length, 2);
  assert.equal(useHook(null, 'teacher').notifications.length, 0, 'Logout render must never return old data');
  assert.equal(useHook('b', 'teacher').notifications.length, 0, 'Account switch render must be empty immediately');
  hookCleanups.forEach(stop => stop()); await flush();
  assert.equal(hookHarness.counters.activeListeners, 0);

  const bell = read('app/components/NotificationBell.tsx');
  assert.match(bell, /useNotifications/);
  assert.ok(!/getUnreadNotifications|subscribeToNotifications/.test(bell));
  assert.match(bell, /notifications\.length/);
  assert.match(bell, /await markAsRead\(notificationId\)/);
  const beforeBell = execFileSync('git', ['show', `${BASELINE_COMMIT}:app/components/NotificationBell.tsx`], { cwd: root, encoding: 'utf8' });
  const markup = source => source.slice(source.indexOf('  const formatDate')).replace(/\r\n/g, '\n');
  assert.equal(markup(bell), markup(beforeBell), 'Rendered markup/date formatting must remain unchanged');
  const hook = read('components/useNotifications.ts');
  assert.match(hook, /useSyncExternalStore/);
  assert.match(hook, /if \(success\) store\.remove/);
  console.log('PASS: concurrent bells, initial/empty snapshots, shared mark-read, abort, Strict lifecycle, account isolation, errors, SDK reconnect and unchanged markup.');
  console.log(JSON.stringify({ baselineCommit: BASELINE_COMMIT, scenario: 'Mount desktop + mobile, 3 unread documents, one mocked account document per lookup',
    before: { ...baseline, sdkReadRequests: baseline.accountLookups + baseline.getDocs + baseline.listenersCreated,
      totalDocumentResultsIncludingAccount: baseline.fetchedDocuments + baseline.accountLookups, listenersAfterUnmount: before.counters.activeListeners },
    after: { ...optimized, sdkReadRequests: optimized.accountLookups + optimized.getDocs + optimized.listenersCreated,
      totalDocumentResultsIncludingAccount: optimized.fetchedDocuments + optimized.accountLookups, listenersAfterUnmount: after.counters.activeListeners },
    disclaimer: 'Mock document results are not Firebase billed reads; no network or production access.' }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });