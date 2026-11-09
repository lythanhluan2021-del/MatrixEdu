const { loadDriveQuestionBank } = require('../src/drive-bank');
const bank = loadDriveQuestionBank();

const files = [
  'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
  'CD3-Một số thiết bị Mạng thông dụng.docx',
  'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx',
  'Chuyên đề 12B. Kết nối mạng.docx',
  'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx'
];

files.forEach(f => {
  const tfs = bank.tfQuestions.filter(q => q.sourceFile === f && q.items && q.items.length >= 4);
  console.log(`\n=== File: ${f} (${tfs.length} TF questions) ===`);
  tfs.slice(0, 3).forEach((q, idx) => {
    console.log(`  TF ${idx+1} [${q.level}]: ${q.prompt.slice(0, 80)}...`);
    console.log(`     Items: ${q.items.length} items (a: ${q.items[0].text.slice(0, 40)}... ans: ${q.items[0].isCorrect})`);
  });
});

