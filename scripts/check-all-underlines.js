const fs = require('fs');
const { readZipEntries } = require('../src/zip-docx');

const testFiles = [
  'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
  'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx',
  'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx',
  'Chuyên đề 12F. Tạo trang Web.docx'
];

for (const fn of testFiles) {
  const buf = fs.readFileSync('data/google_drive_bank/' + fn);
  const entries = readZipEntries(buf);
  const docXml = entries['word/document.xml'].toString('utf8');
  const pMatches = docXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  
  console.log(`\n================== ${fn} ==================`);
  let found = 0;
  for (const p of pMatches) {
    if (p.includes('<w:u') || p.includes('<w:b') || p.includes('<w:highlight')) {
      const rRegex = /<w:r\b[\s\S]*?<\/w:r>/g;
      let rMatch;
      let pText = '';
      let underlinedText = '';
      let boldText = '';
      let highlightText = '';
      while ((rMatch = rRegex.exec(p)) !== null) {
        const rXml = rMatch[0];
        const isU = /<w:u\b/.test(rXml) && !/<w:u\s+w:val="none"/i.test(rXml);
        const isB = /<w:b\b/.test(rXml) && !/<w:b\s+w:val="0"/i.test(rXml) && !/<w:b\s+w:val="false"/i.test(rXml);
        const isH = /<w:highlight\b/.test(rXml);
        let t = '';
        const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
        let tMatch;
        while ((tMatch = tRegex.exec(rXml)) !== null) t += tMatch[1];
        pText += t;
        if (isU && t.trim()) underlinedText += ' [' + t.trim() + ']';
        if (isB && t.trim()) boldText += ' [' + t.trim() + ']';
        if (isH && t.trim()) highlightText += ' [' + t.trim() + ']';
      }
      if (underlinedText || highlightText) {
        if (pText.includes('A.') || pText.includes('B.') || pText.includes('C.') || pText.includes('D.')) {
          console.log(`P snippet: ${pText.substring(0, 100)}`);
          if (underlinedText) console.log(`   Underlined: ${underlinedText}`);
          if (highlightText) console.log(`   Highlight: ${highlightText}`);
          found++;
          if (found >= 4) break;
        }
      }
    }
  }
}

