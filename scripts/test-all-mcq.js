const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = 'data/google_drive_bank';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

files.forEach(f => {
  const buf = fs.readFileSync(path.join(dir, f));
  const parsed = parseDocxBuffer(buf);
  const pDetails = parsed.paragraphDetails || [];
  const expanded = [];
  pDetails.forEach(pd => {
    const parts = pd.text.split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
    if (parts.length > 1) {
      parts.forEach(part => {
        if (part.trim()) expanded.push({ text: part.trim(), taggedText: part.trim(), underlinedParts: [] });
      });
    } else {
      expanded.push(pd);
    }
  });

  let mcq = 0;
  expanded.forEach(d => {
    const qMatch = d.text.match(/^(?:Câu\s*hỏi|Câu)\s+(\d+)(?:\s*\([^)]+\))?[:.]\s*(.*)/is);
    if (qMatch) {
      let norm = qMatch[2].replace(/([^\s\n\t])([A-D])\s*[\.:]/g, '$1\n$2. ');
      const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
      const opts = {};
      let m;
      while ((m = optRegex.exec(norm)) !== null) {
        opts[m[1]] = m[2].trim();
      }
      if (opts['A'] && opts['B']) mcq++;
    }
  });
  console.log(`${f}: ${mcq} MCQ parsed`);
});

