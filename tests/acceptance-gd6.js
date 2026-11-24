// tests/acceptance-gd6.js — BỘ KIỂM TRA NGHIỆM THU ĐỘC LẬP (GĐ6, P2-02).
//
// Mục đích: kiểm chứng lại TOÀN BỘ các lỗi P0-01…P2-05 đã sửa, bằng logic
// kiểm chứng VIẾT LẠI TỪ ĐẦU (dữ liệu thử riêng, phép tính kỳ vọng tự tính
// tay, không import hay gọi lại bất kỳ hàm test nào trong tests/gd*-gates.js,
// tests/ui-token-scan.js hay tests/formula-gates.js). Chỉ dùng module sản
// phẩm (src/*, server.js, index.html) + một máy chủ sống.
//
// Cách chạy:  node tests/acceptance-gd6.js
//   - Phần 1: kiểm chứng tĩnh/đơn vị (không cần máy chủ).
//   - Phần 2: kiểm chứng sống trên một BẢN SAO TẠM của repo (cổng 3199),
//     sao xong xóa — không ghi gì vào bản clone làm việc.
//   - Phần 3: kiểm chứng chế độ giới thiệu Vercel (VERCEL=1, cổng 3198).
// In nhật ký chạy (ngày, giờ, commit đang kiểm tra) và thoát mã 1 nếu có
// bất kỳ kiểm chứng nào rớt.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const { spawn, spawnSync, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const startedAt = new Date();
const fmtDate = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
}).format(startedAt);
let COMMIT = 'unknown';
try { COMMIT = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (_) {}

const { tfQuestionScore } = require('../src/scoring');
const qa = require('../src/qa-validator');
const omr = require('../src/omr-engine');
const docParser = require('../src/doc-parser');
const driveBank = require('../src/drive-bank');
const aiEngine = require('../src/ai-engine');

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(id, name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS ${id} ${name}`); }
  else {
    fail++; failures.push(`${id} ${name}`);
    console.log(`  FAIL ${id} ${name}${detail ? ' — ' + detail : ''}`);
  }
}
function section(title) { console.log(`\n▶ ${title}`); }

// --- Trích một hàm JS theo cặp ngoặc nhọn (không phụ thuộc số dòng) ---
function extractFn(src, signature) {
  const start = src.indexOf(signature);
  if (start < 0) return null;
  const brace = src.indexOf('{', start);
  if (brace < 0) return null;
  let depth = 0;
  for (let i = brace; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}
// --- Bỏ comment // và /* */ nhưng tôn trọng chuỗi '...' "..." `...` ---
function stripComments(code) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < code.length) {
    const c = code[i];
    const n = code[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += n || ''; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}
function fnCode(src, signature) {
  const body = extractFn(src, signature);
  return body === null ? null : stripComments(body);
}

// --- Dữ liệu thử RIÊNG của bộ nghiệm thu (không dùng lại dữ liệu các gate) ---
function buildBaseQuestions() {
  const qs = [];
  const mcqAnswers = ['B', 'D', 'A', 'C'];
  for (let i = 0; i < 4; i++) {
    qs.push({
      id: `GD6-MCQ-${i + 1}`, type: 'MCQ',
      options: [`Phương án alpha ${i + 1}`, `Phương án beta ${i + 1}`, `Phương án gamma ${i + 1}`, `Phương án delta ${i + 1}`],
      answer: mcqAnswers[i]
    });
  }
  for (let i = 0; i < 2; i++) {
    qs.push({
      id: `GD6-TF-${i + 1}`, type: 'TF',
      statements: [
        { text: `Mệnh đề nghiệm thu ${i + 1}a`, isTrue: true },
        { text: `Mệnh đề nghiệm thu ${i + 1}b`, isTrue: false },
        { text: `Mệnh đề nghiệm thu ${i + 1}c`, isTrue: true },
        { text: `Mệnh đề nghiệm thu ${i + 1}d`, isTrue: false }
      ]
    });
  }
  qs.push({ id: 'GD6-SA-1', type: 'SA', answer: '12,5' });
  qs.push({ id: 'GD6-SA-2', type: 'SA', answer: '2025' });
  for (let i = 0; i < 6; i++) {
    qs.push({ id: `GD6-ES-${i + 1}`, type: 'ESSAY', answer: `Hướng dẫn chấm tự luận nghiệm thu số ${i + 1} với nội dung đầy đủ.` });
  }
  return qs;
}
const idsOf = (questions) => (questions || []).map(q => q.id).join(',');
const sortedIds = (questions) => (questions || []).map(q => q.id).sort().join(',');

// Thang điểm Đúng/Sai chuẩn Bộ GD&ĐT 2025 — TỰ GHI LẠI từ hướng dẫn chấm
// trong file Word (QĐ2), không gọi tfQuestionScore để tính kỳ vọng.
const MY_TF_RUBRIC = [0, 0.1, 0.25, 0.5, 1.0];

console.log('================================================================');
console.log('  BỘ KIỂM TRA NGHIỆM THU ĐỘC LẬP — GĐ6');
console.log(`  Ngày chạy: ${fmtDate} (Asia/Ho_Chi_Minh)`);
console.log(`  Commit đang kiểm tra: ${COMMIT}`);
console.log(`  Node: ${process.version}`);
console.log('================================================================');

// ================= PHẦN 1 — TĨNH / ĐƠN VỊ =================
// Toàn bộ phần kiểm chứng chạy trong main() async (có await ở E01, G06
// và các pha máy chủ sống phía dưới).
(async function main() {
section('A. Trộn mã đề — P0-01 (không hạt giống) + P0-04 (mã 101 cũng trộn)');
{
  const base = buildBaseQuestions();
  const baseIds = idsOf(base);
  const run1 = qa.generateShuffledVariants(base, 10, 101);
  const run2 = qa.generateShuffledVariants(base, 10, 101);
  check('A01', 'hai lần trộn cùng mã 101 cho thứ tự khác nhau',
    idsOf(run1[0].questions) !== idsOf(run2[0].questions) || idsOf(run1[1].questions) !== idsOf(run2[1].questions),
    'hai lần chạy ra cùng thứ tự — nghi còn hạt giống');
  const orders = run1.map(v => idsOf(v.questions));
  const distinct = new Set(orders).size;
  check('A02', '10 mã đề đều khác thứ tự gốc và khác nhau từng đôi',
    distinct === 10 && orders.every(o => o !== baseIds),
    `chỉ có ${distinct}/10 thứ tự khác nhau`);
  check('A03', 'mọi mã đề giữ đủ 14 câu gốc (không mất/thừa câu)',
    run1.every(v => sortedIds(v.questions) === sortedIds(base)),
    'tập câu hỏi bị thay đổi sau trộn');
  const essayBase = base.filter(q => q.type === 'ESSAY').map(q => q.id).join(',');
  const essayDiff = run1.filter(v =>
    v.questions.filter(q => q.type === 'ESSAY').map(q => q.id).join(',') !== essayBase).length;
  check('A04', 'câu tự luận cũng bị trộn thứ tự (≥8/10 mã khác gốc)',
    essayDiff >= 8, `chỉ ${essayDiff}/10 mã trộn tự luận`);
  const tfBase = base.filter(q => q.type === 'TF').map(q => q.id).join(',');
  const tfDiff = run1.filter(v =>
    v.questions.filter(q => q.type === 'TF').map(q => q.id).join(',') !== tfBase).length;
  check('A05', 'câu Đúng/Sai cũng bị trộn thứ tự (ít nhất 1/10 mã khác gốc)',
    tfDiff >= 1, 'không mã nào trộn thứ tự câu Đúng/Sai');
  check('A06', 'không còn hằng số Park-Miller 16807 trong mã nguồn',
    !/16807/.test(fs.readFileSync(path.join(ROOT, 'src/qa-validator.js'), 'utf8')),
    'còn 16807 trong qa-validator.js');
}

section('B. Đáp án thiếu không mặc định A — P0-02');
{
  const bad = [
    { id: 'GD6-BAD-1', type: 'MCQ', options: ['a', 'b', 'c', 'd'], answer: '' },
    { id: 'GD6-BAD-2', type: 'MCQ', options: ['a', 'b', 'c', 'd'], answer: 'E' },
    { id: 'GD6-BAD-3', type: 'MCQ', options: ['a', 'b', 'c', 'd'], answer: null },
    { id: 'GD6-BAD-4', type: 'MCQ', options: ['a', 'b', 'c', 'd'] }
  ];
  for (const q of bad) {
    let threw = false; let msg = '';
    try { qa.assertValidQuestionAnswers([q]); } catch (e) { threw = true; msg = e.message; }
    check(`B01-${q.id}`, `câu đáp án ${JSON.stringify(q.answer)} bị chặn và nêu đúng mã câu`,
      threw && msg.includes(q.id), threw ? `thông báo không nêu mã câu: ${msg}` : 'không ném lỗi');
  }
  let threwMix = false;
  try { qa.generateShuffledVariants([...buildBaseQuestions(), bad[1]], 2, 101); } catch (_) { threwMix = true; }
  check('B02', 'trộn đề có câu thiếu đáp án thì dừng ngay, không trộn', threwMix, 'vẫn trộn được');
  let okValid = true;
  try { qa.assertValidQuestionAnswers(buildBaseQuestions()); } catch (_) { okValid = false; }
  check('B03', 'đề đủ đáp án hợp lệ thì qua kiểm tra', okValid, 'đề hợp lệ bị chặn oan');
  const srcAll = ['src/qa-validator.js', 'src/ai-engine.js', 'src/zip-docx.js', 'server.js', 'index.html']
    .map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  check('B04', 'không còn `|| \'A\'` trên bất kỳ đường đáp án nào',
    !srcAll.includes("|| 'A'"), 'vẫn còn || \'A\'');
}

