const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Kết nối mạng.docx');
const parsed = parseDocxBuffer(buf);

for (let pi = 385; pi < Math.min(parsed.paragraphs.length, 445); pi++) {
  console.log(`P${pi+1}: ${parsed.paragraphs[pi].trim()}`);
}

