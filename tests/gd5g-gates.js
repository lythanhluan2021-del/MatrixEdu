// GĐ5g gates — nút chuyển bước chỉ chuyển trang (UI-25), hết toast tự
// hiện (UI-24), toast trong luồng trang (UI-26), 1.1 bốn cột (UI-28),
// tên ngân hàng gọn + ẩn ID thư mục (UI-27), nút Quản trị nhất quán
// (UI-29), độ tương phản, 1.2 gọn, một thông báo ngân hàng trống,
// thẻ trạng thái Bước 4/5, một cặp nút xoay, hai nút Xuất Excel,
// OMR sửa "Bước 1" → "Bước 7", xác minh mẫu OMR 3code dùng chung
// tờ phiếu 4 số là đúng hình học (không phải chép nhầm).
// Run: node tests/gd5g-gates.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// CSS lấy theo cùng cách của gd5d/gd5f (có 2 khối <style> + một comment
// trong CSS chứa chuỗi "<style>" nên phải dùng regex, không split()).
const allCss = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
// Thân một hàm JS: từ "function NAME(" tới dòng "    }" đầu tiên sau đó.
function fnBody(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) return null;
  const after = html.slice(start);
  const end = after.indexOf('\n    }');
  return end < 0 ? null : after.slice(0, end);
}
// Thân hàm sau khi bỏ hết comment (các ghi chú GĐ5g nhắc tên hàm cũ).
function fnCode(name) {
  const b = fnBody(name);
  if (b === null) return null;
  return b.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

console.log('GĐ5g gates:');

// --- A1. #step1-status-msg không còn nằm trong #gdrive-scan-report ---
// Ranh giới: comment GĐ5g nằm ngay sau thẻ đóng của report box và trước
// ô msg (em ruột, không phải con) — slice từ đầu report tới comment.
const reportStart = html.indexOf('id="gdrive-scan-report"');
const gd5gNote = html.indexOf('<!-- GĐ5g (UI-24): ô thông báo tải/phân tích');
const reportSlice = html.slice(reportStart, gd5gNote);
check('UI-24 #step1-status-msg KHÔNG nằm trong #gdrive-scan-report',
  gd5gNote > reportStart && !reportSlice.includes('id="step1-status-msg"')
  && html.indexOf('id="step1-status-msg"') > gd5gNote,
  'msg div vẫn là con của report box');
const step2 = html.slice(html.indexOf('<section id="step-2"'), html.indexOf('<section id="step-3"'));
check('UI-24 #step1-status-msg vẫn ở trong Bước 2 (anh em sau report box)',
  step2.includes('id="step1-status-msg"'), 'msg div biến mất khỏi Bước 2');

// Null-guard ở mọi chỗ ghi innerHTML vào msgBox.
const guarded = (html.match(/if \(msgBox\) msgBox\.innerHTML/g) || []).length;
check('UI-24 runStep1Analysis + handler tải file đều guard msgBox (3 chỗ)',
  guarded >= 3, `tìm thấy ${guarded} chỗ guard`);
check('UI-24 renderDetectedMatrixPreview guard box null',
  /function renderDetectedMatrixPreview[\s\S]{0,300}?if \(!box\) return;/.test(html),
  'không có if (!box) return;');

// --- A2. Nút chuyển bước chỉ chuyển trang ---
const navFns = ['confirmStep1AndGoStep2', 'confirmStep2AndGoStep3', 'confirmStep3AndGoStep4', 'confirmStep2AndGoStep4', 'confirmStep4AndGoStep5'];
for (const fn of navFns) {
  const code = fnCode(fn);
  check(`UI-25 ${fn} chỉ gọi goToStep (không fetch/phân tích/sinh đề/toast)`,
    code !== null
    && code.includes('goToStep(')
    && !/runStep|runQaValidationNow|fetch\(|showToast|await/.test(code),
    code === null ? 'không tìm thấy hàm' : 'hàm vẫn gọi tác vụ phụ');
}
check('UI-25 không còn nhãn "Bước 4: Sinh đề →" trên nút chuyển bước',
  !html.includes('Bước 4: Sinh đề →'), 'nhãn cũ còn sót');
check('UI-25 nút chuyển bước mang nhãn đúng hành vi mới',
  html.includes('Bước 4: Soạn đề →') && html.includes('Bước 4 →'),
  'thiếu "Bước 4: Soạn đề →" hoặc "Bước 4 →"');
// Các nút hành động trong bước vẫn tồn tại (người dùng bấm tay mới chạy).
check('UI-25 nút "Sinh đề" trong Bước 4 vẫn gọi runStep4GenerateExam',
  /onclick="runStep4GenerateExam\(\)"[^>]*>[\s\S]{0,200}?Sinh đề/.test(html) || html.includes('onclick="runStep4GenerateExam()"'),
  'mất nút Sinh đề trong bước');
check('UI-25 nút "Đồng bộ Ma trận" ở Bước 3 vẫn gọi runStep3GenerateSpec',
  html.includes('onclick="runStep3GenerateSpec()"'), 'mất nút Đồng bộ Ma trận');
check('UI-25 nút "Phân tích" ở 1.2 vẫn gọi runStep1Analysis',
  html.includes('onclick="runStep1Analysis()"'), 'mất nút Phân tích');

// --- A3. Toast trong luồng trang, không che nút ---
const toastDivIdx = html.indexOf('id="toast-container"');
const contentIdx = html.indexOf('class="content-container"');
const step1Idx = html.indexOf('<section id="step-1"');
check('UI-26 #toast-container nằm trong .content-container (trước Bước 1)',
  toastDivIdx > contentIdx && toastDivIdx < step1Idx,
  'toast-container không ở trong content-container');
const toastCss = (allCss.match(/#toast-container \{[^}]*\}/g) || []).join(' ');
check('UI-26 CSS toast không dùng position: fixed',
  !/position:\s*fixed/.test(toastCss), 'toast vẫn fixed');
check('UI-26 CSS toast có :empty { display: none; }',
  /#toast-container:empty\s*\{\s*display:\s*none;?\s*\}/.test(allCss),
  'thiếu quy tắc ẩn khi rỗng');
check('UI-26 showToast vẫn giới hạn tối đa 3 toast, tự ẩn 4.2s',
  /while \(container\.children\.length >= 3\) container\.firstChild\.remove\(\)/.test(html) && /setTimeout\(\(\) => el\.remove\(\), 4200\)/.test(html),
  'giới hạn số lượng/thời gian toast thay đổi');

// --- B4. 1.2 gọn, không còn khoảng trắng chết ---
check('UI-24 .bank-sources align-items: start (không stretch)',
  /\.bank-sources \{[^}]*align-items:\s*start/.test(allCss), 'bank-sources vẫn stretch');
check('UI-24 .upload-zone-row không còn flex: 1',
  !/\.upload-zone-row \{[^}]*flex:\s*1/.test(allCss), 'upload-zone-row vẫn flex: 1');
check('UI-24 #uploaded-files-list:empty { display: none; }',
  /#uploaded-files-list:empty\s*\{\s*display:\s*none;?\s*\}/.test(allCss),
  'thiếu quy tắc ẩn danh sách rỗng');

// --- B5. Chỉ một thông báo ngân hàng trống ---
check('UI-24 pill "ĐÃ QUÉT: 0 TỆP — NGÂN HÀNG TRỐNG" đã bỏ',
  !html.includes('ĐÃ QUÉT: 0 TỆP — NGÂN HÀNG TRỐNG</span>'),
  'pill trùng ý còn sót');
check('UI-24 dải vàng "Ngân hàng đang trống" là thông báo duy nhất khi trống',
  /Ngân hàng đang trống:<\/strong> chưa có câu hỏi nào/.test(html),
  'mất dải vàng hướng dẫn hành động');
check('UI-24 pill xanh "ĐÃ ĐỒNG BỘ N TỆP WORD" vẫn giữ khi có dữ liệu',
  /ĐÃ ĐỒNG BỘ \$\{files\} TỆP WORD/.test(html), 'mất pill đồng bộ khi có dữ liệu');

// --- B6. "Chưa đồng bộ" đủ chỗ ở đầu trang hẹp ---
// #autosave-text nằm trong badge: từ đầu badge tới lần đóng kép đầu
// tiên "</span></span>" (đóng span text + đóng span badge) phải chứa nó.
// (Kiểm tra cũ sai: span chấm tròn cũng có </span> trước autosave-text.)
const badgeStart = html.indexOf('id="session-autosave-badge"');
const badgeClose = html.indexOf('</span></span>', badgeStart);
const badgeHtml = badgeClose > 0 ? html.slice(badgeStart, badgeClose) : '';
check('UI-24 #autosave-text nằm TRONG #session-autosave-badge',
  badgeHtml.includes('id="autosave-text"') && badgeHtml.includes('Tự động sao lưu'),
  'autosave-text vẫn là span ngoài badge');
check('UI-24 .autosave-badge white-space: nowrap',
  /\.autosave-badge \{[^}]*white-space:\s*nowrap/.test(allCss),
  'thiếu nowrap trên autosave-badge');

// --- B7. 1.1 bốn cột ở màn hình rộng ---
const base4 = (allCss.match(/#step-1 \.meta-grid \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/g) || []).length;
check('UI-28 đúng MỘT quy tắc gốc #step-1 .meta-grid 4 cột',
  base4 === 1, `tìm thấy ${base4} quy tắc 4 cột`);
check('UI-28 không còn quy tắc gốc 2 cột repeat(2, 1fr) cho #step-1 .meta-grid',
  !/#step-1 \.meta-grid \{[^}]*repeat\(2, 1fr\)/.test(allCss),
  'quy tắc 2 cột cũ còn sót');
check('UI-28 media 1280px vẫn về 2 cột, 768px về 1 cột',
  /@media \(max-width: 1280px\)[\s\S]{0,200}?#step-1 \.meta-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(allCss)
  && /@media \(max-width: 768px\)[\s\S]{0,200}?#step-1 \.meta-grid \{ grid-template-columns: 1fr/.test(allCss),
  'media query 1.1 thay đổi');

// --- B8. Tên ngân hàng gọn, không lặp ngoặc ---
const shortSrc = html.slice(html.indexOf('function shortBankName'));
const shortBody = shortSrc.slice(shortSrc.indexOf('{') + 1, shortSrc.indexOf('\n    }'));
let shortBankName = null;
try { shortBankName = new Function('folderName', shortBody); } catch (e) { /* báo ở gate dưới */ }
check('UI-27 shortBankName("Ngân hàng câu hỏi Tin học THPT (Google Drive)") = "Tin học THPT"',
  shortBankName !== null && shortBankName('Ngân hàng câu hỏi Tin học THPT (Google Drive)') === 'Tin học THPT',
  shortBankName === null ? 'không trích được hàm' : `trả về ${JSON.stringify(shortBankName('Ngân hàng câu hỏi Tin học THPT (Google Drive)'))}`);
check('UI-27 shortBankName("Ngân hàng câu hỏi Toán THPT - Google Drive") = "Toán THPT"',
  shortBankName !== null && shortBankName('Ngân hàng câu hỏi Toán THPT - Google Drive') === 'Toán THPT',
  'hàm không xử lý hậu tố "- Google Drive"');
check('UI-27 tiêu đề modal dùng shortBankName, không ghép lồng ngoặc',
  /modalTitle\.textContent = `NGÂN HÀNG CÂU HỎI \(\$\{shortBankName\(data\.folderName\)\.toUpperCase\(\)\}\)`/.test(html)
  && !html.includes('NGÂN HÀNG CÂU HỎI GOOGLE DRIVE (${'),
  'tiêu đề modal vẫn ghép lồng ngoặc');
// Chỉ kiểm tra DÒNG gán (ghi chú GĐ5g trong file vẫn trích công thức cũ
// để giải thích, nên không được kiểm tra "không còn chuỗi cũ" trên toàn file).
const badgeLine = (html.split('\n').find(l => l.includes('step4Badge.textContent = ')) || '');
check('UI-27 badge Bước 4 dùng displayBankName, không còn "của Thầy/Cô (... - ...)"',
  /step4Badge\.textContent = `\$\{folderName\} \(\$\{total\} câu hỏi gốc\)`/.test(badgeLine)
  && !badgeLine.includes('của Thầy/Cô'),
  `dòng badge hiện tại: ${badgeLine.trim().slice(0, 120)}`);

// --- B9. ID thư mục Drive không phô trong chuỗi hiển thị ---
const folderId = '1MbQqovIMutXQP-qDRqehjAeRZzVqojF-';
const idLines = html.split('\n').filter(l => l.includes(folderId));
check('UI-27 ID thư mục chỉ xuất hiện trong URL drive.google.com/drive/folders/',
  idLines.length > 0 && idLines.every(l => l.includes('drive.google.com/drive/folders/')),
  idLines.length === 0 ? 'ID biến mất hoàn toàn (kể cả URL mặc định)' : `dòng không phải URL: ${idLines.filter(l => !l.includes('drive.google.com/drive/folders/')).slice(0, 2).join(' | ')}`);
check('UI-27 phụ đề modal tĩnh không còn ID (chỉ ghi "Bóc tách từ thư mục Google Drive")',
  html.includes('Bóc tách từ thư mục Google Drive'),
  'phụ đề tĩnh vẫn chứa ID');

// --- B10. Mẫu OMR 3code dùng chung tờ phiếu 4 số là đúng hình học ---
const { OMR_TEMPLATES } = require('../src/omr-templates.js');
const t4 = OMR_TEMPLATES.find(t => t.id === 'bgd_2025_4code');
const t3 = OMR_TEMPLATES.find(t => t.id === 'bgd_2025_3code');
// Hình học nằm trong t.coords (sbd/code/part1/part2/part3); so sánh mọi
// thứ TRỪ numCols của cột mã (đó chính là điểm khác duy nhất có chủ đích).
function geom(t) {
  const { numCols, ...codeRest } = t.coords.code;
  return {
    width: t.width, height: t.height,
    fiducials: t.fiducials, timingMarks: t.timingMarks,
    sbd: t.coords.sbd, part1: t.coords.part1, part2: t.coords.part2, part3: t.coords.part3,
    code: codeRest
  };
}
check('UI-24 hình học 3code ≡ 4code (khổ, fiducial, timing, SBD, 3 phần, cột mã trừ numCols)',
  t4 && t3 && JSON.stringify(geom(t4)) === JSON.stringify(geom(t3)),
  'hình học khác nhau — không được dùng chung file');
check('UI-24 chỉ khác số cột mã: 3code numCols=3 / codeDigits=3, 4code numCols=4 / codeDigits=4',
  t4 && t3 && t4.coords.code.numCols === 4 && t3.coords.code.numCols === 3
  && t4.codeDigits === 4 && t3.codeDigits === 3,
  `4code=${JSON.stringify(t4 && t4.coords.code)} 3code=${JSON.stringify(t3 && t3.coords.code)}`);
const tplDir = fs.readdirSync(path.join(root, 'data', 'omr_templates'));
check('UI-24 không tồn tại file ảnh/tờ phiếu riêng cho 3 số (không bịa đường dẫn)',
  !tplDir.some(f => /3code|3[_-]so|3\s*số/i.test(f)),
  `có file 3 số: ${tplDir.filter(f => /3code|3[_-]so/i.test(f)).join(', ')}`);

// --- B11. Nút Quản trị nhất quán ---
const authBtn = html.slice(html.indexOf('id="auth-header-btn"'), html.indexOf('id="auth-header-btn"') + 400);
check('UI-29 nhãn tĩnh nút đầu trang là "Quản trị" (trung lập, không nhấp nháy)',
  /Quản trị/.test(authBtn) && !/> Đăng nhập</.test(authBtn) && !/> Đặt mật khẩu</.test(authBtn),
  'nhãn tĩnh vẫn là Đăng nhập/Đặt mật khẩu');
check('UI-29 openAuthModal đợi /api/auth/status nếu trạng thái chưa biết',
  /async function openAuthModal\(\) \{[\s\S]{0,300}?if \(window\.__mxAuthSetup === undefined\) \{[\s\S]{0,80}?await checkAuthStatus\(\)/.test(html),
  'openAuthModal mở ngay không đợi trạng thái');

// --- B12. Độ tương phản dòng "Không tìm thấy câu hỏi phù hợp" ---
check('UI-24 dòng trống dùng var(--mx-ink-2) (~5,5:1), không dùng var(--mx-line)',
  /Không tìm thấy câu hỏi phù hợp với bộ lọc hiện tại\.<\/div>`/.test(html)
  && html.includes('color: var(--mx-ink-2)">Không tìm thấy câu hỏi phù hợp')
  && !html.includes('color: var(--mx-line)">Không tìm thấy câu hỏi phù hợp'),
  'dòng trống vẫn màu --mx-line');

// --- B13. Thẻ trạng thái Bước 4 / Bước 5 ---
check('UI-24 #step4-process-card tồn tại trong Bước 4',
  html.slice(html.indexOf('<section id="step-4"'), html.indexOf('<section id="step-5"')).includes('id="step4-process-card"'),
  'thiếu div step4-process-card');
check('UI-24 renderStep4ProcessCard() được gọi từ renderExamStep()',
  fnCode('renderExamStep') !== null && fnCode('renderExamStep').includes('renderStep4ProcessCard()'),
  'renderExamStep không gọi renderStep4ProcessCard');
check('UI-24 #step5-overview tồn tại ở đầu Bước 5',
  html.slice(html.indexOf('<section id="step-5"'), html.indexOf('<section id="step-6"')).includes('id="step5-overview"'),
  'thiếu div step5-overview');
check('UI-24 renderStep5Overview() được gọi từ renderAnswerAndQaStep()',
  fnCode('renderAnswerAndQaStep') !== null && fnCode('renderAnswerAndQaStep').includes('renderStep5Overview()'),
  'renderAnswerAndQaStep không gọi renderStep5Overview');
check('UI-24 thẻ trạng thái chỉ dùng số liệu thật từ appState (không bịa)',
  /renderStep4ProcessCard[\s\S]{0,2000}?appState\.questions/.test(html)
  && /renderStep5Overview[\s\S]{0,2000}?appState\.qaReport/.test(html),
  'thẻ trạng thái không đọc appState');

// --- B14. Một cặp nút xoay ---
const rot180 = (html.match(/rotateActiveOmrPaper\(180\)/g) || []).length;
const rot90 = (html.match(/rotateActiveOmrPaper\(90\)/g) || []).length;
check('UI-24 đúng 1 cặp rotateActiveOmrPaper(180)/(90) — cặp ở cụm nổi đã bỏ',
  rot180 === 1 && rot90 === 1, `180°: ${rot180} lần, 90°: ${rot90} lần`);

// --- B15. Hai nút "Xuất Excel" ---
const xls = (html.match(/onclick="exportOmrRosterCsv\(\)"/g) || []).length;
check('UI-24 đúng 2 nút "Xuất Excel" (đầu Bước 7 + tab báo cáo, footer đã bỏ)',
  xls === 2, `tìm thấy ${xls} nút`);
const step7Footer = html.slice(html.indexOf('<!-- FOOTER STEP 7 -->'), html.indexOf('<!-- FOOTER STEP 7 -->') + 1200);
check('UI-24 footer Bước 7 không còn nút Xuất Excel',
  !step7Footer.includes('exportOmrRosterCsv()'), 'footer vẫn có Xuất Excel');

// --- B16. OMR: "Bước 1" → "Bước 7" ---
check('UI-24 không còn "Nạp Đ/Á] ở Bước 1" / "(B1)" trong ngữ cảnh OMR',
  !html.includes('Nạp Đ/Á] ở Bước 1') && !html.includes('Cần nạp Đáp án (B1)') && !html.includes('Chờ nạp Đáp án ở Bước 1'),
  'còn tham chiếu Bước 1 sai');
check('UI-24 tham chiếu "Nạp Đ/Á ở Bước 7" hiện diện (≥6 chỗ)',
  (html.match(/Nạp Đ\/Á\] ở Bước 7/g) || []).length >= 6,
  `tìm thấy ${(html.match(/Nạp Đ\/Á\] ở Bước 7/g) || []).length} chỗ`);

console.log(`\nGĐ5g gates: ${pass} pass, ${fail} fail`);
if (fail > 0) { console.log('FAILED: ' + failures.join(', ')); process.exit(1); }
