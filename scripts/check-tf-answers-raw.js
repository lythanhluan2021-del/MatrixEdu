const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Kết nối mạng.docx');
const parsed = parseDocxBuffer(buf);

console.log('Tables in Kết nối mạng:', parsed.tables.length);
parsed.tables.forEach((t, ti) => {
  console.log(`Table ${ti+1}: ${t.length} rows`);
  t.slice(0, 4).forEach(r => console.log('  ', r));
});

// Check paragraphs mentioning "đúng", "sai" or "Đáp án"
parsed.paragraphs.forEach((p, pi) => {
  if (/đáp\s*án|bảng\s*đáp\s*án|phần\s*ii/i.test(p)) {
    console.log(`P${pi+1}: ${p.slice(0, 100)}`);
  }
});

