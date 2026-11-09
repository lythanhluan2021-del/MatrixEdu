const { loadDriveQuestionBank, calculateRelevanceScore } = require('../src/drive-bank');
const bank = loadDriveQuestionBank();

const row4 = {
  topic: 'Chủ đề 2. Mạng máy tính và Internet',
  unit: 'Bài 3: Một số thiết bị mạng thông dụng.'
};

const q16 = bank.tfQuestions.find(q => q.sourceFile.includes('12A') && q.prompt.includes('Câu 16'));
if (q16) {
  console.log('q16 prompt:', q16.prompt);
  console.log('q16 level:', q16.level);
  console.log('q16 relevance score:', calculateRelevanceScore(q16, row4.topic, row4.unit));
  console.log('q16 total score with lv match:', calculateRelevanceScore(q16, row4.topic, row4.unit) + (q16.level === 'Hiểu' ? 15 : 0));
}

