const fs = require('fs');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();

function inspectFile(name, label) {
  console.log(`\n=================== ${label} (${name}) ===================`);
  const list = bank.tfQuestions.filter(q => q.sourceFile.includes(name));
  console.log(`Found ${list.length} questions`);
  list.forEach((q, idx) => {
    const ans = q.items.map(it => `${it.letter}: [${it.level}] ${it.isCorrect ? 'Đ' : 'S'}`).join(' | ');
    console.log(`\n#${idx + 1} (${q.id})`);
    console.log(`Prompt: ${q.prompt.substring(0, 100)}`);
    console.log(`Answers: ${ans}`);
    q.items.forEach(it => {
      console.log(`   ${it.letter}) [${it.level}] [${it.isCorrect ? 'Đúng' : 'Sai'}]: ${it.text.substring(0, 80)}`);
    });
  });
}

inspectFile('12A', 'Chủ đề 1: Trí tuệ nhân tạo (AI)');
inspectFile('CD3', 'Chủ đề 2: Thiết bị mạng (Bài 3)');
inspectFile('Bài 4', 'Chủ đề 2: Giao thức mạng (Bài 4)');
inspectFile('Kết nối mạng', 'Chủ đề 2: Kết nối mạng & Chia sẻ tài nguyên (Bài 5)');
inspectFile('11D', 'Chủ đề 3: Đạo đức, pháp luật, văn hoá số (Bài 6)');

