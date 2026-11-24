// GĐ5i gates — nút Lưu báo lỗi rõ ràng (UI-34), pill AI bấm được (UI-35).
// Run: node tests/gd5i-gates.js
//
// UI-34: trước đây saveCurrentProfile() chỉ hiện toast khi data.ok đúng;
// mọi lỗi (401 chưa đăng nhập, 503 demo Vercel, lỗi khác) đều lặng lẽ
// return null — nút Lưu bấm vào như không có phản hồi. Sau sửa: 401 thì
// toast "Yêu cầu đăng nhập quản trị." + mở modal đăng nhập; 503
// DEMO_MODE_READONLY thì toast giải thích bản demo không lưu được, cần
// bản Windows localhost; lỗi khác thì toast kèm message máy chủ. silent=true
// giữ nguyên không hiện toast.
// UI-35: pill trạng thái AI #ai-status-badge từ <span> thành <button> mở
// modal cấu hình AI (openAiConfigModal); đoạn JS cập nhật text/class của
// badge vẫn hoạt động; pill "Tự động sao lưu" không đụng tới.
//
// Cổng chạy trên máy chủ thật (cổng test 3391/3392, không dùng 3000) cho
// phần API, và chạy hàm saveCurrentProfile trích từ index.html trong vm
// với fetch/showToast/openAuthModal giả lập cho phần client.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let passed = 0;
let failed = 0;

