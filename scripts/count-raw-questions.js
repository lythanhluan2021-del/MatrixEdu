const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = 'data/google_drive_bank';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

files.forEach(f => {
  const buf = fs.readFileSync(path.join(dir, f));
  const parsed = parseDocxBuffer(buf);
  let totalInlineQuestions = 0;
  parsed.paragraphs.forEach(p => {
    const matches = p.match(/(?:Câu\s*hỏi|Câu)\s+\d+[:.]/gi);
    if (matches) totalInlineQuestions += matches.length;
  });
  console.log(`${f}: ~${totalInlineQuestions} questions detected in text`);
});

