/**
 * tests/gd3-gates.js — Cổng kiểm tra GĐ3 (P1-06…P1-10).
 *
 * Chạy: node tests/gd3-gates.js
 * Mỗi cổng in ✔/✘ kèm lý do; thoát 1 nếu có cổng nào rớt.
 *
 * Lưu ý: một số cổng ghi vào thư mục data/ thật của repo (phiên OMR,
 * exports, admin_auth.json) — script tự sao lưu và dọn sạch sau khi chạy.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const REPO = path.join(__dirname, '..');
const DATA_DIR = path.join(REPO, 'data');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'matrixedu_gd3_'));

const { atomicWriteJson, atomicWriteFile, isDemoMode } = require('../src/storage');
const { extractDocumentContent, isPdfTextUnreadable, PDF_UNREADABLE_MESSAGE } = require('../src/doc-parser');
const { validateExamProfile, isValidShortAnswer } = require('../src/qa-validator');
const { step1AnalyzeMaterial, step2GenerateMatrix, step3GenerateSpecification, step4GenerateQuestionsAndAnswers, regenerateSingleQuestion } = require('../src/ai-engine');
const { syncGoogleDriveFolder, loadDriveQuestionBank } = require('../src/drive-bank');
const { SAMPLE_DOCUMENTS } = require('../src/sample-materials');
const { createMaterialDocx } = require('../src/zip-docx');

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
  return new Promise(r => setTimeout(r, ms));
}

// ------------------------------------------------------------ HTTP helpers
function httpJson({ port, method, path: p, body, cookie }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: p,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let json = null;
        try { json = JSON.parse(raw.toString('utf8')); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, json, raw });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function startServer(port, extraEnv = {}) {
  const child = spawn('node', ['server.js'], {
    cwd: REPO,
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

async function setupAdmin(port, password = 'Gd3TestPass123') {
  const r = await httpJson({ port, method: 'POST', path: '/api/auth/setup', body: { password } });
  assert.strictEqual(r.status, 200, `setup admin thất bại: ${JSON.stringify(r.json)}`);
  const setCookie = r.headers['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
  assert(cookie, 'Không nhận được cookie phiên sau khi setup admin');
  return cookie;
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) return resolve();
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} resolve(); }, 5000);
  });
}

// ------------------------------------------------------------- PDF builders
function buildPdf(contentStream) {
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj',
    `4 0 obj<</Length ${Buffer.byteLength(contentStream)}>>stream\n${contentStream}\nendstream endobj`,
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj'
  ];
  return Buffer.from(`%PDF-1.4\n${objects.join('\n')}\n%%EOF`, 'latin1');
}

// ---------------------------------------------------------- backup helpers
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function removeDirSync(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// ================================================================== MAIN
(async () => {
  console.log('================================================================================');
  console.log(' CỔNG KIỂM TRA GĐ3 (P1-06…P1-10)');
  console.log('================================================================================\n');

  // ---------------------------------------------------------- P1-08a: ghi nguyên tử
  console.log('P1-08 — Ghi nguyên tử + sao lưu ngày + khóa ghi:');
  await gate('atomicWriteJson: ghi v1 rồi v2 — nội dung cuối là v2, không còn file .tmp-*, không còn khóa', () => {
    const f = path.join(TMP, 'atomic.json');
    atomicWriteJson(f, { version: 1 });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(f, 'utf8')), { version: 1 });
    atomicWriteJson(f, { version: 2 });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(f, 'utf8')), { version: 2 });
    const leftovers = fs.readdirSync(TMP).filter(n => n.includes('.tmp-') || n.endsWith('.lock'));
    assert.strictEqual(leftovers.length, 0, 'Còn file tạm/khóa: ' + leftovers.join(', '));
  });
  await gate('dailyBackup: trước khi ghi đè, bản cũ được sao vào backups/YYYY-MM-DD/', () => {
    const f = path.join(TMP, 'atomic.json');
    const day = new Date().toISOString().slice(0, 10);
    const backup = path.join(TMP, 'backups', day, 'atomic.json');
    assert(fs.existsSync(backup), 'Không thấy bản sao lưu ngày ' + backup);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(backup, 'utf8')), { version: 1 });
  });
  await gate('atomicWriteFile (nhị phân): ghi docx giả — nội dung nguyên vẹn', () => {
    const f = path.join(TMP, 'fake.docx');
    const buf = Buffer.from('PK\x03\x04' + 'x'.repeat(1000));
    atomicWriteFile(f, buf);
    assert(fs.readFileSync(f).equals(buf), 'Nội dung file nhị phân khác sau khi ghi');
  });
  await gate('isDemoMode: tắt khi không có VERCEL, bật khi VERCEL=1', () => {
    assert.strictEqual(isDemoMode(), false, 'isDemoMode phải false khi không có VERCEL');
    process.env.VERCEL = '1';
    assert.strictEqual(isDemoMode(), true, 'isDemoMode phải true khi VERCEL=1');
    delete process.env.VERCEL;
  });

  // ------------------------------------------- P1-08b: tắt tiến trình đột ngột
  console.log('\nP1-08 — Phiên OMR còn nguyên sau khi tắt tiến trình đột ngột (SIGKILL):');
  const omrDbDir = path.join(DATA_DIR, 'omr_database');
  const omrDbBackup = path.join(TMP, 'omr_database_backup');
  copyDirSync(omrDbDir, omrDbBackup);
  const omrDbFile = path.join(DATA_DIR, 'omr_database.json');
  const omrDbFileBackup = fs.existsSync(omrDbFile) ? fs.readFileSync(omrDbFile) : null;
  try {
    const writerPath = path.join(TMP, 'kill-writer.js');
    fs.writeFileSync(writerPath, `
const { saveGradingSessionSnapshot } = require(${JSON.stringify(path.join(REPO, 'src', 'omr-engine.js'))});
let i = 0;
setInterval(() => {
  i++;
  try {
    saveGradingSessionSnapshot({
      gradedPapers: Array.from({ length: 5 }, (_, k) => ({ sbd: '12000' + k, studentName: 'HS ' + k, totalScore: (i % 10) + k * 0.1, code: '101' })),
      answerKeysByCode: { '101': { part1: ['A', 'B', 'C', 'D'] } },
      pointRules: { mcq: 0.25 },
      metadata: { subject: 'Toán', grade: '12', className: '12A1' },
      title: 'Ca chấm kiểm thử GĐ3 #' + i,
      examId: 'gd3-kill-test',
      examTitle: 'Kiểm thử GĐ3',
      className: '12A1',
      sessionId: 'gd3_kill_test'
    });
  } catch (_) {}
}, 15);
`);
    await gate('kill -9 giữa lúc ghi phiên: file phiên và CSDL vẫn đọc được JSON đầy đủ', async () => {
      const child = spawn('node', [writerPath], { cwd: REPO, stdio: 'ignore' });
      await sleep(600);
      child.kill('SIGKILL');
      await new Promise(r => child.once('exit', r));
      const sessionFile = path.join(omrDbDir, 'gd3_kill_test.json');
      assert(fs.existsSync(sessionFile), 'Không thấy file phiên gd3_kill_test.json sau khi kill');
      const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      assert(Array.isArray(session.papers) && session.papers.length === 5, 'Phiên bị cắt nửa chừng (papers không đủ 5 bài)');
      assert(session.statistics, 'Phiên thiếu statistics — file bị ghi dở');
      assert(fs.existsSync(omrDbFile), 'Mất file omr_database.json sau khi kill');
      JSON.parse(fs.readFileSync(omrDbFile, 'utf8'));
      // Lần ghi tiếp theo phải tự dọn khóa mồ côi + file tạm của tiến trình chết.
      const { saveGradingSessionSnapshot } = require('../src/omr-engine');
      saveGradingSessionSnapshot({
        gradedPapers: [{ sbd: '120001', studentName: 'HS 1', totalScore: 5, code: '101' }],
        answerKeysByCode: { '101': { part1: ['A'] } },
        pointRules: { mcq: 0.25 },
        metadata: { subject: 'Toán', grade: '12', className: '12A1' },
        title: 'Ca chấm kiểm thử GĐ3 (dọn khóa mồ côi)',
        examId: 'gd3-kill-test',
        examTitle: 'Kiểm thử GĐ3',
        className: '12A1',
        sessionId: 'gd3_kill_test'
      });
      const leftovers = fs.readdirSync(omrDbDir).filter(n => n.includes('.tmp-') || n.endsWith('.lock'));
      assert.strictEqual(leftovers.length, 0, 'Còn file tạm/khóa sau lần ghi dọn dẹp: ' + leftovers.join(', '));
    });
  } finally {
    removeDirSync(omrDbDir);
    copyDirSync(omrDbBackup, omrDbDir);
    if (omrDbFileBackup !== null) fs.writeFileSync(omrDbFile, omrDbFileBackup);
    else if (fs.existsSync(omrDbFile)) fs.unlinkSync(omrDbFile);
  }

  // ------------------------------------------------- P1-08c: chế độ giới thiệu
  console.log('\nP1-08 — Chế độ giới thiệu trên Vercel (VERCEL=1):');
  const demoTmpAuth = path.join(os.tmpdir(), 'matrixedu_data', 'admin_auth.json');
  if (fs.existsSync(demoTmpAuth)) fs.unlinkSync(demoTmpAuth);
  const demoServer = startServer(3210, { VERCEL: '1' });
  try {
    await gate('/api/health trả demoMode=true kèm thông báo giới thiệu', async () => {
      const health = await waitHealth(3210);
      assert.strictEqual(health.demoMode, true, 'demoMode phải true khi VERCEL=1');
      assert(health.demoNotice && health.demoNotice.includes('Bản giới thiệu'), 'Thiếu demoNotice');
    });
    await gate('POST /api/profiles ở chế độ giới thiệu → 503 DEMO_MODE_READONLY (không ghi lén /tmp)', async () => {
      const cookie = await setupAdmin(3210);
      const r = await httpJson({
        port: 3210, method: 'POST', path: '/api/profiles', cookie,
        body: { id: 'gd3_demo_profile', title: 'Đề thử demo', metadata: { subject: 'Toán', grade: '12' } }
      });
      assert.strictEqual(r.status, 503, `Phải trả 503, thực tế ${r.status}: ${JSON.stringify(r.json)}`);
      assert.strictEqual(r.json.errorCode, 'DEMO_MODE_READONLY');
      assert(r.json.message.includes('Bản giới thiệu'), 'Thông báo phải nêu rõ bản giới thiệu');
    });
  } finally {
    await stopServer(demoServer);
    if (fs.existsSync(demoTmpAuth)) fs.unlinkSync(demoTmpAuth);
  }

  // ------------------------------------------------------------ P1-09: đồng bộ
  console.log('\nP1-09 — Đồng bộ Drive báo đúng trạng thái khi mất mạng:');
  const activeBankFile = path.join(DATA_DIR, 'active_drive_bank.json');
  const activeBankBackup = fs.existsSync(activeBankFile) ? fs.readFileSync(activeBankFile) : null;
  const fakeFolderDir = path.join(DATA_DIR, 'google_drive_bank', 'OFFLINE0000000000000000');
  try {
    await gate('mất mạng (thư mục giả, fetch lỗi) → ok:false + usedCachedData, KHÔNG báo thành công', async () => {
      const realDocx = path.join(DATA_DIR, 'google_drive_bank', '1MbQqovIMutXQP-qDRqehjAeRZzVqojF-', 'De_On_Tap_01_Tin_Hoc_10_ICT_Giua_HK1.docx');
      assert(fs.existsSync(realDocx), 'Thiếu file docx mẫu để gieo dữ liệu đệm');
      fs.mkdirSync(fakeFolderDir, { recursive: true });
      fs.copyFileSync(realDocx, path.join(fakeFolderDir, 'De_On_Tap_01_Tin_Hoc_10_ICT_Giua_HK1.docx'));
      const res = await syncGoogleDriveFolder('https://drive.google.com/drive/folders/OFFLINE0000000000000000');
      assert.strictEqual(res.ok, false, 'Đồng bộ lỗi mạng phải trả ok:false, thực tế: ' + JSON.stringify(res).slice(0, 300));
      assert.strictEqual(res.usedCachedData, true, 'Phải ghi rõ đang dùng dữ liệu đệm');
      assert(res.message.includes('Không kết nối được'), 'Thông báo phải nêu nguyên nhân mất kết nối: ' + res.message);
      assert(!res.message.includes('đồng bộ thành công'), 'Không được chứa cụm "đồng bộ thành công" khi thất bại');
    });
    await gate('chỉ một thư mục Drive trong cấu hình (không còn thư mục dự phòng 1wcSRCs…)', () => {
      const src = fs.readFileSync(path.join(REPO, 'src', 'drive-bank.js'), 'utf8');
      assert(src.includes('1MbQqovIMutXQP-qDRqehjAeRZzVqojF-'), 'Thiếu thư mục Drive đang dùng');
      const stale = src.split('\n').filter(l => l.includes('1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop') && !l.trim().startsWith('//'));
      assert.strictEqual(stale.length, 0, 'Còn dùng thư mục dự phòng cũ trong code: ' + stale.join(' | '));
    });
    await gate('hàm sync OMR cũ đã đổi tên thành exportOmrDatabaseLocalBackup, syncMode=local_backup_export', () => {
      const omr = require('../src/omr-engine');
      assert.strictEqual(typeof omr.exportOmrDatabaseLocalBackup, 'function', 'Thiếu hàm exportOmrDatabaseLocalBackup');
      const src = fs.readFileSync(path.join(REPO, 'src', 'omr-engine.js'), 'utf8');
      assert(src.includes("syncMode: 'local_backup_export'"), 'syncMode phải là local_backup_export');
    });
  } finally {
    removeDirSync(fakeFolderDir);
    if (activeBankBackup !== null) fs.writeFileSync(activeBankFile, activeBankBackup);
    else if (fs.existsSync(activeBankFile)) fs.unlinkSync(activeBankFile);
    // Nạp lại ngân hàng thật sau khi cổng P1-09 dùng ngân hàng giả.
    try { loadDriveQuestionBank(true); } catch (_) {}
  }

  // -------------------------------------------------------------- P1-06: PDF
  console.log('\nP1-06 — PDF quét/không trích được chữ bị từ chối ở bước 1:');
  await gate('thông báo chuẩn đúng nguyên văn yêu cầu', () => {
    assert.strictEqual(PDF_UNREADABLE_MESSAGE, 'PDF dạng ảnh quét, cần bản Word hoặc chạy OCR trước');
  });
  await gate('PDF không có chữ (trang trống) → pdfUnreadable=true', () => {
    const pdf = buildPdf('BT /F1 18 Tf 72 720 Td () Tj ET');
    const ex = extractDocumentContent('scan.pdf', pdf, 'application/pdf');
    assert.strictEqual(ex.pdfUnreadable, true, 'PDF trống phải bị đánh dấu không đọc được');
    assert(isPdfTextUnreadable(ex.text).unreadable, 'isPdfTextUnreadable phải bắt chữ giữ chỗ');
  });
  await gate('PDF mã hóa font (chuỗi rác dài không khoảng trắng) → pdfUnreadable=true', () => {
    const pdf = buildPdf('BT /F1 18 Tf 72 720 Td (xKqZmPqRtVwXyZaBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890AbCdEfGhIjKlMnOpQrStUvWxYz) Tj ET');
    const ex = extractDocumentContent('encoded.pdf', pdf, 'application/pdf');
    assert.strictEqual(ex.pdfUnreadable, true, 'PDF mã hóa font phải bị đánh dấu không đọc được');
  });
  await gate('PDF chữ thật (đủ từ, có khoảng trắng) → pdfUnreadable=false, đi tiếp bình thường', () => {
    const pdf = buildPdf('BT /F1 18 Tf 72 720 Td (Ham so bac hai co do thi la parabol voi dinh tai diem cuc tri va truc doi xung di qua dinh cua do thi ham so do) Tj ET');
    const ex = extractDocumentContent('real.pdf', pdf, 'application/pdf');
    assert.strictEqual(ex.pdfUnreadable, false, 'PDF chữ thật không được chặn: ' + ex.unreadableReason);
    assert(ex.text.length > 50, 'Phải trích được văn bản thật');
  });

  // -------------------------------------------------------------- P1-07: đáp án
  console.log('\nP1-07 — Xóa đáp án dự phòng dạng mẫu câu; thiếu đáp án thì dừng:');
  await gate('mã nguồn ai-engine.js không còn chuỗi đáp án mẫu', () => {
    const src = fs.readFileSync(path.join(REPO, 'src', 'ai-engine.js'), 'utf8');
    for (const s of ['Đáp án theo SGK', 'Theo chuẩn SGK', 'Trình bày theo yêu cầu câu hỏi']) {
      assert(!src.includes(s), 'Còn chuỗi mẫu câu: ' + s);
    }
  });
  await gate('validator: TLN đáp số "12,5" đạt; TLN đáp án dạng câu chữ bị gắn cờ; TLN trống bị gắn cờ', () => {
    const base = { metadata: { subject: 'Toán', grade: '12' }, matrix: { rows: [] }, specification: [], questions: [], variants: [] };
    const withSa = (answer) => validateExamProfile({
      ...base,
      matrix: { rows: [{ id: 'row_1', counts: { SA: { 'Biết': 1 } }, points: 0.5 }] },
      questions: [{ id: 'q_sa_1', type: 'SA', rowId: 'row_1', level: 'Biết', points: 0.5, stem: 'Tính giá trị.', answer, matrixRef: 'TLN1' }]
    });
    const saAnswerIssues = (qa) => qa.issues.filter(i => i.includes('Câu 1 (SA)') && /đáp số|Câu trả lời ngắn/i.test(i));
    assert.strictEqual(saAnswerIssues(withSa('12,5')).length, 0, 'Đáp số 12,5 phải đạt, issues: ' + withSa('12,5').issues.join(' | '));
    assert(saAnswerIssues(withSa('Đáp án theo SGK và tài liệu chuyên môn.')).length > 0, 'Đáp án dạng câu chữ phải bị gắn cờ');
    assert(saAnswerIssues(withSa('')).length > 0, 'TLN trống phải bị gắn cờ');
    assert.strictEqual(isValidShortAnswer('9'), true);
    assert.strictEqual(isValidShortAnswer('Đáp án theo SGK và tài liệu chuyên môn.'), false);
  });
  await gate('validator: tự luận chỉ có dòng trích nguồn chung chung bị gắn cờ (nội dung tối thiểu)', () => {
    const exam = {
      metadata: { subject: 'Toán', grade: '12' },
      matrix: { rows: [{ id: 'row_1', counts: { ESSAY: { 'Biết': 1 } }, points: 1 }] },
      specification: [],
      questions: [{ id: 'q_essay_1', type: 'ESSAY', rowId: 'row_1', level: 'Biết', points: 1, stem: 'Trình bày...', answer: '', explanation: 'Căn cứ theo tài liệu "De_On_Tap_01.docx" trong Ngân hàng câu hỏi Google Drive.', matrixRef: 'TL1' }],
      variants: []
    };
    const qa = validateExamProfile(exam);
    assert(qa.issues.some(i => i.includes('Câu 1 (ESSAY)')), 'Tự luận chỉ có dòng trích nguồn phải bị gắn cờ, issues: ' + qa.issues.join(' | '));
  });
  await gate('step4: đề thử Tin 10 có câu TLN thiếu đáp số → bị chặn (MISSING_TLN_ANSWER), không sinh đề', async () => {
    const s = SAMPLE_DOCUMENTS.thpt_it_10;
    const buf = createMaterialDocx(s.title, s.paragraphs);
    const ex = extractDocumentContent(s.name, buf);
    const s1 = await step1AnalyzeMaterial({ metadata: s.metadata, rawText: ex.text, tables: ex.tables });
    const s2 = await step2GenerateMatrix({ metadata: s.metadata, units: s1.analysis.units });
    const s3 = step3GenerateSpecification({ metadata: s.metadata, matrix: s2.matrix, units: s1.analysis.units });
    const s4 = await step4GenerateQuestionsAndAnswers({ metadata: s.metadata, matrix: s2.matrix, specification: s3.specification, rawText: ex.text });
    assert.strictEqual(s4.ok, false, 'Phải chặn sinh đề khi TLN thiếu đáp số');
    assert.strictEqual(s4.errorCode, 'MISSING_TLN_ANSWER', 'errorCode phải là MISSING_TLN_ANSWER, thực tế: ' + s4.errorCode);
    assert(!s4.variants, 'Không được trả variants khi bị chặn');
  });
  await gate('regenerateSingleQuestion: TLN môn Tin không tạo biến thể toán; TLN môn Toán vẫn tạo được', async () => {
    const tinQ = { id: 'q_sa_1', type: 'SA', stem: 'Cho biết dung lượng bộ nhớ RAM?', unit: 'Máy tính', level: 'Biết', points: 0.5, rowId: 'row_1', topic: 'Máy tính', matrixRef: 'TLN1' };
    const tinRes = await regenerateSingleQuestion({ question: tinQ, metadata: { subject: 'Tin học', grade: '10' }, preferBank: false });
    assert.strictEqual(tinRes.ok, false, 'TLN môn Tin không được tạo biến thể toán: ' + JSON.stringify(tinRes).slice(0, 200));
    const mathQ = { id: 'q_sa_1', type: 'SA', stem: 'Tính giá trị của hàm số tại x = 2.', unit: 'Hàm số', level: 'Biết', points: 0.5, rowId: 'row_1', topic: 'Hàm số', matrixRef: 'TLN1' };
    const mathRes = await regenerateSingleQuestion({ question: mathQ, metadata: { subject: 'Toán', grade: '12' }, preferBank: false });
    assert.strictEqual(mathRes.ok, true, 'TLN môn Toán phải tạo được biến thể');
    assert(isValidShortAnswer(mathRes.question.answer), 'Đáp án biến thể Toán phải là số');
  });

  // -------------------------------------------------------------- P1-10: xuất Word
  console.log('\nP1-10 — Xuất Word: tên file an toàn, lỗi ghi báo rõ:');
  const localAuthFile = path.join(DATA_DIR, 'admin_auth.json');
  const localAuthBackup = fs.existsSync(localAuthFile) ? fs.readFileSync(localAuthFile) : null;
  if (fs.existsSync(localAuthFile)) fs.unlinkSync(localAuthFile);
  const localServer = startServer(3211);
  try {
    // Sinh một hồ sơ đề thật bằng pipeline Toán 12 để xuất Word.
    const s = SAMPLE_DOCUMENTS.thpt_math_12;
    const buf = createMaterialDocx(s.title, s.paragraphs);
    const ex = extractDocumentContent(s.name, buf);
    const s1 = await step1AnalyzeMaterial({ metadata: s.metadata, rawText: ex.text, tables: ex.tables });
    const s2 = await step2GenerateMatrix({ metadata: s.metadata, units: s1.analysis.units });
    const s3 = step3GenerateSpecification({ metadata: s.metadata, matrix: s2.matrix, units: s1.analysis.units });
    const s4 = await step4GenerateQuestionsAndAnswers({ metadata: s.metadata, matrix: s2.matrix, specification: s3.specification, rawText: ex.text });
    assert(s4.ok, 'Pipeline Toán 12 phải sinh được đề để làm dữ liệu xuất Word');
    const profile = {
      metadata: { ...s.metadata, subject: '../../tmp/evil', grade: '12', examPeriod: 'Kiểm tra' },
      matrix: s2.matrix,
      specification: s3.specification,
      questions: s4.questions,
      variants: s4.variants
    };

    await waitHealth(3211);
    const cookie = await setupAdmin(3211);

    await gate('tên môn chứa "../" — file vẫn nằm trong data/exports, tên file đã chuẩn hóa', async () => {
      const exportsDir = path.join(DATA_DIR, 'exports');
      const before = new Set(fs.existsSync(exportsDir) ? fs.readdirSync(exportsDir) : []);
      const r = await httpJson({ port: 3211, method: 'POST', path: '/api/export-docx', cookie, body: { examData: profile, mode: 'full' } });
      assert.strictEqual(r.status, 200, `Xuất Word phải 200, thực tế ${r.status}: ${JSON.stringify(r.json)}`);
      const disp = r.headers['content-disposition'] || '';
      assert(!disp.includes('..') && !disp.includes('/tmp/'), 'Tên file tải về vẫn chứa đường dẫn nguy hiểm: ' + disp);
      assert(!disp.includes('%2F') && !disp.includes('%2f'), 'Tên file tải về vẫn chứa / đã mã hóa: ' + disp);
      const after = fs.existsSync(exportsDir) ? fs.readdirSync(exportsDir) : [];
      const created = after.filter(n => !before.has(n));
      assert.strictEqual(created.length, 1, 'Phải tạo đúng 1 bản sao trong exports, thực tế: ' + created.join(', '));
      assert(!created[0].includes('..'), 'Tên bản sao trong exports vẫn chứa "..": ' + created[0]);
      const resolved = path.resolve(exportsDir, created[0]);
      assert(resolved.startsWith(path.resolve(exportsDir) + path.sep), 'Bản sao thoát khỏi thư mục exports!');
      assert(!fs.existsSync('/tmp/evil_Lop12.docx'), 'File lọt ra ngoài /tmp!');
      fs.unlinkSync(path.join(exportsDir, created[0]));
    });

    await gate('thư mục exports không ghi được — trả 500 EXPORT_SAVE_FAILED thay vì báo thành công', async () => {
      const exportsDir = path.join(DATA_DIR, 'exports');
      const exportsBackupDir = path.join(TMP, 'exports_backup');
      copyDirSync(exportsDir, exportsBackupDir);
      removeDirSync(exportsDir);
      fs.writeFileSync(exportsDir, 'khong-phai-thu-muc'); // thay thư mục bằng file
      try {
        const r = await httpJson({ port: 3211, method: 'POST', path: '/api/export-docx', cookie, body: { examData: profile, mode: 'full' } });
        assert.strictEqual(r.status, 500, `Phải trả 500, thực tế ${r.status}`);
        assert.strictEqual(r.json.errorCode, 'EXPORT_SAVE_FAILED', 'errorCode phải là EXPORT_SAVE_FAILED: ' + JSON.stringify(r.json));
        assert(r.json.message.includes('Không lưu được'), 'Thông báo phải nêu rõ không lưu được: ' + r.json.message);
      } finally {
        if (fs.existsSync(exportsDir)) fs.unlinkSync(exportsDir);
        copyDirSync(exportsBackupDir, exportsDir);
      }
    });
  } finally {
    await stopServer(localServer);
    if (localAuthBackup !== null) fs.writeFileSync(localAuthFile, localAuthBackup);
    else if (fs.existsSync(localAuthFile)) fs.unlinkSync(localAuthFile);
  }

  // ------------------------------------------------------------------ tổng kết
  console.log('\n================================================================================');
  console.log(` CỔNG GĐ3: ${passed} ĐẠT / ${failed} RỚT`);
  console.log('================================================================================');
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('❌ LỖI KHÔNG BẮT ĐƯỢC TRONG tests/gd3-gates.js:', err);
  process.exit(1);
});
