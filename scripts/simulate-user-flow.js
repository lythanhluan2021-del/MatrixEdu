const fs = require('fs');
const { extractDocumentContent } = require('../src/doc-parser');
const { step1AnalyzeMaterial, step2GenerateMatrix } = require('../src/ai-engine');

async function testFlow() {
  const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
  // 1. Upload doc
  const uploadRes = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf);
  console.log('--- 1. UPLOAD DOC ---');
  console.log('detectedMatrix rows:', uploadRes.detectedMatrix?.rows?.length);
  console.log('detectedUnits rows:', uploadRes.detectedUnits?.length);
  console.log('tables count:', uploadRes.tables?.length);

  // 2. Step 1 Analyze
  const step1Res = await step1AnalyzeMaterial({
    metadata: uploadRes.detectedMetadata || { grade: '12', subject: 'Tin học', level: 'THPT' },
    rawText: uploadRes.text,
    tables: uploadRes.tables
  });
  console.log('\n--- 2. STEP 1 ANALYZE ---');
  console.log('step1Res.ok:', step1Res.ok);
  console.log('step1 units count:', step1Res.analysis?.units?.length);
  console.log('step1 detectedMatrix rows:', step1Res.analysis?.detectedMatrix?.rows?.length);
  if (step1Res.analysis?.units) {
    step1Res.analysis.units.forEach((u, i) => console.log(`   Unit ${i+1}: ${u.unit}`));
  }

  // 3. Step 2 Generate Matrix
  const step2Res = await step2GenerateMatrix({
    metadata: uploadRes.detectedMetadata || { grade: '12', subject: 'Tin học', level: 'THPT' },
    units: step1Res.analysis?.units,
    detectedMatrix: step1Res.analysis?.detectedMatrix || uploadRes.detectedMatrix
  });
  console.log('\n--- 3. STEP 2 MATRIX ---');
  console.log('step2Res.ok:', step2Res.ok);
  console.log('step2 matrix rows count:', step2Res.matrix?.rows?.length);
  if (step2Res.matrix?.rows) {
    step2Res.matrix.rows.forEach((r, i) => console.log(`   Row ${i+1}: ${r.unit} | Points: ${r.points}`));
  }
}

testFlow();

