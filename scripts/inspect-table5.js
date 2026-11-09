const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const parsed = parseDocxBuffer(buf);
const tbl5 = parsed.tables[4]; // Table 5: Bản đặc tả

console.log('=== TABLE 5 (BẢN ĐẶC TẢ) ROWS ===');
tbl5.forEach((r, idx) => {
  console.log(`Row ${idx+1}: [${r[1]}] | [${r[2]}]`);
  console.log(`   YCCD: ${r[3]?.slice(0, 80)}...`);
  console.log(`   TN nhiều lựa chọn: [${r[4]}]`);
  console.log(`   Đúng - Sai: [${r[5]}]`);
});

