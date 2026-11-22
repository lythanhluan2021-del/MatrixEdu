function parseTextAnswerKey(rawText) {
  const result = {};
  if (!rawText || typeof rawText !== 'string') return result;

  // Try JSON first
  try {
    const json = JSON.parse(rawText);
    if (json.answerKeysByCode) return json.answerKeysByCode;
    if (typeof json === 'object' && Object.keys(json).length > 0 && json['101']?.part1) return json;
  } catch (e) {}

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return result;

  // Format A: CSV kiểu bảng (Header có các mã đề)
  if (lines.length > 1 && (lines[0].includes(',') || lines[0].includes('\t') || lines[0].includes(';'))) {
    const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headers = lines[0].split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));

    // Tìm các cột là mã đề (VD: 101, 102, Mã 101, Code 101)
    const codeCols = [];
    headers.forEach((h, colIdx) => {
      const m = h.match(/([0-9]{3,4})/);
      if (m) codeCols.push({ colIdx, code: m[1] });
    });

    if (codeCols.length > 0) {
      codeCols.forEach(cc => {
        result[cc.code] = { part1: [], part2: {}, part3: {} };
      });

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''));
        codeCols.forEach(cc => {
          const val = (row[cc.colIdx] || '').toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(val)) {
            result[cc.code].part1.push(val);
          }
        });
      }
      return result;
    }
  }

  // Format B: Text theo dòng 'Mã đề 101: 1A 2B 3C...' hoặc '[101] 1A 2B...'
  let currentCode = '101';
  lines.forEach(line => {
    const codeMatch = line.match(/(?:mã đề|mã|code|đề|\[)\s*([0-9]{3,4})/i);
    if (codeMatch) {
      currentCode = codeMatch[1];
      if (!result[currentCode]) result[currentCode] = { part1: [], part2: {}, part3: {} };
    }

    if (!result[currentCode]) result[currentCode] = { part1: [], part2: {}, part3: {} };

    // Tìm các cặp số câu + đáp án: 1A, 2.B, 3-C, 4: D
    const pairs = [...line.matchAll(/([0-9]{1,2})\s*[\.:\-_]?\s*([A-D])/gi)];
    pairs.forEach(p => {
      const qNum = parseInt(p[1], 10);
      const opt = p[2].toUpperCase();
      result[currentCode].part1[qNum - 1] = opt;
    });

    // Tìm Đúng/Sai phần 2: 1a: Đ, 1b: S
    const tfPairs = [...line.matchAll(/([0-9]{1,2})\s*([a-d])\s*[\.:\-_]?\s*([ĐDS])/gi)];
    tfPairs.forEach(p => {
      const qNum = p[1];
      const sub = p[2].toLowerCase();
      const val = (p[3] === 'S' || p[3] === 's') ? 'S' : 'Đ';
      if (!result[currentCode].part2[qNum]) result[currentCode].part2[qNum] = {};
      result[currentCode].part2[qNum][sub] = val;
    });
  });

  return result;
}

// Test format bảng CSV
const csvSample = 'Câu,101,102,103,104\n1,A,B,C,D\n2,B,C,D,A\n3,C,D,A,B\n4,D,A,B,C';
console.log('CSV Parse:', Object.keys(parseTextAnswerKey(csvSample)));

// Test format text Zalo
const textSample = 'Mã đề 101: 1A 2B 3C 4D 5A 6B 7C 8D 1a: Đ 1b: S 1c: Đ 1d: S\nMã đề 102: 1B 2C 3D 4A 5B 6C 7D 8A 1a: S 1b: Đ 1c: S 1d: Đ';
const textParsed = parseTextAnswerKey(textSample);
console.log('Text Parse:', Object.keys(textParsed), '101 p1 count:', textParsed['101'].part1.filter(Boolean).length, '101 p2:', textParsed['101'].part2);

