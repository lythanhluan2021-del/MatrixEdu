const fs = require('fs');
const { extractDocumentContent } = require('../src/doc-parser');
const { step4GenerateQuestionsAndAnswers } = require('../src/ai-engine');

const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const res = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf);
console.log('Detected Matrix rows:', res.detectedMatrix?.rows?.length);

async function run() {
  if (res.detectedMatrix?.rows) {
    res.detectedMatrix.rows.forEach((r, idx) => {
      console.log('Row ' + (idx + 1) + ': [' + r.topic + '] - [' + r.unit + ']');
      console.log('  MCQ:', JSON.stringify(r.counts?.MCQ));
      console.log('  TF:', JSON.stringify(r.counts?.TF));
      console.log('  SA:', JSON.stringify(r.counts?.SA));
    });

    const step4Res = await step4GenerateQuestionsAndAnswers({
      metadata: { grade: '12', subject: 'Tin học' },
      matrix: res.detectedMatrix,
      specification: res.detectedSpec?.specification || []
    });

    console.log('\n--- GENERATED EXAM AUDIT ---');
    console.log('Total questions:', step4Res.questions?.length);
    step4Res.questions?.forEach((q, i) => {
      console.log(`Q${i+1} [${q.type}] [${q.level}] (Ref: ${q.matrixRef})`);
      console.log(`   Assigned Row: [${q.topic}] - [${q.unit}]`);
      console.log(`   Source File: ${q.sourceFile || 'AI/Custom'}`);
      console.log(`   Stem preview: ${q.stem.slice(0, 80)}...`);
    });
  }
}
run();
