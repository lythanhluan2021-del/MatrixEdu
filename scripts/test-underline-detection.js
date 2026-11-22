const fs = require('fs');
const path = require('path');
const { readZipEntries } = require('../src/zip-docx');

function decodeXmlEntities(str) {
  return (str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseParagraphXmlWithFormatting(pXml) {
  let fullText = '';
  let fullTextWithTags = '';
  const underlinedParts = [];

  // Parse each run <w:r> or direct tokens
  const rRegex = /<w:r\b[\s\S]*?<\/w:r>|<w:tab\s*\/?>|<w:br\s*\/?>/g;
  let rMatch;
  while ((rMatch = rRegex.exec(pXml)) !== null) {
    const item = rMatch[0];
    if (item.startsWith('<w:tab')) {
      fullText += '\t';
      fullTextWithTags += '\t';
      continue;
    }
    if (item.startsWith('<w:br')) {
      fullText += '\n';
      fullTextWithTags += '\n';
      continue;
    }

    // It's a run <w:r>
    const isUnderlined = /<w:u\b/.test(item) && !/<w:u\s+w:val="none"/i.test(item);
    
    // Extract text inside <w:t>
    let runText = '';
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(item)) !== null) {
      runText += decodeXmlEntities(tMatch[1]);
    }

    if (runText) {
      fullText += runText;
      if (isUnderlined) {
        fullTextWithTags += `<u>${runText}</u>`;
        underlinedParts.push(runText.trim());
      } else {
        fullTextWithTags += runText;
      }
    }
  }

  return {
    text: fullText.trim(),
    textWithTags: fullTextWithTags.trim(),
    underlinedParts
  };
}

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const entries = readZipEntries(buf);
  const docXml = entries['word/document.xml'].toString('utf8');
  const pMatches = docXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];

  let mcqCount = 0;
  let correctFoundCount = 0;

  // Let's test questions
  for (let i = 0; i < pMatches.length; i++) {
    const pObj = parseParagraphXmlWithFormatting(pMatches[i]);
    const text = pObj.text;
    
    if (/^Câu\s+\d+[:.]/i.test(text)) {
      mcqCount++;
      // Collect question + options
      let combinedTags = pObj.textWithTags;
      let j = i + 1;
      while (j < pMatches.length) {
        const nextObj = parseParagraphXmlWithFormatting(pMatches[j]);
        if (/^Câu\s+\d+[:.]/i.test(nextObj.text) || /^PHẦN\b/i.test(nextObj.text) || /^CHỦ ĐỀ\b/i.test(nextObj.text)) {
          break;
        }
        combinedTags += '\n' + nextObj.textWithTags;
        j++;
      }

      // Check which option is underlined
      let detectedAnswer = null;

      // Pattern 1: <u>A</u> or <u>A.</u> or <u>A:</u> or <u>[A-D]</u>
      const letterMatch = combinedTags.match(/<u>\s*([A-D])\s*[\.:]?\s*<\/u>/i);
      if (letterMatch) {
        detectedAnswer = letterMatch[1].toUpperCase();
      } else {
        // Pattern 2: Option text inside <u>...</u>
        // e.g. A. <u>Nội dung đúng</u>
        const optWithUnderline = combinedTags.match(/(?:^|[\t\n\s])([A-D])\s*[\.:]\s*<u>(.*?)<\/u>/is);
        if (optWithUnderline) {
          detectedAnswer = optWithUnderline[1].toUpperCase();
        } else {
          // Pattern 3: <u>A. Nội dung đúng</u>
          const fullOptUnderline = combinedTags.match(/<u>\s*([A-D])\s*[\.:]\s*(.*?)<\/u>/is);
          if (fullOptUnderline) {
            detectedAnswer = fullOptUnderline[1].toUpperCase();
          }
        }
      }

      if (detectedAnswer) {
        correctFoundCount++;
        if (correctFoundCount <= 2) {
          console.log(`[${file}] ${text.substring(0, 60)} -> DETECTED ANSWER: ${detectedAnswer}`);
        }
      }
    }
  }

  console.log(`[${file}] Total "Câu X": ${mcqCount} | Answers detected via underline: ${correctFoundCount}`);
}

