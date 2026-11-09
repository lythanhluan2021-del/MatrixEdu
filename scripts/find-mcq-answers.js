const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const parsed = parseDocxBuffer(buf);
  console.log(`\n================== ${file} ==================`);
  
  // Look for any table with answer key like: Câu | Đáp án or 1 | A | 2 | B ...
  let foundKey = false;
  parsed.tables.forEach((t, i) => {
    const textSample = JSON.stringify(t);
    if (/\"A\"|\"B\"|\"C\"|\"D\"/.test(textSample) && /\"1\"|\"2\"|\"3\"/.test(textSample)) {
      console.log(`Table ${i+1} might be MCQ Answer Key! Sample:`, t.slice(0, 3));
      foundKey = true;
    }
  });

  // Check paragraphs for answer keys: "1.A 2.B" or "1A, 2B" or "Đáp án trắc nghiệm"
  parsed.paragraphs.forEach((p, pi) => {
    if (/(?:đáp án|bảng đáp án|hướng dẫn chấm|key)/i.test(p) && !/đáp án đúng|đáp án sai/i.test(p)) {
      console.log(`Answer paragraph L${pi}:`, p.substring(0, 150));
      for (let k = 1; k <= 3 && pi + k < parsed.paragraphs.length; k++) {
        console.log(`   -> L${pi+k}:`, parsed.paragraphs[pi+k].substring(0, 150));
      }
      foundKey = true;
    }
  });

  if (!foundKey) {
    console.log('No separate answer key found, checking if options have marks/underlines...');
  }
}

