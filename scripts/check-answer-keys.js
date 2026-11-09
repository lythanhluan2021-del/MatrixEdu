const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const files = ['Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx', 'CD3-Một số thiết bị Mạng thông dụng.docx', 'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx'];

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const parsed = parseDocxBuffer(buf);
  console.log(`\n================== ${file} ==================`);
  
  // Look for tables or text containing "ĐÁP ÁN"
  if (parsed.tables && parsed.tables.length > 0) {
    console.log(`Found ${parsed.tables.length} tables in ${file}`);
    parsed.tables.forEach((t, tidx) => {
      console.log(`Table #${tidx+1}: headers:`, t.headers ? t.headers.slice(0, 5) : 'none');
      if (t.rows && t.rows.length > 0) {
        console.log(`Table #${tidx+1} row 0:`, t.rows[0].slice(0, 5));
        if (t.rows.length > 1) console.log(`Table #${tidx+1} row 1:`, t.rows[1].slice(0, 5));
      }
    });
  }

  // Also look for "ĐÁP ÁN" in paragraphs
  (parsed.paragraphs || []).forEach((p, pidx) => {
    if (/ĐÁP\s*ÁN|BẢNG\s*ĐÁP\s*ÁN/i.test(p)) {
      console.log(`Paragraph L${pidx}:`, p);
      for (let k = 1; k <= 3 && pidx + k < parsed.paragraphs.length; k++) {
        console.log(`   + L${pidx+k}:`, parsed.paragraphs[pidx+k].substring(0, 100));
      }
    }
  });
}

