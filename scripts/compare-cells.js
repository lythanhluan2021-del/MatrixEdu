const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');
const { extractDocumentContent } = require('../src/doc-parser');

const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const parsed = parseDocxBuffer(buf);
const ext = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf);

const tbl2 = parsed.tables[1]; // Table 2
console.log('=== ORIGINAL TABLE 2 IN DOCX ===');
tbl2.forEach((r, idx) => {
  console.log(`Row ${idx + 1}: ${r.map(c => `[${c}]`).join(' ')}`);
});

console.log('\n=== DETECTED MATRIX ROWS ===');
ext.detectedMatrix.rows.forEach((r, idx) => {
  console.log(`Row ${idx + 1}: Topic="${r.topic}" | Unit="${r.unit}"`);
  console.log(`   MCQ: Biết=${r.counts.MCQ['Biết']}, Hiểu=${r.counts.MCQ['Hiểu']}, VD=${r.counts.MCQ['Vận dụng']} (Refs: ${r.cellRefs.MCQ.join(', ')})`);
  console.log(`   TF : Biết=${r.counts.TF['Biết']}, Hiểu=${r.counts.TF['Hiểu']}, VD=${r.counts.TF['Vận dụng']} (Refs: ${r.cellRefs.TF.join(', ')})`);
  console.log(`   SA : Biết=${r.counts.SA['Biết']}, Hiểu=${r.counts.SA['Hiểu']}, VD=${r.counts.SA['Vận dụng']}`);
  console.log(`   TL : Biết=${r.counts.ESSAY['Biết']}, Hiểu=${r.counts.ESSAY['Hiểu']}, VD=${r.counts.ESSAY['Vận dụng']}`);
  console.log(`   Points: ${r.points}đ`);
});

