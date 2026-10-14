const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let account = { id: 'student-demo', role: 'student' };
let queries = 0;
const mocks = {
  'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
  '@/components/LearningGate': { useLearningAccount: () => account },
  '@/components/ui': {
    Card: ({ children }) => React.createElement('section', null, children),
    Button: ({ children }) => React.createElement('button', null, children),
  },
  '@/app/firebase/services/homework': { getHomeworkSubmissions: () => { queries++; return Promise.resolve([]); } },
  '@/app/firebase/services/progress': { getHomeworkProgress: () => { queries++; return Promise.resolve([]); } },
  '../components/SubmissionsCalendar': { default: () => React.createElement('div', null, 'Submission calendar') },
  '../components/SubmissionsList': { default: () => React.createElement('div', null, 'Submission list') },
};
const source = read('app/dashboard/submissions/page.tsx');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const loaded = { exports: {} };
new Function('require', 'exports', 'module', compiled)(name => mocks[name] || require(name), loaded.exports, loaded);
const Page = loaded.exports.default;
const html = renderToStaticMarkup(React.createElement(Page));
assert.match(html, /Nộp bài tập/);
assert.match(html, /href="\/dashboard\/submit"/);
assert.match(html, /Submission calendar/);
assert.match(html, /Đang tải bài đã nộp/);
account = { id: 'teacher-demo', role: 'teacher' };
assert.match(renderToStaticMarkup(React.createElement(Page)), /Trang này dành cho học viên/);
account = null;
assert.match(renderToStaticMarkup(React.createElement(Page)), /Đang tải/);
assert.equal(queries, 0, 'Server render should not fetch student data');
assert.ok(source.includes('cancelled = true'), 'Ignore stale requests after date/account changes');
assert.ok(source.includes('result?.userId === account.id && result.date === selectedDate'));
const dashboard = read('app/dashboard/components/StudentDashboard.tsx');
assert.ok(!/SubmissionsCalendar|SubmissionsList|Nộp bài tập/.test(dashboard));
assert.ok(!read('app/dashboard/page.tsx').includes('getHomeworkSubmissions'));
const nav = read('app/components/Navigation.tsx');
assert.match(nav.slice(nav.indexOf('case "student":'), nav.indexOf('case "assistant":')), /href: "\/dashboard\/submissions", label: "Nộp bài tập"/);
assert.ok(read('app/dashboard/submit/page.tsx').includes("router.push('/dashboard/submissions')"));
console.log('PASS: submissions page rendering, student guard, loading, navigation, return link, stale-result guard and removal from dashboard.');