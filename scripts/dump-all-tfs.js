const fs = require('fs');
const path = require('path');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();
const targetFiles = [
  'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
  'CD3-Một số thiết bị Mạng thông dụng.docx',
  'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx',
  'Chuyên đề 12B. Kết nối mạng.docx',
  'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx'
];

targetFiles.forEach(file => {
  const tfs = bank.tfQuestions.filter(q => q.sourceFile === file);
  console.log(`\n=================== FILE: ${file} (${tfs.length} TF questions) ===================`);
  tfs.forEach((q, idx) => {
    console.log(`\n[TF ${idx+1}] ID: ${q.id} | Prompt: ${q.prompt?.slice(0, 80)}`);
    if (q.items) {
      q.items.forEach(it => {
        console.log(`   ${it.letter}) [${it.level}] [${it.isCorrect ? 'ĐÚNG' : 'SAI'}]: ${it.text?.slice(0, 70)}`);
      });
    }
  });
});

