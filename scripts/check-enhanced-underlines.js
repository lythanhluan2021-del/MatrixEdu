const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

function detectUnderlinedAnswer(combinedTaggedText, options, underlinedParts = []) {
  if (!combinedTaggedText) return null;
  const letterMatch = combinedTaggedText.match(/<u>\s*([A-D])\s*[\.:]?\s*<\/u>/i);
  if (letterMatch) return letterMatch[1].toUpperCase();

  const fullMatch = combinedTaggedText.match(/<u>\s*([A-D])\s*[\.:]\s*[\s\S]*?<\/u>/i);
  if (fullMatch) return fullMatch[1].toUpperCase();

  const contentMatch = combinedTaggedText.match(/(?:^|[\t\n\s])([A-D])\s*[\.:]\s*<u>[\s\S]*?<\/u>/i);
  if (contentMatch) return contentMatch[1].toUpperCase();

  if (options) {
    const allUnderlined = (combinedTaggedText.match(/<u>([\s\S]*?)<\/u>/gi) || [])
      .map(u => u.replace(/<\/?u>/gi, '').trim().toLowerCase())
      .concat(underlinedParts.map(u => (u || '').trim().toLowerCase()));

    for (const uText of allUnderlined) {
      if (uText.length >= 3) {
        for (const letter of ['A', 'B', 'C', 'D']) {
          const optText = (options[letter] || '').toLowerCase().trim();
          if (optText && (optText.includes(uText) || uText.includes(optText))) {
            return letter;
          }
        }
      }
    }
  }
  return null;
}

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));
let totalMCQ = 0;
let detected = 0;
const ansDist = { A: 0, B: 0, C: 0, D: 0 };

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const parsed = parseDocxBuffer(buf);
  const pDetails = parsed.paragraphDetails || [];
  
  const expandedDetails = [];
  pDetails.forEach(pd => {
    const qMatches = pd.text.match(/(?:^|[\s\n\t])(?:Câu\s*hỏi|Câu)\s+\d+[:.]/gi);
    if (qMatches && qMatches.length > 1) {
      const parts = (pd.taggedText || pd.text).split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
      parts.forEach(part => {
        if (part.trim()) {
          const plain = part.replace(/<\/?u>/gi, '').trim();
          const uParts = (part.match(/<u>([\s\S]*?)<\/u>/gi) || []).map(u => u.replace(/<\/?u>/gi, '').trim());
          expandedDetails.push({ text: plain, taggedText: part.trim(), underlinedParts: uParts });
        }
      });
    } else {
      expandedDetails.push(pd);
    }
  });

  let i = 0;
  while (i < expandedDetails.length) {
    const rawLine = expandedDetails[i].text.trim();
    if (!rawLine) { i++; continue; }
    const qMatch = rawLine.match(/^(?:Câu\s*hỏi|Câu)\s+(\d+)(?:\s*\([^)]+\))?[:.]\s*(.*)/is);
    if (qMatch) {
      let collected = [expandedDetails[i]];
      i++;
      while (i < expandedDetails.length) {
        const nextLine = expandedDetails[i].text.trim();
        if (/^(?:Câu\s*hỏi|Câu)\s+\d+/i.test(nextLine) || 
            /^(PHẦN\s+[I|V|X]+|CHỦ ĐỀ\b|\d+\.\s*NHẬN BIẾT|\d+\.\s*THÔNG HIỂU|\d+\.\s*VẬN DỤNG)/i.test(nextLine) ||
            /BẢNG ĐÁP ÁN/i.test(nextLine)) {
          break;
        }
        if (nextLine) collected.push(expandedDetails[i]);
        i++;
      }

      const combinedText = collected.map(d => d.text).join('\n');
      const combinedTagged = collected.map(d => d.taggedText).join('\n');
      const allUnderlined = collected.flatMap(d => d.underlinedParts || []);
      const normalized = combinedText.replace(/([^\s\n\t])([A-D])\s*[\.:]/g, '$1\n$2. ');

      const options = {};
      const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
      let m;
      while ((m = optRegex.exec(normalized)) !== null) {
        options[m[1]] = m[2].trim();
      }

      if (options['A'] && options['B']) {
        totalMCQ++;
        const ans = detectUnderlinedAnswer(combinedTagged, options, allUnderlined);
        if (ans) {
          detected++;
          ansDist[ans]++;
        }
      }
      continue;
    }
    i++;
  }
}

console.log(`Total MCQs parsed: ${totalMCQ}`);
console.log(`Detected underlined answers: ${detected} / ${totalMCQ} (${Math.round(detected/totalMCQ*100)}%)`);
console.log('Answer distribution:', ansDist);

