const fs = require('fs');
const { extractDocumentContent } = require('../src/doc-parser');
const { step4GenerateQuestionsAndAnswers } = require('../src/ai-engine');

const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const docRes = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf);
const matrix = docRes.detectedMatrix;

console.log('Matrix rows:', matrix.rows.length);

async function run() {
  const genRes = await step4GenerateQuestionsAndAnswers({
    metadata: {
      grade: 'Lớp 12',
      subject: 'Tin học',
      examPeriod: 'Kiểm tra Giữa học kỳ I',
      level: 'THPT'
    },
    matrix,
    specification: [],
    rawText: ''
  });

  console.log('Generate ok:', genRes.ok);
  const tfQuestions = genRes.questions.filter(q => q.type === 'TF');
  console.log('\n--- TF QUESTIONS GENERATED (' + tfQuestions.length + ') ---');
  tfQuestions.forEach((q, idx) => {
    console.log(`\nCâu ${idx + 1} (${q.matrixRef})`);
    console.log(`Chủ đề: ${q.unit || q.topic}`);
    console.log(`Stem: ${q.stem}`);
    const stmts = q.statements || q.items || [];
    stmts.forEach((st, sIdx) => {
      const letter = ['a', 'b', 'c', 'd'][sIdx];
      const ans = st.isTrue ? 'Đúng' : 'Sai';
      console.log(`   ${letter}) [${st.level || 'Biết'}] [${ans}]: ${st.text}`);
    });
    console.log(`Giải thích: ${q.explanation}`);
  });
}

run();

