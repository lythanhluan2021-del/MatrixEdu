const fs = require('fs');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();

function cleanStem(rawPrompt, optA) {
  if (!rawPrompt) return '';
  let str = rawPrompt;

  // 1. If optA text is available, locate 'A.' or 'A:' preceding optA snippet anywhere in the string
  if (optA && optA.trim()) {
    const aSnip = optA.trim().substring(0, 10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexA = new RegExp('A\\s*[\\.:]\\s*' + aSnip, 'i');
    const matchA = str.match(regexA);
    if (matchA && matchA.index !== undefined && matchA.index > 0) {
      return str.substring(0, matchA.index).trim();
    }
  }

  // 2. Pattern: A. ... B. ... C. ...
  const generalMatch = str.match(/(?:^|[\s\n\r\t]|[.\?!:;]|(?<=[a-zà-ỹ0-9]))A\s*[\.:]\s*[\s\S]*?[B|b]\s*[\.:]/);
  if (generalMatch && generalMatch.index !== undefined && generalMatch.index > 0) {
    return str.substring(0, generalMatch.index).trim();
  }

  // 3. Fallback: match any A. preceded by delimiter or space
  const firstA = str.match(/(?:^|[\s\n\r\t]|[.\?!:;]|(?<=[a-zà-ỹ0-9]))A\s*[\.:]/);
  if (firstA && firstA.index !== undefined && firstA.index > 0) {
    return str.substring(0, firstA.index).trim();
  }

  return str.trim();
}

let dirty = 0;
let cleanedSamples = [];
bank.mcqQuestions.forEach((q, idx) => {
  const optA = q.options && q.options[0];
  const cleaned = cleanStem(q.prompt, optA);
  if (/(?:^|[\s\n\t.\?!,:])([A-D])\s*[\.:]/m.test(cleaned)) {
    dirty++;
    if (dirty <= 5) {
      console.log('Still dirty:', q.id, '-->', cleaned);
    }
  }
  if (q.prompt.includes('Phát biểu nào sau đây sai?A.')) {
    cleanedSamples.push({ original: q.prompt, cleaned });
  }
});

console.log('Total MCQs:', bank.mcqQuestions.length);
console.log('Remaining dirty prompts:', dirty);
console.log('Cleaned sample (Câu 16 in screenshot):', JSON.stringify(cleanedSamples, null, 2));
