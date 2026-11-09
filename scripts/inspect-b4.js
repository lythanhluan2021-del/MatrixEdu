const { loadDriveQuestionBank } = require('../src/drive-bank');
const bank = loadDriveQuestionBank();

const b4Questions = bank.mcqQuestions.filter(q => q.sourceFile.includes('Giao Thức Mạng'));
console.log('Total MCQ in Bài 4 Giao thức mạng:', b4Questions.length);
b4Questions.slice(0, 8).forEach((q, idx) => {
  console.log(`Q${idx+1} [${q.level}]: ${q.prompt.slice(0, 90)}...`);
});

