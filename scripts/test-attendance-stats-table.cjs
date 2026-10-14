const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'components/AttendanceStatsTable.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
assert.equal((code.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
const mod = { exports: {} };
new Function('require', 'exports', 'module', code.outputText)(require, mod.exports, mod);
const rows = [{ date: '2026-09-10', type: 'Read aloud', total: 3, feedback: 2, within: 1 }, { date: '2026-09-11', type: 'Read aloud', total: 0, feedback: 0, within: 0 }];
const html = renderToStaticMarkup(React.createElement(mod.exports.default, { rows, daily: true, staffName: 'Assistant <test>' }));
for (const text of ['10/09/2026', '11/09/2026', '66.7%', '33.3%', '—', '% feedback thực hiện', '% trong hạn', 'tabindex="0"', 'Assistant &lt;test&gt;']) assert.ok(html.includes(text), text);
assert.equal((html.match(/<tbody>.*?<tr /s) || []).length, 1);
const summary = renderToStaticMarkup(React.createElement(mod.exports.default, { rows: [rows[0]], staffName: 'Teacher' }));
assert.ok(!summary.includes('Ngày nộp bài'));
assert.ok(summary.includes('Tổng hợp theo dạng bài'));
for (const daily of [true, false]) {
  const cases = [
    { date: '2026-09-10', type: 'Exact threshold', total: 10, feedback: 3, within: 0 },
    { date: '2026-09-10', type: 'Below threshold', total: 10, feedback: 2, within: 2 },
    { date: '2026-09-10', type: 'Rounded percentage', total: 10001, feedback: 3000, within: 0 },
    { date: '2026-09-10', type: 'No submissions', total: 0, feedback: 0, within: 0 },
  ];
  const rendered = renderToStaticMarkup(React.createElement(mod.exports.default, { rows: cases, daily, staffName: 'Staff' }));
  assert.ok(rendered.includes('Đạt 30%'));
  const bodyRows = [...rendered.matchAll(/<tbody>(.*?)<\/tbody>/gs)][0][1].match(/<tr .*?<\/tr>/gs);
  assert.match(bodyRows[0], />Đạt<\/span>/);
  assert.match(bodyRows[1], />Không đạt<\/span>/);
  assert.match(bodyRows[2], /30\.0%/);
  assert.match(bodyRows[2], />Không đạt<\/span>/, 'Threshold must use exact counts, not rounded percentage');
  assert.ok(!bodyRows[3].includes('<span'));
}
const ui = fs.readFileSync(path.join(root, 'components/AttendanceRangeStats.tsx'), 'utf8');
assert.ok(ui.includes("useState('daily')"));
assert.ok(ui.includes('!cursor && !busy && !error'));
assert.ok(ui.includes('completeAttendanceDailyRows'));
assert.match(ui, /!cursor && !busy && !error && rows.length > 0 && range && <>\s*<AttendanceDaySummary/);
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const summaryCode = ts.transpileModule(fs.readFileSync(path.join(root, 'components/AttendanceDaySummary.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const summaryMod = { exports: {} };
new Function('require', 'exports', 'module', summaryCode)(name => name === '@/lib/attendance-range-loader' ? require('../lib/attendance-range-loader') : require(name), summaryMod.exports, summaryMod);
const daySummaryHtml = renderToStaticMarkup(React.createElement(summaryMod.exports.default, { rows: [
  { date: '2026-09-10', type: 'RA', total: 10, feedback: 3, within: 0 },
  { date: '2026-09-10', type: 'RS', total: 10, feedback: 3, within: 0 },
  { date: '2026-09-11', type: 'RA', total: 10, feedback: 2, within: 2 },
  { date: '2026-09-12', type: 'RA', total: 0, feedback: 0, within: 0 },
] }));
for (const label of ['Ngày đạt', 'Ngày không đạt', 'Ngày không có bài']) assert.match(daySummaryHtml, new RegExp(`<dt[^>]*>${label}</dt><dd[^>]*>1</dd>`));
assert.ok(daySummaryHtml.includes('3 ngày trong khoảng đã chọn'));
console.log('PASS: daily/summary tables, dates, percentages, zero totals, escaping, accessible scroll and complete-range guard.');