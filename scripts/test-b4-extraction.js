const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');
const { detectUnderlinedAnswer } = require('../src/drive-bank');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);
const pDetails = parsed.paragraphDetails || [];

const expandedDetails = [];
pDetails.forEach(pd => {
  const qMatches = pd.text.match(/(?:^|[\s\n\t])(?:Câu\s*hỏi|Câu)\s+\d+[:.]/gi);
  if (qMatches && qMatches.length > 1) {
    const parts = pd.text.split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
    parts.forEach(part => {
      if (part.trim()) {
        expandedDetails.push({
          text: part.trim(),
          taggedText: part.trim(),
          underlinedParts: []
        });
      }
    });
  } else {
    expandedDetails.push(pd);
  }
});

let currentLevel = 'Biết';
let currentFormat = 'mcq';
const mcqQuestions = [];
const tfQuestions = [];
let i = 0;

while (i < expandedDetails.length) {
  const rawLine = expandedDetails[i].text.trim();
  if (!rawLine) { i++; continue; }

  if (/TRẮC\s*NGHIỆM\s*ĐÚNG\s*[\/-]?\s*SAI|DẠNG\s*D2|PHẦN\s*II\b/i.test(rawLine)) {
    currentFormat = 'true_false';
  } else if (/TRẢ\s*LỜI\s*NGẮN|TỰ\s*LUẬN|PHẦN\s*III\b/i.test(rawLine)) {
    currentFormat = 'short_answer';
  } else if (/PHẦN\s*I\b|TRẮC\s*NGHIỆM\s*(NHIỀU\s*LỰA\s*CHỌN|4\s*LỰA\s*CHỌN)|A\.\s*TRẮC\s*NGHIỆM/i.test(rawLine)) {
    currentFormat = 'mcq';
  }

  const qMatch = rawLine.match(/^(?:Câu\s*hỏi|Câu)\s+(\d+)(?:\s*\([^)]+\))?[:.]\s*(.*)/is);
  if (qMatch) {
    const qNum = parseInt(qMatch[1], 10);
    let qPrompt = qMatch[2].trim();
    let collectedDetails = [expandedDetails[i]];

    i++;
    while (i < expandedDetails.length) {
      const nextLine = expandedDetails[i].text.trim();
      if (/^(?:Câu\s*hỏi|Câu)\s+\d+/i.test(nextLine) || 
          /^(PHẦN\s+[I|V|X]+|CHỦ ĐỀ\b|\d+\.\s*NHẬN BIẾT|\d+\.\s*THÔNG HIỂU|\d+\.\s*VẬN DỤNG)/i.test(nextLine) ||
          /BẢNG ĐÁP ÁN/i.test(nextLine)) {
        break;
      }
      if (nextLine) collectedDetails.push(expandedDetails[i]);
      i++;
    }

    const combinedText = collectedDetails.map(d => d.text).join('\n');
    const combinedTagged = collectedDetails.map(d => d.taggedText).join('\n');
    const allUnderlined = collectedDetails.flatMap(d => d.underlinedParts || []);

    const hasTFItems = /(?:^|\n)\s*[a-d]\s*[\).]/m.test(combinedText);
    const normalizedCombined = combinedText.replace(/([^\s\n\t])([A-D])\s*[\.:]/g, '$1\n$2. ');
    const hasMCQItems = /(?:^|[\t\s\n])([A-D])\s*[\.:]\s*/.test(normalizedCombined);

    if (hasTFItems && (currentFormat === 'true_false' || !hasMCQItems)) {
      // TF processing...
      tfQuestions.push({ qNum, prompt: qPrompt });
      continue;
    }

    const options = {};
    const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
    let m;
    while ((m = optRegex.exec(normalizedCombined)) !== null) {
      options[m[1]] = m[2].trim();
    }

    if (options['A'] && options['B']) {
      let cleanPrompt = qPrompt;
      if (!cleanPrompt || cleanPrompt.length < 5) {
        cleanPrompt = combinedText.replace(/(?:^|[\t\n\s])[A-D]\s*[\.:].*$/s, '').trim();
      }
      const detectedAns = 'A';
      mcqQuestions.push({
        qNum,
        prompt: cleanPrompt,
        options,
        ans: detectedAns || 'A'
      });
    }
    continue;
  }
  i++;
}

console.log('Parsed MCQ in Bài 4:', mcqQuestions.length);
console.log('Parsed TF in Bài 4:', tfQuestions.length);
console.log('Sample MCQ 1:', mcqQuestions[0]?.prompt?.slice(0, 60), mcqQuestions[0]?.options);
console.log('Sample MCQ 50:', mcqQuestions[49]?.prompt?.slice(0, 60), mcqQuestions[49]?.options);
