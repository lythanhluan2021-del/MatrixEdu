const fs = require('fs');
let code = fs.readFileSync('scripts/verify-all.js', 'utf8');

const targetPoint = '  console.log(\'\\n--- 6. Verify index.html contains Step 7 & Fullscreen Modal & Drive Bank elements ---\');';

const newCheck = `  console.log('\\n--- 5b. Testing POST /api/omr/parse-answer-key (External Answer Key Engine) ---');
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

  console.log('\\n--- 6. Verify index.html contains Step 7 & Fullscreen Modal & Drive Bank elements ---');`;

if (code.includes(targetPoint)) {
  code = code.replace(targetPoint, newCheck);
  code = code.replace(
    '  console.log(\'Has modal-page-spec (Trang 2):\', rawHtml.includes(\'id="modal-page-spec"\'));',
    `  console.log('Has modal-page-spec (Trang 2):', rawHtml.includes('id="modal-page-spec"'));
  console.log('Has modalManageAnswerKeys:', rawHtml.includes('id="modalManageAnswerKeys"'));
  console.log('Has openManageAnswerKeysModal:', rawHtml.includes('openManageAnswerKeysModal'));
  console.log('Has handleExternalAnswerKeyFile:', rawHtml.includes('handleExternalAnswerKeyFile'));`
  );
  fs.writeFileSync('scripts/verify-all.js', code, 'utf8');
  console.log('Updated scripts/verify-all.js');
}

