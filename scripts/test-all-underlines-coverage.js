const fs = require('fs');
const path = require('path');
const { readZipEntries } = require('../src/zip-docx');

function decodeXmlEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractParagraphDetails(pXml) {
  let plainText = '';
  let taggedText = '';
  const underlinedParts = [];

  const rRegex = /<w:r\b[\s\S]*?<\/w:r>|<w:tab\s*\/?>|<w:br\s*\/?>/g;
  let rMatch;
  while ((rMatch = rRegex.exec(pXml)) !== null) {
    const item = rMatch[0];
    if (item.startsWith('<w:tab')) {
      plainText += '\t';
      taggedText += '\t';
      continue;
    }
    if (item.startsWith('<w:br')) {
      plainText += '\n';
      taggedText += '\n';
      continue;
    }

    const isUnderlined = /<w:u\b/.test(item) && !/<w:u\s+w:val="none"/i.test(item);

    let runText = '';
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(item)) !== null) {
      runText += decodeXmlEntities(tMatch[1]);
    }

    if (runText) {
      plainText += runText;
      if (isUnderlined) {
        taggedText += `<u>${runText}</u>`;
        underlinedParts.push(runText.trim());
      } else {
        taggedText += runText;
      }
    }
  }

  return {
    text: plainText.trim(),
    taggedText: taggedText.trim(),
    underlinedParts,
    isUnderlined: underlinedParts.length > 0
  };
}

function detectUnderlinedAnswer(combinedTaggedText, options) {
  const letterMatch = combinedTaggedText.match(/<u>\s*([A-D])\s*[\.:]?\s*<\/u>/i);
  if (letterMatch) return letterMatch[1].toUpperCase();

  const fullMatch = combinedTaggedText.match(/<u>\s*([A-D])\s*[\.:]\s*[\s\S]*?<\/u>/i);
  if (fullMatch) return fullMatch[1].toUpperCase();

  const contentMatch = combinedTaggedText.match(/(?:^|[\t\n\s])([A-D])\s*[\.:]\s*<u>[\s\S]*?<\/u>/i);
  if (contentMatch) return contentMatch[1].toUpperCase();

  if (options) {
    const uMatches = combinedTaggedText.match(/<u>([\s\S]*?)<\/u>/gi) || [];
    for (const u of uMatches) {
      const uText = u.replace(/<\/?u>/gi, '').toLowerCase().trim();
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

let grandMCQ = 0;
let grandWithAns = 0;
const ansDistribution = { A: 0, B: 0, C: 0, D: 0 };

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const entries = readZipEntries(buf);
  const docXml = entries['word/document.xml'].toString('utf8');
  const pMatches = docXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const pDetails = pMatches.map(extractParagraphDetails).filter(p => p.text.length > 0);

  let fileMCQ = 0;
  let fileWithAns = 0;

  let i = 0;
  while (i < pDetails.length) {
    const p = pDetails[i];
    const qMatch = p.text.match(/^(?:Câu\s*hỏi|Câu)\s+(\d+)(?:\s*\([^)]+\))?[:.]\s*(.*)/i);
    if (qMatch) {
      let collected = [p];
      let j = i + 1;
      while (j < pDetails.length) {
        const nextP = pDetails[j];
        if (/^(?:Câu\s*hỏi|Câu)\s+\d+/i.test(nextP.text) || /^(PHẦN|CHỦ ĐỀ|BÀI|\d+\.\s*NHẬN BIẾT)/i.test(nextP.text)) {
          break;
        }
        collected.push(nextP);
        j++;
      }

      const combinedText = collected.map(c => c.text).join('\n');
      const combinedTagged = collected.map(c => c.taggedText).join('\n');

      const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
      const options = {};
      let m;
      while ((m = optRegex.exec(combinedText)) !== null) {
        options[m[1]] = m[2].trim();
      }

      if (options['A'] && options['B']) {
        fileMCQ++;
        const ans = detectUnderlinedAnswer(combinedTagged, options);
        if (ans) {
          fileWithAns++;
          ansDistribution[ans]++;
        }
      }
      i = j - 1;
    }
    i++;
  }

  console.log(`[${file}] MCQ: ${fileMCQ} | Underlined Answer Detected: ${fileWithAns} (${fileMCQ > 0 ? Math.round(fileWithAns/fileMCQ*100) : 0}%)`);
  grandMCQ += fileMCQ;
  grandWithAns += fileWithAns;
}

console.log('\n========================================');
console.log(`TOTAL MCQ: ${grandMCQ} | DETECTED UNDERLINED ANSWERS: ${grandWithAns} (${Math.round(grandWithAns/grandMCQ*100)}%)`);
console.log('Answer distribution:', ansDistribution);

