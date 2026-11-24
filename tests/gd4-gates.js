/**
 * tests/gd4-gates.js — Cổng kiểm tra GĐ4 (P0-10 XSS, P2-01 số liệu ngân hàng,
 * P2-05 trang 404 + tuyến API còn mở).
 *
 * Chạy: node tests/gd4-gates.js
 * Mỗi cổng in PASS/FAIL kèm lý do; thoát 1 nếu có cổng nào rớt.
 *
 * Gồm 3 nhóm:
 *  A. Tĩnh (không cần server): escapeHtml xử lý ', ", <, >, &; mọi điểm
 *     chèn dữ liệu động đã rà soát đều dùng escapeHtml; modal ngân hàng
 *     không còn số hard-code; CSP thắt chặt; quyết định từng tuyến API.
 *  B. Sống (khởi động server thử trên cổng 3194): 404 thân thiện + escape
 *     pathname độc hại, 401 ở 3 tuyến đã khóa, 200 ở các tuyến giữ mở,
 *     upload-doc sau khi đăng nhập vẫn chạy (Bước 2 không bị phá).
 *  C. Dọn dẹp: admin_auth.json thử nghiệm được sao lưu/khôi phục như gd3.
 *
 * Lưu ý về ranh giới phòng thủ: máy chủ LƯU TRỮ dữ liệu thô (tên học sinh,
 * SBD, tên đề...) nguyên vẹn — việc escape xảy ra lúc HIỂN THỊ ở client.
 * Cổng B kiểm chứng vòng lưu trữ thô đó qua /api/profiles, còn cổng A kiểm
 * chứng mọi điểm hiển thị đều escape. Kẻ tấn công không thể chèn mã qua
 * API rồi thấy nó chạy, vì mọi nơi hiển thị đều escape trước khi innerHTML.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const REPO = path.join(__dirname, '..');
const DATA_DIR = path.join(REPO, 'data');
const PORT = 3194;

const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
const serverJs = fs.readFileSync(path.join(REPO, 'server.js'), 'utf8');
const importerJs = fs.readFileSync(path.join(REPO, 'src', 'docx-exam-importer.js'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

// Trích một hàm JS khỏi mã nguồn bằng regex rồi chạy thật bằng eval.
// (Các hàm này không có khối lồng nhau nên regex [^}]* đủ dùng.)
function extractFn(src, fnName) {
  const m = src.match(new RegExp(`function ${fnName}(\\([^)]*\\)) \\{([\\s\\S]*?)\\n\\s*\\}`));
  assert(m, `Không trích được hàm ${fnName}`);
  return new Function('return (function ' + fnName + m[1] + '{' + m[2] + '})')();
}

const ATTACKS = [
  // [đầu vào, chuỗi độc KHÔNG được xuất hiện nguyên vẹn trong đầu ra]
  ['<script>alert(1)</script>', '<script>'],
  ["';alert(1);//", "';alert"],
  ['"><img src=x onerror=alert(1)>', '"><img'],
  ['a & b', 'a & b'],
  ['Nguyễn Văn A', null] // tên thường phải giữ nguyên
];

// ------------------------------------------------------------ HTTP helpers
function httpReq({ method, path: p, body, cookie }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port: PORT, path: p, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, json, raw });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function startServer(port) {
  const child = spawn('node', ['server.js'], {
    cwd: REPO, env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', () => {});
  return child;
}
function stopServer(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} resolve(); }, 5000);
  });
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitHealth(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await httpReq({ method: 'GET', path: '/api/health' });
      if (r.status === 200 && r.json && r.json.ok) return;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error(`Server trên cổng ${PORT} không trả /api/health sau ${timeoutMs}ms`);
}

// ================================================================== MAIN
(async () => {
  console.log('================================================================================');
  console.log(' CỔNG KIỂM TRA GĐ4 (P0-10 XSS, P2-01, P2-05)');
  console.log('================================================================================\n');

  // ------------------------------------------------ A1. escapeHtml client
  console.log('A1 — escapeHtml trong index.html:');
  const escapeHtml = extractFn(html, 'escapeHtml');
  for (const [input, forbidden] of ATTACKS) {
    const out = escapeHtml(input);
    if (forbidden === null) {
      check(`escapeHtml giữ nguyên tên thường "${input}"`, out === input, `ra "${out}"`);
    } else {
      check(`escapeHtml vô hiệu hóa ${JSON.stringify(input)}`, !out.includes(forbidden), `ra "${out}"`);
    }
  }
  check("escapeHtml: ' → &#39;", escapeHtml("a'b") === 'a&#39;b', `ra "${escapeHtml("a'b")}"`);
  check('escapeHtml: " → &quot;', escapeHtml('a"b') === 'a&quot;b', `ra "${escapeHtml('a"b')}"`);
  check('escapeHtml: < > & → &lt; &gt; &amp;', escapeHtml('<a>&') === '&lt;a&gt;&amp;');
  check('escapeHtml: không escape đúp (đầu vào đã có &lt;)', escapeHtml('&lt;') === '&amp;lt;');
  check('escapeHtml: null/undefined → chuỗi rỗng', escapeHtml(null) === '' && escapeHtml(undefined) === '');

  // --------------------------------------- A2. escapeHtml docx-exam-importer
  console.log('\nA2 — escapeHtml trong src/docx-exam-importer.js:');
  const escapeHtmlImp = extractFn(importerJs, 'escapeHtml');
  check("escapeHtml importer: ' → &#39;", escapeHtmlImp("x'y") === 'x&#39;y');
  check('escapeHtml importer: <script> bị vô hiệu', !escapeHtmlImp('<script>alert(1)</script>').includes('<script>'));

  // ------------------------------------------------- A3. safeDriveFolderUrl
  console.log('\nA3 — safeDriveFolderUrl (allowlist link Drive):');
  const safeUrl = extractFn(html, 'safeDriveFolderUrl');
  const FALLBACK = 'https://drive.google.com/drive/folders/1MbQqovIMutXQP-qDRqehjAeRZzVqojF-?usp=sharing';
  check('giữ link Drive chuẩn', safeUrl('https://drive.google.com/drive/folders/1MbQqovIMutXQP-qDRqehjAeRZzVqojF-?usp=sharing') === FALLBACK);
  check('javascript: → fallback', safeUrl('javascript:alert(1)') === FALLBACK);
  check('link chứa dấu " → fallback', safeUrl('https://drive.google.com/drive/folders/abc" onclick="alert(1)') === FALLBACK);
  check('domain lạ → fallback', safeUrl('https://evil.com/drive/folders/abc') === FALLBACK);
  check('thiếu folder id → fallback', safeUrl('https://drive.google.com/drive/folders/') === FALLBACK);
  check('chuỗi rỗng → fallback', safeUrl('') === FALLBACK);

  // ------------------------------------------- A4. mọi điểm chèn đều escape
  console.log('\nA4 — Các điểm chèn dữ liệu động đều dùng escapeHtml:');
  const mustHave = [
    // Bảng bài chấm OMR (renderOmrPapersTable)
    ["bảng bài chấm: sbd", "escapeHtml(p.sbd"],
    ["bảng bài chấm: tên HS", "escapeHtml(p.studentName"],
    ["bảng bài chấm: mã đề", "escapeHtml(p.scannedExamCode"],
    ["bảng bài chấm: p.id trong onclick", "selectOmrPaper('${escapeHtml(p.id)}')"],
    // Bảng báo cáo (renderOmrReportsView) — 2 lần xuất hiện của p.id
    ["báo cáo: p.id trong onclick", "selectOmrPaper('${escapeHtml(p.id)}')"],
    // Nhật ký lưu vết
    ["audit: sbd/paperId", "escapeHtml(l.sbd"],
    ["audit: tên HS", "escapeHtml((l.studentName"],
    ["audit: trường sửa", "escapeHtml(l.field)"],
    ["audit: giá trị cũ", "escapeHtml(l.oldVal)"],
    ["audit: giá trị mới", "escapeHtml(l.newVal)"],
    // Modal danh sách lớp (renderOmrRosterModalTable)
    ["roster modal: value sbd", 'value="${escapeHtml(r.sbd'],
    ["roster modal: value tên", 'value="${escapeHtml(r.name'],
    // Ma trận đáp án
    ["ma trận ĐA: Mã code (badge)", "Mã ${escapeHtml(c)}"],
    ["ma trận ĐA: Mã code (thead)", "Mã ${escapeHtml(c)}"],
    ["ma trận ĐA: removeAnswerKeyCode", "removeAnswerKeyCode('${escapeHtml(c)}')"],
    ["ma trận ĐA: setAnswerMatrixP1", "setAnswerMatrixP1('${escapeHtml(c)}'"],
    ["ma trận ĐA: setAnswerMatrixP2", "setAnswerMatrixP2('${escapeHtml(c)}'"],
    ["ma trận ĐA: value P3", 'value="${escapeHtml(currentVal)}"'],
    ["ma trận ĐA: setAnswerMatrixP3", "setAnswerMatrixP3('${escapeHtml(c)}'"],
    // Modal sửa bài
    ["sửa bài: option mã đề", 'value="${escapeHtml(c)}"'],
    ["sửa bài: Mã đề trong option", "Mã đề ${escapeHtml(c)}"],
    ["sửa bài: cảnh báo", "${escapeHtml(w.message)}"],
    ["sửa bài: value TLN", 'value="${escapeHtml(val)}"'],
    // Link thư mục Drive + mức TF trong modal ngân hàng
    ["link Drive: href allowlist + escape", 'href="${escapeHtml(safeDriveFolderUrl(folderUrl))}"'],
    ["link Drive: rel=noopener", 'rel="noopener"'],
    ["modal ngân hàng: mức TF", "(${escapeHtml(it.level"],
  ];
  for (const [name, needle] of mustHave) {
    check(name, html.includes(needle), `không thấy "${needle}"`);
  }
  const mustNotHave = [
    ["không còn selectOmrPaper('${p.id}') thô", "selectOmrPaper('${p.id}')"],
    ["không còn value=\"${r.sbd thô", 'value="${r.sbd'],
    ["không còn value=\"${r.name thô", 'value="${r.name'],
    ["không còn value=\"${currentVal}\" thô", 'value="${currentVal}"'],
    ["không còn value=\"${val}\" thô", 'value="${val}"'],
    ["không còn href=\"${folderUrl}\" thô", 'href="${folderUrl}"'],
    ["không còn (${it.level thô", "(${it.level || 'Biết'})"],
    ["không còn removeAnswerKeyCode('${c}') thô", "removeAnswerKeyCode('${c}')"],
    ["không còn setAnswerMatrixP1('${c}' thô", "setAnswerMatrixP1('${c}'"],
    ["không còn setAnswerMatrixP2('${c}' thô", "setAnswerMatrixP2('${c}'"],
    ["không còn setAnswerMatrixP3('${c}' thô", "setAnswerMatrixP3('${c}'"],
    ["không còn ${w.message} thô", "${w.message}"],
    ["không còn ${l.oldVal} thô", "${l.oldVal}"],
    ["không còn ${l.field} thô", "${l.field}"],
    ["không còn ${p.studentName || ''} thô trong innerHTML", "${p.studentName || ''}</div>"],
    ["không còn ${p.sbd || 'Chưa tô'} thô", "${p.sbd || 'Chưa tô'}"],
  ];
  for (const [name, needle] of mustNotHave) {
    check(name, !html.includes(needle), `vẫn còn "${needle}"`);
  }
  // Các onclick='...escapeHtml...' trước đây đã được sửa bằng chính việc
  // escapeHtml thêm ': kiểm chứng hàm escapeHtml có thay ' (cổng A1).
  check("onclick='...escapeHtml...' an toàn nhờ escapeHtml thêm '", html.includes(".replace(/'/g, '&#39;')"));

  // ------------------------------------------------------- A5. P2-01 số thật
  console.log('\nA5 — P2-01: số liệu ngân hàng thật, không hard-code 804:');
  check('modal không còn chữ 804', !html.includes('804 CÂU') && !html.includes('(804'), 'vẫn còn 804');
  check('modal không còn badge MCQ: 664', !html.includes('MCQ: 664'));
  check('modal không còn badge Đúng/Sai: 106', !html.includes('Đúng/Sai: 106'));
  check('modal không còn badge Tự luận/TLN: 34', !html.includes('Tự luận/TLN: 34'));
  check('3 badge có id để cập nhật từ API', html.includes('id="drive-bank-badge-mcq"') && html.includes('id="drive-bank-badge-tf"') && html.includes('id="drive-bank-badge-sa"'));
  check('badge cập nhật từ data.mcqCount/tfCount/saCount', html.includes('data.mcqCount') && html.includes('data.tfCount') && html.includes('data.saCount'));
  check('modal tải limit=2000', html.includes('/api/drive-bank/questions?limit=2000'));
  check('không còn limit=200 ở modal (chuỗi cũ có dấu nháy đóng)', !html.includes("/api/drive-bank/questions?limit=200'"));
  check('máy chủ nâng trần limit 500 → 2000', serverJs.includes('Math.min(2000,'));
  check('ghi chú cắt bớt khi total > số đã tải', html.includes('chỉ hiển thị') && html.includes('câu đầu (giới hạn 2000)'));

  // ------------------------------------------------------------- A6. CSP
  console.log('\nA6 — CSP (server.js SECURITY_HEADERS):');
  const csp = (serverJs.match(/'Content-Security-Policy': "([^"]+)"/) || [])[1] || '';
  check('CSP có object-src \'none\'', csp.includes("object-src 'none'"));
  check('CSP có base-uri \'self\'', csp.includes("base-uri 'self'"));
  check('CSP có frame-ancestors \'self\'', csp.includes("frame-ancestors 'self'"));
  check('CSP thêm form-action \'self\'', csp.includes("form-action 'self'"));
  check('CSP thêm font-src \'self\'', csp.includes("font-src 'self'"));
  check('CSP thêm frame-src \'none\'', csp.includes("frame-src 'none'"));
  check('CSP giữ script-src unsafe-inline (ghi rõ lý do trong comment)', csp.includes("script-src 'self' 'unsafe-inline'") && serverJs.includes('GIỮ \'unsafe-inline\''));
  check('không có thẻ <meta CSP> trùng lặp trong index.html', !/http-equiv=["']Content-Security-Policy/i.test(html));

  // ------------------------------------------------- A7. quyết định tuyến API
  console.log('\nA7 — Quyết định từng tuyến API còn mở (ghi trong server.js):');
  function handlerRegion(routeSnippet) {
    const i = serverJs.indexOf(routeSnippet);
    assert(i >= 0, `Không tìm thấy tuyến ${routeSnippet}`);
    // Chỉ lấy đúng khối if của tuyến này (tới dấu đóng khối đầu tiên),
    // để tuyến kề sau (vd: POST /api/omr/templates/custom có requireAuth)
    // không làm sai kết quả.
    const end = serverJs.indexOf('\n    }', i);
    return serverJs.slice(i, end === -1 ? i + 400 : end);
  }
  check('POST /api/upload-doc: KHÓA (requireAuth)', handlerRegion("pathname === '/api/upload-doc'").includes('requireAuth'));
  check('POST /api/load-workspace-file: KHÓA (requireAuth)', handlerRegion("pathname === '/api/load-workspace-file'").includes('requireAuth'));
  check('GET /api/workspace-files: KHÓA (requireAuth)', handlerRegion("pathname === '/api/workspace-files'").includes('requireAuth'));
  check('GET /api/presets: GIỮ MỞ (tài liệu mẫu tĩnh, không dữ liệu người dùng)', !handlerRegion("pathname === '/api/presets'").includes('requireAuth'));
  check('GET /api/drive-bank/status: GIỮ MỞ (chỉ số lượng + tên file, không đáp án)', !handlerRegion("pathname === '/api/drive-bank/status'").includes('requireAuth'));
  check('GET /api/omr/templates: GIỮ MỞ (định nghĩa mẫu phiếu công khai)', !handlerRegion("pathname === '/api/omr/templates'").includes('requireAuth'));

  // ------------------------------------------------------- B. kiểm tra sống
  console.log('\nB — Kiểm tra sống trên server thử (cổng 3194):');
  const authFile = path.join(DATA_DIR, 'admin_auth.json');
  const authBackup = fs.existsSync(authFile) ? fs.readFileSync(authFile) : null;
  if (fs.existsSync(authFile)) fs.unlinkSync(authFile);
  const child = startServer(PORT);
  try {
    await waitHealth();

    const home = await httpReq({ method: 'GET', path: '/' });
    check('GET / → 200 + CSP có frame-src none + form-action self',
      home.status === 200
      && (home.headers['content-security-policy'] || '').includes("frame-src 'none'")
      && (home.headers['content-security-policy'] || '').includes("form-action 'self'"),
      `status ${home.status}, CSP: ${home.headers['content-security-policy']}`);

    const nf = await httpReq({ method: 'GET', path: '/khong-ton-tai-xyz' });
    check('GET /khong-ton-tai-xyz → 404 HTML thân thiện (không JSON thô)',
      nf.status === 404
      && (nf.headers['content-type'] || '').includes('text/html')
      && nf.raw.includes('Không tìm thấy trang')
      && nf.raw.includes('href="/"')
      && !nf.raw.includes('{"ok":false'),
      `status ${nf.status}, type ${nf.headers['content-type']}`);

    const evilPath = '/?__pathname=%2F%3Cscript%3Ealert(1)%3C%2Fscript%3E';
    const evil = await httpReq({ method: 'GET', path: evilPath });
    check('404 escape pathname độc hại: &lt;script&gt;, không còn <script> thô',
      evil.status === 404
      && evil.raw.includes('&lt;script&gt;')
      && !evil.raw.includes('<script>alert(1)</script>'),
      `status ${evil.status}, body có <script> thô: ${evil.raw.includes('<script>alert(1)')}`);

    const apiNf = await httpReq({ method: 'GET', path: '/api/khong-ton-tai' });
    check('GET /api/khong-ton-tai → 404 JSON như cũ', apiNf.status === 404 && apiNf.json && apiNf.json.ok === false);

    const upUnauth = await httpReq({ method: 'POST', path: '/api/upload-doc', body: { fileName: 't.txt', base64Data: Buffer.from('hello').toString('base64') } });
    check('POST /api/upload-doc chưa đăng nhập → 401', upUnauth.status === 401, `status ${upUnauth.status}`);
    const loadUnauth = await httpReq({ method: 'POST', path: '/api/load-workspace-file', body: { fileName: 'x.docx' } });
    check('POST /api/load-workspace-file chưa đăng nhập → 401', loadUnauth.status === 401, `status ${loadUnauth.status}`);
    const wsUnauth = await httpReq({ method: 'GET', path: '/api/workspace-files' });
    check('GET /api/workspace-files chưa đăng nhập → 401', wsUnauth.status === 401, `status ${wsUnauth.status}`);

    const st = await httpReq({ method: 'GET', path: '/api/drive-bank/status' });
    check('GET /api/drive-bank/status giữ mở → 200', st.status === 200, `status ${st.status}`);
    const tpl = await httpReq({ method: 'GET', path: '/api/omr/templates' });
    check('GET /api/omr/templates giữ mở → 200', tpl.status === 200, `status ${tpl.status}`);
    const pre = await httpReq({ method: 'GET', path: '/api/presets' });
    check('GET /api/presets giữ mở → 200', pre.status === 200, `status ${pre.status}`);

    // Đăng nhập rồi kiểm tra lại: Bước 2 không bị phá + lưu trữ thô.
    const setup = await httpReq({ method: 'POST', path: '/api/auth/setup', body: { password: 'Gd4TestPass123' } });
    assert.strictEqual(setup.status, 200, `setup admin thất bại: ${JSON.stringify(setup.json)}`);
    const setCookie = setup.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
    assert(cookie, 'Không nhận được cookie phiên sau khi setup admin');

    const upAuth = await httpReq({ method: 'POST', path: '/api/upload-doc', cookie, body: { fileName: 't.txt', base64Data: Buffer.from('hello world').toString('base64') } });
    check('POST /api/upload-doc đã đăng nhập → 200 (Bước 2 vẫn chạy)', upAuth.status === 200, `status ${upAuth.status}: ${JSON.stringify(upAuth.json)}`);
    const wsAuth = await httpReq({ method: 'GET', path: '/api/workspace-files', cookie });
    check('GET /api/workspace-files đã đăng nhập → 200', wsAuth.status === 200, `status ${wsAuth.status}`);
    const loadAuth = await httpReq({ method: 'POST', path: '/api/load-workspace-file', cookie, body: { fileName: 'khong-co-file-nay.docx' } });
    check('POST /api/load-workspace-file đã đăng nhập, file không có → 404 (không phải 401)', loadAuth.status === 404, `status ${loadAuth.status}`);

    const bankQ = await httpReq({ method: 'GET', path: '/api/drive-bank/questions?limit=2000', cookie });
    check('GET /api/drive-bank/questions?limit=2000 → 200, có total thật',
      bankQ.status === 200 && bankQ.json && typeof bankQ.json.total === 'number',
      `status ${bankQ.status}: ${JSON.stringify(bankQ.json)}`);

    // Ranh giới lưu trữ thô: tên hồ sơ chứa <script> được lưu nguyên vẹn
    // (máy chủ không lọc), nhưng nơi hiển thị đã escape (cổng A4).
    const evilName = "<script>alert(1)</script> — Đề XSS thử";
    const mkProfile = await httpReq({ method: 'POST', path: '/api/profiles', cookie, body: { id: 'gd4_xss_probe', title: evilName, metadata: { subject: 'Tin học', grade: 12, examPeriod: 'Giữa HK1' }, questions: [], variants: [] } });
    if (mkProfile.status === 200 || mkProfile.status === 201) {
      const list = await httpReq({ method: 'GET', path: '/api/profiles', cookie });
      const found = (list.json && (list.json.profiles || [])).find(p => p.id === 'gd4_xss_probe');
      check('API lưu tên hồ sơ độc hại nguyên vẹn (không lọc lén) — escape xảy ra lúc hiển thị',
        !!found && found.title === evilName, `không thấy hồ sơ hoặc tên đã bị đổi: ${JSON.stringify(found)}`);
      // Dọn hồ sơ thử.
      await httpReq({ method: 'DELETE', path: '/api/profiles/gd4_xss_probe', cookie });
    } else {
      check('tạo hồ sơ thử chứa <script> (cần API profiles cho phép)', false, `status ${mkProfile.status}: ${JSON.stringify(mkProfile.json)}`);
    }
  } finally {
    await stopServer(child);
    if (authBackup !== null) fs.writeFileSync(authFile, authBackup);
    else if (fs.existsSync(authFile)) fs.unlinkSync(authFile);
  }

  // ------------------------------------------------------------------ tổng kết
  console.log('\n================================================================================');
  console.log(` CỔNG GĐ4: ${pass} ĐẠT / ${fail} RỚT`);
  if (failures.length) console.log(' Rớt: ' + failures.join(' | '));
  console.log('================================================================================');
  process.exit(fail > 0 ? 1 : 0);
})().catch((err) => {
  console.error('❌ LỖI KHÔNG BẮT ĐƯỢC TRONG tests/gd4-gates.js:', err);
  process.exit(1);
});
