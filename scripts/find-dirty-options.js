const fs = require('fs');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();
let dirtyOptions = [];

bank.mcqQuestions.forEach((q, idx) => {
  if (!q.options) return;
  q.options.forEach((opt, optIdx) => {
    const letter = ['A', 'B', 'C', 'D'][optIdx];
    // Check if option contains:
    // 1. Next section header
    // 2. Next question (Câu hỏi, Câu 12...)
    // 3. Next option letter (e.g. B. or C. or D. inside an option)
    // 4. "Đáp án" or "Hướng dẫn giải"
    // 5. Unwanted trailing newlines or multiline text
    const hasNextSection = /(?:^|[\s\n\t])(?:\d+\.\s*CÂU\s*HỎI|\d+\.\s*Câu\s*(?:hỏi|trắc\s*nghiệm)|PHẦN\s+[I|V|X]+|BẢNG\s*ĐÁP\s*ÁN|MỨC\s*ĐỘ\s*\d|CHỦ\s*ĐỀ\b|\d+\.\s*NHẬN\s*BIẾT|\d+\.\s*THÔNG\s*HIỂU|\d+\.\s*VẬN\s*DỤNG|ĐÁP\s*ÁN\s*CHI\s*TIẾT)/i.test(opt);
    const hasNextQuestion = /(?:^|[\s\n\t])(?:Câu\s*hỏi|Câu)\s+\d+[:.]/i.test(opt);
    const hasNextOption = /(?:^|[\s\n\t])([A-D])\s*[\.:]\s+/i.test(opt) && optIdx < 3; // e.g. if option A contains B.
    const hasAnswerKey = /(?:^|[\s\n\t])(?:Đáp\s*án\s*[:.]|Hướng\s*dẫn\s*giải\s*[:.])/i.test(opt);
    const hasMultiLine = opt.includes('\n');

    if (hasNextSection || hasNextQuestion || hasNextOption || hasAnswerKey || hasMultiLine) {
      dirtyOptions.push({
        id: q.id,
        source: q.sourceFile,
        optLetter: letter,
        text: opt,
        reasons: { hasNextSection, hasNextQuestion, hasNextOption, hasAnswerKey, hasMultiLine }
      });
    }
  });
});

console.log('Total flagged options count:', dirtyOptions.length);
dirtyOptions.forEach((d, i) => {
  console.log(`\n#${i + 1} [${d.id}] (${d.source}) Opt ${d.optLetter}:`);
  console.log('   Reasons:', JSON.stringify(d.reasons));
  console.log('   Original text:', JSON.stringify(d.text));
});