async function gate(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✘ ${name}\n     → ${err.message}`);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Thân một hàm JS: từ "function NAME(" tới dòng "    }" đầu tiên sau đó.
// Giữ lại từ khóa async đứng trước (indexOf('function ...') bỏ mất nó;
// fnBody của gd5h không gặp vì chỉ kiểm tra tĩnh, còn ở đây hàm được
// chạy thật trong vm nên thiếu async sẽ lỗi biên dịch).
function fnBody(name) {
  let start = html.indexOf(`function ${name}(`);
  if (start < 0) return null;
  if (html.slice(Math.max(0, start - 6), start) === 'async ') start -= 6;
  const after = html.slice(start);
  const end = after.indexOf('\n    }');
  // Lấy cả dấu "}" đóng hàm (độ dài của '\n    }') — thiếu nó thì code
  // trích ra không biên dịch được trong vm.
  return end < 0 ? null : after.slice(0, end + '\n    }'.length);
}
function fnCode(name) {
  const b = fnBody(name);
  if (b === null) return null;
  return b.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

// ------------------------------------------------------------ HTTP helpers
function httpJson({ port, method, path: p, body, cookie }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: p,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...(cookie ? { Cookie: cookie } : {})
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(raw.toString('utf8'));
          } catch (_) {}
          resolve({ status: res.statusCode, headers: res.headers, json, raw });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function startServer(port, extraEnv = {}) {
  const child = spawn('node', ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', () => {});
  return child;
}

async function waitHealth(port, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await httpJson({ port, method: 'GET', path: '/api/health' });
      if (r.status === 200 && r.json && r.json.ok) return r.json;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error(`Server trên cổng ${port} không trả /api/health sau ${timeoutMs}ms`);
}

async function setupAdmin(port, password = 'Gd5iTestPass123') {
  const r = await httpJson({ port, method: 'POST', path: '/api/auth/setup', body: { password } });
  assert.strictEqual(r.status, 200, `setup admin thất bại: ${JSON.stringify(r.json)}`);
  const setCookie = r.headers['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : '';
  assert(cookie, 'Không nhận được cookie phiên sau khi setup admin');
  return cookie;
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch (_) {}
      resolve();
    }, 5000);
  });
}

// ------------------------------------------- vm: chạy saveCurrentProfile thật
// Trích hàm từ index.html, chạy trong vm với fetch/toast/modal giả lập.
function makeSaveHarness(fetchImpl) {
  const src = fnBody('saveCurrentProfile');
  assert(src, 'Không trích được hàm saveCurrentProfile từ index.html');
  const calls = { toasts: [], modals: 0, fetches: [] };
  const sandbox = {
    syncMetadataFromInputs: () => {},
    buildCleanProfilePayload: () => ({ id: 'exam_test', title: 'Đề test', metadata: {} }),
    fetch: async (url, opts) => {
      calls.fetches.push({ url, method: (opts && opts.method) || 'GET' });
      return fetchImpl(url, opts);
    },
    appState: { id: null, savedExamProfileId: null, lastSavedAt: null, omr: null },
    localStorage: { setItem: () => {} },
    refreshWorkflowReadiness: () => {},
    refreshOmrSavedExamsDropdown: async () => {},
    showToast: (msg, type) => {
      calls.toasts.push({ msg: String(msg), type: type || 'info' });
    },
    openAuthModal: () => {
      calls.modals++;
    }
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src, ctx);
  return {
    calls,
    sandbox,
    save: (...args) => ctx.saveCurrentProfile(...args)
  };
}

function fakeFetch(status, body) {
  return async () => ({ status, json: async () => body });
}

const DEMO_MSG =
  'Bản giới thiệu trên Vercel — dữ liệu không được lưu trên máy chủ này. ' +
  'Hãy dùng bản Windows portable (localhost) để lưu hồ sơ đề, danh sách và phiên chấm thật.';

(async () => {
  console.log('GĐ5i gates:');

  // ------------------------------------------------- UI-34. Kiểm tra tĩnh
  await gate('UI-34 saveCurrentProfile có nhánh 401 mở modal đăng nhập', () => {
    const code = fnCode('saveCurrentProfile');
    assert(code, 'không tìm thấy hàm saveCurrentProfile');
    assert(code.includes('res.status === 401'), 'không có nhánh kiểm tra res.status === 401');
    assert(code.includes('openAuthModal'), 'nhánh 401 không gọi openAuthModal');
  });
  await gate('UI-34 saveCurrentProfile có nhánh 503 DEMO_MODE_READONLY', () => {
    const code = fnCode('saveCurrentProfile');
    assert(code, 'không tìm thấy hàm saveCurrentProfile');
    assert(code.includes('503'), 'không có nhánh kiểm tra 503');
    assert(code.includes('DEMO_MODE_READONLY'), 'không nhắc tới DEMO_MODE_READONLY');
  });
  await gate('UI-34 các nhánh báo lỗi nằm trong if (!silent)', () => {
    const code = fnCode('saveCurrentProfile');
    assert(code, 'không tìm thấy hàm saveCurrentProfile');
    // Khối báo lỗi nằm sau "return data;" của đường thành công.
    const afterSuccess = code.slice(code.indexOf('return data;'));
    const errBlock = afterSuccess.slice(afterSuccess.indexOf('if (!silent)'));
    assert(errBlock.includes('401'), 'khối lỗi sau đường thành công không xử lý 401');
    assert(errBlock.includes('openAuthModal'), 'khối lỗi không mở modal đăng nhập');
    assert(errBlock.includes('DEMO_MODE_READONLY'), 'khối lỗi không xử lý DEMO_MODE_READONLY');
  });
  await gate('UI-34 đường thành công giữ nguyên (toast Đã lưu + return data)', () => {
    const code = fnCode('saveCurrentProfile');
    assert(code, 'không tìm thấy hàm saveCurrentProfile');
    assert(code.includes('Đã lưu đề thi'), 'mất toast thành công "Đã lưu đề thi"');
    assert(code.includes('return data;'), 'mất return data ở đường thành công');
    assert(code.includes("localStorage.setItem('last_saved_exam_profile'"), 'mất ghi localStorage');
  });
  await gate('UI-34 saveCurrentProfileAndGradeStep7 chỉ đi tiếp khi res.ok', () => {
    const code = fnCode('saveCurrentProfileAndGradeStep7');
    assert(code, 'không tìm thấy hàm saveCurrentProfileAndGradeStep7');
    assert(code.includes('if (res && res.ok)'), 'mất điều kiện res.ok trước khi sang Bước 7');
    assert(code.includes('goToStep(7)'), 'mất goToStep(7)');
  });

  // --------------------------------------- UI-34. Chạy hàm thật trong vm
  await gate('UI-34 vm: 401 → toast "Yêu cầu đăng nhập quản trị." + mở modal, trả null', async () => {
    const h = makeSaveHarness(fakeFetch(401, { ok: false, message: 'Yêu cầu đăng nhập quản trị.' }));
    const ret = await h.save(false, false);
    assert.strictEqual(ret, null, '401 phải trả null');
    assert.strictEqual(h.calls.toasts.length, 1, `phải có đúng 1 toast, nhận ${h.calls.toasts.length}`);
    assert(h.calls.toasts[0].msg.includes('Yêu cầu đăng nhập quản trị.'), 'toast không đúng câu: ' + h.calls.toasts[0].msg);
    assert.strictEqual(h.calls.toasts[0].type, 'error', 'toast 401 phải là error');
    assert.strictEqual(h.calls.modals, 1, '401 phải mở modal đăng nhập 1 lần');
    assert.strictEqual(h.calls.fetches[0].url, '/api/profiles', 'phải POST /api/profiles');
    assert.strictEqual(h.calls.fetches[0].method, 'POST', 'phải dùng POST');
  });
  await gate('UI-34 vm: 503 demo → toast nhắc Vercel + Windows, KHÔNG mở modal, trả null', async () => {
    const h = makeSaveHarness(
      fakeFetch(503, { ok: false, errorCode: 'DEMO_MODE_READONLY', message: DEMO_MSG })
    );
    const ret = await h.save(false, false);
    assert.strictEqual(ret, null, '503 phải trả null');
    assert.strictEqual(h.calls.toasts.length, 1, `phải có đúng 1 toast, nhận ${h.calls.toasts.length}`);
    assert(h.calls.toasts[0].msg.includes('Vercel'), 'toast 503 phải nhắc Vercel: ' + h.calls.toasts[0].msg);
    assert(h.calls.toasts[0].msg.includes('Windows'), 'toast 503 phải nhắc bản Windows: ' + h.calls.toasts[0].msg);
    assert.strictEqual(h.calls.modals, 0, '503 demo KHÔNG được mở modal đăng nhập');
  });
  await gate('UI-34 vm: lỗi khác (500) → toast kèm message máy chủ, không mở modal', async () => {
    const h = makeSaveHarness(fakeFetch(500, { ok: false, message: 'Lỗi ghi file' }));
    const ret = await h.save(false, false);
    assert.strictEqual(ret, null, '500 phải trả null');
    assert.strictEqual(h.calls.toasts.length, 1, 'phải có đúng 1 toast');
    assert(h.calls.toasts[0].msg.includes('Lỗi ghi file'), 'toast phải kèm message máy chủ: ' + h.calls.toasts[0].msg);
    assert.strictEqual(h.calls.modals, 0, 'lỗi 500 KHÔNG được mở modal đăng nhập');
  });
  await gate('UI-34 vm: 200 ok → toast thành công, trả data, cập nhật appState', async () => {
    const h = makeSaveHarness(
      fakeFetch(200, { ok: true, id: 'exam_1', title: 'Đề test', updatedAt: '2026-11-24T00:00:00.000Z', examCodes: ['101', '102'] })
    );
    const ret = await h.save(false, false);
    assert(ret && ret.ok === true, '200 phải trả data ok:true');
    assert.strictEqual(h.sandbox.appState.savedExamProfileId, 'exam_1', 'appState chưa cập nhật id đã lưu');
    assert.strictEqual(h.calls.toasts.length, 1, 'phải có đúng 1 toast thành công');
    assert(h.calls.toasts[0].msg.includes('Đã lưu đề thi'), 'toast thành công phải ghi "Đã lưu đề thi"');
    assert.strictEqual(h.calls.toasts[0].type, 'success', 'toast thành công phải là success');
    assert.strictEqual(h.calls.modals, 0, 'lưu thành công không mở modal');
  });
  await gate('UI-34 vm: silent=true + 401 → không toast, không modal, trả null', async () => {
    const h = makeSaveHarness(fakeFetch(401, { ok: false, message: 'Yêu cầu đăng nhập quản trị.' }));
    const ret = await h.save(true, false);
    assert.strictEqual(ret, null, 'silent 401 phải trả null');
    assert.strictEqual(h.calls.toasts.length, 0, 'silent=true không được hiện toast');
    assert.strictEqual(h.calls.modals, 0, 'silent=true không được mở modal');
  });
  await gate('UI-34 vm: silent=true + 503 demo → không toast, không modal', async () => {
    const h = makeSaveHarness(
      fakeFetch(503, { ok: false, errorCode: 'DEMO_MODE_READONLY', message: DEMO_MSG })
    );
    const ret = await h.save(true, false);
    assert.strictEqual(ret, null, 'silent 503 phải trả null');
    assert.strictEqual(h.calls.toasts.length, 0, 'silent=true không được hiện toast');
    assert.strictEqual(h.calls.modals, 0, 'silent=true không được mở modal');
  });
  await gate('UI-34 vm: linkToOmrStep7=true + 401 → không gắn đáp án OMR, vẫn báo lỗi', async () => {
    const h = makeSaveHarness(fakeFetch(401, { ok: false, message: 'Yêu cầu đăng nhập quản trị.' }));
    h.sandbox.appState.omr = {};
    const ret = await h.save(false, true);
    assert.strictEqual(ret, null, '401 phải trả null');
    assert.strictEqual(h.sandbox.appState.omr.selectedExamProfileId, undefined, 'lỗi thì không được gắn đề vào Bước 7');
    assert.strictEqual(h.calls.toasts.length, 1, 'vẫn phải báo lỗi 1 toast');
    assert.strictEqual(h.calls.modals, 1, 'vẫn phải mở modal đăng nhập');
  });
  await gate('UI-34 vm: linkToOmrStep7=true + 200 ok → gắn đề vào Bước 7', async () => {
    const h = makeSaveHarness(
      fakeFetch(200, { ok: true, id: 'exam_1', title: 'Đề test', updatedAt: '2026-11-24T00:00:00.000Z', examCodes: ['101'] })
    );
    h.sandbox.appState.omr = {};
    const ret = await h.save(false, true);
    assert(ret && ret.ok === true, '200 phải trả data');
    assert.strictEqual(h.sandbox.appState.omr.selectedExamProfileId, 'exam_1', 'phải gắn id đề vào Bước 7');
    assert.strictEqual(h.sandbox.appState.omr.activeKeySource, 'saved_profile', 'phải đặt activeKeySource');
  });

  // ------------------------------------------------- UI-35. Kiểm tra tĩnh
  await gate('UI-35 #ai-status-badge là <button> mở openAiConfigModal()', () => {
    const m = html.match(/<button\b[^>]*id="ai-status-badge"[^>]*>/);
    assert(m, '#ai-status-badge không phải <button>');
    assert(m[0].includes('onclick="openAiConfigModal()"'), 'button thiếu onclick openAiConfigModal()');
  });
  await gate('UI-35 button AI có type="button" và title gợi ý', () => {
    const m = html.match(/<button\b[^>]*id="ai-status-badge"[^>]*>/);
    assert(m, 'không tìm thấy button #ai-status-badge');
    assert(m[0].includes('type="button"'), 'thiếu type="button"');
    assert(/title="[^"]*cấu hình/i.test(m[0]), 'thiếu title gợi ý xem cấu hình AI');
  });
  await gate('UI-35 button AI giữ class badge (JS đổi class vẫn chạy)', () => {
    const m = html.match(/<button\b[^>]*id="ai-status-badge"[^>]*>/);
    assert(m, 'không tìm thấy button #ai-status-badge');
    assert(m[0].includes('class="badge badge-amber"'), 'button mất class "badge badge-amber"');
  });
  await gate('UI-35 không còn <span id="ai-status-badge">', () => {
    assert(!html.includes('<span id="ai-status-badge"'), 'vẫn còn span #ai-status-badge');
  });
  await gate('UI-35 JS cập nhật badge (textContent/className) vẫn còn nguyên', () => {
    assert(html.includes("getElementById('ai-status-badge')"), 'mất getElementById ai-status-badge');
    assert(html.includes('aiBadge.textContent'), 'mất cập nhật aiBadge.textContent');
    assert(html.includes("aiBadge.className = 'badge badge-teal'"), 'mất nhánh badge-teal');
    assert(html.includes("aiBadge.className = 'badge badge-amber'"), 'mất nhánh badge-amber');
  });
  await gate('UI-35 CSS #ai-status-badge: con trỏ pointer + kế thừa font', () => {
    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    assert(styleMatch, 'không tìm thấy khối <style>');
    const css = styleMatch[1];
    const rule = css.match(/#ai-status-badge\s*\{[^}]*\}/);
    assert(rule, 'thiếu rule CSS #ai-status-badge');
    assert(rule[0].includes('cursor: pointer'), 'rule thiếu cursor: pointer');
    assert(rule[0].includes('font-family: inherit'), 'rule thiếu font-family: inherit');
  });
  await gate('UI-35 pill "Tự động sao lưu" không đụng tới (vẫn là span, không onclick)', () => {
    const m = html.match(/<span\b[^>]*id="session-autosave-badge"[^>]*>/);
    assert(m, 'không tìm thấy span #session-autosave-badge');
    assert(!m[0].includes('onclick'), 'pill autosave bị thêm onclick');
  });
  await gate('UI-35 chỉ có đúng 1 phần tử #ai-status-badge', () => {
    assert.strictEqual((html.match(/id="ai-status-badge"/g) || []).length, 1, 'ai-status-badge xuất hiện khác 1 lần');
  });

  // ------------------------------------------- UI-34. API thật trên server
  // auth.js: file mật khẩu là data/admin_auth.json khi chạy thường, nhưng
  // là /tmp/matrixedu_data/admin_auth.json khi có VERCEL (bản demo) — phải
  // sao lưu/dọn cả hai đường, không thì lần chạy sau setup sẽ 403 "đã đặt".
  const os = require('os');
  const authFiles = [
    path.join(root, 'data', 'admin_auth.json'),
    path.join(os.tmpdir(), 'matrixedu_data', 'admin_auth.json')
  ];
  const authBackups = authFiles.map((f) => (fs.existsSync(f) ? fs.readFileSync(f) : null));
  for (const f of authFiles) if (fs.existsSync(f)) fs.unlinkSync(f);
  let srv = null;
  let demoSrv = null;
  try {
    await gate('UI-34 API: POST /api/profiles chưa đăng nhập → 401 "Yêu cầu đăng nhập quản trị."', async () => {
      srv = startServer(3391);
      await waitHealth(3391);
      const r = await httpJson({ port: 3391, method: 'POST', path: '/api/profiles', body: { id: 'exam_gd5i', title: 'Đề test' } });
      assert.strictEqual(r.status, 401, `phải trả 401, nhận ${r.status}: ${JSON.stringify(r.json)}`);
      assert(r.json && r.json.ok === false, 'body phải có ok:false');
      assert.strictEqual(r.json.message, 'Yêu cầu đăng nhập quản trị.', 'message 401 không đúng câu');
    });
    await gate('UI-34 API: bản demo (VERCEL=1) đã đăng nhập mà POST /api/profiles → 503 DEMO_MODE_READONLY', async () => {
      demoSrv = startServer(3392, { VERCEL: '1' });
      const health = await waitHealth(3392);
      assert.strictEqual(health.demoMode, true, 'VERCEL=1 mà /api/health không báo demoMode:true');
      const cookie = await setupAdmin(3392);
      const r = await httpJson({ port: 3392, method: 'POST', path: '/api/profiles', body: { id: 'exam_gd5i', title: 'Đề test' }, cookie });
      assert.strictEqual(r.status, 503, `phải trả 503, nhận ${r.status}: ${JSON.stringify(r.json)}`);
      assert(r.json && r.json.ok === false, 'body phải có ok:false');
      assert.strictEqual(r.json.errorCode, 'DEMO_MODE_READONLY', 'errorCode phải là DEMO_MODE_READONLY');
      assert(r.json.message && r.json.message.includes('Vercel'), 'message 503 phải nhắc Vercel');
      assert(r.json.message.includes('Windows'), 'message 503 phải nhắc bản Windows');
    });
    await gate('UI-34 API: bản demo chưa đăng nhập → 401 trước (auth chạy trước demo)', async () => {
      const r = await httpJson({ port: 3392, method: 'POST', path: '/api/profiles', body: { id: 'exam_gd5i', title: 'Đề test' } });
      assert.strictEqual(r.status, 401, `phải trả 401, nhận ${r.status}`);
      assert.strictEqual(r.json.message, 'Yêu cầu đăng nhập quản trị.', 'message 401 không đúng câu');
    });
  } finally {
    await stopServer(srv);
    await stopServer(demoSrv);
    authFiles.forEach((f, i) => {
      if (authBackups[i] !== null) fs.writeFileSync(f, authBackups[i]);
      else if (fs.existsSync(f)) fs.unlinkSync(f);
    });
  }

  // ------------------------------------------------------------------ tổng kết
  console.log('\n================================================================================');
  console.log(` CỔNG GĐ5i: ${passed} ĐẠT / ${failed} RỚT`);
  console.log('================================================================================');
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('❌ LỖI KHÔNG BẮT ĐƯỢC TRONG tests/gd5i-gates.js:', err);
  process.exit(1);
});
