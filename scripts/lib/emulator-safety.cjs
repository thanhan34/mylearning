const net = require('node:net');
function validateEnvironment(env) {
  const projectId = env.ACCOUNTS_EMULATOR_PROJECT;
  if (!/^demo-[a-z0-9-]+$/.test(projectId || '')) throw Error('SAFETY: demo- project required');
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_CONFIG', 'FIREBASE_PRIVATE_KEY', 'GOOGLE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'GOOGLE_CLIENT_EMAIL', 'FIREBASE_TOKEN']) {
    if (env[key]) throw Error(`SAFETY: credentials/config variable forbidden: ${key}`);
  }
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID']) {
    if (env[key] && env[key] !== projectId) throw Error(`SAFETY: conflicting project variable: ${key}`);
  }
  // Numeric loopback only: no DNS, URL parsing ambiguity or nonlocal endpoints.
  const match = /^(127\.0\.0\.1|\[::1\]):([0-9]{1,5})$/.exec(env.FIRESTORE_EMULATOR_HOST || '');
  if (!match || +match[2] < 1 || +match[2] > 65535) throw Error('SAFETY: numeric loopback emulator host required');
  return { projectId, host: match[1] === '[::1]' ? '::1' : match[1], port: +match[2] };
}
function ready(config) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: config.host, port: config.port });
    socket.setTimeout(2000);
    socket.once('connect', () => { socket.destroy(); resolve(); });
    socket.once('error', () => { socket.destroy(); reject(Error('EMULATOR_UNAVAILABLE: no SDK initialized')); });
    socket.once('timeout', () => { socket.destroy(); reject(Error('EMULATOR_UNAVAILABLE: local timeout')); });
  });
}
module.exports = { validateEnvironment, ready };