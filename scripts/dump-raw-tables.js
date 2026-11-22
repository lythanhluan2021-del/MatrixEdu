const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const parsed = parseDocxBuffer(buf);

console.log('Total tables in TIN 12:', parsed.tables.length);
parsed.tables.forEach((tbl, tIdx) => {
  console.log(`\n================== TABLE ${tIdx + 1} (${tbl.length} rows) ==================`);
  tbl.forEach((row, rIdx) => {
    console.log(`Row ${rIdx + 1} (${row.length} cols):`, JSON.stringify(row));
  });
});

