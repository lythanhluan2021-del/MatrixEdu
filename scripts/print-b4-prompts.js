const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);

for (let pi = 185; pi < 218; pi++) {
  console.log(`P${pi+1}: ${parsed.paragraphs[pi].trim()}`);
}

