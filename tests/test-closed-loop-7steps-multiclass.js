const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

const requestHandler = require('../server');
const { gradeBatchPapers } = require('../src/omr-engine');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const OMR_DB_DIR = path.join(DATA_DIR, 'omr_database');

function snapshotFile(filePath) {
  if (!fs.existsSync(filePath)) return { existed: false, content: null };
  return { existed: true, content: fs.readFileSync(filePath) };
}

function restoreFile(filePath, snap) {
  if (snap.existed) {
    fs.writeFileSync(filePath, snap.content);
  } else if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

async function runTests() {
  console.log('🧪 Running test-closed-loop-7steps-multiclass.js...');

  // Snapshot persistent files so tests do not leave dirty data behind
  const trackedFiles = [
    path.join(DATA_DIR, 'omr_rosters.json'),
    path.join(DATA_DIR, 'omr_active_roster.json'),
    path.join(DATA_DIR, 'omr_database.json'),
    path.join(DATA_DIR, 'omr_audit_logs.json')
  ];
  const fileSnapshots = new Map(trackedFiles.map(fp => [fp, snapshotFile(fp)]));
  const existingProfiles = new Set(fs.existsSync(PROFILES_DIR) ? fs.readdirSync(PROFILES_DIR) : []);
  const existingDbFiles = new Set(fs.existsSync(OMR_DB_DIR) ? fs.readdirSync(OMR_DB_DIR) : []);

  const server = http.createServer(requestHandler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  async function api(method, urlPath, body) {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { }
    return { status: res.status, headers: res.headers, text, json };
  }

  try {
    // ------------------------------------------------------------------
    // 1. Static & inline JS checks on index.html
    // ------------------------------------------------------------------
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert(!html.includes("'omr-template-select'"), 'index.html must not contain legacy typo omr-template-select');
    assert(html.includes('omr-saved-exam-select'), 'Missing omr-saved-exam-select');
    assert(html.includes('omr-active-class-select'), 'Missing omr-active-class-select');
    assert(html.includes('omr-multiclass-report-box'), 'Missing omr-multiclass-report-box');
    assert(html.includes('edit-paper-essay-score'), 'Missing edit-paper-essay-score');
    assert(html.includes('saveCurrentProfileAndGradeStep7'), 'Missing saveCurrentProfileAndGradeStep7');
    assert(html.includes('prepareNextClassGrading'), 'Missing prepareNextClassGrading');
    assert(html.includes('refreshWorkflowReadiness'), 'Missing refreshWorkflowReadiness');
    assert(html.includes('buildCleanProfilePayload'), 'Missing buildCleanProfilePayload');

    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
    scripts.forEach((m, idx) => {
      if (m[1].trim()) {
        new Function(m[1]);
      }
    });
    console.log('  ✅ 1. index.html DOM hooks & inline JS syntax OK');

    // ------------------------------------------------------------------
    // 2. Bugfix check: 44-paper batch with blank/missing/invalid exam codes
    // ------------------------------------------------------------------
    const fourKeys = {
      '101': { part1: Array(24).fill('A'), part2: { '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: {} },
      '102': { part1: Array(24).fill('B'), part2: { '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: {} },
      '103': { part1: Array(24).fill('C'), part2: { '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: {} },
      '104': { part1: Array(24).fill('D'), part2: { '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: {} }
    };

    const dirty44Papers = Array.from({ length: 44 }, (_, i) => {
      const codeCases = ['', 'chưa tô', '999', '101', '102', '103', '104'];
      const scannedExamCode = codeCases[i % codeCases.length];
      return {
        id: `dirty_${i + 1}`,
        sbd: i % 5 === 0 ? 'chưa tô' : `1200${String((i % 9) + 1).padStart(2, '0')}`,
        scannedExamCode,
        isBlankPaper: i === 2,
        answers: i === 2 ? { part1: {}, part2: {}, part3: {} } : { part1: { 1: 'A', 2: 'B' }, part2: {}, part3: {} }
      };
    });

    const directRes = gradeBatchPapers({
      papers: dirty44Papers,
      answerKeysByCode: fourKeys,
      pointRules: { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 },
      roster: [],
      targetClassName: '12A1'
    });
    assert.strictEqual(directRes.gradedPapers.length, 44, 'Expected 44 graded papers without crashing');

    // Guard check when answerKeysByCode is empty
    const emptyKeyRes = await api('POST', '/api/omr/grade-batch', {
      answerKeysByCode: {},
      papers: dirty44Papers,
      useSampleBatch: false
    });
    assert.strictEqual(emptyKeyRes.status, 400, 'Expected HTTP 400 when answerKeysByCode is empty');

    const batchRes = await api('POST', '/api/omr/grade-batch', {
      answerKeysByCode: fourKeys,
      pointRules: { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 },
      examId: 'exam_dirty_check',
      examTitle: 'Kiem tra 44 bai co ma loi',
      className: '12A1',
      overwriteSameExamClass: true,
      papers: dirty44Papers
    });
    assert.strictEqual(batchRes.status, 200, 'HTTP grade-batch with missing/invalid exam codes must return 200');
    assert.strictEqual(batchRes.json.ok, true);
    assert.strictEqual(batchRes.json.totalPapers, 44);
    assert(batchRes.json.warningCount > 0, 'Missing/invalid exam code papers should be flagged with warnings');
    console.log('  ✅ 2. 44-paper dirty batch (missing/invalid exam codes) graded safely without crash');

    // ------------------------------------------------------------------
    // 3. Profile warehouse with Mixed Exam (MCQ + TF + Essay) + Essay score
    // ------------------------------------------------------------------
    const mixedVariants = ['101', '102', '103', '104'].map(code => {
      const qs = [];
      for (let i = 1; i <= 20; i++) {
        qs.push({ format: 'mcq', type: 'MCQ', answer: i % 2 === 0 ? 'B' : 'A' });
      }
      for (let i = 1; i <= 2; i++) {
        qs.push({
          format: 'tf',
          type: 'TF',
          statements: [{ isTrue: true }, { isTrue: false }, { isTrue: true }, { isTrue: false }]
        });
      }
      for (let i = 1; i <= 3; i++) {
        qs.push({ format: 'essay', type: 'ESSAY', prompt: `Tu luan ${i}` });
      }
      return { code, questions: qs };
    });

    const profileId = `test_closed_loop_${Date.now()}`;
    const saveProfRes = await api('POST', '/api/profiles', {
      id: profileId,
      metadata: { subject: 'Tin học', grade: '10', examPeriod: 'Giữa kỳ I (Test Tự luận)' },
      matrix: {
        totalScore: 10,
        pointRules: { MCQ: 0.25, TF: 1.0, SA: 0.5 },
        rows: [
          { topic: 'Chủ đề 1', mcq_b: 10, mcq_h: 6, mcq_vd: 4, tf_b: 1, tf_h: 1, tf_vd: 0, tl_b: 1, tl_h: 1, tl_vd: 1 }
        ]
      },
      questions: mixedVariants[0].questions,
      variants: mixedVariants,
      // Simulate dirty client state trying to smuggle transient OMR scans inside profile
      omr: { gradedPapers: [{ id: 'transient_blob_should_be_stripped' }] }
    });
    assert.strictEqual(saveProfRes.status, 200);
    assert.strictEqual(saveProfRes.json.ok, true);
    assert.strictEqual(saveProfRes.json.hasEssay, true);
    assert.strictEqual(saveProfRes.json.maxOmrScore, 7);
    assert.deepStrictEqual(saveProfRes.json.examCodes, ['101', '102', '103', '104']);

    const listProfRes = await api('GET', '/api/profiles');
    const savedSummary = listProfRes.json.profiles.find(p => p.id === profileId);
    assert(savedSummary, 'Saved exam must appear in GET /api/profiles');
    assert.strictEqual(savedSummary.hasEssay, true);
    assert.strictEqual(savedSummary.essayMaxScore, 3);
    assert.strictEqual(savedSummary.maxOmrScore, 7);

    const getProfRes = await api('GET', `/api/profiles/${encodeURIComponent(profileId)}`);
    assert.strictEqual(getProfRes.json.ok, true);
    assert.strictEqual(getProfRes.json.profile.omr, undefined, 'Transient .omr must be decoupled/stripped');
    assert(getProfRes.json.profile.omrConfig, 'omrConfig must be computed for Step 7');
    assert.strictEqual(getProfRes.json.profile.omrConfig.maxOmrScore, 7);

    console.log('  ✅ 3. Exam warehouse profile persistence & mixed-exam omrConfig restoration OK');

    // ------------------------------------------------------------------
    // 4. Multi-class rosters + Grading multiple classes + Regrade overwrite + Grade Report + CSV
    // ------------------------------------------------------------------
    const multiClassCsv = [
      'SBD,Họ và tên,Lớp,Ngày sinh',
      '100101,Nguyễn An 1,12A1,01/01/2008',
      '100102,Trần Bình 1,12A1,02/02/2008',
      '100201,Lê Cường 2,12A2,03/03/2008',
      '100202,Phạm Dung 2,12A2,04/04/2008',
      '100401,Hoàng Em 4,12A4,05/05/2008',
      '100402,Vũ Giang 4,12A4,06/06/2008'
    ].join('\n');

    const parseRosterRes = await api('POST', '/api/omr/parse-roster', { rawText: multiClassCsv });
    assert.strictEqual(parseRosterRes.json.ok, true);

    const rostersList = await api('GET', '/api/omr/rosters');
    const classNames = rostersList.json.classes.map(c => c.className);
    assert(classNames.includes('12A1') && classNames.includes('12A2') && classNames.includes('12A4'), 'All 3 classes should be split and stored');

    const select12A2 = await api('POST', '/api/omr/rosters/select', { className: '12A2' });
    assert.strictEqual(select12A2.json.activeClass, '12A2');
    assert.strictEqual(select12A2.json.roster[0].sbd, '100201');

    const selectAll = await api('POST', '/api/omr/rosters/select', { className: '__ALL__' });
    assert(selectAll.json.roster.length >= 6, '__ALL__ should return combined roster');

    const omrConfigKeys = getProfRes.json.profile.omrConfig.answerKeysByCode;
    const makeClassPapers = (sbds, scorePattern = 'high') => sbds.map((sbd, idx) => {
      const p1 = {};
      for (let q = 1; q <= 20; q++) {
        p1[q] = scorePattern === 'high' ? (q % 2 === 0 ? 'B' : 'A') : (q <= 10 ? (q % 2 === 0 ? 'B' : 'A') : 'C');
      }
      return {
        id: `mc_${sbd}_${idx}`,
        sbd,
        scannedExamCode: idx % 2 === 0 ? '101' : '102',
        answers: {
          part1: p1,
          part2: { '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' }, '2': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } },
          part3: {}
        }
      };
    });

    // Grade 12A1 twice -> overwriteSameExamClass must overwrite session (not create duplicates!)
    const g12a1First = await api('POST', '/api/omr/grade-batch', {
      answerKeysByCode: omrConfigKeys,
      pointRules: { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 },
      roster: selectAll.json.classesMap['12A1'],
      examId: profileId,
      examTitle: 'Đề Kiểm Tra Giữa Kỳ Toàn Khối',
      className: '12A1',
      overwriteSameExamClass: true,
      papers: makeClassPapers(['100101', '100102'], 'high')
    });
    assert.strictEqual(g12a1First.status, 200);
    const s12a1 = g12a1First.json.sessionId;

    const g12a1Second = await api('POST', '/api/omr/grade-batch', {
      answerKeysByCode: omrConfigKeys,
      pointRules: { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 },
      roster: selectAll.json.classesMap['12A1'],
      examId: profileId,
      examTitle: 'Đề Kiểm Tra Giữa Kỳ Toàn Khối',
      className: '12A1',
      overwriteSameExamClass: true,
      papers: makeClassPapers(['100101', '100102'], 'high')
    });
    assert.strictEqual(g12a1Second.json.sessionId, s12a1, 'Re-grading same (examId, className) should overwrite same sessionId');

    // Add essayScore to first paper in 12A1 & verify session persistence + Audit Trail
    const updRes = await api('POST', '/api/omr/update-paper', {
      sessionId: s12a1,
      paperId: 'mc_100101_0',
      updates: { essayScore: 2.5, reason: 'Cong diem tu luan cham tay' },
      allPapers: g12a1Second.json.gradedPapers,
      answerKeysByCode: omrConfigKeys,
      pointRules: { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 },
      roster: selectAll.json.classesMap['12A1'],
      user: 'GV Test'
    });
    assert.strictEqual(updRes.json.ok, true);
    assert.strictEqual(updRes.json.updatedPaper.essayScore, 2.5);
    assert.strictEqual(updRes.json.updatedPaper.result.totalScore, 9.5, '7.0 OMR + 2.5 Essay = 9.5');

    // Verify synced session on disk has updated paper score
    const sessCheck = await api('GET', `/api/omr/sessions/${encodeURIComponent(s12a1)}`);
    assert.strictEqual(sessCheck.json.session.gradedPapers[0].result.totalScore, 9.5);

    // Grade 12A2 & 12A4 with SAME examId
    const g12a2 = await api('POST', '/api/omr/grade-batch', {
      answerKeysByCode: omrConfigKeys,
      pointRules: { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 },
      roster: selectAll.json.classesMap['12A2'],
      examId: profileId,
      examTitle: 'Đề Kiểm Tra Giữa Kỳ Toàn Khối',
      className: '12A2',
      overwriteSameExamClass: true,
      papers: makeClassPapers(['100201', '100202'], 'mid')
    });
    assert.strictEqual(g12a2.status, 200);

    const g12a4 = await api('POST', '/api/omr/grade-batch', {
      answerKeysByCode: omrConfigKeys,
      pointRules: { mcq: 0.25, tfStyle: 'fixed025', sa: 0.5 },
      roster: selectAll.json.classesMap['12A4'],
      examId: profileId,
      examTitle: 'Đề Kiểm Tra Giữa Kỳ Toàn Khối',
      className: '12A4',
      overwriteSameExamClass: true,
      papers: makeClassPapers(['100401', '100402'], 'high')
    });
    assert.strictEqual(g12a4.status, 200);

    // Whole-grade comparison report
    const reportRes = await api('GET', `/api/omr/grade-report?examId=${encodeURIComponent(profileId)}`);
    assert.strictEqual(reportRes.status, 200);
    assert.strictEqual(reportRes.json.ok, true);
    assert.strictEqual(reportRes.json.totalClasses, 3, 'Report must aggregate 3 classes (12A1, 12A2, 12A4)');
    assert.strictEqual(reportRes.json.overall.totalPapers, 6);

    // Whole-grade CSV export (includeAllClasses + essay column)
    const csvAllRes = await api('POST', '/api/omr/export-roster-csv', {
      includeAllClasses: true,
      examId: profileId,
      hasEssay: true
    });
    assert.strictEqual(csvAllRes.status, 200);
    assert(csvAllRes.text.includes('100101') && csvAllRes.text.includes('100201') && csvAllRes.text.includes('100401'), 'Whole-grade CSV must include students from all 3 classes');

    const csvSingleRes = await api('POST', '/api/omr/export-roster-csv', {
      gradedPapers: sessCheck.json.session.gradedPapers,
      hasEssay: true
    });
    assert.strictEqual(csvSingleRes.status, 200);
    assert(csvSingleRes.text.includes('Điểm Tự luận'), 'Single-class CSV for mixed exam must include Điểm Tự luận column');

    // Delete class test
    const delClsRes = await api('DELETE', '/api/omr/rosters/12A4');
    assert.strictEqual(delClsRes.json.ok, true);
    assert(!delClsRes.json.classes.some(c => c.className === '12A4'));

    console.log('  ✅ 4. Multi-class rosters, re-grade deduplication, grade-report, and whole-grade CSV OK');
  } finally {
    await new Promise(resolve => server.close(resolve));
    // Clean up temporary files created in profiles/ and omr_database/ and restore data/*.json
    if (fs.existsSync(PROFILES_DIR)) {
      for (const f of fs.readdirSync(PROFILES_DIR)) {
        if (!existingProfiles.has(f)) fs.unlinkSync(path.join(PROFILES_DIR, f));
      }
    }
    if (fs.existsSync(OMR_DB_DIR)) {
      for (const f of fs.readdirSync(OMR_DB_DIR)) {
        if (!existingDbFiles.has(f)) fs.unlinkSync(path.join(OMR_DB_DIR, f));
      }
    }
    for (const [fp, snap] of fileSnapshots.entries()) {
      restoreFile(fp, snap);
    }
  }

  console.log('🎉 ALL closed-loop 7-step & multi-class tests PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
