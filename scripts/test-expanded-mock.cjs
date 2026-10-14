const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { createExpandedSeed } = require('../lib/mock/seed');
const { feedbackTiming, vietnamDate } = require('../lib/attendance-audit');
const { EXERCISE_TYPES } = require('../lib/learning-access');
const { execute } = require('../lib/mock/engine');
const now = new Date('2026-09-30T01:00:00Z');
const seed = createExpandedSeed(now);
const homework = Object.entries(seed).filter(([key]) => key.startsWith('homework/')).map(([, data]) => data);
assert.equal(Object.keys(seed).length, 474);
assert.equal(homework.length, 450);
assert.equal(new Set(homework.map(data => data.date)).size, 45);
const types = new Set(); const statuses = new Set(); let total = 0;
for (const data of homework) {
  assert.ok(seed[`users/${data.userId}`]);
  assert.equal(seed[`users/${data.userId}`].approvalStatus, 'approved');
  assert.ok(data.date <= vietnamDate(now));
  assert.equal(new Set(data.submissions.map(sub => sub.id)).size, data.submissions.length);
  for (const sub of data.submissions) {
    total++; types.add(sub.type); statuses.add(feedbackTiming(sub, 'mock-teacher', data.date));
    if (sub.feedbackAt) assert.ok(Date.parse(sub.feedbackAt) <= now.getTime());
    if (sub.feedbackBy?.startsWith('mock-extra-')) assert.ok(seed[`users/${sub.feedbackBy}`].assignedFeedbackTypes.includes(sub.type));
  }
}
assert.equal(types.size, EXERCISE_TYPES.length);
for (const status of ['within', 'late', 'missing', 'other', 'unknown']) assert.ok(statuses.has(status));
assert.equal(homework.filter(data => data.date === vietnamDate(now)).length, 10);
assert.ok(homework.some(data => data.submissions.filter(sub => sub.type === 'Read aloud').length > 20));
assert.deepEqual(createExpandedSeed(now), seed, 'Seed must be deterministic for a given instant');
global.__learningMockStore = { seedVersion: 1, revision: 10, documents: {
  'users/mock-extra-staff-01': { name: 'Keep my edits' },
} };
execute({ kind: 'read', ref: { path: 'users', type: 'collection' } });
assert.equal(global.__learningMockStore.seedVersion, 2);
assert.equal(global.__learningMockStore.revision, 11);
assert.equal(global.__learningMockStore.documents['users/mock-extra-staff-01'].name, 'Keep my edits');
execute({ kind: 'read', ref: { path: 'users', type: 'collection' } });
assert.equal(global.__learningMockStore.revision, 11);
console.log(`PASS: 24 extra accounts, 450 homework records, ${total} submissions, all types/timing scenarios, pagination and additive migration.`);