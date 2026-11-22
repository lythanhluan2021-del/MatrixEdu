const fs = require('fs');
const path = require('path');

// 1. Update src/qa-validator.js
const qaValPath = path.join(__dirname, '..', 'src', 'qa-validator.js');
let qaContent = fs.readFileSync(qaValPath, 'utf8');

const oldShuffledVariants = `function generateShuffledVariants(baseQuestions, numVariants = 4, startCode = 101) {
  const variants = [];
  const count = Math.max(1, Math.min(12, Number(numVariants) || 1));

  // Hàm PRNG có seed cố định theo mã đề để kết quả ổn định, tái lập được
  function createSeededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function shuffleArray(arr, rand) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  for (let vIdx = 0; vIdx < count; vIdx++) {
    const code = String(startCode + vIdx);
    const clonedQuestions = JSON.parse(JSON.stringify(baseQuestions || []));

    if (vIdx === 0) {
      // Mã đề gốc (101) giữ nguyên thứ tự chuẩn để đối chiếu trực tiếp
      variants.push({ code, questions: clonedQuestions });
      continue;
    }

    const rand = createSeededRandom(startCode + vIdx * 997);`;

const newShuffledVariants = `function generateShuffledVariants(baseQuestions, numVariants = 4, startCode = 101, customCodes = []) {
  const variants = [];
  // Chuẩn hóa danh sách mã đề tùy chỉnh nếu giáo viên chỉ định
  const userCodes = (Array.isArray(customCodes) ? customCodes : [])
    .map(c => String(c || '').trim())
    .filter(Boolean);

  const count = userCodes.length > 0
    ? userCodes.length
    : Math.max(1, Math.min(12, Number(numVariants) || 1));

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // Hàm PRNG có seed cố định theo mã đề để kết quả ổn định, tái lập được
  function createSeededRandom(seed) {
    let s = Math.abs(seed) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function shuffleArray(arr, rand) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  for (let vIdx = 0; vIdx < count; vIdx++) {
    const code = userCodes[vIdx] || String(startCode + vIdx);
    const clonedQuestions = JSON.parse(JSON.stringify(baseQuestions || []));

    if (vIdx === 0) {
      // Mã đề gốc (mã đầu tiên) giữ nguyên thứ tự chuẩn để đối chiếu trực tiếp
      variants.push({ code, questions: clonedQuestions });
      continue;
    }

    const seedVal = hashString(code) + (vIdx * 997) + (parseInt(code, 10) || 101);
    const rand = createSeededRandom(seedVal);`;

if (qaContent.includes(oldShuffledVariants)) {
  qaContent = qaContent.replace(oldShuffledVariants, newShuffledVariants);
  fs.writeFileSync(qaValPath, qaContent, 'utf8');
  console.log('✓ Updated generateShuffledVariants in src/qa-validator.js');
} else {
  console.log('⚠ Could not find oldShuffledVariants in src/qa-validator.js');
}

// 2. Update src/ai-engine.js
const aiEnginePath = path.join(__dirname, '..', 'src', 'ai-engine.js');
let aiContent = fs.readFileSync(aiEnginePath, 'utf8');

const oldAiVariants = `  // Nhân bản & Trộn các mã đề theo số lượng giáo viên yêu cầu (Mặc định 4 đề: 101, 102, 103, 104)
  const numVariants = Number(metadata.numVariants) || 4;
  const variants = generateShuffledVariants(questions, numVariants, 101);`;

const newAiVariants = `  // Nhân bản & Trộn các mã đề theo số lượng và danh sách mã đề tùy chỉnh của giáo viên
  const numVariants = Number(metadata.numVariants) || 4;
  const rawCodes = metadata.customCodes;
  const customCodes = Array.isArray(rawCodes) ? rawCodes : (typeof rawCodes === 'string' ? rawCodes.split(/[,;\\s]+/).filter(Boolean) : []);
  const variants = generateShuffledVariants(questions, numVariants, 101, customCodes);`;

if (aiContent.includes(oldAiVariants)) {
  aiContent = aiContent.replace(oldAiVariants, newAiVariants);
  fs.writeFileSync(aiEnginePath, aiContent, 'utf8');
  console.log('✓ Updated step4GenerateQuestionsAndAnswers in src/ai-engine.js');
} else {
  console.log('⚠ Could not find oldAiVariants in src/ai-engine.js');
}

// 3. Update server.js /api/shuffle-variants endpoint
const serverPath = path.join(__dirname, '..', 'server.js');
let sContent = fs.readFileSync(serverPath, 'utf8');

const oldServerShuffle = `      const variants = generateShuffledVariants(body.questions || [], body.numVariants || 4, body.startCode || 101);`;
const newServerShuffle = `      const rawCodes = body.customCodes;
      const customCodes = Array.isArray(rawCodes) ? rawCodes : (typeof rawCodes === 'string' ? rawCodes.split(/[,;\\s]+/).filter(Boolean) : []);
      const variants = generateShuffledVariants(body.questions || [], body.numVariants || 4, body.startCode || 101, customCodes);`;

if (sContent.includes(oldServerShuffle)) {
  sContent = sContent.replace(oldServerShuffle, newServerShuffle);
  fs.writeFileSync(serverPath, sContent, 'utf8');
  console.log('✓ Updated /api/shuffle-variants in server.js');
} else {
  console.log('⚠ Could not find oldServerShuffle in server.js');
}

console.log('All backend updates for custom exam codes completed!');

