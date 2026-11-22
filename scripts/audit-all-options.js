const fs = require('fs');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();
let dirtyOptions = [];

bank.mcqQuestions.forEach((q) => {
  q.options.forEach((opt, optIdx) => {
    const letter = ['A', 'B', 'C', 'D'][optIdx];
    // Check if option contains section headers, next questions, or unwanted trailing text
    if (/(?:^|[\s\n\t])(?:(?:\d+\.|\b(?:PHẦN|DẠNG|D2)\b|[I|V|X]+\b|\bII\b|\bIII\b)[\s\.:\-_]*(?:câu\s*(?:hỏi|trắc\s*nghiệm)|trắc\s*nghiệm|đúng|sai|dạng|tự\s*luận|trả\s*lời|bảng\s*đáp\s*án)|TRẮC\s*NGHIỆM\s*Đ[\/-]?S|BẢNG\s*ĐÁP\s*ÁN|\d+\.\s*(?:CÂU|DẠNG|TRẮC|ĐÚNG|PHẦN|BÀI)|(?:\d+\.)*\d+\.?\s*(?:dạng\s*)?(?:thông\s*hiểu|vận\s*dụng|nhận\s*biết))/i.test(opt)) {
      dirtyOptions.push({
        id: q.id,
        source: q.sourceFile,
        optLetter: letter,
        text: opt
      });
    }
  });
});

console.log('Total dirty options across whole bank:', dirtyOptions.length);
dirtyOptions.forEach((d, i) => {
  console.log(`\n#${i + 1} [${d.id}] (${d.source}) Opt ${d.optLetter}:`);
  console.log('   Text:', JSON.stringify(d.text));
});

