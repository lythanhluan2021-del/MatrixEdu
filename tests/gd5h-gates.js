// GĐ5h gates — thống nhất "Sinh đề" -> "Soạn đề" (UI-30), xóa lối tắt
// Bước 2 -> Bước 4 (UI-30), ẩn ID thư mục Drive khỏi ô nhập (UI-31),
// nút "Xóa tất cả DS" có xác nhận + tách biệt trực quan (UI-32), nhãn nút
// đầu trang ổn định theo /api/auth/status (UI-33).
// Run: node tests/gd5h-gates.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// HTML sau khi bỏ comment (HTML <!-- -->, JS // và /* */) — các ghi chú
// GĐ5h nhắc tên cũ không tính là nhãn hiển thị.
const noComments = html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
// Thân một hàm JS: từ "function NAME(" tới dòng "    }" đầu tiên sau đó.
function fnBody(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) return null;
  const after = html.slice(start);
  const end = after.indexOf('\n    }');
  return end < 0 ? null : after.slice(0, end);
}
function fnCode(name) {
  const b = fnBody(name);
  if (b === null) return null;
  return b.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}
const step2 = html.slice(html.indexOf('<section id="step-2"'), html.indexOf('<section id="step-3"'));
const step3 = html.slice(html.indexOf('<section id="step-3"'), html.indexOf('<section id="step-4"'));
const step4 = html.slice(html.indexOf('<section id="step-4"'), html.indexOf('<section id="step-5"'));
const step7 = html.slice(html.indexOf('<section class="step-card glass-zone-step-7'));

console.log('GĐ5h gates:');

// --- UI-30. Thống nhất thuật ngữ "Soạn đề" ---
check('UI-30 không còn "Sinh đề" trong nhãn/hướng dẫn hiển thị (ngoài comment)',
  !noComments.includes('Sinh đề'), 'còn chuỗi "Sinh đề" ngoài comment');
check('UI-30 không còn "sinh đề" thường trong chuỗi hiển thị (ngoài comment)',
  !noComments.toLowerCase().includes('sinh đề'), 'còn chuỗi "sinh đề" ngoài comment');
check('UI-30 sidebar Bước 4: "Soạn đề & Mã đề"',
  html.includes('<div class="step-desc">Soạn đề &amp; Mã đề</div>'),
  'sidebar vẫn ghi Sinh đề');
check('UI-30 nút hành động Bước 4 là "Soạn đề" và vẫn gọi runStep4GenerateExam',
  /onclick="runStep4GenerateExam\(\)"[^>]*>[\s\S]{0,600}?Soạn đề/.test(html),
  'nút Bước 4 mất nhãn Soạn đề hoặc mất handler');
check('UI-30 thẻ 3 bước: "1. Soạn đề"; dải vàng: Hãy nhấn "Soạn đề".',
  html.includes("title: '1. Soạn đề'") && html.includes('Hãy nhấn "Soạn đề".'),
  'thẻ/dải vàng chưa đổi');
check('UI-30 Bước 5 tham chiếu "Bước 4 (Soạn & Trộn đề)" (2 chỗ)',
  (html.match(/Bước 4 \(Soạn &amp; Trộn đề\)/g) || []).length === 2
  && !html.includes('Bước 4 (Soạn &amp; Trộn Sinh đề)'),
  'tham chiếu Bước 5 chưa đổi hết');
check('UI-30 tiêu đề Bước 4 vẫn "Soạn & Trộn đề"; "Trộn mã đề" giữ nguyên',
  html.includes('title="Bước 4: Soạn & Trộn đề"') && html.includes('Trộn mã đề'),
  'tiêu đề Bước 4 hoặc Trộn mã đề bị đổi nhầm');

// --- UI-30. Xóa lối tắt Bước 2 -> Bước 4 ---
check('UI-30 hàm confirmStep2AndGoStep4 đã xóa',
  !html.includes('function confirmStep2AndGoStep4('), 'hàm lối tắt còn tồn tại');
check('UI-30 không còn lời gọi confirmStep2AndGoStep4() trong HTML',
  !html.includes('confirmStep2AndGoStep4()'), 'còn nút gọi hàm lối tắt');
