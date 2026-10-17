/** Explicit, fixed local-test target. Never infer emulator mode from localhost. */
export function firebaseEmulatorTarget(config: {
  enabled?: string; projectId?: string; firestore?: string; auth?: string;
}) {
  if (config.enabled === undefined || config.enabled === '0') return null;
  if (config.enabled !== '1' || config.projectId !== 'demo-mocktest-phase43'
    || config.firestore !== '127.0.0.1:8080' || config.auth !== '127.0.0.1:9099') {
    throw new Error('Invalid Firebase local-test emulator configuration.');
  }
  return { projectId: config.projectId, host: '127.0.0.1', firestorePort: 8080, authPort: 9099 };
}