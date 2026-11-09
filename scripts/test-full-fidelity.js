const fs = require('fs');
const path = require('path');
const { extractDocumentContent } = require('../src/doc-parser');
const { parseDocxBuffer } = require('../src/zip-docx');

// Mock updated drive-bank functions
function inferCognitiveLevel(promptText, defaultLevel = 'Biết') {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const p = norm(promptText);

  if (
    /tinh\b|xac dinh dia chi|chuyen doi|tinh huong|xu ly su co|khi gap loi|thiet lap|cau hinh|cai dat|lenh nao.*(de|giup) (kiem tra|ping|tracert)/i.test(p) ||
    /\b(lan|mai|kien|nam|an|hung|minh|thanh)\b.*(su dung|can|gui|cai dat|thiet lap|ket noi)/i.test(p) ||
    /mot (cong ty|truong hoc|lop hoc|van phong|doanh nghiep|gia dinh)/i.test(p)
  ) {
    return 'Vận dụng';
  }

  if (
    /tai sao|vi sao|muc dich|vai tro|chuc nang|so sanh|phan biet|y nghia|giai thich|phan anh dung|khac voi|khong phu hop|phat bieu nao sai|loi khuyen nao sai/i.test(p)
  ) {
    return 'Hiểu';
  }

  return defaultLevel;
}

