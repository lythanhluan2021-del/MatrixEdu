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

const fs = require('fs');
const { parseDocxBuffer } = require('../src/zip-docx');

const buf = fs.readFileSync('data/google_drive_bank/Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx');
const parsed = parseDocxBuffer(buf);
const pDetails = parsed.paragraphDetails || [];

const expandedDetails = [];
pDetails.forEach(pd => {
  const qMatches = pd.text.match(/(?:^|[\s\n\t])(?:Câu\s*hỏi|Câu)\s+\d+[:.]/gi);
  if (qMatches && qMatches.length > 1) {
    const parts = pd.text.split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
    parts.forEach(part => {
      if (part.trim()) expandedDetails.push({ text: part.trim() });
    });
  } else {
    expandedDetails.push(pd);
  }
});

const counts = { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 };
expandedDetails.forEach(d => {
  const m = d.text.match(/^(?:Câu\s*hỏi|Câu)\s+(\d+)(?:\s*\([^)]+\))?[:.]\s*(.*)/is);
  if (m) {
    const lv = inferCognitiveLevel(m[2]);
    counts[lv]++;
  }
});

console.log('Inferred levels in Bài 4:', counts);

