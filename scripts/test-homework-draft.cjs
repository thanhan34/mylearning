const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const values = new Map();
let blocked = false;
global.window = { localStorage: {
  getItem(key) { if (blocked) throw new Error('Storage blocked'); return values.get(key) ?? null; },
  setItem(key, value) { if (blocked) throw new Error('Storage full'); values.set(key, value); },
  removeItem(key) { if (blocked) throw new Error('Storage blocked'); values.delete(key); },
} };

// Minimal hook runner: execute effects after render, retaining state across renders.
let states = [];
let dependencies = [];
let cursor = 0;
let effects = [];
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  },
  useEffect(effect, deps) {
    const index = cursor++;
    if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) effects.push(effect);
    dependencies[index] = deps;
  },
};
const source = fs.readFileSync(path.join(root, 'lib/use-homework-draft.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const loaded = { exports: {} };
new Function('require', 'exports', 'module', compiled)(name => name === 'react' ? react : require(name), loaded.exports, loaded);
function render(owner = 'student-a', date = '2026-10-24') {
  cursor = 0;
  effects = [];
  const result = loaded.exports.useHomeworkDraft(owner, date);
  effects.forEach(effect => effect());
  return result;
}
function mount(owner = 'student-a', date = '2026-10-24') {
  states = [];
  dependencies = [];
  assert.equal(render(owner, date).ready, false);
  return render(owner, date);
}

let draft = mount();
assert.equal(draft.ready, true);
const text = 'RA#1 shared answer\nhttps://www.apeuni.com/practice/answer_item?model=read_alouds&answer_id=123\nunfinished link';
draft.updateDraft({ text });
assert.equal(values.size, 1, 'Persist immediately before another render or navigation');
draft = render();
draft.updateDraft({ selectedDate: '2026-10-20' });
draft = mount();
assert.equal(draft.text, text, 'Restore exact content after navigating away or reloading');
assert.equal(draft.selectedDate, '2026-10-20', 'Restore selected date, not today');

assert.equal(render('student-b').ready, false, 'Do not expose another account draft while switching');
draft = render('student-b');
assert.equal(draft.text, '');
draft.updateDraft({ text: 'Student B draft' });
draft = mount();
assert.equal(draft.text, text, 'Account drafts remain separate');
assert.equal(render(null).ready, false);
draft = mount();
assert.equal(draft.text, text, 'Logging out must not delete the draft');

// A failed submission never calls clearDraft, so a remount must retain the input.
draft = mount();
assert.equal(draft.text, text);
draft.clearDraft();
assert.equal(render().text, '');
draft = mount();
assert.equal(draft.text, '', 'Successful submission must not restore the old draft');
assert.equal(mount('student-b').text, 'Student B draft', 'Clearing must affect only the current student');

draft = mount();
draft.updateDraft({ text: 'To be removed' });
draft = render();
draft.updateDraft({ text: '' });
assert.equal(mount().text, '', 'Deleting all input must not resurrect older links');

const key = 'homework-submission-draft:v1:student-a';
for (const invalid of ['{bad json', 'null', '{"text":123,"selectedDate":"2026-10-24"}', '{"text":"old","selectedDate":"invalid"}']) {
  values.set(key, invalid);
  assert.equal(mount().text, '', 'Invalid storage must not crash or restore malformed data');
}
blocked = true;
draft = mount();
assert.equal(draft.storageError, true);
draft.updateDraft({ text: 'Keep in memory if storage is unavailable' });
draft = render();
assert.equal(draft.text, 'Keep in memory if storage is unavailable');
assert.equal(draft.storageError, true);
blocked = false;
draft.updateDraft({ selectedDate: '2026-10-21' });
assert.equal(render().storageError, false, 'Recover when storage becomes available');
assert.equal(mount().text, 'Keep in memory if storage is unavailable');

const page = fs.readFileSync(path.join(root, 'app/dashboard/submit/page.tsx'), 'utf8');
assert.match(page, /updateDraft\(\{ text: event.target.value \}\)/);
assert.match(page, /updateDraft\(\{ selectedDate: event.target.value \}\)/);
assert.match(page, /if \(!success\) throw new Error\('Failed to save submissions'\);\s+clearDraft\(\);/);
assert.equal((page.match(/clearDraft\(\)/g) || []).length, 1, 'Only clear after successful save, never on errors or unmount');
assert.match(page, /session\?\.user\?\.email\?\.trim\(\).toLowerCase\(\)/);
console.log('PASS: immediate draft persistence, navigation/reload restoration, date restoration, account isolation, logout, success cleanup, failure retention, invalid storage and storage errors.');