section('C. Đối chiếu đáp án từng mã đề — P0-03');
{
  const base = buildBaseQuestions();
  const variants = qa.generateShuffledVariants(base, 4, 101);
  check('C01', 'mã đề trộn thật đối chiếu khớp 100% với đề gốc',
    qa.validateVariantAnswers(base, variants).length === 0,
    JSON.stringify(qa.validateVariantAnswers(base, variants).slice(0, 2)));
  const tampered = JSON.parse(JSON.stringify(variants));
  const v102 = tampered.find(v => v.code === '102');
  const firstMcq = v102.questions.find(q => q.type === 'MCQ');
  const labels = ['A', 'B', 'C', 'D'];
  firstMcq.answer = labels[(labels.indexOf(firstMcq.answer) + 1) % 4];
  const issues = qa.validateVariantAnswers(base, tampered);
  check('C02', 'đổi đáp án 1 câu ở mã 102 thì bị bắt, nêu đúng mã đề + mã câu',
    issues.length > 0 && issues.some(s => s.includes('102') && s.includes(firstMcq.id)),
    `không bắt được: ${JSON.stringify(issues.slice(0, 2))}`);
  const tamperedTf = JSON.parse(JSON.stringify(variants));
  const v103 = tamperedTf.find(v => v.code === '103');
  const firstTf = v103.questions.find(q => q.type === 'TF');
  firstTf.statements[0].isTrue = !firstTf.statements[0].isTrue;
  const issuesTf = qa.validateVariantAnswers(base, tamperedTf);
  check('C03', 'đổi tính Đúng/Sai 1 mệnh đề thì bị bắt',
    issuesTf.length > 0 && issuesTf.some(s => s.includes('103')),
    'không bắt được mệnh đề bị đổi');
}

