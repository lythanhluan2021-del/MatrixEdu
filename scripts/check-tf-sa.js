const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const parsed = parseDocxBuffer(buf);
  const pList = parsed.paragraphs || [];
  
  const tfMatches = [];
  const saMatches = [];
  const partMatches = [];
  
  pList.forEach((p, idx) => {
    if (/PHẦN\s+(I|II|III|1|2|3)|TRẮC NGHIỆM ĐÚNG\s*SAI|TRẢ LỜI NGẮN|ĐÚNG\/SAI/i.test(p)) {
      partMatches.push({ idx, text: p.trim() });
    }
    if (/^[a-d]\)\s*/i.test(p.trim())) {
      tfMatches.push({ idx, text: p.trim() });
    }
    if (/câu hỏi tự luận|trả lời ngắn/i.test(p)) {
      saMatches.push({ idx, text: p.trim() });
    }
  });

  if (partMatches.length > 0 || tfMatches.length > 0 || saMatches.length > 0) {
    console.log(`\n================== ${file} ==================`);
    console.log('Part headings:', partMatches.slice(0, 5));
    console.log(`Sub-items a) b) c) d): ${tfMatches.length} items`);
    if (tfMatches.length > 0) {
      console.log('Sample a) b) c) d):', tfMatches.slice(0, 4));
    }
    console.log('Short answer mentions:', saMatches.slice(0, 3));
  }
}

