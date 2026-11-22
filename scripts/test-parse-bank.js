const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

function parseQuestionsFromText(paragraphs, filename) {
  const mcqQuestions = [];
  const tfQuestions = [];
  const saQuestions = [];

  let currentLevel = 'Biết';
  let currentFormat = 'mcq';

  let i = 0;
  while (i < paragraphs.length) {
    const rawLine = paragraphs[i].trim();
    if (!rawLine) {
      i++;
      continue;
    }

    // Check level headers
    if (/NHẬN\s*BIẾT|MỨC\s*ĐỘ\s*1/i.test(rawLine)) {
      currentLevel = 'Biết';
    } else if (/THÔNG\s*HIỂU|MỨC\s*ĐỘ\s*2/i.test(rawLine)) {
      currentLevel = 'Hiểu';
    } else if (/VẬN\s*DỤNG|MỨC\s*ĐỘ\s*(3|4)/i.test(rawLine)) {
      currentLevel = 'Vận dụng';
    }

    // Check format headers
    if (/TRẮC\s*NGHIỆM\s*ĐÚNG\s*[\/-]?\s*SAI|DẠNG\s*D2|PHẦN\s*II\b/i.test(rawLine)) {
      currentFormat = 'true_false';
    } else if (/TRẢ\s*LỜI\s*NGẮN|TỰ\s*LUẬN|PHẦN\s*III\b/i.test(rawLine)) {
      currentFormat = 'short_answer';
    } else if (/PHẦN\s*I\b|TRẮC\s*NGHIỆM\s*(NHIỀU\s*LỰA\s*CHỌN|4\s*LỰA\s*CHỌN)|A\.\s*TRẮC\s*NGHIỆM/i.test(rawLine)) {
      currentFormat = 'mcq';
    }

    // Check if line starts a question: "Câu 1:", "Câu 1.", "Câu 1 "
    const qMatch = rawLine.match(/^Câu\s+(\d+)[:.]\s*(.*)/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      let qPrompt = qMatch[2].trim();
      let collectedLines = [];

      // Read following lines until next question or major header
      i++;
      while (i < paragraphs.length) {
        const nextLine = paragraphs[i].trim();
        if (/^Câu\s+\d+[:.]/i.test(nextLine) || 
            /^(PHẦN\s+[I|V|X]+|CHỦ ĐỀ\b|\d+\.\s*NHẬN BIẾT|\d+\.\s*THÔNG HIỂU|\d+\.\s*VẬN DỤNG)/i.test(nextLine) ||
            /BẢNG ĐÁP ÁN/i.test(nextLine)) {
          break;
        }
        if (nextLine) collectedLines.push(nextLine);
        i++;
      }

      const combined = [qPrompt, ...collectedLines].join('\n');
      
      // True/False sub-items are explicitly lowercase a), b), c), d) or have "đúng/sai"
      // Notice: Do NOT use 'i' flag for [a-d]! Lowercase only!
      const hasTFItems = /(?:^|\n)\s*[a-d]\s*[\).]/m.test(combined);
      
      // Check MCQ: uppercase [A-D] followed by dot or colon
      const hasMCQItems = /(?:^|[\t\s\n])([A-D])\s*[\.:]\s*/.test(combined);

      if (hasTFItems && (currentFormat === 'true_false' || !hasMCQItems)) {
        // Parse a), b), c), d) items
        const tfItems = [];
        const lines = combined.split('\n');
        let currentSub = null;
        for (const line of lines) {
          const subMatch = line.match(/^\s*([a-d])\s*[\).]\s*(.*)/); // case sensitive lowercase
          if (subMatch) {
            if (currentSub) tfItems.push(currentSub);
            currentSub = { letter: subMatch[1].toLowerCase(), text: subMatch[2].trim(), isCorrect: null };
            if (/\((?:đúng|đ|true)\)/i.test(line)) currentSub.isCorrect = true;
            else if (/\((?:sai|s|false)\)/i.test(line)) currentSub.isCorrect = false;
          } else if (currentSub) {
            currentSub.text += ' ' + line;
            if (/\((?:đúng|đ|true)\)/i.test(line)) currentSub.isCorrect = true;
            else if (/\((?:sai|s|false)\)/i.test(line)) currentSub.isCorrect = false;
          }
        }
        if (currentSub) tfItems.push(currentSub);

        if (tfItems.length >= 2) {
          tfQuestions.push({
            qNum,
            prompt: qPrompt || lines[0],
            items: tfItems,
            level: currentLevel,
            sourceFile: filename,
            type: 'true_false'
          });
          continue;
        }
      }

      // Check MCQ options A, B, C, D
      const options = {};
      // Options can be split across lines or all in one line: "A. xxx.  B. yyy.  C. zzz.  D. ttt."
      const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
      let m;
      while ((m = optRegex.exec(combined)) !== null) {
        options[m[1]] = m[2].trim();
      }

      if (options['A'] && options['B']) {
        let cleanPrompt = qPrompt;
        if (!cleanPrompt) {
          cleanPrompt = combined.replace(/(?:^|[\t\n\s])[A-D]\s*[\.:].*$/s, '').trim();
        }
        mcqQuestions.push({
          qNum,
          prompt: cleanPrompt || qPrompt,
          options: [
            options['A'] || '',
            options['B'] || '',
            options['C'] || '',
            options['D'] || ''
          ],
          correctAnswer: 'A',
          level: currentLevel,
          sourceFile: filename,
          type: 'mcq'
        });
      } else {
        saQuestions.push({
          qNum,
          prompt: qPrompt || combined,
          level: currentLevel,
          sourceFile: filename,
          type: 'short_answer'
        });
      }
      continue;
    }

    i++;
  }

  return { mcqQuestions, tfQuestions, saQuestions };
}

let totalMCQ = 0;
let totalTF = 0;
let totalSA = 0;

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const parsed = parseDocxBuffer(buf);
  const result = parseQuestionsFromText(parsed.paragraphs || [], file);
  console.log(`\n[${file}]`);
  console.log(`  MCQ: ${result.mcqQuestions.length} | TF: ${result.tfQuestions.length} | SA: ${result.saQuestions.length}`);
  totalMCQ += result.mcqQuestions.length;
  totalTF += result.tfQuestions.length;
  totalSA += result.saQuestions.length;
}

console.log(`\n========================================`);
console.log(`GRAND TOTAL: ${totalMCQ} MCQ, ${totalTF} True/False, ${totalSA} Short Answer`);
console.log(`TOTAL BANK QUESTIONS: ${totalMCQ + totalTF + totalSA}`);
