const fs = require('fs');
const { loadDriveQuestionBank } = require('../src/drive-bank');

const bank = loadDriveQuestionBank();
console.log('Total TF questions in bank:', bank.tfQuestions.length);

const categories = {
  ai: [],
  netDevice: [],
  netProtocol: [],
  resourceShare: [],
  cyberLaw: []
};

bank.tfQuestions.forEach(q => {
  const f = q.sourceFile;
  const p = q.prompt.toLowerCase();
  const allText = (q.prompt + ' ' + q.items.map(it => it.text).join(' ')).toLowerCase();

  if (f.includes('12A') || allText.includes('trí tuệ nhân tạo') || allText.includes('ani') || allText.includes('học máy')) {
    categories.ai.push(q);
  }
  if (f.includes('CD3') || f.includes('thiết bị')) {
    categories.netDevice.push(q);
  }
  if (f.includes('Bài 4') || allText.includes('giao thức') || allText.includes('tcp/ip') || allText.includes('địa chỉ ip')) {
    categories.netProtocol.push(q);
  }
  if (allText.includes('chia sẻ') || allText.includes('tài nguyên') || f.includes('Kết nối mạng')) {
    categories.resourceShare.push(q);
  }
  if (f.includes('11D') || allText.includes('không gian mạng') || allText.includes('ứng xử') || allText.includes('văn hóa')) {
    categories.cyberLaw.push(q);
  }
});

console.log('TF AI:', categories.ai.length);
console.log('TF Net Device:', categories.netDevice.length);
console.log('TF Net Protocol:', categories.netProtocol.length);
console.log('TF Resource Sharing:', categories.resourceShare.length);
console.log('TF Cyber Law:', categories.cyberLaw.length);

console.log('\n--- SAMPLE RESOURCE SHARING TF ---');
categories.resourceShare.forEach((q, i) => {
  console.log(`[#${i+1}] ${q.id} (${q.sourceFile}): ${q.prompt.substring(0, 70)}`);
  q.items.forEach(it => {
    console.log(`   ${it.letter}. [${it.level}] [${it.isCorrect ? 'Đ' : 'S'}] ${it.text.substring(0, 60)}`);
  });
});

