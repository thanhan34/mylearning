const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

function load(relative) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.equal((compiled.diagnostics || []).filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, `Invalid TSX in ${relative}`);
  const module = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)(
    name => name === 'next/link' ? { default: ({ children, ...props }) => React.createElement('a', props, children) }
      : name === '@/components/ui' ? load('components/ui/index.tsx')
      : name === '../components/HomeworkGuide' ? load('app/dashboard/components/HomeworkGuide.tsx')
      : name === '../components/ApeUniAccountGuide' ? load('app/dashboard/components/ApeUniAccountGuide.tsx')
      : name === '../components/ZoomGuide' ? load('app/dashboard/components/ZoomGuide.tsx')
      : name === '../components/SubmissionGuide' ? load('app/dashboard/components/SubmissionGuide.tsx')
      : name === '../components/ApeUniCopyLinkGuide' ? load('app/dashboard/components/ApeUniCopyLinkGuide.tsx')
      : name === '../components/WfdGuide' ? load('app/dashboard/components/WfdGuide.tsx') : require(name),
    module.exports, module,
  );
  return module.exports;
}

const Guide = load('app/dashboard/components/HomeworkGuide.tsx').default;
const html = renderToStaticMarkup(React.createElement(Guide));
assert.match(html, /aria-labelledby="homework-guide-title"/);
assert.equal((html.match(/<h3 class="font-semibold text-gray-900">Bước /g) || []).length, 4);
assert.equal((html.match(/<li[ >]/g) || []).length, 10);
for (const text of ['Hướng dẫn làm bài tập về nhà', 'ApeUni', 'Read Aloud', 'Sep P', 'Prac Status', 'Unpracticed', '30 câu đầu tiên từ trên xuống dưới', 'Không tự ý chọn câu ở giữa hoặc làm ngẫu nhiên.', 'nộp kết quả bài tập', 'PTE Intensive – Học là đậu!']) {
  assert.ok(html.includes(text), `Missing guide text: ${text}`);
}
const dashboard = fs.readFileSync(path.join(root, 'app/dashboard/components/StudentDashboard.tsx'), 'utf8');
assert.ok(!dashboard.includes('HomeworkGuide'), 'Guide should no longer be embedded in the dashboard');
const Page = load('app/dashboard/guides/page.tsx').default;
const topics = ['zoom', 'account', 'homework', 'copy-link', 'submission', 'wfd'];
const headingIds = ['zoom-guide-title', 'apeuni-account-guide-title', 'homework-guide-title', 'apeuni-copy-link-guide-title', 'submission-guide-title', 'wfd-guide-title'];
const pages = topics.map(topic => renderToStaticMarkup(React.createElement(Page, { searchParams: { topic } })));
const pageHtml = pages.join('');
pages.forEach((markup, index) => {
  assert.equal((markup.match(/class="ui-card p-4 sm:p-6 homework-guide"/g) || []).length, 1, 'Only the selected guide should render');
  headingIds.forEach((id, guideIndex) => assert.equal(markup.includes(`id="${id}"`), guideIndex === index));
  assert.equal((markup.match(/aria-current="page"/g) || []).length, 1);
  assert.ok(markup.includes(`href="/dashboard/guides?topic=${topics[index]}#guide-content" aria-current="page"`));
  assert.ok(markup.includes('aria-label="Chuyển hướng dẫn"'));
  assert.ok(markup.includes('Danh mục hướng dẫn'));
  for (const group of ['Chuẩn bị', 'Luyện tập &amp; nộp bài', 'Luyện tập bổ trợ']) assert.ok(markup.includes(group));
  assert.equal((markup.match(/class="guide-topic-icon"/g) || []).length, 6, 'Every topic has a consistent icon');
  assert.ok(markup.includes('lg:sticky lg:top-24'), 'Desktop directory stays accessible while reading');
  assert.ok(markup.includes('Cần hỗ trợ thêm?'));
  assert.match(markup, /id="guide-content" tabindex="-1"/i);
  for (const topic of topics) assert.ok(markup.includes(`/dashboard/guides?topic=${topic}#guide-content`));
  if (index > 0) assert.ok(markup.includes('← Trước'));
  if (index < topics.length - 1) assert.ok(markup.includes('Tiếp theo →'));
  const localIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(localIds).size, localIds.length, 'No duplicate heading IDs on a page');
});
for (const topic of [undefined, 'unknown', ['zoom', 'account']]) {
  const markup = renderToStaticMarkup(React.createElement(Page, { searchParams: { topic } }));
  assert.ok(markup.includes('id="zoom-guide-title"'), 'Missing/invalid topics should safely default to Zoom');
}
assert.match(pageHtml, /<h1[^>]*>Hướng dẫn<\/h1>/);
assert.ok(pageHtml.includes(html), 'Dedicated page should render the full existing guide');
const AccountGuide = load('app/dashboard/components/ApeUniAccountGuide.tsx').default;
const accountHtml = renderToStaticMarkup(React.createElement(AccountGuide));
assert.match(accountHtml, /aria-labelledby="apeuni-account-guide-title"/);
assert.equal((accountHtml.match(/<h3 class="font-semibold text-gray-900">Bước /g) || []).length, 3);
assert.equal((accountHtml.match(/<li[ >]/g) || []).length, 10, 'Three steps, three fields and four notes');
for (const text of ['Hướng dẫn tạo tài khoản ApeUni', 'Register', 'Nickname:', 'Tên hiển thị', 'Email:', 'Email đang sử dụng', 'Password:', 'Mật khẩu', 'email + password', 'Spam/Junk', 'PTE Intensive – Học là đậu!']) {
  assert.ok(accountHtml.includes(text), `Missing account guide text: ${text}`);
}
assert.match(accountHtml, /href="https:\/\/www\.apeuni\.com\/pte\/login" target="_blank" rel="noopener noreferrer"/);
assert.ok(pageHtml.includes(accountHtml), 'Page should render the full account guide');
assert.ok(pageHtml.indexOf('id="apeuni-account-guide-title"') < pageHtml.indexOf('id="homework-guide-title"'));
const ZoomGuide = load('app/dashboard/components/ZoomGuide.tsx').default;
const zoomHtml = renderToStaticMarkup(React.createElement(ZoomGuide));
assert.match(zoomHtml, /aria-labelledby="zoom-guide-title"/);
assert.equal((zoomHtml.match(/<h3 class="font-semibold text-gray-900">Bước /g) || []).length, 6);
assert.equal((zoomHtml.match(/<li[ >]/g) || []).length, 39, 'Zoom guide should preserve all step lists and six notes');
for (const text of ['Hướng dẫn cài đặt Zoom để học', 'Zoom Workplace', 'Windows', 'MacBook', 'iPhone/iPad', 'Điện thoại Android', 'Meeting ID:', 'Passcode:', 'Speaker:', 'Microphone:', 'Họ tên + Target PTE', 'An Doan PTE79', 'Nguyen Minh Hang PTE65', 'Tran Van A PTE50', 'Samsung', 'User', '5–10 phút', 'Tắt microphone khi không cần phát biểu.', 'Nếu gặp lỗi kỹ thuật, chụp màn hình và gửi cho giáo viên hoặc bộ phận hỗ trợ.', 'PTE Intensive – Học là đậu!']) {
  assert.ok(zoomHtml.includes(text), `Missing Zoom guide text: ${text}`);
}
assert.match(zoomHtml, /href="https:\/\/zoom\.us\/download" target="_blank" rel="noopener noreferrer"/);
assert.ok(pageHtml.includes(zoomHtml), 'Page should render the complete Zoom guide');
assert.ok(pageHtml.indexOf('id="zoom-guide-title"') < pageHtml.indexOf('id="apeuni-account-guide-title"'));
const SubmissionGuide = load('app/dashboard/components/SubmissionGuide.tsx').default;
const submissionHtml = renderToStaticMarkup(React.createElement(SubmissionGuide));
assert.match(submissionHtml, /aria-labelledby="submission-guide-title"/);
assert.equal((submissionHtml.match(/<h3 class="font-semibold text-gray-900">Bước /g) || []).length, 4);
assert.equal((submissionHtml.match(/<li[ >]/g) || []).length, 12, 'Four steps, three rules and five notes');
for (const text of ['Hướng dẫn nộp bài tập', 'My Learning', 'Navigation', 'Nộp bài mới', 'Mỗi bài tập tương ứng với 1 link ApeUni.', 'nhiều bài tập cùng lúc', 'một dòng riêng biệt', 'Không dán nhiều link chung trên cùng một dòng.', 'Nộp 3 bài', 'Nếu nộp sai link hoặc gặp lỗi, liên hệ giáo viên hoặc bộ phận hỗ trợ.', 'PTE Intensive – Học là đậu!']) {
  assert.ok(submissionHtml.includes(text), `Missing submission guide text: ${text}`);
}
assert.ok(submissionHtml.includes('Link bài Read Aloud\nLink bài Repeat Sentence\nLink bài Write From Dictation'), 'Example links must be on separate lines');
assert.match(submissionHtml, /href="https:\/\/mylearning\.pteintensive\.com\/dashboard" target="_blank" rel="noopener noreferrer"/);
assert.ok(pageHtml.includes(submissionHtml), 'Page should render the full submission guide');
assert.ok(pageHtml.indexOf('id="homework-guide-title"') < pageHtml.indexOf('id="submission-guide-title"'));
const navigation = fs.readFileSync(path.join(root, 'app/components/Navigation.tsx'), 'utf8');
const CopyLinkGuide = load('app/dashboard/components/ApeUniCopyLinkGuide.tsx').default;
const copyLinkHtml = renderToStaticMarkup(React.createElement(CopyLinkGuide));
assert.match(copyLinkHtml, /aria-labelledby="apeuni-copy-link-guide-title"/);
assert.equal((copyLinkHtml.match(/<h3 class="font-semibold text-gray-900">Bước /g) || []).length, 6);
assert.equal((copyLinkHtml.match(/<li[ >]/g) || []).length, 11, 'Six steps and five notes');
for (const text of ['Hướng dẫn copy link bài tập từ ApeUni', 'Read Aloud', 'Speaking', 'Submit', 'AI Score', 'Score Info', 'Share', 'Copy Link', 'Tóm tắt thao tác', 'Chọn dạng bài → Ghi âm → Submit → AI Score → Score Info → Share → Copy Link', '10 bài', 'Không copy link của trang danh sách bài tập.', 'Score Info → Share → Copy Link', 'Nộp bài tập', 'My Learning', 'PTE Intensive – Học là đậu!']) {
  assert.ok(copyLinkHtml.includes(text), `Missing copy link guide text: ${text}`);
}
assert.ok(pageHtml.includes(copyLinkHtml), 'Page should render the complete copy link guide');
assert.ok(pageHtml.indexOf('id="homework-guide-title"') < pageHtml.indexOf('id="apeuni-copy-link-guide-title"'));
assert.ok(pageHtml.indexOf('id="apeuni-copy-link-guide-title"') < pageHtml.indexOf('id="submission-guide-title"'));
const studentNav = navigation.slice(navigation.indexOf('case "student":'), navigation.indexOf('case "assistant":'));
assert.match(studentNav, /href: "\/dashboard\/guides", label: "Hướng dẫn"/);
assert.equal((navigation.match(/mainItems\.map/g) || []).length, 2, 'Desktop and mobile should both render the main navigation');
const WfdGuide = load('app/dashboard/components/WfdGuide.tsx').default;
const wfdHtml = renderToStaticMarkup(React.createElement(WfdGuide));
assert.ok(pages[5].includes(wfdHtml), 'WFD topic should render its complete guide');
assert.equal((wfdHtml.match(/<h3 class="font-semibold text-gray-900">[1-5]\. /g) || []).length, 5);
for (const text of ['Hướng dẫn học bộ tủ WFD', '2 Topic', 'Mỗi câu WFD phải chép 5 lần.', 'nghĩa tiếng Việt của từng câu', 'Cách 1: Chép tay', 'Cách 2: Đánh máy', 'chụp hình bài viết tay và gửi vào nhóm học', 'chụp màn hình kết quả và gửi vào nhóm học', 'Mỗi câu phải chép hoặc đánh máy 5 lần.', 'Topic giáo viên giao', 'a / an / the', '-s', '-ed', 'PTE Intensive – Học là đậu!']) {
  assert.ok(wfdHtml.includes(text), `Missing WFD guide text: ${text}`);
}
assert.match(wfdHtml, /href="https:\/\/study\.pteintensive\.com\/writefromdictation" target="_blank" rel="noopener noreferrer"/);
assert.equal((wfdHtml.match(/<li[ >]/g) || []).length, 50, 'WFD guide retains all sections, methods and notes');
console.log('PASS: six topic URLs, WFD content and external link, one guide per page, active navigation, previous/next, fallback, unique IDs and existing content preserved.');