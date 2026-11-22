const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);

let splitParagraphs = [];
parsed.paragraphs.forEach(p => {
  // If paragraph contains multiple "Câu X:"
  const parts = p.split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
  parts.forEach(part => {
    if (part.trim()) splitParagraphs.push(part.trim());
  });
});

console.log('Original paragraphs:', parsed.paragraphs.length);
console.log('Split paragraphs:', splitParagraphs.length);

// Count how many questions start with Câu \d+
const qStarts = splitParagraphs.filter(p => /^(?:Câu\s*hỏi|Câu)\s+\d+[:.]/i.test(p));
console.log('Questions starting with Câu \\d+:', qStarts.length);
qStarts.slice(0, 10).forEach(q => console.log('Sample:', q.slice(0, 70)));

