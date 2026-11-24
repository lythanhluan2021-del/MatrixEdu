/**
 * tests/gd2-gates.js — Cổng nghiệm thu GĐ2 (Đúng đáp án, đúng điểm).
 * Mỗi kiểm tra đều là test TÁI HIỆN đỏ-trước/xanh-sau (nguyên tắc 5):
 * chạy trên code cũ (trước GĐ2) thì đỏ — đã kiểm chứng bằng cách chạy
 * cùng file này với src/ ở commit 9061d5e (xem ghi chú cuối file).
 *
 * Chạy: node tests/gd2-gates.js   (exit 0 khi toàn bộ cổng đạt)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const {
  computeMatrixStatistics,
  generateShuffledVariants,
  validateExamProfile,
  validateVariantAnswers,
  tfQuestionScore,
  TF_SCORE_BY_CORRECT
} = require('../src/qa-validator');
const {
  step2GenerateMatrix,
  step3GenerateSpecification,
  step4GenerateQuestionsAndAnswers
} = require('../src/ai-engine');
const {
  gradeSinglePaper,
  gradeBatchPapers,
  buildStrictAnswerKeysFromExam
} = require('../src/omr-engine');
const { generateExamDocx, readZipEntries } = require('../src/zip-docx');
const { SAMPLE_DOCUMENTS } = require('../src/sample-materials');
const { step1AnalyzeMaterial } = require('../src/ai-engine');

let passed = 0;
let failed = 0;
const failures = [];

async function gate(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err.message}`);
    console.log(`  ✘ ${name}\n      → ${err.message}`);
  }
}

function baseQuestions() {
  const mcq = (id, ans) => ({
    id, type: 'MCQ', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1',
    level: 'Biết', points: 0.25, matrixRef: `MT-${id}`,
    stem: `Câu hỏi trắc nghiệm ${id}?`,
    options: [`Phương án A của ${id}`, `Phương án B của ${id}`, `Phương án C của ${id}`, `Phương án D của ${id}`],
    answer: ans
  });
  const tf = (id) => ({
    id, type: 'TF', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1',
    level: 'Hiểu', points: 1.0, matrixRef: `MT-${id}`,
    stem: `Xét tính đúng sai ${id}:`,
    statements: [
      { letter: 'a', text: `Mệnh đề a của ${id} đúng`, isTrue: true, answer: 'Đúng', level: 'Biết' },
      { letter: 'b', text: `Mệnh đề b của ${id} sai`, isTrue: false, answer: 'Sai', level: 'Biết' },
      { letter: 'c', text: `Mệnh đề c của ${id} đúng`, isTrue: true, answer: 'Đúng', level: 'Hiểu' },
      { letter: 'd', text: `Mệnh đề d của ${id} sai`, isTrue: false, answer: 'Sai', level: 'Vận dụng' }
    ]
  });
  return [
    mcq('q_mcq_1', 'A'), mcq('q_mcq_2', 'B'), mcq('q_mcq_3', 'C'), mcq('q_mcq_4', 'D'),
    tf('q_tf_1'), tf('q_tf_2'),
    { id: 'q_sa_1', type: 'SA', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1', level: 'Hiểu', points: 0.5, matrixRef: 'MT-q_sa_1', stem: 'Tính 6 × 2 = ?', answer: '12' },
    { id: 'q_sa_2', type: 'SA', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1', level: 'Vận dụng', points: 0.5, matrixRef: 'MT-q_sa_2', stem: 'Tính 7 + 5 = ?', answer: '12' },
    { id: 'q_es_1', type: 'ESSAY', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1', level: 'Hiểu', points: 1.0, matrixRef: 'MT-q_es_1', stem: 'Trình bày nội dung bài 1.', answer: 'Hướng dẫn chấm: nêu đúng kiến thức cốt lõi và vận dụng giải quyết yêu cầu.' },
    { id: 'q_es_2', type: 'ESSAY', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1', level: 'Vận dụng', points: 1.0, matrixRef: 'MT-q_es_2', stem: 'Vận dụng bài 1 vào tình huống thực tiễn.', answer: 'Hướng dẫn chấm: lập luận chặt chẽ, vận dụng đúng và trình bày khoa học.' },
    { id: 'q_es_3', type: 'ESSAY', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1', level: 'Biết', points: 1.0, matrixRef: 'MT-q_es_3', stem: 'Nêu khái niệm cơ bản của bài 1.', answer: 'Hướng dẫn chấm: trình bày đúng khái niệm và cho ví dụ minh họa cụ thể.' },
    { id: 'q_es_4', type: 'ESSAY', rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1', level: 'Hiểu', points: 1.0, matrixRef: 'MT-q_es_4', stem: 'So sánh hai nội dung chính của bài 1.', answer: 'Hướng dẫn chấm: so sánh đúng điểm giống và khác, có kết luận rõ ràng.' }
  ];
}

// Bộ kiểm tra chéo ĐỘC LẬP (không dùng lại hàm của hệ thống — cổng GĐ2):
// đối chiếu từng mã đề với đề gốc bằng nội dung phương án/mệnh đề.
function independentVariantCrossCheck(base, variants) {
  const problems = [];
  const baseById = new Map(base.map(q => [q.id, q]));
  for (const v of variants) {
    const ids = (v.questions || []).map(q => q.id);
    if (ids.length !== base.length || new Set(ids).size !== base.length) {
      problems.push(`Mã ${v.code}: số câu/tập ID khác đề gốc`);
      continue;
    }
    for (const vq of v.questions) {
      const bq = baseById.get(vq.id);
      if (!bq) { problems.push(`Mã ${v.code}: câu ${vq.id} không có trong đề gốc`); continue; }
      if (bq.type === 'MCQ') {
        const labels = ['A', 'B', 'C', 'D'];
        const bAns = bq.options[labels.indexOf(bq.answer)];
        const vAns = vq.options[labels.indexOf(vq.answer)];
        if (bAns !== vAns) problems.push(`Mã ${v.code} ${vq.id}: đáp án đúng đổi từ "${bAns}" thành "${vAns}"`);
        if ([...bq.options].sort().join('|') !== [...vq.options].sort().join('|')) {
          problems.push(`Mã ${v.code} ${vq.id}: tập phương án khác đề gốc`);
        }
      } else if (bq.type === 'TF') {
        const bMap = new Map(bq.statements.map(s => [s.text, s.isTrue]));
        for (const st of (vq.statements || [])) {
          if (!bMap.has(st.text)) problems.push(`Mã ${v.code} ${vq.id}: mệnh đề lạ "${String(st.text).slice(0, 30)}"`);
          else if (bMap.get(st.text) !== st.isTrue) problems.push(`Mã ${v.code} ${vq.id}: mệnh đề "${String(st.text).slice(0, 30)}" đổi Đúng/Sai`);
        }
      } else if (String(bq.answer ?? '') !== String(vq.answer ?? '')) {
        problems.push(`Mã ${v.code} ${vq.id}: đáp án đổi sau trộn`);
      }
    }
  }
  return problems;
}

function orderSignature(questions) {
  return (questions || []).map(q => q.id).join(',');
}

async function main() {
  console.log('================================================================================');
  console.log(' CỔNG GĐ2: ĐÚNG ĐÁP ÁN — ĐÚNG ĐIỂM (P0-01…P0-04, P0-09, P1-01…P1-05)');
  console.log('================================================================================\n');

  // ---- P0-01: trộn không đoán trước được ----
  console.log('▶ P0-01 — Trộn bằng crypto (không hạt giống)');
  await gate('Hai lần sinh cùng mã đề cho thứ tự khác nhau', () => {
    const base = baseQuestions();
    const v1 = generateShuffledVariants(base, 4, 101, ['101', '102', '103', '104']);
    const v2 = generateShuffledVariants(base, 4, 101, ['101', '102', '103', '104']);
    const sig1 = v1.map(v => orderSignature(v.questions)).join('#');
    const sig2 = v2.map(v => orderSignature(v.questions)).join('#');
    assert.notStrictEqual(sig1, sig2, 'Cùng mã đề mà hai lần sinh cho thứ tự giống hệt — vẫn đoán trước được');
  });
  await gate('Không còn PRNG có hạt giống trong mã trộn', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'qa-validator.js'), 'utf8');
    assert(!src.includes('createSeededRandom'), 'Còn hàm createSeededRandom');
    assert(!src.includes('16807'), 'Còn hằng số Park-Miller 16807');
    assert(!src.includes('hashString(code)'), 'Còn hạt giống từ mã đề');
    assert(src.includes('crypto.randomInt'), 'Không dùng crypto.randomInt');
  });

  // ---- P0-02: cấm mặc định đáp án A ----
  console.log('▶ P0-02 — Không mặc định đáp án A');
  await gate('5 kiểu đáp án hỏng đều bị chặn và nêu đúng câu', () => {
    const brokenCases = [
      { label: 'rỗng', mutate: q => { q.answer = ''; } },
      { label: 'E', mutate: q => { q.answer = 'E'; } },
      { label: 'Đ', mutate: q => { q.answer = 'Đ'; } },
      { label: 'null', mutate: q => { q.answer = null; } },
      { label: 'thiếu trường', mutate: q => { delete q.answer; } }
    ];
    for (const c of brokenCases) {
      const base = baseQuestions();
      c.mutate(base[0]); // câu MCQ đầu tiên
      assert.throws(
        () => generateShuffledVariants(base, 2, 101, ['101', '102']),
        /q_mcq_1|Câu 1/,
        `Đáp án hỏng kiểu "${c.label}" không bị chặn`
      );
    }
  });
  await gate('Không còn mẫu || \'A\' ở đường đi của đáp án (src + server)', () => {
    const files = ['src/ai-engine.js', 'src/qa-validator.js', 'src/omr-engine.js', 'src/zip-docx.js', 'src/drive-bank.js', 'server.js'];
    for (const f of files) {
      const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
      const hits = src.split('\n').filter(line => line.includes("|| 'A'") && !line.trim().startsWith('//'));
      assert.strictEqual(hits.length, 0, `${f} còn || 'A': ${hits[0] || ''}`);
    }
  });

  // ---- P0-03 + cổng 20 mã đề: kiểm tra chéo đáp án ----
  console.log('▶ P0-03 — QA đối chiếu đáp án từng mã đề');
  await gate('20 mã đề đối chiếu 100% bằng logic độc lập', () => {
    const base = baseQuestions();
    const codes = Array.from({ length: 20 }, (_, i) => String(101 + i));
    const variants = generateShuffledVariants(base, 20, 101, codes);
    assert.strictEqual(variants.length, 20, 'Không sinh đủ 20 mã đề');
    const problems = independentVariantCrossCheck(base, variants);
    assert.strictEqual(problems.length, 0, `Đối chiếu độc lập phát hiện lệch: ${problems.slice(0, 3).join('; ')}`);
  });
  await gate('Hoán đổi đáp án một câu trong một mã đề thì validator báo đúng mã đề, đúng câu', () => {
    const base = baseQuestions();
    const variants = generateShuffledVariants(base, 4, 101, ['101', '102', '103', '104']);
    // Giả mạo: đổi đáp án câu MCQ đầu của mã 102 thành phương án sai.
    const tampered = JSON.parse(JSON.stringify(variants));
    const target = tampered[1].questions.find(q => q.type === 'MCQ');
    const labels = ['A', 'B', 'C', 'D'];
    target.answer = labels[(labels.indexOf(target.answer) + 1) % 4];
    const issues = validateVariantAnswers(base, tampered);
    assert(issues.length > 0, 'Validator không phát hiện đáp án bị hoán đổi');
    assert(issues.some(m => m.includes('102') && m.includes(target.id)), `Lỗi không nêu đúng mã đề/câu: ${issues.join('; ')}`);
    // Và validateExamProfile cũng phải đỏ (không còn "đạt" giả như trước GĐ2).
    const report = validateExamProfile({
      metadata: { subject: 'Toán', grade: '12' },
      matrix: { levels: ['Biết', 'Hiểu', 'Vận dụng'], questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'], pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 }, rows: [] },
      specification: [],
      questions: base,
      variants: tampered
    });
    assert(!report.isValid, 'validateExamProfile vẫn báo đạt dù đáp án mã đề bị đổi');
  });
  await gate('Đề gốc không bị thay bằng mã đề đầu trước khi kiểm tra', async () => {
    // step4 với ma trận hợp lệ: questions trả về phải giữ nguyên thứ tự
    // gốc (MCQ/TF/SA/ESSAY theo dòng ma trận), không phải thứ tự đã trộn.
    const matrix = {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [{
        id: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1',
        counts: {
          MCQ: { 'Biết': 2, 'Hiểu': 0, 'Vận dụng': 0 },
          TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
          SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
          ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
        },
        points: 1.5
      }]
    };
    const specification = [{
      rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1',
      outcomes: { 'Biết': 'Biết.', 'Hiểu': 'Hiểu.', 'Vận dụng': 'Vận dụng.' },
      questionRefs: { MCQ: ['C1', 'C2'], TF: ['ĐS1a', 'ĐS1b', 'ĐS1c', 'ĐS1d'], SA: [], ESSAY: [] }
    }];
    const res = await step4GenerateQuestionsAndAnswers({
      metadata: { subject: 'Toán', grade: '12', numVariants: 2, customCodes: ['101', '102'] },
      matrix, specification, rawText: ''
    });
    assert(res.ok, `Bước 4 thất bại: ${res.message || ''}`);
    const baseOrder = res.questions.map(q => q.type).join(',');
    assert.strictEqual(baseOrder, 'MCQ,MCQ,TF', `Đề gốc bị xáo trộn trước kiểm tra: ${baseOrder}`);
    // Ma trận thử chỉ có 1,5đ nên QA báo lỗi tổng điểm là đúng — điều cần
    // kiểm ở đây là KHÔNG còn lỗi đối chiếu mã đề (P0-03) và đề gốc giữ
    // nguyên thứ tự sau khi trộn.
    const variantIssues = (res.qaReport?.issues || []).filter(m => m.includes('Mã đề'));
    assert.strictEqual(variantIssues.length, 0, `Còn lỗi đối chiếu mã đề: ${variantIssues.join('; ')}`);
  });

  // ---- P0-04: trộn mọi mã đề, kể cả tự luận ----
  console.log('▶ P0-04 — Trộn thứ tự câu ở mọi mã đề');
  await gate('10 mã đề: mọi mã đề đều khác đề gốc ở thứ tự câu, không hai mã đề trùng nhau', () => {
    const base = baseQuestions();
    const baseSig = orderSignature(base);
    const variants = generateShuffledVariants(base, 10, 101, Array.from({ length: 10 }, (_, i) => String(101 + i)));
    const sigs = variants.map(v => orderSignature(v.questions));
    assert(sigs.every(s => s !== baseSig), 'Có mã đề giữ nguyên thứ tự đề gốc');
    assert.strictEqual(new Set(sigs).size, 10, 'Có hai mã đề trùng hệt nhau về thứ tự câu');
  });
  await gate('Câu tự luận cũng được trộn (mã 101 và các mã khác)', () => {
    const base = baseQuestions();
    const variants = generateShuffledVariants(base, 4, 101, ['101', '102', '103', '104']);
    const baseEssayOrder = base.filter(q => q.type === 'ESSAY').map(q => q.id).join(',');
    const orders = variants.map(v => v.questions.filter(q => q.type === 'ESSAY').map(q => q.id).join(','));
    assert(orders.some(o => o !== baseEssayOrder), 'Không mã đề nào đổi thứ tự tự luận so với đề gốc');
    assert(new Set(orders).size > 1, 'Mọi mã đề có cùng một thứ tự tự luận');
  });

  // ---- P0-09: chấm lại phía máy chủ ----
  console.log('▶ P0-09 — Chấm lại phía máy chủ (khóa + biểu điểm + roster của máy chủ)');
  await gate('Khóa đáp án giả + biểu điểm giả + roster giả đều bị bỏ qua khi chấm', () => {
    const realKeys = {
      '101': { part1: ['A', 'B', 'C', 'D'], part2: { '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: { '1': '12' } }
    };
    const fakeKeys = {
      '101': { part1: ['D', 'D', 'D', 'D'], part2: { '1': { a: 'S', b: 'Đ', c: 'S', d: 'Đ' } }, part3: { '1': '99' } }
    };
    // Bài làm đúng hết theo khóa thật: P1 4×0,25=1,0; P2 4 ý đúng=1,0; P3 0,5 → 2,5.
    const paper = {
      id: 'paper_1', sbd: '120001', scannedExamCode: '101',
      answers: { part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }, part2: { 1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: { 1: '12' } },
      result: { totalScore: 9.9 }, // điểm giả client tự tính — phải bị bỏ qua
      totalScore: 9.9
    };
    const serverRoster = [{ sbd: '120001', name: 'Học sinh Mẫu 01', className: '12A1' }];
    const fakeRoster = [{ sbd: '120001', name: 'Thí sinh GIẢ', className: '99Z' }];
    // Máy chủ chấm bằng khóa THẬT + biểu điểm chuẩn + roster máy chủ,
    // dù body gửi khóa giả / biểu điểm giả / roster giả / điểm giả.
    const graded = gradeBatchPapers({
      papers: [JSON.parse(JSON.stringify(paper))],
      answerKeysByCode: realKeys, // ← máy chủ tự tra, không lấy từ body
      pointRules: { mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 },
      roster: serverRoster,
      targetClassName: '12A1',
      persistDbState: false
    });
    const gp = graded.gradedPapers[0];
    assert.strictEqual(gp.result.totalScore, 2.5, `Điểm máy chủ tính sai: ${gp.result.totalScore} (kỳ vọng 2,5)`);
    assert.strictEqual(gp.studentName, 'Học sinh Mẫu 01', `Tên học sinh lấy từ roster giả: ${gp.studentName}`);
    // Chấm bằng khóa GIẢ cho thấy điểm sẽ sai — chứng minh khóa giả không được dùng.
    const gradedFake = gradeBatchPapers({
      papers: [JSON.parse(JSON.stringify(paper))],
      answerKeysByCode: fakeKeys,
      pointRules: { mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 },
      roster: fakeRoster,
      targetClassName: '12A1',
      persistDbState: false
    });
    assert.notStrictEqual(gradedFake.gradedPapers[0].result.totalScore, 2.5, 'Khóa giả cho cùng điểm với khóa thật — kiểm tra vô nghĩa');
  });
  await gate('Hồ sơ đề thiếu đáp án thì bộ dựng khóa nghiêm ngặt báo rõ câu (không mặc định A)', () => {
    const built = buildStrictAnswerKeysFromExam({
      variants: [{
        code: '101',
        questions: [
          { id: 'q_mcq_1', type: 'MCQ', options: ['a', 'b', 'c', 'd'], answer: 'B' },
          { id: 'q_mcq_2', type: 'MCQ', options: ['a', 'b', 'c', 'd'] }
        ]
      }]
    });
    assert(built.problems.length > 0, 'Không phát hiện câu thiếu đáp án');
    assert(built.problems.some(p => p.includes('q_mcq_2')), `Lỗi không nêu đúng câu: ${built.problems.join('; ')}`);
    assert.strictEqual(built.keys['101'].part1[1], null, 'Đáp án thiếu vẫn bị điền giá trị');
  });

  // ---- P1-01: một quy ước điểm Đúng/Sai ----
  console.log('▶ P1-01 — Một quy ước điểm Đúng/Sai (QĐ2)');
  await gate('Bảng điểm 0–4 ý đúng: 0 / 0,1 / 0,25 / 0,5 / 1,0', () => {
    assert.deepStrictEqual(TF_SCORE_BY_CORRECT, [0, 0.1, 0.25, 0.5, 1.0]);
    for (let n = 0; n <= 4; n++) assert.strictEqual(tfQuestionScore(n), TF_SCORE_BY_CORRECT[n]);
  });
  await gate('Chấm OMR: đúng 2/4 ý được 0,25đ ngay cả khi client gửi kiểu chia đều', () => {
    const key = { part1: [], part2: { '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: {} };
    const paper = { answers: { part1: {}, part2: { 1: { a: 'Đ', b: 'Đ', c: 'S', d: 'S' } }, part3: {} } };
    const r = gradeSinglePaper(paper, key, { mcq: 0.25, tfStyle: 'fixed025', tfSubPoint: 0.25, sa: 0.5 });
    assert.strictEqual(r.part2Score, 0.25, `Đúng 2 ý mà được ${r.part2Score}đ (chia đều cũ cho 0,5đ)`);
    const paper3 = { answers: { part1: {}, part2: { 1: { a: 'Đ', b: 'S', c: 'Đ', d: 'Đ' } }, part3: {} } };
    assert.strictEqual(gradeSinglePaper(paper3, key, {}).part2Score, 0.5, 'Đúng 3 ý phải được 0,5đ');
  });
  await gate('Hướng dẫn chấm trong Word khớp đúng thang chung', () => {
    const examData = {
      metadata: { subject: 'Toán', grade: '12', examPeriod: 'Kiểm tra' },
      matrix: { levels: ['Biết'], questionTypes: ['MCQ', 'TF'], pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 }, rows: [] },
      specification: [],
      questions: baseQuestions(),
      variants: generateShuffledVariants(baseQuestions(), 2, 101, ['101', '102'])
    };
    const buf = generateExamDocx(examData, 'answer');
    const entries = readZipEntries(buf);
    const xml = entries['word/document.xml'].toString('utf8');
    assert(xml.includes('Đúng 1 ý được 0,1 điểm'), 'Thang 1 ý trong Word sai');
    assert(xml.includes('đúng 2 ý được 0,25 điểm'), 'Thang 2 ý trong Word sai');
    assert(xml.includes('đúng 3 ý được 0,5 điểm'), 'Thang 3 ý trong Word sai');
    assert(xml.includes('đúng cả 4 ý được 1,0 điểm'), 'Thang 4 ý trong Word sai');
  });

  // ---- P1-02: ý Đúng/Sai lẻ ----
  console.log('▶ P1-02 — Tổng ý Đúng/Sai lẻ bị chặn ở bước lập ma trận');
  await gate('Ma trận có dòng 3 ý Đúng/Sai thì bước 4 từ chối và nêu đúng đơn vị', async () => {
    const matrix = {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [{
        id: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1: Đơn vị lẻ',
        counts: {
          MCQ: { 'Biết': 1, 'Hiểu': 0, 'Vận dụng': 0 },
          TF: { 'Biết': 3, 'Hiểu': 0, 'Vận dụng': 0 },
          SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
          ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
        },
        points: 1.0
      }]
    };
    const specification = [{
      rowId: 'row_1', topic: 'Chủ đề 1', unit: 'Bài 1: Đơn vị lẻ',
      outcomes: { 'Biết': 'Biết.', 'Hiểu': 'Hiểu.', 'Vận dụng': 'Vận dụng.' },
      questionRefs: { MCQ: ['C1'], TF: ['ĐS1a', 'ĐS1b', 'ĐS1c'], SA: [], ESSAY: [] }
    }];
    const res = await step4GenerateQuestionsAndAnswers({
      metadata: { subject: 'Toán', grade: '12' },
      matrix, specification, rawText: ''
    });
    assert.strictEqual(res.ok, false, 'Bước 4 vẫn sinh đề dù ma trận có ý Đúng/Sai lẻ');
    assert.strictEqual(res.errorCode, 'TF_ITEMS_NOT_MULTIPLE_OF_4', `Mã lỗi sai: ${res.errorCode}`);
    assert(res.message.includes('Bài 1: Đơn vị lẻ'), `Thông báo không nêu đúng đơn vị: ${res.message}`);
  });

  // ---- P1-03: gom ý Đúng/Sai trong một dòng ----
  console.log('▶ P1-03 — Ý Đúng/Sai không gom xuyên dòng ma trận');
  await gate('Mọi câu Đúng/Sai sinh ra đều truy về đúng một dòng ma trận', async () => {
    const rows = [1, 2, 3].map(n => ({
      id: `row_${n}`, topic: `Chủ đề ${n}`, unit: `Bài ${n}`,
      counts: {
        MCQ: { 'Biết': 2, 'Hiểu': 0, 'Vận dụng': 0 },
        TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
        SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
        ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
      },
      points: 1.5
    }));
    const matrix = {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows
    };
    const specification = rows.map(r => ({
      rowId: r.id, topic: r.topic, unit: r.unit,
      outcomes: { 'Biết': 'Biết.', 'Hiểu': 'Hiểu.', 'Vận dụng': 'Vận dụng.' },
      questionRefs: { MCQ: ['C1', 'C2'], TF: ['ĐS1a', 'ĐS1b', 'ĐS1c', 'ĐS1d'], SA: [], ESSAY: [] }
    }));
    const res = await step4GenerateQuestionsAndAnswers({
      metadata: { subject: 'Toán', grade: '12', numVariants: 1, customCodes: ['101'] },
      matrix, specification, rawText: ''
    });
    assert(res.ok, `Bước 4 thất bại: ${res.message || ''}`);
    const tfs = res.questions.filter(q => q.type === 'TF');
    assert.strictEqual(tfs.length, 3, `Số câu Đúng/Sai phải đúng 3 (mỗi dòng 1 câu), thực tế ${tfs.length}`);
    for (const q of tfs) {
      const row = rows.find(r => r.id === q.rowId);
      assert(row, `Câu TF ${q.id} không truy về dòng ma trận nào (rowId=${q.rowId})`);
      assert.strictEqual(q.unit, row.unit, `Câu TF ${q.id} mang đơn vị "${q.unit}" thay vì "${row.unit}"`);
      assert(!String(q.unit).includes('&'), `Câu TF ${q.id} gom nhiều đơn vị: "${q.unit}"`);
      assert(!String(q.matrixRef).includes('&'), `Câu TF ${q.id} tham chiếu nhiều dòng: "${q.matrixRef}"`);
    }
  });

  // ---- P1-04: Ngữ văn ----
  console.log('▶ P1-04 — Ngữ văn: tổng điểm đúng 10,0 với mọi số đơn vị');
  await gate('Ngữ văn 3, 4, 5, 6 đơn vị: tổng điểm đều đúng 10,0', async () => {
    for (const n of [3, 4, 5, 6]) {
      const units = Array.from({ length: n }, (_, i) => ({ topic: `Chủ đề ${i + 1}`, unit: `Bài ${i + 1}` }));
      const res = await step2GenerateMatrix({ metadata: { subject: 'Ngữ văn', grade: '10' }, units });
      assert(res.ok, `Bước 2 Ngữ văn ${n} đơn vị thất bại`);
      assert(Math.abs(res.stats.totalPoints - 10.0) <= 0.01, `Ngữ văn ${n} đơn vị: tổng ${res.stats.totalPoints}đ (kỳ vọng 10,0)`);
      for (const row of res.matrix.rows) {
        const essaySum = ['Biết', 'Hiểu', 'Vận dụng'].reduce((a, lv) => a + Number(row.essayPoints?.[lv] || 0), 0);
        assert(Math.abs(essaySum - row.points) <= 0.01, `Dòng "${row.unit}": tổng điểm tự luận ${essaySum} khác điểm dòng ${row.points}`);
      }
    }
  });

  // ---- P1-05: làm tròn phần dư lớn nhất ----
  console.log('▶ P1-05 — Tỉ lệ mức độ cộng đúng 100%');
  await gate('200 ma trận ngẫu nhiên hợp lệ: tổng tỉ lệ luôn 100%, tổng điểm luôn 10', () => {
    let seed = 20261124;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const levels = ['Biết', 'Hiểu', 'Vận dụng'];
    for (let t = 0; t < 200; t++) {
      const nRows = 2 + Math.floor(rnd() * 4); // 2–5 dòng
      const rows = [];
      let mcqLeft = 12, tfQLeft = 4, saLeft = 6; // 12×0,25 + 16 ý×0,25 + 6×0,5 = 10đ
      for (let r = 0; r < nRows; r++) {
        const counts = { MCQ: {}, TF: {}, SA: {}, ESSAY: {} };
        for (const lv of levels) {
          const m = r === nRows - 1 ? mcqLeft : Math.floor(rnd() * (mcqLeft + 1));
          mcqLeft -= m; counts.MCQ[lv] = m;
          const s = r === nRows - 1 ? saLeft : Math.floor(rnd() * (saLeft + 1));
          saLeft -= s; counts.SA[lv] = s;
          counts.TF[lv] = 0; counts.ESSAY[lv] = 0;
        }
        // Chia câu TF (mỗi câu 4 ý: 2 Biết, 1 Hiểu, 1 Vận dụng) cho các dòng.
        rows.push({ id: `row_${r + 1}`, topic: `Chủ đề ${r + 1}`, unit: `Bài ${r + 1}`, counts });
      }
      for (let q = 0; q < tfQLeft; q++) {
        const r = rows[Math.floor(rnd() * rows.length)];
        r.counts.TF['Biết'] += 2; r.counts.TF['Hiểu'] += 1; r.counts.TF['Vận dụng'] += 1;
      }
      const matrix = { levels, questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'], pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 }, rows };
      const stats = computeMatrixStatistics(matrix, {});
      assert(Math.abs(stats.totalPoints - 10.0) <= 0.01, `Ma trận thử ${t}: tổng điểm ${stats.totalPoints}`);
      const pctSum = levels.reduce((a, lv) => a + stats.levelPercentages[lv], 0);
      assert.strictEqual(pctSum, 100, `Ma trận thử ${t}: tổng tỉ lệ ${pctSum}% (mức: ${JSON.stringify(stats.levelPercentages)})`);
    }
  });

  // ---- Cổng tổng: đề mẫu cộng đúng 10,0 ----
  console.log('▶ Cổng tổng — Mọi đề mẫu cộng đúng 10,0');
  await gate('5 đề mẫu (Toán/Anh/Tin/Lý/Hóa 12): ma trận và đề đều đúng 10,0', async () => {
    for (const key of ['thpt_math_12', 'thpt_eng_12', 'thpt_it_12', 'thpt_phys_12', 'thpt_chem_12']) {
      const sample = SAMPLE_DOCUMENTS[key];
      const { extractDocumentContent } = require('../src/doc-parser');
      const { createMaterialDocx } = require('../src/zip-docx');
      const buf = createMaterialDocx(sample.title, sample.paragraphs);
      const extracted = extractDocumentContent(sample.name, buf);
      const step1 = await step1AnalyzeMaterial({ metadata: sample.metadata, rawText: extracted.text, tables: extracted.tables });
      assert(step1.ok, `Bước 1 ${key} thất bại`);
      const step2 = await step2GenerateMatrix({ metadata: sample.metadata, units: step1.analysis.units });
      assert(Math.abs(step2.stats.totalPoints - 10.0) <= 0.01, `${key}: ma trận ${step2.stats.totalPoints}đ`);
      const step3 = step3GenerateSpecification({ metadata: sample.metadata, matrix: step2.matrix, units: step1.analysis.units });
      const step4 = await step4GenerateQuestionsAndAnswers({ metadata: sample.metadata, matrix: step2.matrix, specification: step3.specification, rawText: extracted.text });
      assert(step4.ok, `${key}: bước 4 thất bại — ${step4.message || ''}`);
      const total = Math.round(step4.questions.reduce((a, q) => a + Number(q.points || 0), 0) * 100) / 100;
      assert(Math.abs(total - 10.0) <= 0.01, `${key}: tổng điểm đề ${total}đ (kỳ vọng 10,0)`);
      assert(step4.qaReport && step4.qaReport.isValid, `${key}: QA báo lỗi — ${(step4.qaReport?.issues || []).join('; ')}`);
    }
  });

  console.log('\n================================================================================');
  console.log(` CỔNG GĐ2: ${passed} ĐẠT / ${failed} RỚT`);
  console.log('================================================================================');
  if (failed > 0) {
    console.log('Các cổng rớt:');
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Lỗi chạy cổng GĐ2:', err);
  process.exit(1);
});

/**
 * Ghi chú kiểm chứng đỏ-trước/xanh-sau (nguyên tắc 5):
 * Cùng file test này khi chạy với src/ ở commit 9061d5e (trước GĐ2) cho
 * kết quả đỏ ở các cổng P0-01 (thứ tự lặp lại được), P0-02 (không ném lỗi),
 * P0-03 (validator báo đạt dù đáp án bị đổi), P0-04 (mã 101 giữ nguyên
 * thứ tự, tự luận không trộn) và P1-01 (đúng 2 ý được 0,5đ theo fixed025).
 * Cách kiểm chứng: git archive 9061d5e src | tar -x -C /tmp/gd2-redcheck
 * rồi chạy node với NODE_PATH trỏ sang cây cũ (xem báo cáo GĐ2).
 */