check('UI-30 footer Bước 2 chỉ đi tiếp Bước 3 (không tắt Bước 4)',
  step2.includes('onclick="goToStep(1)"') && step2.includes('onclick="confirmStep2AndGoStep3()"')
  && !step2.includes('confirmStep2AndGoStep4'),
  'footer Bước 2 còn lối tắt hoặc mất đường về Bước 3');
check('UI-30 footer Bước 2: nút "Bước 3: Đặc tả →" là primary duy nhất',
  /class="btn btn-primary btn-lg" onclick="confirmStep2AndGoStep3\(\)"/.test(step2)
  && (step2.match(/<div class="step-footer">[\s\S]*?<\/div>\s*<\/div>/)
    || [''])[0].split('btn-primary').length - 1 === 1,
  'footer Bước 2 thiếu primary hoặc có hơn 1 primary');
check('UI-30 footer Bước 3 vẫn đi Bước 4 ("Bước 4: Soạn đề →")',
  step3.includes('onclick="confirmStep3AndGoStep4()"') && step3.includes('Bước 4: Soạn đề →'),
  'footer Bước 3 mất đường sang Bước 4');

// --- UI-31. Ẩn ID thư mục Drive khỏi ô nhập ---
const FOLDER_ID = '1MbQqovIMutXQP-qDRqehjAeRZzVqojF-';
const inputTag = html.slice(html.indexOf('id="gdrive-folder-url"') - 200, html.indexOf('id="gdrive-folder-url"') + 400);
check('UI-31 ô nhập hiển thị dạng rút gọn, không còn ID đầy đủ trong value',
  inputTag.includes('value="drive.google.com/drive/folders/1MbQ…ojF-"')
  && !inputTag.includes(FOLDER_ID),
  'ô nhập vẫn hiện URL đầy đủ');
check('UI-31 có nút "Đổi thư mục" gọi editDriveFolderUrl()',
  html.includes('onclick="editDriveFolderUrl()"') && html.includes('>Đổi thư mục</button>'),
  'thiếu nút Đổi thư mục');
check('UI-31 có các helper mask/get/resolve/edit + hằng URL mặc định',
  html.includes('function maskDriveFolderUrl(') && html.includes('function getDriveFolderUrl(')
  && html.includes('function resolveDriveFolderUrlFromInput(')
  && html.includes('function editDriveFolderUrl(')
  && html.includes('const DEFAULT_DRIVE_FOLDER_URL = '),
  'thiếu helper');
check('UI-31 maskDriveFolderUrl rút gọn đúng (4 đầu + … + 4 cuối)',
  (() => {
    try {
      const src = html.slice(html.indexOf('function maskDriveFolderUrl'));
      const body = src.slice(0, src.indexOf('\n    }') + 6);
      const sandbox = {};
      vm.runInNewContext(body + '\nthis.__m = maskDriveFolderUrl;', sandbox);
      return sandbox.__m('https://drive.google.com/drive/folders/' + FOLDER_ID + '?usp=sharing')
        === 'drive.google.com/drive/folders/1MbQ…ojF-';
    } catch (e) { return false; }
  })(), 'mask sai định dạng');
check('UI-31 resolve chỉ nhận link đầy đủ, không gửi dạng rút gọn',
  (() => {
    const code = fnCode('resolveDriveFolderUrlFromInput');
    return code !== null
      && code.includes('typed !== maskDriveFolderUrl(current)')
      && code.includes('return current;');
  })(), 'resolve không phân biệt link mới với dạng rút gọn');
check('UI-31 connectAndScan + syncDriveBankNow đọc URL qua resolver',
  fnCode('connectAndScanGoogleDriveBank') !== null
  && fnCode('connectAndScanGoogleDriveBank').includes('resolveDriveFolderUrlFromInput()')
  && fnCode('syncDriveBankNow') !== null
  && fnCode('syncDriveBankNow').includes('resolveDriveFolderUrlFromInput()'),
  'quét/đồng bộ vẫn đọc thẳng ô nhập');
check('UI-31 syncOmrToGoogleDrive + renderDriveBankReport đọc URL thật từ state',
  fnCode('syncOmrToGoogleDrive') !== null
  && fnCode('syncOmrToGoogleDrive').includes('getDriveFolderUrl()')
  && /const folderUrl = data\.folderUrl \|\| getDriveFolderUrl\(\);/.test(html),
  'còn chỗ đọc URL từ ô nhập đã mask');
