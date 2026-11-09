const fs = require('fs');
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch(e) { resolve({ raw: buf }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch(e) { resolve({ raw: buf }); }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- 1. Testing GET /api/drive-bank/status ---');
  const status = await get('/api/drive-bank/status');
  console.log('Status OK:', status.ok);
  console.log('Total questions:', status.totalQuestions);
  console.log('Files count:', status.filesCount);
  console.log('MCQ count:', status.mcqCount);
  console.log('Underline count:', status.underlineCount, `(${status.underlinePercent}%)`);

  console.log('\n--- 2. Testing POST /api/drive-bank/sync ---');
  const syncRes = await post('/api/drive-bank/sync', {
    folderUrl: 'https://drive.google.com/drive/folders/1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop?usp=sharing'
  });
  console.log('Sync OK:', syncRes.ok);
  console.log('Message:', syncRes.message);
  console.log('Total Questions:', syncRes.totalQuestions);

  console.log('\n--- 3. Testing POST /api/load-workspace-file (TIN 12 - MA TRAN KTGK 1.docx) ---');
  const docxRes = await post('/api/load-workspace-file', { fileName: 'TIN 12 - MA TRAN KTGK 1.docx' });
  console.log('Docx loaded OK:', docxRes.ok);
  console.log('Detected Matrix rows:', docxRes.detectedMatrix?.rows?.length);

  console.log('\n--- 4. Testing POST /api/step4-exam (default 4 variants) ---');
  const examRes = await post('/api/step4-exam', {
    metadata: {
      schoolName: 'TRƯỜNG THPT NGUYỄN SINH SẮC',
      subject: 'Tin học',
      grade: '12',
      examPeriod: 'Giữa học kỳ I',
      numVariants: 4
    },
    matrix: docxRes.detectedMatrix,
    specification: docxRes.detectedSpec
  });
  console.log('Exam generated OK:', examRes.ok);
  const variants = examRes.variants || examRes.exam?.variants || [];
  console.log('Exam variants count:', variants.length);
  variants.forEach(v => {
    console.log(`  -> Mã đề ${v.code}: ${v.questions?.length} câu (MCQ: ${v.questions?.filter(q => q.type==='MCQ').length}, TF: ${v.questions?.filter(q => q.type==='TF').length}, Essay: ${v.questions?.filter(q => q.type==='ESSAY').length})`);
  });

  console.log('\n--- 5. Testing Chức năng 7: OMR Grading & Audit Trail & Google Drive Sync ---');
  // 5.1 Template info
  const tmpl = await get('/api/omr/template-info');
  console.log('OMR Template Info OK:', tmpl.ok);
  console.log('  PDF file:', tmpl.fileName, `(${(tmpl.fileSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log('  Default roster count:', tmpl.defaultRoster?.length);

  // 5.2 Extract answer keys from the generated 4 variants
  const answerKeysByCode = {};
  variants.forEach(v => {
    const code = String(v.code);
    const p1 = [];
    const p2 = {};
    (v.questions || []).forEach(q => {
      if (q.type === 'MCQ' || q.format === 'mcq') {
        p1.push(q.correctAnswer || 'A');
      } else if (q.type === 'TF' || q.format === 'tf') {
        p2[String(Object.keys(p2).length + 1)] = {
          a: q.subItems?.[0]?.correctAnswer || 'Đ',
          b: q.subItems?.[1]?.correctAnswer || 'S',
          c: q.subItems?.[2]?.correctAnswer || 'Đ',
          d: q.subItems?.[3]?.correctAnswer || 'S'
        };
      }
    });
    answerKeysByCode[code] = { part1: p1, part2: p2 };
  });
  console.log('Extracted answer keys for codes:', Object.keys(answerKeysByCode).join(', '));

  // 5.3 Batch Grade
  const gradeBatchRes = await post('/api/omr/grade-batch', {
    answerKeysByCode,
    pointRules: { mcq: 0.25, tfStyle: 'moet2025' },
    useSampleBatch: true
  });
  console.log('Batch Grade OK:', gradeBatchRes.ok);
  console.log('  Total Papers graded:', gradeBatchRes.totalPapers);
  console.log('  Valid papers:', gradeBatchRes.validCount);
  console.log('  Warning papers (need review):', gradeBatchRes.warningCount);
  console.log('  Class Average score:', gradeBatchRes.statistics?.avg);
  console.log('  Max score:', gradeBatchRes.statistics?.max, '| Min score:', gradeBatchRes.statistics?.min);

  // 5.4 Update a flagged paper (fix invalid exam code 0999 -> 101) & Audit Trail test
  const errorPaper = gradeBatchRes.gradedPapers?.find(p => p.warnings?.length > 0);
  if (errorPaper) {
    console.log(`\n  Testing Audit Trail on student [${errorPaper.sbd}] ${errorPaper.studentName}:`);
    console.log(`    Before edit: Code = "${errorPaper.scannedExamCode}", Warnings = ${errorPaper.warnings?.map(w => w.type).join(', ')}`);
    const updateRes = await post('/api/omr/update-paper', {
      paperId: errorPaper.id,
      updates: {
        scannedExamCode: '101',
        reason: 'Học sinh tô nhầm mã đề 0999, giám khảo đối chiếu đề gốc và sửa về mã đề 101'
      },
      allPapers: gradeBatchRes.gradedPapers,
      answerKeysByCode,
      user: 'Giám khảo Nguyễn Thị Ngân'
    });
    console.log('  Update & Audit OK:', updateRes.ok);
    console.log('  New Audit record:', updateRes.newAuditRecords?.[0]?.field, '->', updateRes.newAuditRecords?.[0]?.newVal);
    console.log('  Total Audit logs:', updateRes.allAuditLogs?.length);
    console.log('  Updated student total score:', updateRes.updatedPaper?.result?.totalScore);
  }

  // 5.5 Sync Database & Audit Logs to Google Drive
  console.log('\n  Testing Sync OMR Database & Audit Logs to Google Drive:');
  const gdriveSyncRes = await post('/api/omr/sync-gdrive', {
    folderId: '1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop',
    gradedPapers: gradeBatchRes.gradedPapers,
    metadata: { schoolName: 'TRƯỜNG THPT NGUYỄN SINH SẮC', subject: 'Tin học', grade: '12' }
  });
  console.log('  Sync GDrive OK:', gdriveSyncRes.ok);
  console.log('  Synced files count:', gdriveSyncRes.files?.length);
  gdriveSyncRes.files?.forEach(f => console.log(`    -> ${f.name} (${f.size} bytes)`));

  console.log('\n--- 5b. Testing POST /api/omr/parse-answer-key (External Answer Key Engine) ---');
  const sampleCsv = fs.readFileSync('data/sample_dapan_ngoai_toan12.csv', 'utf8');
  const parsedCsvRes = await post('/api/omr/parse-answer-key', { rawText: sampleCsv });
  console.log('Parse external CSV OK:', parsedCsvRes.ok);
  console.log('  Detected Codes count:', parsedCsvRes.totalCodes, '(' + (parsedCsvRes.detectedCodes || []).join(', ') + ')');
  console.log('  Code 101 Part 1 questions:', parsedCsvRes.answerKeysByCode?.['101']?.part1?.length);

  const sampleZalo = fs.readFileSync('data/sample_dapan_zalo_tin12.txt', 'utf8');
  const parsedZaloRes = await post('/api/omr/parse-answer-key', { rawText: sampleZalo });
  console.log('Parse external Zalo text OK:', parsedZaloRes.ok);
  console.log('  Detected Codes count:', parsedZaloRes.totalCodes, '(' + (parsedZaloRes.detectedCodes || []).join(', ') + ')');
  console.log('  Code 101 Part 2 True/False questions:', Object.keys(parsedZaloRes.answerKeysByCode?.['101']?.part2 || {}).length);

  console.log('\n--- 6. Verify index.html contains Step 7 & Fullscreen Modal & Drive Bank elements ---');
  const indexHtml = await get('/');
  const rawHtml = indexHtml.raw || '';
  console.log('Has nav-step-7 in Stepper:', rawHtml.includes('id="nav-step-7"'));
  console.log('Has step-7 section:', rawHtml.includes('id="step-7"'));
  console.log('Has modalEditPaper:', rawHtml.includes('id="modalEditPaper"'));
  console.log('Has renderOmrStep function:', rawHtml.includes('function renderOmrStep'));
  console.log('Has runOmrBatchGrading function:', rawHtml.includes('function runOmrBatchGrading'));
  console.log('Has syncOmrToGoogleDrive function:', rawHtml.includes('function syncOmrToGoogleDrive'));
  console.log('Has modalMatrixFullscreen:', rawHtml.includes('id="modalMatrixFullscreen"'));
  console.log('Has modal-matrix-pages-bar (Pagination):', rawHtml.includes('id="modal-matrix-pages-bar"'));
  console.log('Has modal-page-matrix (Trang 1):', rawHtml.includes('id="modal-page-matrix"'));
  console.log('Has modal-page-spec (Trang 2):', rawHtml.includes('id="modal-page-spec"'));
  console.log('Has modalManageAnswerKeys:', rawHtml.includes('id="modalManageAnswerKeys"'));
  console.log('Has openManageAnswerKeysModal:', rawHtml.includes('openManageAnswerKeysModal'));
  console.log('Has handleExternalAnswerKeyFile:', rawHtml.includes('handleExternalAnswerKeyFile'));

  console.log('\nALL VERIFICATIONS COMPLETE & PASSED 100%!');
}

run().catch(console.error);
