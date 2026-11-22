const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const omrEngine = require('../src/omr-engine');
const answerKeyParser = require('../src/answer-key-parser');
const qaValidator = require('../src/qa-validator');
const docParser = require('../src/doc-parser');
const zipDocx = require('../src/zip-docx');
const requestHandler = require('../server');

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   -> ${err.stack || err.message}`);
    failed++;
  }
}

function captureDataSnapshot() {
  const trackedFiles = [
    'omr_active_roster.json',
    'omr_rosters.json',
    'omr_audit_logs.json',
    'omr_database.json',
    'deleted_profiles.json'
  ];
  const fileSnapshots = new Map();
  for (const rel of trackedFiles) {
    const abs = path.join(DATA_DIR, rel);
    fileSnapshots.set(abs, fs.existsSync(abs) ? fs.readFileSync(abs) : null);
  }

  const omrDbDir = path.join(DATA_DIR, 'omr_database');
  const existingDbFiles = fs.existsSync(omrDbDir) ? new Set(fs.readdirSync(omrDbDir)) : null;

  const profilesDir = path.join(DATA_DIR, 'profiles');
  const existingProfileContents = new Map();
  if (fs.existsSync(profilesDir)) {
    for (const f of fs.readdirSync(profilesDir)) {
      const fp = path.join(profilesDir, f);
      if (fs.statSync(fp).isFile()) {
        existingProfileContents.set(f, fs.readFileSync(fp));
      }
    }
  }

  const existingDataRootEntries = new Set(fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : []);

  return { fileSnapshots, omrDbDir, existingDbFiles, profilesDir, existingProfileContents, existingDataRootEntries };
}

function restoreDataSnapshot(snap) {
  for (const [abs, buf] of snap.fileSnapshots.entries()) {
    if (buf === null) {
      if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
    } else {
      fs.writeFileSync(abs, buf);
    }
  }

  if (snap.existingDbFiles === null) {
    if (fs.existsSync(snap.omrDbDir)) fs.rmSync(snap.omrDbDir, { recursive: true, force: true });
  } else if (fs.existsSync(snap.omrDbDir)) {
    for (const f of fs.readdirSync(snap.omrDbDir)) {
      if (!snap.existingDbFiles.has(f)) {
        fs.rmSync(path.join(snap.omrDbDir, f), { recursive: true, force: true });
      }
    }
  }

  if (fs.existsSync(snap.profilesDir)) {
    for (const f of fs.readdirSync(snap.profilesDir)) {
      if (!snap.existingProfileContents.has(f)) {
        fs.rmSync(path.join(snap.profilesDir, f), { recursive: true, force: true });
      }
    }
    for (const [f, buf] of snap.existingProfileContents.entries()) {
      fs.writeFileSync(path.join(snap.profilesDir, f), buf);
    }
  }

  if (fs.existsSync(DATA_DIR)) {
    for (const entry of fs.readdirSync(DATA_DIR)) {
      if (!snap.existingDataRootEntries.has(entry)) {
        fs.rmSync(path.join(DATA_DIR, entry), { recursive: true, force: true });
      }
    }
  }
}

async function startTempServer() {
  const srv = http.createServer(requestHandler);
  await new Promise(resolve => srv.listen(0, '127.0.0.1', resolve));
  const { port } = srv.address();
  return { server: srv, baseUrl: `http://127.0.0.1:${port}` };
}

