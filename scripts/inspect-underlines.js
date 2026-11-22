const fs = require('fs');
const { readZipEntries } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/CD3-Một số thiết bị Mạng thông dụng.docx');
const entries = readZipEntries(buf);
const docXml = entries['word/document.xml'].toString('utf8');

const pMatches = docXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];

function inspectParagraph(pXml) {
  const rRegex = /<w:r\b[\s\S]*?<\/w:r>/g;
  let rMatch;
  const runs = [];
  while ((rMatch = rRegex.exec(pXml)) !== null) {
    const rXml = rMatch[0];
    const isUnderlined = /<w:u\b/.test(rXml) && !/<w:u\s+w:val="none"/i.test(rXml);
    const isBold = /<w:b\b/.test(rXml) && !/<w:b\s+w:val="0"/i.test(rXml) && !/<w:b\s+w:val="false"/i.test(rXml);
    
    // Extract text in <w:t>
    let text = '';
    const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(rXml)) !== null) {
      text += tMatch[1];
    }
    runs.push({ text, isUnderlined, isBold });
  }
  return runs;
}

let count = 0;
for (const p of pMatches) {
  if (p.includes('<w:u')) {
    const runs = inspectParagraph(p);
    const fullText = runs.map(r => r.text).join('');
    if (fullText.includes('A.') || fullText.includes('B.') || fullText.includes('C.') || fullText.includes('D.')) {
      console.log(`\n================== P #${count+1} ==================`);
      console.log('Full Text:', fullText);
      console.log('Runs with styling:');
      runs.forEach((r, ri) => {
        if (r.text.trim()) {
          console.log(`  [R${ri}] "${r.text}" | u=${r.isUnderlined} | b=${r.isBold}`);
        }
      });
      count++;
      if (count >= 5) break;
    }
  }
}