function resolveTargetBankFiles(row = {}) {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const t = norm(row.topic || row.chu_de || '');
  const u = norm(row.unit || row.noi_dung || '');
  const full = `${t} ${u}`.trim();

  let targetFiles = [];
  let forbiddenFiles = [];
  let preferredKeywords = [];
  let penaltyKeywords = [];

  const hasAI = /tri tue nhan tao|\b(ai|ani|agi)\b|hoc may|alan turing|dartmouth/i.test(full);
  const hasNetDevice = /thiet bi mang|switch|router|access point|modem|\bhub\b|cap mang|bai 3\b/i.test(full);
  const hasNetProtocol = /giao thuc|tcp\/ip|dia chi ip|ipv4|ipv6|goi tin|dns|dhcp|\bip\b|bai 4\b/i.test(full);
  const hasResourceSharing = /chia se tai nguyen|ket noi cac thiet bi|ket noi mang|thiet bi so|wlan|lan\b|bai 5\b/i.test(full);
  const hasCyberLaw = /dao duc|phap luat|van hoa|khong gian mang|moi truong so|ung xu|giao tiep|an toan mang|bai 6\b/i.test(full);
  const hasWeb = /tao trang web|trang web|\bhtml\b|\bweb\b|mobirise|bai 7\b/i.test(full);
  const hasCareer = /huong nghiep|nhom nghe|dich vu va quan tri/i.test(full);
  const hasCSDL = /co so du lieu|\bcsdl\b|\bsql\b|khoa chinh/i.test(full);
  const hasPython = /lap trinh|python|\bbien\b|phep gan/i.test(full);

  const ALL_FILES = [
    'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
    'CD3-Một số thiết bị Mạng thông dụng.docx',
    'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx',
    'Chuyên đề 12B. Kết nối mạng.docx',
    'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx',
    'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx',
    'Chuyên đề 12F. Tạo trang Web.docx',
    'Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx',
    'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx',
    'Chuyên đề 10F. Lập trình cơ bản.docx'
  ];

  if (hasAI && !hasNetDevice && !hasNetProtocol && !hasResourceSharing && !hasCyberLaw) {
    targetFiles = ['Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    if (full.includes('bai 1') || full.includes('lam quen') || full.includes('khai niem')) {
      preferredKeywords = ['khai niem', 'ani', 'agi', 'turing', 'dartmouth', 'tri tue', 'dinh nghia'];
      penaltyKeywords = ['y te', 'giao duc', 'tai chinh', 'dao duc', 'viec lam', 'chan doan'];
    } else if (full.includes('bai 2') || full.includes('khoa hoc') || full.includes('doi song') || full.includes('ung dung')) {
      preferredKeywords = ['khoa hoc', 'doi song', 'y te', 'giao duc', 'tai chinh', 'dao duc', 'ung dung'];
      penaltyKeywords = ['alan turing', 'dartmouth'];
    }
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  if (hasNetDevice && !hasNetProtocol) {
    targetFiles = ['CD3-Một số thiết bị Mạng thông dụng.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  if (hasNetProtocol) {
    targetFiles = ['Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  if (hasResourceSharing) {
    targetFiles = ['Chuyên đề 12B. Kết nối mạng.docx', 'CD3-Một số thiết bị Mạng thông dụng.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  if (hasCyberLaw) {
    targetFiles = ['Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  return { targetFiles: [], forbiddenFiles: [], preferredKeywords: [], penaltyKeywords: [] };
}

function calculateRelevanceScore(question, topicText, subtopicText) {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const target = norm(topicText + ' ' + subtopicText);
  const qText = norm(question.prompt + ' ' + (question.topicTitle || '') + ' ' + (question.topicCode || ''));

  let score = 0;
  const keyPhrases = [
    { phrase: 'tri tue nhan tao', weight: 30 },
    { phrase: 'ani', weight: 25 },
    { phrase: 'agi', weight: 25 },
    { phrase: 'thiet bi mang', weight: 30 },
    { phrase: 'switch', weight: 25 },
    { phrase: 'router', weight: 25 },
    { phrase: 'access point', weight: 25 },
    { phrase: 'modem', weight: 25 },
    { phrase: 'giao thuc', weight: 30 },
    { phrase: 'tcp/ip', weight: 30 },
    { phrase: 'dia chi ip', weight: 30 },
    { phrase: 'ipv4', weight: 25 },
    { phrase: 'ipv6', weight: 25 },
    { phrase: 'chia se tai nguyen', weight: 30 },
    { phrase: 'ket noi mang', weight: 25 },
    { phrase: 'dao duc', weight: 25 },
    { phrase: 'phap luat', weight: 25 },
    { phrase: 'van hoa', weight: 20 },
    { phrase: 'khong gian mang', weight: 25 },
    { phrase: 'ung xu', weight: 25 }
  ];

  for (const kp of keyPhrases) {
    if (target.includes(kp.phrase) && qText.includes(kp.phrase)) score += kp.weight;
  }

  const stopwords = new Set(['bai', 'chu', 'de', 'va', 'cua', 'trong', 'cac', 'mot', 'cho', 'la', 'co', 'nhung', 'khi', 'theo', 'dung', 'sai', 'sau', 'day']);
  const words = target.split(/[\s,.;:()_/-]+/).filter(w => w.length >= 3 && !stopwords.has(w));
  for (const w of words) {
    if (qText.includes(w)) score += 2;
  }
  return score;
}

// Load bank with expanded paragraphs & inferred levels
function loadEnhancedBank() {
  const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));
  const allMCQ = [];
  const allTF = [];
  const allSA = [];

  for (const file of files) {
    const buf = fs.readFileSync(path.join(dir, file));
    const parsed = parseDocxBuffer(buf);
    const pDetails = parsed.paragraphDetails || [];
    
    // Split multi-question paragraphs
    const expandedDetails = [];
    pDetails.forEach(pd => {
      const qMatches = pd.text.match(/(?:^|[\s\n\t])(?:Câu\s*hỏi|Câu)\s+\d+[:.]/gi);
      if (qMatches && qMatches.length > 1) {
        const parts = (pd.taggedText || pd.text).split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
        parts.forEach(part => {
          if (part.trim()) {
            const plain = part.replace(/<\/?u>/gi, '').trim();
            const uParts = (part.match(/<u>([\s\S]*?)<\/u>/gi) || []).map(u => u.replace(/<\/?u>/gi, '').trim());
            expandedDetails.push({ text: plain, taggedText: part.trim(), underlinedParts: uParts });
          }
        });
      } else {
        expandedDetails.push(pd);
      }
    });

    let currentLevel = 'Biết';
    let currentFormat = 'mcq';
    let i = 0;

    while (i < expandedDetails.length) {
      const rawLine = expandedDetails[i].text.trim();
      if (!rawLine) { i++; continue; }

      if (/NHẬN\s*BIẾT|MỨC\s*ĐỘ\s*1\b/i.test(rawLine)) currentLevel = 'Biết';
      else if (/THÔNG\s*HIỂU|MỨC\s*ĐỘ\s*2\b/i.test(rawLine)) currentLevel = 'Hiểu';
      else if (/VẬN\s*DỤNG|MỨC\s*ĐỘ\s*(3|4)\b/i.test(rawLine)) currentLevel = 'Vận dụng';

      if (/TRẮC\s*NGHIỆM\s*ĐÚNG\s*[\/-]?\s*SAI|DẠNG\s*D2|PHẦN\s*II\b/i.test(rawLine)) currentFormat = 'true_false';
      else if (/TRẢ\s*LỜI\s*NGẮN|TỰ\s*LUẬN|PHẦN\s*III\b/i.test(rawLine)) currentFormat = 'short_answer';
      else if (/PHẦN\s*I\b|TRẮC\s*NGHIỆM\s*(NHIỀU\s*LỰA\s*CHỌN|4\s*LỰA\s*CHỌN)|A\.\s*TRẮC\s*NGHIỆM/i.test(rawLine)) currentFormat = 'mcq';

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
        const normalized = combinedText.replace(/([^\s\n\t])([A-D])\s*[\.:]/g, '$1\n$2. ');
        const hasMCQItems = /(?:^|[\t\s\n])([A-D])\s*[\.:]\s*/.test(normalized);

        const detectedLevel = inferCognitiveLevel(qPrompt || combinedText, currentLevel);

        if (hasTFItems && (currentFormat === 'true_false' || !hasMCQItems)) {
          const tfItems = [];
          const lines = combinedText.split('\n');
          let currentSub = null;
          for (const line of lines) {
            const subMatch = line.match(/^\s*([a-d])\s*[\).]\s*(.*)/);
            if (subMatch) {
              if (currentSub) tfItems.push(currentSub);
              currentSub = { letter: subMatch[1].toLowerCase(), text: subMatch[2].trim(), isCorrect: false, level: detectedLevel };
              if (/\((?:đúng|đ|true)\)/i.test(line)) currentSub.isCorrect = true;
            } else if (currentSub) {
              currentSub.text += ' ' + line;
              if (/\((?:đúng|đ|true)\)/i.test(line)) currentSub.isCorrect = true;
            }
          }
          if (currentSub) tfItems.push(currentSub);
          if (tfItems.length >= 4) {
            allTF.push({
              id: `TF_${file}_Q${qNum}`,
              prompt: qPrompt || lines[0],
              items: tfItems.slice(0, 4),
              level: detectedLevel,
              sourceFile: file
            });
          }
          continue;
        }

        const options = {};
        const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
        let m;
        while ((m = optRegex.exec(normalized)) !== null) {
          options[m[1]] = m[2].trim();
        }

        if (options['A'] && options['B']) {
          let cleanPrompt = qPrompt;
          if (!cleanPrompt || cleanPrompt.length < 5) {
            cleanPrompt = combinedText.replace(/(?:^|[\t\n\s])[A-D]\s*[\.:].*$/s, '').trim();
          }
          allMCQ.push({
            id: `MCQ_${file}_Q${qNum}`,
            prompt: cleanPrompt || qPrompt,
            options: [options['A']||'', options['B']||'', options['C']||'', options['D']||''],
            correctAnswer: 'A',
            level: detectedLevel,
            sourceFile: file
          });
        }
        continue;
      }
      i++;
    }
  }

  return { allMCQ, allTF, allSA };
}

const bank = loadEnhancedBank();
console.log(`Loaded Enhanced Bank: ${bank.allMCQ.length} MCQ, ${bank.allTF.length} TF`);

// Now run simulation of step4
const matrixBuf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
const parsedMatrix = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', matrixBuf);
const rows = parsedMatrix.detectedMatrix.rows;

const usedIds = new Set();
function pickDrive(qt, row, lv) {
  let list = (qt === 'MCQ') ? bank.allMCQ : bank.allTF;
  const { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords } = resolveTargetBankFiles(row);
  let available = list.filter(q => !usedIds.has(q.id) && !forbiddenFiles.includes(q.sourceFile));
  if (targetFiles.length > 0) {
    const inTarget = available.filter(q => targetFiles.includes(q.sourceFile));
    if (inTarget.length > 0) available = inTarget;
  }
  const scored = available.map(q => {
    let score = calculateRelevanceScore(q, row.topic, row.unit);
    if (targetFiles.includes(q.sourceFile)) score += 100;
    if (q.level === lv) score += 30;
    const qText = (q.prompt + ' ' + (q.options ? q.options.join(' ') : '')).toLowerCase();
    for (const kw of preferredKeywords) if (qText.includes(kw)) score += 20;
    for (const kw of penaltyKeywords) if (qText.includes(kw)) score -= 25;
    return { q, score };
  }).sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    usedIds.add(scored[0].q.id);
    return scored[0].q;
  }
  return null;
}

console.log('\n--- VERIFYING MCQ ALLOCATION ---');
let mcqIdx = 1;
rows.forEach((r, rIdx) => {
  for (const lv of ['Biết', 'Hiểu', 'Vận dụng']) {
    const cnt = r.counts.MCQ[lv] || 0;
    for (let c = 0; c < cnt; c++) {
      const q = pickDrive('MCQ', r, lv);
      console.log(`C${mcqIdx++} [${lv}] -> Row ${rIdx+1}: [${r.unit.slice(0, 35)}] -> File: ${q.sourceFile}`);
    }
  }
});

console.log('\n--- VERIFYING TF ALLOCATION ---');
let tfIdx = 1;
let pending = [];
rows.forEach((r, rIdx) => {
  for (const lv of ['Biết', 'Hiểu', 'Vận dụng']) {
    const cnt = r.counts.TF[lv] || 0;
    for (let c = 0; c < cnt; c++) {
      pending.push({ r, rIdx, lv });
      if (pending.length === 4) {
        const prim = pending[0].r;
        const q = pickDrive('TF', prim, 'Hiểu');
        console.log(`ĐS${tfIdx++} -> Row ${pending[0].rIdx+1}: [${prim.unit.slice(0, 35)}] -> File: ${q ? q.sourceFile : 'NONE'}`);
        pending = [];
      }
    }
  }
});
