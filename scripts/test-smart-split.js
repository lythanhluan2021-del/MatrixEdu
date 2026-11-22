const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = 'data/google_drive_bank';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

files.forEach(f => {
  const buf = fs.readFileSync(path.join(dir, f));
  const parsed = parseDocxBuffer(buf);
  const pDetails = parsed.paragraphDetails || [];
  
  // Intelligent expansion: only split if a single paragraph contains >= 2 question headers
  const expandedDetails = [];
  pDetails.forEach(pd => {
    const qMatches = pd.text.match(/(?:^|[\s\n\t])(?:Câu\s*hỏi|Câu)\s+\d+[:.]/gi);
    if (qMatches && qMatches.length > 1) {
      // Contains multiple questions in one paragraph -> split!
      const parts = pd.text.split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
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

  console.log(`${f}: original = ${pDetails.length}, expanded = ${expandedDetails.length}`);
});

