const { loadDriveQuestionBank } = require('../src/drive-bank');
const bank = loadDriveQuestionBank();

console.log('Total TF questions in bank:', bank.tfQuestions.length);

// Let's inspect TF questions in Chuyên đề 12A
const tf12A = bank.tfQuestions.filter(q => q.sourceFile.includes('12A'));
console.log('\n--- 12A (AI) TF questions:', tf12A.length);
tf12A.forEach((q, idx) => {
  console.log(`[TF 12A #${idx+1}] ${q.prompt.slice(0, 70)}`);
  q.items.forEach(it => console.log(`   ${it.letter}) [${it.level}] [${it.isCorrect?'Đ':'S'}] ${it.text.slice(0, 60)}`));
});

// Let's inspect TF questions in Bài 4
const tfB4 = bank.tfQuestions.filter(q => q.sourceFile.includes('Bài 4'));
console.log('\n--- Bài 4 (Giao thức mạng) TF questions:', tfB4.length);
tfB4.slice(0, 4).forEach((q, idx) => {
  console.log(`[TF B4 #${idx+1}] ${q.prompt.slice(0, 70)}`);
  q.items.forEach(it => console.log(`   ${it.letter}) [${it.level}] [${it.isCorrect?'Đ':'S'}] ${it.text.slice(0, 60)}`));
});

// Let's inspect TF questions in Bài 5 / Kết nối mạng
const tfB5 = bank.tfQuestions.filter(q => q.sourceFile.includes('Kết nối mạng'));
console.log('\n--- Kết nối mạng (Bài 5) TF questions:', tfB5.length);
tfB5.slice(0, 4).forEach((q, idx) => {
  console.log(`[TF B5 #${idx+1}] ${q.prompt.slice(0, 70)}`);
  q.items.forEach(it => console.log(`   ${it.letter}) [${it.level}] [${it.isCorrect?'Đ':'S'}] ${it.text.slice(0, 60)}`));
});

