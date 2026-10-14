const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(relative) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.equal((code.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, `Invalid TSX: ${relative}`);
  const module = { exports: {} };
  new Function('require', 'exports', 'module', code.outputText)(name =>
    name === 'next/link' ? { default: ({ children, ...props }) => React.createElement('a', props, children) }
      : name === '@/components/ui' ? load('components/ui/index.tsx') : require(name), module.exports, module);
  return module.exports;
}
const Page = load('app/dashboard/teacher/attendance-guide/page.tsx').default;
const html = renderToStaticMarkup(React.createElement(Page));
assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
assert.equal((html.match(/<section /g) || []).length, 6);
assert.equal((html.match(/<article /g) || []).length, 4);
assert.match(html, /Các mốc quan trọng/);
assert.match(html, /Nội dung hướng dẫn/);
assert.match(html, /lg:sticky lg:top-24/);
assert.match(html, /Vuốt ngang bảng/);
assert.match(html, /href="#attendance-guide-top"/);
assert.match(html, /id="attendance-guide-top"/);
assert.match(html, /Bắt đầu feedback/);
assert.match(html, /attendance-guide-illustration/);
assert.match(html, /<details open="" class="attendance-guide-menu">/);
assert.match(html, /<summary>Nội dung hướng dẫn/);
assert.match(html, /aria-label="Bảng hạn feedback bù" tabindex="0"/);
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Heading IDs must remain unique');
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `Missing anchor ${match[1]}`);
for (const id of ['feedback-rules', 'workday-rules', 'makeup-feedback', 'attendance-period', 'feedback-deadlines', 'examples']) {
  assert.ok(html.includes(`href="#${id}"`));
  assert.ok(html.includes(`id="${id}"`));
  assert.ok(html.includes(`aria-labelledby="${id}-title"`));
}
for (const text of ['Dành cho giảng viên và trợ giảng', '30% số bài của từng học viên', '4 bài cần ít nhất 2 feedback',
  'Sai ở đâu.', 'Cần sửa gì.', 'Cách cải thiện.', 'Những lỗi cần tránh ở các bài sau.',
  'không tự động phát sinh ngày công', 'từ ngày 21 tháng trước đến hết ngày 20 tháng hiện tại',
  '23:59, giờ Việt Nam', 'ngày học viên nộp bài, không phải ngày feedback bù', 'Read Aloud – Repeat Sentence – Write From Dictation',
  'A: 9 bài, B: 0 bài', 'không được hồi tố công cho kỳ 21/08–20/09']) assert.ok(html.includes(text), text);
const table = html.match(/<tbody>(.*?)<\/tbody>/s)[1];
assert.equal((table.match(/<tr /g) || []).length, 6);
assert.ok(!html.includes('7 ngày'), 'The guide must not retain the old makeup deadline');
assert.match(html, /Quy tắc 3 ngày và ngày chốt công/);
assert.match(html, /feedback bù tối đa trong vòng 3 ngày/);
for (const [submitted, three, deadline] of [
  ['05/09', '08/09', '08/09'], ['10/09', '13/09', '13/09'], ['15/09', '18/09', '18/09'],
  ['18/09', '21/09', '20/09'], ['20/09', '23/09', '20/09'], ['21/09', '24/09', '24/09 – thuộc kỳ công tiếp theo'],
]) assert.ok(table.includes(`>${submitted}</th><td class="p-3">${three}</td><td class="p-3 font-medium">${deadline}</td>`));
const navigation = fs.readFileSync(path.join(root, 'app/components/Navigation.tsx'), 'utf8');
for (const role of ['teacher', 'assistant']) {
  const section = navigation.split(`case "${role}":`)[1].split(/case |default:/)[0];
  assert.ok(section.includes('/dashboard/teacher/attendance-guide'), `${role} navigation`);
}
const workspace = fs.readFileSync(path.join(root, 'components/FeedbackWorkspace.tsx'), 'utf8');
assert.ok(workspace.includes("['teacher', 'assistant'].includes(account.role) && <Link href=\"/dashboard/teacher/attendance-guide\""));
console.log('PASS: attendance guide render, six sections, deadline table, four cases and both staff navigation links.');