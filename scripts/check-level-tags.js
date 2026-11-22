const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = 'data/google_drive_bank';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

files.forEach(f => {
  const buf = fs.readFileSync(path.join(dir, f));
  const parsed = parseDocxBuffer(buf);
  const found = new Set();
  parsed.paragraphs.forEach(p => {
    const m = p.match(/(?:NHẬN\s*BIẾT|THÔNG\s*HIỂU|VẬN\s*DỤNG|MỨC\s*ĐỘ\s*\d|\((?:NB|TH|VD|VDC|B|H|V)\))/gi);
    if (m) m.forEach(x => found.add(x.toUpperCase()));
  });
  console.log(`${f}: level tags =`, Array.from(found));
});