check('UI-31 initDriveBankStatus lưu URL thật vào state, ô nhập chỉ hiện rút gọn',
  (() => {
    const code = fnCode('initDriveBankStatus');
    return code !== null
      && code.includes('window.__mxDriveFolderUrl = data.folderUrl')
      && code.includes('maskDriveFolderUrl(data.folderUrl)')
      && !code.includes('urlInput.value = data.folderUrl');
  })(), 'init vẫn ghi URL đầy đủ vào ô nhập');

// --- UI-32. Nút xóa toàn bộ danh sách học sinh ---
check('UI-32 không có nút nào mang nhãn "Xóa học sinh" ở đầu trang Bước 7',
  !step7.includes('Xóa học sinh'), 'còn nhãn "Xóa học sinh" ở Bước 7');
check('UI-32 nút "Xóa tất cả DS" là btn-danger (tách biệt với nút lành)',
  /<button class="btn btn-danger btn-sm" onclick="clearAllOmrRostersFromModal\(\)"/.test(html),
  'nút xóa vẫn dùng btn-secondary như nút lành');
check('UI-32 clearAllOmrRostersFromModal có hộp xác nhận trước khi xóa',
  (() => {
    const code = fnCode('clearAllOmrRostersFromModal');
    return code !== null && code.includes("if (!confirm('Xóa sạch toàn bộ Danh sách lớp đang lưu")
      && code.includes('/api/omr/rosters/clear');
  })(), 'xóa không có confirm hoặc không gọi API xóa');
check('UI-32 nút xóa nằm trong mục danh sách lớp (không đặt cạnh nút xuất)',
  html.indexOf('onclick="clearAllOmrRostersFromModal()"') > html.indexOf('Danh sách Học sinh đang áp dụng'),
  'nút xóa không nằm trong mục danh sách');

// --- UI-33. Nhãn nút đầu trang ổn định ---
const authBtn = html.slice(html.indexOf('id="auth-header-btn"'), html.indexOf('id="auth-header-btn"') + 400);
check('UI-33 nhãn tĩnh nút đầu trang vẫn "Quản trị" (trung lập)',
  /Quản trị/.test(authBtn) && !/> Đăng nhập</.test(authBtn) && !/> Đặt mật khẩu</.test(authBtn),
  'nhãn tĩnh đổi thành Đăng nhập/Đặt mật khẩu');
check('UI-33 openAuthModal đợi trạng thái im lặng, không chạm nút đầu trang',
  (() => {
    const code = fnCode('openAuthModal');
    return code !== null
      && /if \(!window\.__mxAuthKnown\)\s*\{\s*await fetchAuthStatusFlags\(\);/.test(code)
      && !code.includes('checkAuthStatus()') && !code.includes('updateAuthHeaderBtn');
  })(), 'openAuthModal vẫn gọi checkAuthStatus/cập nhật nút');
check('UI-33 closeModal không chạm trạng thái đăng nhập',
  (() => {
    const code = fnCode('closeModal');
    return code !== null && !code.includes('checkAuthStatus')
      && !code.includes('updateAuthHeaderBtn') && !code.includes('fetchAuthStatusFlags');
  })(), 'closeModal vẫn cập nhật trạng thái');
check('UI-33 updateAuthHeaderBtn chỉ gọi từ checkAuthStatus / đăng nhập / đăng xuất',
  (() => {
    const calls = [...html.matchAll(/updateAuthHeaderBtn\(\);/g)].map(m => m.index);
    if (calls.length !== 3) return false;
    const owners = calls.map(idx => {
      const before = html.slice(0, idx);
      const all = [...before.matchAll(/function (checkAuthStatus|submitAuthForm|logoutAdmin)\(/g)];
      return all.length ? all[all.length - 1][1] : null;
    }).sort();
    return JSON.stringify(owners) === JSON.stringify(['checkAuthStatus', 'logoutAdmin', 'submitAuthForm']);
  })(), 'updateAuthHeaderBtn còn gọi từ chỗ khác');
check('UI-33 __mxAuthKnown khởi tạo false, bật true sau lần lấy trạng thái',
  html.includes('window.__mxAuthKnown = false;')
  && (html.match(/window\.__mxAuthKnown = true;/g) || []).length === 2,
  'thiếu cờ __mxAuthKnown');

console.log(`\nGĐ5h gates: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) { console.log('Failed: ' + failures.join(', ')); process.exit(1); }
