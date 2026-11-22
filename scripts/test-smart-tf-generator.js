const fs = require('fs');
const { extractDocumentContent } = require('../src/doc-parser');
const { loadDriveQuestionBank, resolveTargetBankFiles } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();
const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const ext = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf);
const matrix = ext.detectedMatrix;

console.log('Matrix rows:', matrix.rows.length);

// Let's examine how TF items are specified across rows
const tfSlots = [];
matrix.rows.forEach((r, rIdx) => {
  ['Biết', 'Hiểu', 'Vận dụng'].forEach(lv => {
    const cnt = r.counts.TF?.[lv] || 0;
    for (let c = 0; c < cnt; c++) {
      tfSlots.push({ row: r, rIdx, lv });
    }
  });
});

console.log('Total TF statement slots:', tfSlots.length);
console.log('Slots detail:');
tfSlots.forEach((slot, sIdx) => {
  console.log(`Slot ${sIdx + 1}: Row ${slot.rIdx + 1} [${slot.row.unit}] - Level: ${slot.lv}`);
});

// Group slots into questions of 4 statements
const tfQuestions = [];
for (let qIdx = 0; qIdx < Math.floor(tfSlots.length / 4); qIdx++) {
  const qSlots = tfSlots.slice(qIdx * 4, qIdx * 4 + 4);
  const rowsInQuestion = Array.from(new Set(qSlots.map(s => s.rIdx)));
  console.log(`\nQuestion ${qIdx + 1} spans Rows:`, rowsInQuestion.map(ri => `Dòng ${ri+1} (${matrix.rows[ri].unit})`).join(' + '));
}

