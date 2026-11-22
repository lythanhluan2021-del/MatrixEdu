const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);
console.log('Total paragraphs:', parsed.paragraphs.length);
parsed.paragraphs.slice(0, 30).forEach((p, idx) => {
  if (p.trim()) console.log(`P${idx+1}: ${p.trim()}`);
});