(async () => {
  console.log('🛡️ STRICT SYSTEM AUDIT SUITE — MATRIXEDU');
  console.log('='.repeat(64));

  const snapshot = captureDataSnapshot();
  const { server, baseUrl } = await startTempServer();

  try {
    // NHÓM 1: KHÔNG CÒN CSDL ẢO KHI KHỞI ĐỘNG & CÔ LẬP DANH SÁCH LỚP
    await runTest('1.1 Clean startup: GET /api/omr/rosters & /api/omr/sessions return zero virtual DB', async () => {
      const r1 = await fetch(`${baseUrl}/api/omr/rosters`).then(r => r.json());
      assert.strictEqual(r1.ok, true);
      assert.strictEqual(r1.totalClasses, 0, `Expected 0 classes on clean state, got ${r1.totalClasses}`);
      assert.strictEqual(r1.totalStudents, 0, `Expected 0 students on clean state, got ${r1.totalStudents}`);
      assert.deepStrictEqual(r1.classes, []);
      assert.deepStrictEqual(r1.activeRoster, []);

      const r2 = await fetch(`${baseUrl}/api/omr/sessions`).then(r => r.json());
      assert.strictEqual(r2.ok, true);
      assert.strictEqual(r2.sessions.length, 0, `Expected 0 pre-seeded sessions, got ${r2.sessions.length}`);
    });

    await runTest('1.2 Clear/delete last class NEVER resurrects fake DEFAULT_CLASS_ROSTER (12A1)', async () => {
      omrEngine.saveClassRoster({
        className: '10A3',
        roster: [{ sbd: '100301', name: 'Nguyễn Văn Thật', className: '10A3', dob: '10/10/2010' }]
      });
      assert.strictEqual(omrEngine.getActiveRoster().length, 1);

      omrEngine.deleteClassRoster('10A3');
      assert.strictEqual(omrEngine.getActiveRoster().length, 0, 'Deleting last class must leave empty roster');
      assert.strictEqual(omrEngine.listClassRostersSummary().classes.length, 0);

      omrEngine.saveClassRoster({
        className: '10A4',
        roster: [{ sbd: '100401', name: 'Lê Thị Minh', className: '10A4' }]
      });
      omrEngine.clearAllRosters();
      assert.strictEqual(omrEngine.getActiveRoster().length, 0, 'clearAllRosters must clear active roster');

      const clearRes = await fetch(`${baseUrl}/api/omr/rosters/clear`, { method: 'POST' }).then(r => r.json());
      assert.strictEqual(clearRes.ok, true);
      assert.strictEqual(clearRes.totalStudents, 0);
    });

    await runTest('1.3 gradeBatchPapers with explicit empty roster [] does NOT match fake 12A1 students', () => {
      const resultEmpty = omrEngine.gradeBatchPapers({
        papers: [{
          id: 'p_real_1',
          sbd: '120001',
          scannedExamCode: '201',
          answers: { part1: { 1: 'A' }, part2: {}, part3: {} }
        }],
        answerKeysByCode: {
          '201': { part1: ['A'], part2: {}, part3: {} }
        },
        pointRules: { mcq: 1, tfStyle: 'fixed025', tfSubPoint: 0.25, sa: 0 },
        roster: [],
        persistDbState: false
      });
      assert.strictEqual(resultEmpty.gradedPapers[0].studentName, 'Chưa định danh');
      assert.notStrictEqual(resultEmpty.gradedPapers[0].studentName, 'Nguyễn Minh Tuấn', 'Must NEVER resolve fake 12A1 student 120001');

      const resultMismatch = omrEngine.gradeBatchPapers({
        papers: [{
          id: 'p_real_2',
          sbd: '120001',
          scannedExamCode: '201',
          answers: { part1: { 1: 'A' }, part2: {}, part3: {} }
        }],
        answerKeysByCode: {
          '201': { part1: ['A'], part2: {}, part3: {} }
        },
        pointRules: { mcq: 1, tfStyle: 'fixed025', tfSubPoint: 0.25, sa: 0 },
        roster: [{ sbd: '100001', name: 'Thí sinh lớp 10A1', className: '10A1' }],
        persistDbState: false
      });
      assert.ok(resultMismatch.gradedPapers[0].warnings.some(w => w.type === 'UNMATCHED_SBD'));
    });

    // NHÓM 2: CÔ LẬP NGHIÊM NGẶT CHẾ ĐỘ CHẤM THẬT VS CHẾ ĐỘ DEMO
    await runTest('2.1 POST /api/omr/grade-batch rejects missing keys (MISSING_ANSWER_KEYS) & empty real papers (NO_SCANNED_PAPERS)', async () => {
      const resNoKeys = await fetch(`${baseUrl}/api/omr/grade-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: 'exam_real_empty',
          className: '10A1',
          useSampleBatch: false,
          papers: []
        })
      });
      assert.strictEqual(resNoKeys.status, 400);
      const dataNoKeys = await resNoKeys.json();
      assert.strictEqual(dataNoKeys.errorCode, 'MISSING_ANSWER_KEYS');

      const resNoPapers = await fetch(`${baseUrl}/api/omr/grade-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: 'exam_real_empty',
          className: '10A1',
          useSampleBatch: false,
          answerKeysByCode: { '201': { part1: ['A'], part2: {}, part3: {} } },
          papers: []
        })
      });
      assert.strictEqual(resNoPapers.status, 400);
      const dataNoPapers = await resNoPapers.json();
      assert.strictEqual(dataNoPapers.ok, false);
      assert.strictEqual(dataNoPapers.errorCode, 'NO_SCANNED_PAPERS');
    });

    await runTest('2.2 Demo mode (useSampleBatch: true) does NOT pollute real sessions or grade aggregation', async () => {
      const demoRes = await fetch(`${baseUrl}/api/omr/grade-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: 'exam_demo_only',
          examTitle: 'Bài Demo Không Được Lưu',
          className: '12A1',
          useSampleBatch: true,
          papers: []
        })
      }).then(r => r.json());

      assert.strictEqual(demoRes.ok, true);
      assert.strictEqual(demoRes.isDemoSimulation, true);
      assert.strictEqual(demoRes.savedSession, null);
      assert.ok(demoRes.gradedPapers.length > 0);

      const sessionsAfterDemo = await fetch(`${baseUrl}/api/omr/sessions`).then(r => r.json());
      assert.strictEqual(sessionsAfterDemo.sessions.length, 0, 'Demo simulation must NEVER write to real OMR sessions');

      const agg = omrEngine.aggregateGradeReportByExam('exam_demo_only');
      assert.strictEqual(agg.totalClasses, 0, 'Demo simulation must NEVER appear in exam aggregation reports');
      assert.strictEqual(agg.examsIndex.length, 0);
    });

    // NHÓM 3: PARSER ĐÁP ÁN, DANH SÁCH LỚP & TÀI LIỆU
    await runTest('3.1 parseTextAnswerKey & parseMatrix2DToKeys never fabricate A or invert False->Đ', () => {
      const parsedText = answerKeyParser.parseTextAnswerKey('Mã đề 305\n1. B  3. D');
      assert.ok(parsedText['305']);
      assert.strictEqual(parsedText['305'].part1[0], 'B');
      assert.strictEqual(parsedText['305'].part1[1], '', 'Missing Q2 must stay empty string, NOT fabricated "A"');
      assert.strictEqual(parsedText['305'].part1[2], 'D');

      const keys2D = answerKeyParser.parseMatrix2DToKeys([
        ['Mã đề', 'Câu', 'Đáp án'],
        ['401', '1', 'C'],
        ['401', '2a', 'False'],
        ['401', '2b', 'Sai'],
        ['401', '2c', 'True'],
        ['401', '2d', 'X']
      ]);
      assert.strictEqual(keys2D['401'].part2['2'].a, 'S');
      assert.strictEqual(keys2D['401'].part2['2'].b, 'S');
      assert.strictEqual(keys2D['401'].part2['2'].c, 'Đ');
      assert.strictEqual(keys2D['401'].part2['2'].d, 'Đ');
    });

    await runTest('3.2 parseMatrix2DToRoster never fabricates fake SBD 120001+, DOB 01/01/2008, or class 12A1', () => {
      const roster = answerKeyParser.parseMatrix2DToRoster([
        ['SBD', 'Họ và tên', 'Lớp', 'Ngày sinh'],
        ['100101', 'Phạm Thị Hoa', '', ''],
        ['', 'Học sinh thiếu SBD', '10A2', '']
      ], { defaultClass: '' });

      assert.strictEqual(roster.length, 2);
      assert.strictEqual(roster[0].sbd, '100101');
      assert.strictEqual(roster[0].className, '', 'Missing class must stay empty, NOT fabricated "12A1"');
      assert.strictEqual(roster[0].dob, '', 'Missing DOB must stay empty, NOT fabricated "01/01/2008"');
      assert.strictEqual(roster[1].sbd, '', 'Missing SBD must stay empty, NOT fabricated "120002"');
      assert.strictEqual(roster[1].dob, '');
    });

    await runTest('3.3 parseSchoolMatrixAndSpecFromDocx parses Grade 10 Essay Matrix & zipDocx rejects corrupt ZIP', async () => {
      const matrixSamplePath = path.join(ROOT_DIR, 'data', 'sample_docs', 'TIN 10 MA TRAN KTGK I 2026 - 2027.docx');
      if (fs.existsSync(matrixSamplePath)) {
        const buf = fs.readFileSync(matrixSamplePath);
        const parsed = await docParser.parseSchoolMatrixAndSpecFromDocx(buf, 'TIN 10 MA TRAN.docx');
        assert.ok(parsed.matrix && Array.isArray(parsed.matrix.rows) && parsed.matrix.rows.length > 0);
        const essaySum = parsed.matrix.rows.reduce((s, r) => s + Number(r.tl_biet || 0) + Number(r.tl_hieu || 0) + Number(r.tl_vandung || 0), 0);
        assert.ok(essaySum > 0, 'Tin 10 matrix must preserve Tự luận questions');
      }

      assert.throws(() => zipDocx.readZipEntries(Buffer.from('NOT_A_VALID_ZIP_HEADER')), /Không đọc được|Invalid|zip|EOCD/i);
    });

    // NHÓM 4: CHẤM ĐIỂM, SỬA PHIẾU + AUDIT TRAIL & TRỘN ĐỀ QA
    await runTest('4.1 gradeSinglePaper honors 0pt rule, custom tfSubPoint, and does not mutate paper.answers.part3', () => {
      const paper = {
        sbd: '10001',
        scannedExamCode: '501',
        answers: { part1: { 1: 'A', 2: 'B' }, part2: { 1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' } }, part3: { 1: ' 12,5 ' } }
      };
      const key = {
        part1: ['A', 'C'],
        part2: { 1: { a: 'Đ', b: 'Đ', c: 'Đ', d: 'Đ' } },
        part3: { 1: '12.5' }
      };
      const res = omrEngine.gradeSinglePaper(paper, key, { mcq: 0, tfStyle: 'fixed025', tfSubPoint: 0.5, sa: 1.5 });
      assert.strictEqual(res.part1Score, 0, 'Explicit mcq: 0 must stay 0');
      assert.strictEqual(res.part2Score, 1, '2 correct TF sub-items * 0.5 = 1.0');
      assert.strictEqual(res.part3Score, 1.5, 'Comma decimal must match 12.5');
      assert.strictEqual(res.totalScore, 2.5);
      assert.strictEqual(paper.answers.part3['1'], ' 12,5 ', 'Caller answers object must not be mutated');
    });

    await runTest('4.2 updatePaperAndAudit preserves UNKNOWN_EXAM_CODE / UNMATCHED_SBD until genuinely resolved', () => {
      const paper = {
        id: 'paper_audit_1',
        sbd: '999999',
        scannedExamCode: '999',
        answers: { part1: { 1: 'B' }, part2: {}, part3: {} },
        result: { totalScore: 0, hasKey: false },
        warnings: [{ type: 'UNKNOWN_EXAM_CODE', message: 'Bad code' }]
      };
      const keys = { '101': { part1: ['A'], part2: {}, part3: {} } };
      const roster = [{ sbd: '100001', name: 'Trần Anh Khoa', className: '10A1' }];
      const rules = { mcq: 0.5, tfStyle: 'fixed025', sa: 0 };

      // Fix only Part I while exam code and SBD are still invalid
      const step1 = omrEngine.updatePaperAndAudit({
        paperId: 'paper_audit_1',
        updates: { part1Answers: { 1: 'A' }, reason: 'Sửa câu 1' },
        allPapers: [paper],
        answerKeysByCode: keys,
        pointRules: rules,
        roster,
        user: 'QA Tester'
      });
      assert.ok(step1.updatedPaper.warnings.some(w => w.type === 'UNKNOWN_EXAM_CODE'), 'Must keep UNKNOWN_EXAM_CODE');
      assert.ok(step1.updatedPaper.warnings.some(w => w.type === 'UNMATCHED_SBD'), 'Must keep UNMATCHED_SBD');
      assert.strictEqual(step1.updatedPaper.result.hasKey, false);

      // Now fix BOTH examCode and SBD
      const step2 = omrEngine.updatePaperAndAudit({
        paperId: 'paper_audit_1',
        updates: { scannedExamCode: '101', sbd: '100001', reason: 'Sửa đúng mã đề và SBD' },
        allPapers: [step1.updatedPaper],
        answerKeysByCode: keys,
        pointRules: rules,
        roster,
        user: 'QA Tester'
      });
      assert.strictEqual(step2.updatedPaper.warnings.length, 0);
      assert.strictEqual(step2.updatedPaper.studentName, 'Trần Anh Khoa');
      assert.strictEqual(step2.updatedPaper.result.totalScore, 0.5);
    });

    await runTest('4.3 qa-validator: MCQ lowercase answer tracking & positional options guard + 0pt matrix rule', () => {
      const variants = qaValidator.generateShuffledVariants([
        {
          format: 'mcq',
          prompt: 'Q1',
          options: ['Phương án 1', 'Phương án 2', 'Phương án 3', 'Phương án 4'],
          answer: '  c  '
        },
        {
          format: 'mcq',
          prompt: 'Q2',
          options: ['A. Đúng', 'B. Sai', 'C. Cả A và B đều đúng', 'D. Không ý nào đúng'],
          answer: 'C'
        }
      ], ['111']);
      const q1 = variants[0].questions[0];
      assert.strictEqual(q1.options[['A', 'B', 'C', 'D'].indexOf(q1.answer)], 'Phương án 3', 'Must track "  c  " -> Phương án 3 across shuffle');
      const q2 = variants[0].questions[1];
      assert.strictEqual(q2.options[2], 'C. Cả A và B đều đúng', 'Positional "Cả A và B" option must NOT shuffle');
      assert.strictEqual(q2.answer, 'C');

      const stats = qaValidator.computeMatrixStatistics({
        rows: [{ counts: { MCQ: { 'Biết': 4, 'Hiểu': 0, 'Vận dụng': 0 } } }],
        pointRules: { MCQ: 0, TF: 0.25, SA: 0.5, ESSAY: 1 }
      });
      assert.strictEqual(stats.totalPoints, 0, 'Point rule 0 via ?? must stay 0');
    });

    // NHÓM 5: SERVERLESS VERCEL (READ-ONLY FS, TOMBSTONE PROFILE, SYNC EXPORT, PATH TRAVERSAL)
    await runTest('5.1 Profile DELETE tombstones bundled profiles so GET lists & GET/:id respect deletion', async () => {
      const listBefore = await fetch(`${baseUrl}/api/profiles`).then(r => r.json());
      assert.strictEqual(listBefore.ok, true);
      assert.ok(listBefore.profiles.length > 0);
      const targetId = listBefore.profiles[0].id;
      assert.strictEqual(listBefore.profiles[0].isSampleProfile, true);

      const delRes = await fetch(`${baseUrl}/api/profiles/${encodeURIComponent(targetId)}`, { method: 'DELETE' }).then(r => r.json());
      assert.strictEqual(delRes.ok, true);

      const getDeleted = await fetch(`${baseUrl}/api/profiles/${encodeURIComponent(targetId)}`);
      assert.strictEqual(getDeleted.status, 404);

      const listAfter = await fetch(`${baseUrl}/api/profiles`).then(r => r.json());
      assert.ok(!listAfter.profiles.some(p => p.id === targetId), 'Tombstoned profile must disappear from list');
    });

    await runTest('5.2 VERCEL=1 runtime dir uses os.tmpdir() & drive-bank rejects 0-file sync + sanitizes paths', () => {
      const probeScript = `
        const os = require('os');
        const path = require('path');
        const assert = require('assert');
        const https = require('https');
        const { PassThrough } = require('stream');

        // Mock https.get returning empty folder HTML (0 .docx files)
        https.get = (_url, _opts, cb) => {
          const callback = typeof _opts === 'function' ? _opts : cb;
          const res = new PassThrough();
          res.statusCode = 200;
          process.nextTick(() => {
            callback(res);
            res.end('<html><body>Empty Drive Folder</body></html>');
          });
          return { on() { return this; }, setTimeout() { return this; } };
        };

        const db = require('./src/drive-bank');
        assert.ok(db.BANK_DIR.startsWith(os.tmpdir()), 'VERCEL=1 BANK_DIR must use os.tmpdir(): ' + db.BANK_DIR);
        db.syncGoogleDriveFolder('https://drive.google.com/drive/folders/abc123XYZ')
          .then(() => { throw new Error('Should have rejected empty Drive folder'); })
          .catch(err => {
            assert.ok(/Không|0|file/i.test(err.message), 'Unexpected error: ' + err.message);
            console.log('VERCEL_DRIVE_CHECK_OK');
          });
      `;
      const out = execFileSync(process.execPath, ['-e', probeScript], {
        cwd: ROOT_DIR,
        env: { ...process.env, VERCEL: '1' },
        encoding: 'utf8'
      });
      assert.ok(out.includes('VERCEL_DRIVE_CHECK_OK'));
    });

    await runTest('5.3 syncOmrDatabaseToGoogleDrive returns honest remoteDriveUploaded: false & inline downloadable files', () => {
      const syncOut = omrEngine.syncOmrDatabaseToGoogleDrive({
        folderId: '',
        gradedPapers: [{
          id: 'p1',
          sbd: '100001',
          studentName: 'Võ Thị Sáu',
          className: '10A1',
          dob: '01/02/2010',
          scannedExamCode: '101',
          answers: { part1: { 1: 'A' }, part2: {}, part3: {} },
          result: { totalScore: 10, part1Score: 10, part2Score: 0, part3Score: 0, essayScore: 0 },
          warnings: []
        }],
        answerKeysByCode: { '101': { part1: ['A'], part2: {}, part3: {} } },
        pointRules: { mcq: 10, tfStyle: 'fixed025', sa: 0 },
        metadata: { schoolName: 'THPT TEST', subject: 'Tin học', grade: '10', className: '10A1' }
      });

      assert.strictEqual(syncOut.ok, true);
      assert.strictEqual(syncOut.remoteDriveUploaded, false);
      assert.ok(!/Đã lưu.*và đồng bộ thành công lên Google Drive/i.test(syncOut.message), 'Must NOT falsely claim remote Drive upload succeeded');
      assert.strictEqual(syncOut.files.length, 3);
      assert.ok(syncOut.files.every(f => typeof f.content === 'string' && f.content.length > 10), 'All export files must include inline downloadable content');
    });

    // NHÓM 6: KIỂM ĐỊNH STATIC TRÊN INDEX.HTML (NO VIRTUAL KEY FALLBACK / NO TF INVERSION / FIDUCIAL GUARD)
    await runTest('6.1 index.html passes full JS syntax validation & anti-regression invariants', () => {
      const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
      const scripts = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
      assert.ok(scripts.length >= 1);
      for (const m of scripts) {
        if (m[1].trim()) new Function(m[1]);
      }

      // No old TF inversion bug
      assert.ok(!html.includes("correctAnswer.toUpperCase().startsWith('S') ? 'S' : 'Đ'"), 'Old TF False->Đ inversion bug must remain removed');
      // Must NOT fall back to hardcoded old Drive folder in syncOmrToGoogleDrive
      assert.ok(!html.includes('1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop'), 'Hardcoded old Drive folder ID must be removed from index.html');
      // Must NOT fall back silently to hardcoded 101..104 fake keys when variants empty
      assert.ok(!html.includes("const sampleCodes = ['101', '102', '103', '104']"), 'Silent sampleCodes fallback must stay removed');
      // Optical OMR fiducial & SBD guards + Demo banner must be present
      assert.ok(html.includes('FIDUCIAL_ALIGNMENT_FAILED'), 'FIDUCIAL_ALIGNMENT_FAILED warning must exist');
      assert.ok(html.includes('MISSING_SBD') && html.includes('INCOMPLETE_SBD'), 'SBD completeness warnings must exist');
      assert.ok(html.includes('clearDemoOmrSession'), 'Demo mode isolation helper must exist');
    });

    await runTest('6.2 Unified modal open/close & CSS .open/.active parity across index.html', () => {
      const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
      assert.ok(/\.modal-backdrop\.open\s*,\s*\r?\n\s*\.modal-backdrop\.active\s*\{/.test(html), 'CSS must style both .modal-backdrop.open and .modal-backdrop.active');
      assert.ok(html.includes("el.classList.remove('open', 'active')"), 'closeModal must strip both open and active classes');
      assert.ok(html.includes('setupUnifiedModalDismissal'), 'Unified backdrop click + Escape modal dismissal must exist');
      assert.ok(!/function openOmrRosterModal[\s\S]{0,200}style\.display\s*=\s*['"]flex['"]/.test(html), 'openOmrRosterModal must not hardcode inline display:flex');
      assert.ok(!/function openPaperEditModal[\s\S]{0,200}style\.display\s*=\s*['"]flex['"]/.test(html), 'openPaperEditModal must not hardcode inline display:flex');
      assert.ok(!/function openManageAnswerKeysModal[\s\S]{0,350}modal\.classList\.add\(['"]active['"]\)/.test(html), 'openManageAnswerKeysModal must use unified openModal');
    });

    await runTest('6.3 Step 7 3-Step Guided Pipeline & External Answer Key Drop/Error Guards', async () => {
      const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
      assert.ok(html.includes('id="omr-step1-card"') && html.includes('id="omr-step2-card"') && html.includes('id="omr-step3-card"'), '3-step guided pipeline cards must exist');
      assert.ok(html.includes('updateOmrGradingPipelineUI'), 'Strict pipeline readiness gating helper must exist');
      assert.ok(html.includes('id="ak-file-dropzone"') && html.includes('ondrop="onAkModalDrop(event)"'), 'Modal answer key dropzone must support real drag-and-drop');
      assert.ok(!html.includes("if (validCodes.length === 0) validCodes = ['101', '102', '103', '104']"), 'No bogus 101..104 fallback in processUploadedOmrFiles');
      assert.ok(/async function refreshOmrSavedExamsDropdown[\s\S]{0,650}!p\.isSampleProfile/.test(html), 'refreshOmrSavedExamsDropdown must filter out unrequested sample profiles');
      assert.ok(/#omr-filter-pills button[\s\S]{0,120}white-space:\s*nowrap/.test(html), 'Step 7 filter pills must enforce white-space: nowrap');

      const { createZipBuffer } = require('../src/zip-docx');
      const sst = `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Câu</t></si><si><t>A</t></si></sst>`;
      const s1 = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c t="s" r="A1"><v>0</v></c><c r="B1"><v>501</v></c><c r="C1"><v>502</v></c></row><row r="2"><c r="A2"><v>1</v></c><c t="s" r="B2"><v>1</v></c><c r="C2" t="inlineStr"><is><t>C</t></is></c></row></sheetData></worksheet>`;
      const b64 = createZipBuffer({ 'xl/sharedStrings.xml': Buffer.from(sst, 'utf8'), 'xl/worksheets/sheet1.xml': Buffer.from(s1, 'utf8') }).toString('base64');

      const httpRes = await fetch(`${baseUrl}/api/omr/parse-answer-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: 'audit_501_502.xlsx', fileBase64: b64 })
      });
      const parsedBody = await httpRes.json();
      assert.strictEqual(httpRes.status, 200);
      assert.strictEqual(parsedBody.ok, true);
      assert.deepStrictEqual(parsedBody.detectedCodes, ['501', '502']);
      assert.strictEqual(parsedBody.answerKeysByCode['501'].part1[0], 'A');
      assert.strictEqual(parsedBody.answerKeysByCode['502'].part1[0], 'C');
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    restoreDataSnapshot(snapshot);
  }

  console.log('='.repeat(64));
  console.log(`📊 STRICT AUDIT SUMMARY: ${passed} passed, ${failed} failed (total ${passed + failed})`);
  if (failed > 0) process.exit(1);
})();
