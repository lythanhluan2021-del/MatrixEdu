const { loadDriveQuestionBank, calculateRelevanceScore } = require('../src/drive-bank');
const bank = loadDriveQuestionBank();

const row4 = {
  topic: 'Chủ đề 2. Mạng máy tính và Internet',
  unit: 'Bài 3: Một số thiết bị mạng thông dụng.'
};

const candidates = bank.tfQuestions.filter(q => q.items && q.items.length >= 4).map(q => ({
  id: q.id,
  file: q.sourceFile,
  score: calculateRelevanceScore(q, row4.topic, row4.unit),
  level: q.level
})).sort((a, b) => b.score - a.score);

console.log('Top 10 candidates for Row 4 TF:');
console.log(candidates.slice(0, 10));

