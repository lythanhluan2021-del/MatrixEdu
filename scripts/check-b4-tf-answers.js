const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);

parsed.paragraphs.forEach((p, pi) => {
  if (/đáp\s*án|phần\s*ii/i.test(p)) {
    console.log(`P${pi+1}: ${p.slice(0, 80)}`);
  }
});

