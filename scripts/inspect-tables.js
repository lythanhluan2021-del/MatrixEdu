const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const buf = fs.readFileSync(path.join(dir, 'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx'));
const parsed = parseDocxBuffer(buf);

parsed.tables.forEach((t, i) => {
  console.log(`\n--- TABLE ${i+1} (${t.length} rows) ---`);
  t.slice(0, 5).forEach((r, ri) => {
    console.log(`Row ${ri}:`, r);
  });
});