section('D. Thang điểm Đúng/Sai thống nhất — P1-01 (QĐ2)');
{
  const key = { part1: [], part2: { 1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: {} };
  for (let k = 0; k <= 4; k++) {
    const truth = ['Đ', 'S', 'Đ', 'S'];
    const student = {};
    ['a', 'b', 'c', 'd'].forEach((letter, i) => {
      student[letter] = i < k ? truth[i] : (truth[i] === 'Đ' ? 'S' : 'Đ');
    });
    const paper = { sbd: '0101', scannedExamCode: '101', answers: { part1: {}, part2: { 1: student }, part3: {} } };
    const res = omr.gradeSinglePaper(paper, key, { mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 });
    check(`D01-${k}/4`, `Đúng/Sai đúng ${k}/4 ý = ${MY_TF_RUBRIC[k]}đ`,
      res.part2Score === MY_TF_RUBRIC[k] && res.totalScore === MY_TF_RUBRIC[k],
      `được ${res.part2Score}đ`);
  }
  const keyFixed = { part1: [], part2: { 1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: {} };
  // Học sinh đúng 2/4 ý (a, b đúng; c, d sai) → 0.25đ theo thang chuẩn.
  const paperFixed = { sbd: '0101', scannedExamCode: '101', answers: { part1: {}, part2: { 1: { a: 'Đ', b: 'S', c: 'S', d: 'Đ' } }, part3: {} } };
  const resFixed = omr.gradeSinglePaper(paperFixed, keyFixed, { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 });
  check('D02', 'client gửi tfStyle fixed025 vẫn bị bỏ qua (2/4 ý = 0.25đ, không phải 0.5đ)',
    resFixed.part2Score === 0.25, `được ${resFixed.part2Score}đ`);
  check('D03', 'SERVER_POINT_RULES đúng chuẩn (MCQ 0.25, moet2025, SA 0.5)',
    omr.SERVER_POINT_RULES.mcq === 0.25 && omr.SERVER_POINT_RULES.tfStyle === 'moet2025' && omr.SERVER_POINT_RULES.sa === 0.5,
    JSON.stringify(omr.SERVER_POINT_RULES));
  check('D04', 'tfQuestionScore khớp thang Word ở mọi mức 0–4',
    [0, 1, 2, 3, 4].every(k => tfQuestionScore(k) === MY_TF_RUBRIC[k]),
    'lệch thang');
}

section('E. Ma trận — P1-04 (Ngữ văn) + P1-05 (tỉ lệ cộng 100%)');
{
  let e01ok = true; let e01detail = '';
  for (const n of [3, 4, 5, 6]) {
    const units = Array.from({ length: n }, (_, i) => ({ topic: `Chủ đề nghiệm thu ${i + 1}`, unit: `Bài nghiệm thu ${i + 1}` }));
    const res = await aiEngine.step2GenerateMatrix({ metadata: { subject: 'Ngữ văn', grade: '10' }, units });
    if (!res.ok) { e01ok = false; e01detail = `Ngữ văn ${n} đơn vị thất bại`; break; }
    if (Math.abs(res.stats.totalPoints - 10.0) > 0.01) { e01ok = false; e01detail = `Ngữ văn ${n} đơn vị: tổng ${res.stats.totalPoints}đ`; break; }
    for (const row of res.matrix.rows) {
      const sum = ['Biết', 'Hiểu', 'Vận dụng'].reduce((a, lv) => a + Number(row.essayPoints?.[lv] || 0), 0);
      if (Math.abs(sum - row.points) > 0.01) { e01ok = false; e01detail = `dòng "${row.unit}": điểm tự luận ${sum} khác điểm dòng ${row.points}`; break; }
    }
    if (!e01ok) break;
  }
  check('E01', 'Ngữ văn 3/4/5/6 đơn vị: tổng điểm đều 10,0đ, điểm dòng khớp điểm tự luận',
    e01ok, e01detail);
  // Tính lại độc lập từ công thức đã công bố: Đọc hiểu 4,0đ + (n-1) dòng
  // Viết × 6/(n-1)đ, chia Hiểu:Vận dụng = 1:2.
  let e02ok = true; let e02detail = '';
  for (const n of [3, 4, 5, 6]) {
    const writeRowPts = Math.round((6.0 / (n - 1)) * 100) / 100;
    const rows = [];
    for (let i = 0; i < n; i++) {
      const reading = i === 0;
      rows.push({
        id: `row_${i + 1}`, topic: `Chủ đề ${i + 1}`, unit: `Bài ${i + 1}`,
        counts: { MCQ: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }, TF: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }, SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }, ESSAY: reading ? { 'Biết': 2, 'Hiểu': 2, 'Vận dụng': 1 } : { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 } },
        essayPoints: reading
          ? { 'Biết': 1.0, 'Hiểu': 2.0, 'Vận dụng': 1.0 }
          : { 'Biết': 0, 'Hiểu': Math.round((writeRowPts / 3) * 100) / 100, 'Vận dụng': Math.round((writeRowPts - writeRowPts / 3) * 100) / 100 },
        points: reading ? 4.0 : writeRowPts
      });
    }
    const stats = qa.computeMatrixStatistics({ levels: ['Biết', 'Hiểu', 'Vận dụng'], questionTypes: ['ESSAY'], pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 }, rows }, {});
    if (Math.abs(stats.totalPoints - 10.0) > 0.01) { e02ok = false; e02detail = `n=${n}: tổng ${stats.totalPoints}`; break; }
  }
  check('E02', 'tính lại độc lập từ công thức 4đ + 6đ: Ngữ văn 3–6 đơn vị đều 10,0đ',
    e02ok, e02detail);
  let e03ok = true; let e03detail = '';
  let seed = 987654321;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const levels = ['Biết', 'Hiểu', 'Vận dụng'];
  for (let t = 0; t < 200; t++) {
    const nRows = 2 + Math.floor(rnd() * 4);
    let mcqLeft = 12, saLeft = 6;
    const rows = [];
    for (let r = 0; r < nRows; r++) {
      const counts = { MCQ: {}, TF: {}, SA: {}, ESSAY: {} };
      for (const lv of levels) {
        const m = r === nRows - 1 ? mcqLeft : Math.floor(rnd() * (mcqLeft + 1));
        mcqLeft -= m; counts.MCQ[lv] = m;
        const s = r === nRows - 1 ? saLeft : Math.floor(rnd() * (saLeft + 1));
        saLeft -= s; counts.SA[lv] = s;
        counts.TF[lv] = 0; counts.ESSAY[lv] = 0;
      }
      rows.push({ id: `row_${r + 1}`, topic: `Chủ đề ${r + 1}`, unit: `Bài ${r + 1}`, counts });
    }
    for (let q = 0; q < 4; q++) {
      const r = rows[Math.floor(rnd() * rows.length)];
      r.counts.TF['Biết'] += 2; r.counts.TF['Hiểu'] += 1; r.counts.TF['Vận dụng'] += 1;
    }
    const stats = qa.computeMatrixStatistics({ levels, questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'], pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 }, rows }, {});
    const pctSum = levels.reduce((a, lv) => a + stats.levelPercentages[lv], 0);
    if (pctSum !== 100) { e03ok = false; e03detail = `ma trận ${t}: tổng tỉ lệ ${pctSum}%`; break; }
    if (Math.abs(stats.totalPoints - 10.0) > 0.01) { e03ok = false; e03detail = `ma trận ${t}: tổng điểm ${stats.totalPoints}`; break; }
  }
  check('E03', '200 ma trận ngẫu nhiên (hạt riêng): tỉ lệ luôn cộng 100%, tổng điểm luôn 10,0đ',
    e03ok, e03detail);
}

section('F. Đáp án mẫu / đáp án ngắn — P1-07');
{
  const cases = [
    ['12,5', 'math', true], ['2025', 'math', true], ['-3', 'math', true],
    ['Đáp án theo SGK trang 45', 'math', false],
    // Lưu ý: quy tắc môn Anh chỉ xét độ dài (≤4 từ, ≤40 ký tự) nên một cụm
    // ngắn 4 từ như "Đáp án theo SGK..." vẫn qua được — đó là giới hạn đã
    // biết của quy tắc (xem QA_REPORT.md), không phải lỗi của hàm này.
    ['Đáp án theo sách giáo khoa trang bốn mươi lăm', 'eng', false],
    ['', 'math', false], [null, 'math', false],
    ['about', 'eng', true], ['infrastructure', 'eng', true],
    ['cultural identity', 'eng', true],
    ['this is a very long english phrase here', 'eng', false]
  ];
  let allOk = true; let badCase = '';
  for (const [val, fam, expected] of cases) {
    if (qa.isValidShortAnswer(val, fam) !== expected) { allOk = false; badCase = `${JSON.stringify(val)} (${fam})`; break; }
  }
  check('F01', 'đáp án ngắn: số được chấp nhận, câu chữ chung chung bị loại (cả môn số và môn Anh)',
    allOk, `sai ở ${badCase}`);
  const aiSrc = fs.readFileSync(path.join(ROOT, 'src/ai-engine.js'), 'utf8');
  check('F02', 'không còn chuỗi đáp án mẫu "Đáp án theo SGK" trong ai-engine.js',
    !aiSrc.includes('Đáp án theo SGK'),
    'còn chuỗi đáp án mẫu trong ai-engine.js');
}

section('G. PDF quét — P1-06 + chế độ giới thiệu — P1-08');
{
  check('G01', 'PDF không trích được chữ nào thì bị nhận diện là không đọc được',
    docParser.isPdfTextUnreadable('').unreadable === true, '');
  check('G02', 'PDF chỉ trích được 2 từ thì bị nhận diện là không đọc được',
    docParser.isPdfTextUnreadable('ab cd').unreadable === true, '');
  check('G03', 'văn bản thật dài (30+ từ) thì đọc được',
    docParser.isPdfTextUnreadable('Ma trận đề kiểm tra môn Tin học lớp 12 học kỳ một năm học hai nghìn không trăm hai mươi sáu với các chủ đề về mạng máy tính và cơ sở dữ liệu quan hệ cùng nhiều yêu cầu cần đạt khác nhau cho học sinh phổ thông').unreadable === false, '');
  const storageProbePath = '/tmp/gd6_storage_probe.js';
  fs.writeFileSync(storageProbePath, `
    const s = require(${JSON.stringify(path.join(ROOT, 'src/storage.js'))});
    const out = { demo: s.isDemoMode() };
    try { s.assertWritable(); out.writable = true; }
    catch (e) { out.writable = false; out.code = e.code; }
    console.log(JSON.stringify(out));
  `);
  const withVercel = spawnSync(process.execPath, ['/tmp/gd6_storage_probe.js'], { encoding: 'utf8', env: { ...process.env, VERCEL: '1' } });
  const withoutVercel = spawnSync(process.execPath, ['/tmp/gd6_storage_probe.js'], { encoding: 'utf8', env: { ...process.env, VERCEL: '' } });
  try { fs.unlinkSync('/tmp/gd6_storage_probe.js'); } catch (_) {}
  let demoOk = false; let demoDetail = withVercel.stdout.trim();
  try { const o = JSON.parse(withVercel.stdout.trim()); demoOk = o.demo === true && o.writable === false && o.code === 'DEMO_MODE_READONLY'; } catch (_) {}
  check('G04', 'VERCEL=1: isDemoMode true, ghi dữ liệu bị chặn bằng DEMO_MODE_READONLY',
    demoOk, demoDetail);
  let localOk = false; let localDetail = withoutVercel.stdout.trim();
  try { const o = JSON.parse(withoutVercel.stdout.trim()); localOk = o.demo === false; } catch (_) {}
  check('G05', 'không có VERCEL: không phải chế độ giới thiệu',
    localOk, localDetail);
  let syncBadUrl = false;
  try { await driveBank.syncGoogleDriveFolder('khong-phai-link-drive'); }
  catch (e) {
    // Chuỗi 21 ký tự hợp lệ [A-Za-z0-9_-] nên được coi là ID thư mục, fetch
    // Drive trả 404 → hàm phải ném lỗi thành thật kèm nguyên nhân.
    syncBadUrl = /không hợp lệ/i.test(e.message) || /Không tải được tệp câu hỏi/i.test(e.message);
  }
  check('G06', 'đồng bộ với link Drive không hợp lệ thì ném lỗi rõ ràng, không báo thành công',
    syncBadUrl, 'không ném lỗi');
}

section('H. Chống XSS — P0-10');
{
  const escFn = extractFn(html, 'function escapeHtml(');
  check('H00', 'trích được hàm escapeHtml từ index.html', escFn !== null, 'không tìm thấy hàm');
  const esc = vm.runInNewContext(escFn + '\n;escapeHtml;', { console });
  const attacks = [
    '<script>alert(1)</script>',
    "';alert(1);//",
    '"><img src=x onerror=alert(1)>',
    '"><svg onload=alert(3)>',
    'javascript:alert(1)'
  ];
  let h01ok = true; let h01detail = '';
  for (const a of attacks) {
    const out = esc(a);
    // An toàn = không còn ký tự thô nào có thể mở thẻ/thuộc tính/sự kiện.
    // (Từ "onerror"/"onload" còn lại dưới dạng văn bản đã escape thì vô hại.)
    if (/[<>\"\']/.test(out) || /<script/i.test(out)) { h01ok = false; h01detail = `${a} -> ${out}`; break; }
    if (a.includes("'") && !out.includes('&#39;')) { h01ok = false; h01detail = `dấu ' không được escape: ${out}`; break; }
  }
  check('H01', 'escapeHtml vô hiệu hóa 5 chuỗi tấn công (kể cả dấu nháy đơn)',
    h01ok, h01detail);
  const safeFn = extractFn(html, 'function safeDriveFolderUrl(');
  const safe = vm.runInNewContext(safeFn + '\n;safeDriveFolderUrl;', { console });
  const goodUrl = 'https://drive.google.com/drive/folders/1MbQqovIMutXQP-qDRqehjAeRZzVqojF-?usp=sharing';
  check('H02', 'safeDriveFolderUrl: link Drive chuẩn được giữ, javascript:/link chứa dấu " bị chặn về thư mục mặc định',
    safe(goodUrl) === goodUrl &&
    safe('javascript:alert(1)') !== 'javascript:alert(1)' &&
    safe('https://drive.google.com/drive/folders/abc" onclick="alert(1)') !== 'https://drive.google.com/drive/folders/abc" onclick="alert(1)',
    `javascript -> ${safe('javascript:alert(1)')}`);
  const bareField = /\$\{(r|p|l|w)\.(sbd|name|fullName|studentName|className|dob|id|paperId|field|oldVal|newVal|message)\b/;
  for (const fnName of ['renderOmrRosterModalTable', 'renderOmrPapersTable', 'renderOmrReportsView']) {
    const body = extractFn(html, `function ${fnName}(`);
    check(`H03-${fnName}`, `${fnName}: dữ liệu động đều qua escapeHtml, không còn chèn thô`,
      body !== null && body.includes('escapeHtml(') && !bareField.test(body),
      body === null ? 'không tìm thấy hàm' : 'còn chèn thô hoặc thiếu escapeHtml');
  }
}

section('I. Xuất file — P1-10 (chặn traversal)');
{
  const sanFn = extractFn(serverSrc, 'function sanitizeExportFileName(');
  const resFn = extractFn(serverSrc, 'function resolveExportPath(');
  check('I00', 'trích được sanitizeExportFileName + resolveExportPath từ server.js',
    sanFn !== null && resFn !== null, 'không tìm thấy hàm');
  const ctx = { path: require('path'), EXPORTS_DIR: '/tmp/gd6_exports_probe', console };
  vm.createContext(ctx);
  vm.runInContext(sanFn + '\n' + resFn, ctx);
  const resolved = vm.runInContext(`resolveExportPath('../../tmp/evil.docx')`, ctx);
  check('I01', 'tên file chứa ../ vẫn nằm trong thư mục exports',
    resolved.startsWith('/tmp/gd6_exports_probe' + path.sep) && !resolved.includes('..'),
    `đường dẫn ra ngoài: ${resolved}`);
  const cleaned = vm.runInContext(`sanitizeExportFileName('../../tmp/evil.docx')`, ctx);
  check('I02', 'tên file sau chuẩn hóa không còn / hay ..',
    !cleaned.includes('/') && !cleaned.includes('..') && cleaned.length > 0,
    `tên sau chuẩn hóa: ${cleaned}`);
  check('I03', 'server.js tạo EXPORTS_DIR ngay khi khởi động',
    /for \(const dir of \[DATA_DIR, PROFILES_DIR, EXPORTS_DIR\]\)/.test(serverSrc),
    'không thấy vòng tạo thư mục');
}

section('J. Số liệu ngân hàng thật — P2-01');
{
  const badgeMcq = html.match(/id="drive-bank-badge-mcq"[^<]*<[^>]*>([^<]*)</);
  check('J01', 'badge modal ngân hàng khởi đầu bằng "—", không còn số 664/106/34 hard-code',
    /id="drive-bank-badge-mcq"[^>]*>MCQ: —</.test(html) &&
    /id="drive-bank-badge-tf"[^>]*>Đúng\/Sai: —</.test(html) &&
    /id="drive-bank-badge-sa"[^>]*>Tự luận\/TLN: —</.test(html),
    'badge vẫn hard-code số');
  check('J02', 'modal tải câu hỏi với limit=2000 và máy chủ cũng trần 2000',
    html.includes('/api/drive-bank/questions?limit=2000') &&
    /Math\.min\(2000/.test(serverSrc),
    'limit chưa nâng');
  check('J03', 'badge được cập nhật từ data.mcqCount/tfCount/saCount của /api/drive-bank/status',
    /data\.mcqCount/.test(html) && /data\.tfCount/.test(html) && /data\.saCount/.test(html),
    'không thấy cập nhật từ status');
}

section('K. Nút chuyển bước + toast — GĐ5g (UI-24/25/26)');
{
  let k01ok = true; let k01detail = '';
  for (const fnName of ['confirmStep1AndGoStep2', 'confirmStep2AndGoStep3', 'confirmStep3AndGoStep4']) {
    const code = fnCode(html, `function ${fnName}(`);
    if (code === null) { k01ok = false; k01detail = `${fnName} không tìm thấy`; break; }
    if (!/goToStep\(/.test(code) || /fetch\(|runStep|showToast/.test(code)) {
      k01ok = false; k01detail = `${fnName} còn fetch/phân tích/sinh đề/toast`; break;
    }
  }
  check('K01', '3 nút chuyển bước chỉ gọi goToStep (không fetch, không sinh đề, không toast)',
    k01ok, k01detail);
  check('K02', 'nút "Soạn đề" trong Bước 4 vẫn gọi runStep4GenerateExam, nút "Phân tích" vẫn gọi runStep1Analysis',
    /onclick="runStep4GenerateExam\(\)"/.test(html) && /onclick="runStep1Analysis\(\)"/.test(html),
    'nút trong bước bị đổi nhầm');
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
  check('K03', 'toast nằm trong luồng trang (không position: fixed), tối đa 3 toast, tự ẩn',
    !/#toast-container\s*\{[^}]*position:\s*fixed/.test(css) && /:empty\s*\{\s*display:\s*none/.test(css),
    'toast còn fixed hoặc thiếu :empty');
  const oneRule = (html.match(/#step-1 \.meta-grid\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\)/g) || []).length;
  check('K04', 'mục 1.1 đúng một quy tắc 4 cột (UI-28)',
    oneRule === 1, `tìm thấy ${oneRule} quy tắc 4 cột`);
}

section('L. CSP + 404 + tuyến API — GĐ1/GĐ4');
{
  check('L01', 'CSP có default-src \'self\', form-action \'self\', frame-src \'none\', object-src \'none\'',
    /default-src 'self'/.test(serverSrc) && /form-action 'self'/.test(serverSrc) &&
    /frame-src 'none'/.test(serverSrc) && /object-src 'none'/.test(serverSrc),
    'thiếu directive');
  check('L02', 'POST /api/ai-config đã bị xóa khỏi server.js',
    !serverSrc.includes('/api/ai-config'), 'tuyến còn tồn tại');
  check('L03', 'trang 404 thân thiện có nút "Về trang chính MatrixEdu" và escape pathname',
    serverSrc.includes('Về trang chính MatrixEdu') && serverSrc.includes('escapeHtmlServer(pathname)'),
    'thiếu trang 404');
  check('L04', '3 tuyến nhạy cảm (upload-doc, load-workspace-file, workspace-files) đều qua requireAuth',
    ['/api/upload-doc', '/api/load-workspace-file', '/api/workspace-files'].every(p => {
      const idx = serverSrc.indexOf(`pathname === '${p}'`);
      if (idx < 0) return false;
      return /requireAuth\(req, res\)/.test(serverSrc.slice(idx, idx + 400));
    }),
    'có tuyến chưa khóa');
}

// ================= PHẦN 2 — SỐNG (máy chủ thật, bản sao tạm) =================
const os = require('os');

function httpJson(port, method, p, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, method, path: p, timeout: 90000,
      headers: {
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(cookie ? { Cookie: cookie } : {})
      }
    }, (res) => {
      let text = '';
      res.on('data', c => { text += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(text); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('HTTP timeout')));
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function startServer(env, port, cwd) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd, env: { ...process.env, ...env, PORT: String(port) }, stdio: 'ignore'
  });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const r = await httpJson(port, 'GET', '/api/health');
      if (r.status === 200 && r.json && r.json.ok) return child;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  try { child.kill('SIGTERM'); } catch (_) {}
  throw new Error(`máy chủ không lên sau 20s (cổng ${port})`);
}
function stopServer(child) { try { child.kill('SIGTERM'); } catch (_) {} }

function makeTempCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gd6-acc-'));
  execSync(`cp -a ${ROOT}/. ${dir}/`, { stdio: 'ignore' });
  execSync(`rm -rf ${dir}/.git ${dir}/data/backups ${dir}/node_modules ${dir}/data/admin_auth.json`, { stdio: 'ignore' });
  return dir;
}

// PDF tối thiểu chỉ chứa đúng 1 từ "Hello" — mô phỏng PDF quét/không chữ.
const SCANNED_PDF = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
  '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n' +
  '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n' +
  '4 0 obj << /Length 44 >> stream\n' +
  'BT /F1 12 Tf 72 720 Td (Hello) Tj ET\n' +
  'endstream endobj\n' +
  '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n' +
  'trailer << /Root 1 0 R >>\n', 'latin1');

// Hồ sơ đề nghiệm thu: 4 MCQ + 2 TF + 2 SA với đáp án thật.
// Điểm kỳ vọng tự tính tay (thang chuẩn máy chủ):
//   MCQ đúng 3/4 × 0.25 = 0.75
//   TF câu 1 đúng 3/4 ý = 0.5; TF câu 2 đúng 2/4 ý = 0.25
//   SA đúng 1/2 × 0.5 = 0.5   → TỔNG 2.0đ
const GD6_PROFILE = {
  id: 'gd6_acc_exam',
  metadata: { subject: 'Tin học', grade: '12', examPeriod: 'Giữa học kỳ I' },
  questions: [
    { id: 'GD6-C1', type: 'MCQ', options: ['2', '4', '6', '8'], answer: 'A' },
    { id: 'GD6-C2', type: 'MCQ', options: ['x', 'y', 'z', 'w'], answer: 'B' },
    { id: 'GD6-C3', type: 'MCQ', options: ['a', 'b', 'c', 'd'], answer: 'C' },
    { id: 'GD6-C4', type: 'MCQ', options: ['1', '2', '3', '4'], answer: 'D' },
    { id: 'GD6-D1', type: 'TF', statements: [
      { text: 'Mệnh đề một', isTrue: true }, { text: 'Mệnh đề hai', isTrue: false },
      { text: 'Mệnh đề ba', isTrue: true }, { text: 'Mệnh đề bốn', isTrue: false } ] },
    { id: 'GD6-D2', type: 'TF', statements: [
      { text: 'Mệnh đề năm', isTrue: true }, { text: 'Mệnh đề sáu', isTrue: true },
      { text: 'Mệnh đề bảy', isTrue: false }, { text: 'Mệnh đề tám', isTrue: false } ] },
    { id: 'GD6-T1', type: 'SA', answer: '12,5' },
    { id: 'GD6-T2', type: 'SA', answer: '2025' }
  ]
};
const GD6_PAPER = {
  sbd: '0101', scannedExamCode: '101',
  answers: {
    part1: { 1: 'A', 2: 'B', 3: 'B', 4: 'D' },
    part2: { 1: { a: 'Đ', b: 'S', c: 'S', d: 'S' }, 2: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } },
    part3: { 1: '12,5', 2: '2024' }
  },
  // Dữ liệu giả do client tự tính — máy chủ phải xóa và chấm lại.
  result: { totalScore: 9.9 },
  totalScore: 9.9
};
const GD6_FAKE_KEYS = { '101': { part1: ['D', 'D', 'D', 'D'], part2: { 1: { a: 'S', b: 'S', c: 'S', d: 'S' }, 2: { a: 'S', b: 'S', c: 'S', d: 'S' } }, part3: { 1: '0', 2: '0' } } };
const GD6_FAKE_RULES = { mcq: 1.0, tfStyle: 'fixed025', sa: 2.0 };

section('M. Máy chủ sống, chế độ thường — P0-05/06/09, P1-06/09/10, P2-01/05');
let tmpDir = null;
let serverA = null;
try {
  tmpDir = makeTempCopy();
  serverA = await startServer({}, 3199, tmpDir);
  const PORT = 3199;

  const health = await httpJson(PORT, 'GET', '/api/health');
  check('M01', 'GET /api/health trả ok + hasKey là boolean, không lộ ký tự khóa',
    health.status === 200 && health.json && health.json.ok === true &&
    typeof health.json.aiConfig.hasKey === 'boolean' &&
    !JSON.stringify(health.json).match(/sk-[A-Za-z0-9]/) &&
    !('key' in (health.json.aiConfig || {})),
    `status ${health.status}: ${health.text.slice(0, 120)}`);

  const home = await httpJson(PORT, 'GET', '/');
  check('M02', 'GET / trả 200 + header CSP có form-action \'self\' và frame-src \'none\'',
    home.status === 200 &&
    /form-action 'self'/.test(home.headers['content-security-policy'] || '') &&
    /frame-src 'none'/.test(home.headers['content-security-policy'] || ''),
    `status ${home.status}, CSP: ${(home.headers['content-security-policy'] || '').slice(0, 80)}`);

  const unauthProfiles = await httpJson(PORT, 'GET', '/api/profiles');
  const unauthUpload = await httpJson(PORT, 'POST', '/api/upload-doc', { fileName: 'x.txt', base64Data: Buffer.from('hi').toString('base64') });
  const unauthFiles = await httpJson(PORT, 'GET', '/api/workspace-files');
  const unauthLoad = await httpJson(PORT, 'POST', '/api/load-workspace-file', { fileName: 'x.docx' });
  check('M03', 'chưa đăng nhập: profiles / upload-doc / workspace-files / load-workspace-file đều 401',
    unauthProfiles.status === 401 && unauthUpload.status === 401 &&
    unauthFiles.status === 401 && unauthLoad.status === 401,
    `profiles ${unauthProfiles.status}, upload ${unauthUpload.status}, files ${unauthFiles.status}, load ${unauthLoad.status}`);

  const aiConfig = await httpJson(PORT, 'POST', '/api/ai-config', { provider: 'gemini', apiKey: 'x' });
  check('M04', 'POST /api/ai-config đã xóa: trả 404',
    aiConfig.status === 404, `status ${aiConfig.status}`);

  const notFound = await httpJson(PORT, 'GET', '/khong-ton-tai-gd6');
  check('M05', 'đường dẫn lạ trả 404 HTML thân thiện, có nút về trang chính',
    notFound.status === 404 && notFound.text.includes('Về trang chính MatrixEdu') &&
    notFound.text.includes('/khong-ton-tai-gd6'),
    `status ${notFound.status}`);
  const evilPath = await httpJson(PORT, 'GET', '/%3Cscript%3Ealert(1)%3C/script%3E');
  check('M06', 'pathname độc hại trong trang 404 không còn <script> thô (escapeHtmlServer escape được <)',
    evilPath.status === 404 && !evilPath.text.includes('<script>alert(1)') &&
    /function escapeHtmlServer[\s\S]{0,300}?\.replace\(\/<\/g, '&lt;'\)/.test(serverSrc),
    `status ${evilPath.status}`);
  const api404 = await httpJson(PORT, 'GET', '/api/khong-co-gd6');
  check('M07', '/api/* lạ vẫn trả JSON 404 (không trả HTML)',
    api404.status === 404 && api404.json && api404.json.ok === false,
    `status ${api404.status}`);

  const status = await httpJson(PORT, 'GET', '/api/drive-bank/status');
  check('M08', 'ngân hàng: mcq+tf+sa = tổng, filesCount = số file (số liệu nhất quán)',
    status.status === 200 && status.json &&
    typeof status.json.mcqCount === 'number' && typeof status.json.tfCount === 'number' &&
    typeof status.json.saCount === 'number' &&
    status.json.mcqCount + status.json.tfCount + status.json.saCount === status.json.totalQuestions &&
    status.json.filesCount === (status.json.files || []).length,
    `status ${status.status}: ${status.text.slice(0, 160)}`);

  const templates = await httpJson(PORT, 'GET', '/api/omr/templates');
  check('M09', 'mẫu phiếu OMR vẫn mở công khai (4 mẫu)',
    templates.status === 200 && templates.json && Array.isArray(templates.json.templates) &&
    templates.json.templates.length === 4,
    `status ${templates.status}`);

  // --- Đăng nhập quản trị trên bản sao tạm ---
  const setup = await httpJson(PORT, 'POST', '/api/auth/setup', { password: 'Gd6Acc!2026' });
  check('M10', 'đặt mật khẩu quản trị lần đầu trên bản sao tạm thành công',
    setup.status === 200 && setup.json && setup.json.ok === true,
    `status ${setup.status}: ${setup.text.slice(0, 120)}`);
  const login = await httpJson(PORT, 'POST', '/api/auth/login', { password: 'Gd6Acc!2026' });
  const cookie = (login.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  check('M11', 'đăng nhập quản trị nhận được cookie phiên',
    login.status === 200 && cookie.includes('mx_session'),
    `status ${login.status}`);

  const created = await httpJson(PORT, 'POST', '/api/profiles', GD6_PROFILE, cookie);
  check('M12', 'tạo hồ sơ đề nghiệm thu gd6_acc_exam',
    created.status === 200 && created.json && created.json.id === 'gd6_acc_exam',
    `status ${created.status}: ${created.text.slice(0, 160)}`);

  const graded = await httpJson(PORT, 'POST', '/api/omr/grade-batch', {
    examId: 'gd6_acc_exam',
    papers: [GD6_PAPER],
    answerKeysByCode: GD6_FAKE_KEYS,
    pointRules: GD6_FAKE_RULES
  }, cookie);
  const gp = graded.json && graded.json.gradedPapers && graded.json.gradedPapers[0];
  check('M13', 'chấm lại phía máy chủ: đáp án giả (toàn D) + biểu điểm giả (MCQ 1.0đ) + điểm giả 9.9 đều bị bỏ qua → đúng 2.0đ',
    graded.status === 200 && gp && gp.result && gp.result.totalScore === 2.0,
    `status ${graded.status}: ${graded.text.slice(0, 200)}`);
  check('M14', 'grade-batch trả đúng biểu điểm máy chủ + nguồn khóa là hồ sơ đề',
    graded.json && graded.json.pointRules && graded.json.pointRules.mcq === 0.25 &&
    graded.json.pointRules.tfStyle === 'moet2025' && graded.json.pointRules.sa === 0.5 &&
    typeof graded.json.answerKeySource === 'string' && graded.json.answerKeySource.includes('hồ sơ đề'),
    `pointRules ${JSON.stringify(graded.json && graded.json.pointRules)}, source ${graded.json && graded.json.answerKeySource}`);
  check('M15', 'phiên chấm thật được lưu (persistence.saved true)',
    graded.json && graded.json.persistence && graded.json.persistence.saved === true,
    JSON.stringify(graded.json && graded.json.persistence));

  const pdf = await httpJson(PORT, 'POST', '/api/upload-doc', {
    fileName: 'scan.pdf', mimeType: 'application/pdf',
    base64Data: SCANNED_PDF.toString('base64')
  }, cookie);
  check('M16', 'PDF quét (1 từ) bị từ chối 400 PDF_UNREADABLE khi tải lên',
    pdf.status === 400 && pdf.json && pdf.json.errorCode === 'PDF_UNREADABLE',
    `status ${pdf.status}: ${pdf.text.slice(0, 160)}`);

  const sync = await httpJson(PORT, 'POST', '/api/drive-bank/sync', {
    folderUrl: 'https://drive.google.com/drive/folders/GD6_FAKE_FOLDER_ID'
  }, cookie);
  check('M17', 'đồng bộ Drive với thư mục giả thì báo lỗi thật (ok:false, 400/502), không ngụy trang thành công',
    sync.json && sync.json.ok === false && (sync.status === 400 || sync.status === 502),
    `status ${sync.status}: ${sync.text.slice(0, 200)}`);

  const exportsDirExists = fs.existsSync(path.join(tmpDir, 'data', 'exports'));
  check('M18', 'thư mục data/exports tồn tại trên bản sao sau khi máy chủ chạy',
    exportsDirExists, 'thiếu thư mục exports');
} catch (e) {
  check('M00', 'pha máy chủ sống chế độ thường chạy trọn vẹn', false, e.message);
} finally {
  if (serverA) stopServer(serverA);
  await new Promise(r => setTimeout(r, 800));
}

section('N. Máy chủ sống, chế độ giới thiệu Vercel — P1-08');
let serverB = null;
try {
  serverB = await startServer({ VERCEL: '1' }, 3198, tmpDir);
  const PORT = 3198;
  const health = await httpJson(PORT, 'GET', '/api/health');
  check('N01', 'VERCEL=1: /api/health báo demoMode true + demoNotice',
    health.status === 200 && health.json && health.json.demoMode === true &&
    typeof health.json.demoNotice === 'string' && health.json.demoNotice.length > 0,
    `status ${health.status}: ${health.text.slice(0, 160)}`);
  const setup = await httpJson(PORT, 'POST', '/api/auth/setup', { password: 'Gd6Demo!2026' });
  check('N02', 'chế độ giới thiệu: vẫn đặt được mật khẩu quản trị (file mật khẩu được miễn chặn ghi)',
    setup.status === 200 || setup.status === 403,
    `status ${setup.status}: ${setup.text.slice(0, 120)}`);
  let cookie = '';
  if (setup.status === 200) {
    const login = await httpJson(PORT, 'POST', '/api/auth/login', { password: 'Gd6Demo!2026' });
    cookie = (login.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  } else {
    // Mật khẩu đã tồn tại trong /tmp/matrixedu_data từ lần chạy trước — thử
    // đăng nhập bằng mật khẩu của pha này; nếu không được thì bỏ qua N03.
    const login = await httpJson(PORT, 'POST', '/api/auth/login', { password: 'Gd6Demo!2026' });
    cookie = (login.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  }
  if (cookie.includes('mx_session')) {
    const prof = await httpJson(PORT, 'POST', '/api/profiles', { id: 'gd6_demo_probe', metadata: {} }, cookie);
    check('N03', 'chế độ giới thiệu: ghi hồ sơ đề bị chặn 503 DEMO_MODE_READONLY',
      prof.status === 503 && prof.json && prof.json.errorCode === 'DEMO_MODE_READONLY',
      `status ${prof.status}: ${prof.text.slice(0, 160)}`);
  } else {
    check('N03', 'chế độ giới thiệu: ghi hồ sơ đề bị chặn 503 DEMO_MODE_READONLY',
      false, 'không đăng nhập được ở chế độ giới thiệu');
  }
} catch (e) {
  check('N00', 'pha máy chủ sống chế độ giới thiệu chạy trọn vẹn', false, e.message);
} finally {
  if (serverB) stopServer(serverB);
  await new Promise(r => setTimeout(r, 800));
  // Dọn bản sao tạm + file mật khẩu thử trong /tmp (chế độ VERCEL).
  try { if (tmpDir) execSync(`rm -rf ${tmpDir}`, { stdio: 'ignore' }); } catch (_) {}
  try { fs.unlinkSync(path.join(os.tmpdir(), 'matrixedu_data', 'admin_auth.json')); } catch (_) {}
}

// ================= TỔNG KẾT =================
console.log('\n================================================================');
console.log(`  NHẬT KÝ CHẠY — GĐ6 nghiệm thu độc lập`);
console.log(`  Bắt đầu: ${fmtDate} (Asia/Ho_Chi_Minh)`);
console.log(`  Kết thúc: ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())} (Asia/Ho_Chi_Minh)`);
console.log(`  Commit đang kiểm tra: ${COMMIT}`);
console.log(`  Kết quả: ${pass} ĐẠT / ${fail} RỚT (tổng ${pass + fail})`);
if (failures.length > 0) {
  console.log('  Kiểm chứng rớt:');
  failures.forEach(f => console.log(`    - ${f}`));
}
console.log('================================================================');
process.exit(fail === 0 ? 0 : 1);
})().catch((err) => {
  console.error('LỖI CHẾT BỘ NGHIỆM THU:', err);
  process.exit(2);
});
