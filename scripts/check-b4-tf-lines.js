const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);

parsed.paragraphs.forEach((p, pi) => {
  if (/(?:phần\s*ii|đúng\s*[-/]?\s*sai)/i.test(p) || /^[a-d]\)/i.test(p.trim())) {
    console.log(`P${pi+1}: ${p.trim().slice(0, 90)}`);
  }
});

