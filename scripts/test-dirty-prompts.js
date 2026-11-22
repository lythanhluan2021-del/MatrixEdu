const fs = require('fs');
const path = require('path');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();
console.log('Total MCQs in bank:', bank.mcqQuestions.length);

let dirtyPrompts = 0;
bank.mcqQuestions.forEach((q, idx) => {
  if (/(?:^|[\s\n\t\.\?!,:])([A-D])\s*[\.:]/m.test(q.prompt)) {
    dirtyPrompts++;
    if (dirtyPrompts <= 10) {
      console.log(`[Dirty #${dirtyPrompts}] ID: ${q.id}`);
      console.log(`   Prompt: ${q.prompt}`);
    }
  }
});

console.log(`Total dirty prompts with options leaked: ${dirtyPrompts} / ${bank.mcqQuestions.length}`);

