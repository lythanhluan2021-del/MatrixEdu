const { loadDriveQuestionBank } = require('../src/drive-bank');
const bank = loadDriveQuestionBank();

const b4 = bank.mcqQuestions.filter(q => q.sourceFile.includes('Giao Thức Mạng'));
const levels = {};
b4.forEach(q => { levels[q.level] = (levels[q.level] || 0) + 1; });
console.log('Bài 4 MCQ levels:', levels);

const b4TF = bank.tfQuestions.filter(q => q.sourceFile.includes('Giao Thức Mạng'));
const tfLevels = {};
b4TF.forEach(q => { tfLevels[q.level] = (tfLevels[q.level] || 0) + 1; });
console.log('Bài 4 TF levels:', tfLevels);

