const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');

function checkFileStructure(filename) {
  const buf = fs.readFileSync(path.join(dir, filename));
  const parsed = parseDocxBuffer(buf);
  console.log(`\n================== ${filename} ==================`);
  
  // Find sections, levels, question patterns
  const pList = parsed.paragraphs || [];
  let cauCount = 0;
  for (let i = 0; i < pList.length; i++) {
    const text = pList[i].trim();
    if (/^(PHẦN|CHỦ ĐỀ|BÀI|\d+\.\s*NHẬN BIẾT|\d+\.\s*THÔNG HIỂU|\d+\.\s*VẬN DỤNG|I\.|II\.|III\.)/i.test(text)) {
      console.log(`[HEADER L${i}]`, text.substring(0, 100));
    }
    if (/^Câu\s+\d+[:.]/i.test(text)) {
      cauCount++;
      if (cauCount <= 5 || (cauCount >= 20 && cauCount <= 22)) {
        console.log(`\n[CAU #${cauCount} (line ${i})]`, text);
        // Print next 4 lines
        for (let j = 1; j <= 5 && i + j < pList.length; j++) {
          console.log(`   + [L${i+j}]`, pList[i+j].substring(0, 120));
        }
      }
    }
    if (/ĐÁP ÁN|BẢNG ĐÁP ÁN/i.test(text)) {
      console.log(`[ANSWER KEY HEADER L${i}]`, text);
      for (let j = 1; j <= 5 && i + j < pList.length; j++) {
        console.log(`   + [L${i+j}]`, pList[i+j].substring(0, 120));
      }
    }
  }
}

checkFileStructure('Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx');
checkFileStructure('CD3-Một số thiết bị Mạng thông dụng.docx');

