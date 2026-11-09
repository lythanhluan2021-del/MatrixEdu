const fs = require('fs');
const { extractDocumentContent } = require('../src/doc-parser');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const res = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf);

console.log('Detected Matrix rows:', res.detectedMatrix.rows.length);
res.detectedMatrix.rows.forEach((r, idx) => {
  console.log(`Row ${idx+1}: [${r.topic}] - [${r.unit}] (MCQ: ${JSON.stringify(r.counts.MCQ)}, TF: ${JSON.stringify(r.counts.TF)})`);
});

