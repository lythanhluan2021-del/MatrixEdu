const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);

const pDetails = parsed.paragraphDetails || [];
const expandedDetails = [];

pDetails.forEach(pd => {
  const parts = pd.text.split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
  if (parts.length > 1) {
    // Also split taggedText if possible
    parts.forEach(part => {
      if (part.trim()) {
        expandedDetails.push({
          text: part.trim(),
          taggedText: part.trim(),
          underlinedParts: []
        });
      }
    });
  } else {
    expandedDetails.push(pd);
  }
});

let parsedMCQ = 0;
let parsedTF = 0;

expandedDetails.forEach((d, idx) => {
  const rawLine = d.text;
  const qMatch = rawLine.match(/^(?:Câu\s*hỏi|Câu)\s+(\d+)(?:\s*\([^)]+\))?[:.]\s*(.*)/is);
  if (qMatch) {
    let text = qMatch[2];
    // Check if options exist
    let norm = text.replace(/([^\s\n\t])([A-D])\s*[\.:]/g, '$1\n$2. ');
    const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
    const opts = {};
    let m;
    while ((m = optRegex.exec(norm)) !== null) {
      opts[m[1]] = m[2].trim();
    }
    if (opts['A'] && opts['B']) {
      parsedMCQ++;
    }
  }
});

console.log('Total expanded details:', expandedDetails.length);
console.log('Successfully parsed MCQs in Bài 4:', parsedMCQ);

