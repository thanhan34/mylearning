// Read-only diagnostic. Never prints keys, tokens, or user document contents.
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env.local') });
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/server/firebase-admin.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'exports', 'module', compiled)(require, loaded.exports, loaded);
const project = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const email = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
console.log('Firebase project:', project || '(not configured)');
console.log('Server identity:', email || '(Application Default Credentials)');
console.log('Credential source:', process.env.FIREBASE_CLIENT_EMAIL ? 'FIREBASE_*' : email ? 'GOOGLE_* fallback' : 'ADC');
const timeout = setTimeout(() => { console.error('Diagnostic timed out after 30 seconds.'); process.exit(1); }, 30000);
(async () => {
  let failed = false;
  try {
    await loaded.exports.adminDb().collection('users').limit(1).get();
    console.log('PASS: Firestore user lookup (read-only).');
  } catch (error) {
    failed = true;
    console.error('FAIL: Firestore access. Error code:', error.code || 'configuration');
    if (error.code === 7 || error.code === 'permission-denied') {
      console.error('Grant this server identity Cloud Datastore User (roles/datastore.user) in the Firebase project, or configure the correct FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.');
    } else if (error.code === 8 || error.code === 'resource-exhausted') {
      console.error('Firestore RESOURCE_EXHAUSTED: check Firestore usage, quotas and billing status in the configured Firebase project. Changing teacher/assistant permissions will not resolve this error.');
      console.error('Quota exceeded reported by server:', /quota exceeded|exceeded.*quota/i.test(`${error.message || ''} ${error.details || ''}`) ? 'yes' : 'not explicit; inspect resource limits');
    } else console.error('Check the server credentials, project ID and network connectivity.');
  }
  try {
    // Signs locally; token is neither printed nor exchanged, and no Firebase user is created.
    await loaded.exports.adminAuth().createCustomToken('diagnostic-token-not-exchanged');
    console.log('PASS: Firebase custom-token signing.');
  } catch (error) {
    failed = true;
    console.error('FAIL: Custom-token signing. Error code:', error.code || 'configuration');
  }
  clearTimeout(timeout);
  process.exit(failed ? 1 : 0);
})();