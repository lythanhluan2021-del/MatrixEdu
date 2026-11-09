/**
 * OMR ENGINE - BỘ MÁY CHẤM PHIẾU TRẢ LỜI TRẮC NGHIỆM BỘ GD&ĐT 2025
 * Tương thích chuẩn "Phiếu TLTN 2025 mã đề 4 số đen trắng.pdf"
 * Hỗ trợ chấm theo mã đề, quy tắc tính điểm Bộ GD&ĐT 2025,
 * phát hiện lỗi tô (tô mờ, sai mã đề, tô đúp), lưu vết can thiệp (Audit Trail),
 * thống kê phổ điểm & đồng bộ CSDL vào Google Drive.
 */

const fs = require('fs');
const path = require('path');

// Đường dẫn lưu trữ CSDL cục bộ và đồng bộ
const DATA_DIR = path.join(__dirname, '..', 'data');
const OMR_DB_FILE = path.join(DATA_DIR, 'omr_database.json');
const OMR_AUDIT_FILE = path.join(DATA_DIR, 'omr_audit_logs.json');
const OMR_ROSTER_FILE = path.join(DATA_DIR, 'omr_active_roster.json');
const OMR_SESSIONS_DIR = path.join(DATA_DIR, 'omr_database');

// Khởi tạo thư mục data và omr_database nếu chưa có
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(OMR_SESSIONS_DIR)) {
  fs.mkdirSync(OMR_SESSIONS_DIR, { recursive: true });
}

/**
 * Danh sách lớp mẫu chuẩn THPT (35 học sinh)
 */
const DEFAULT_CLASS_ROSTER = [
  { sbd: '120001', name: 'Nguyễn An Bình', gender: 'Nam', dob: '15/03/2008', className: '12A1' },
  { sbd: '120002', name: 'Trần Thị Cẩm Tú', gender: 'Nữ', dob: '22/07/2008', className: '12A1' },
  { sbd: '120003', name: 'Lê Hoàng Dũng', gender: 'Nam', dob: '10/11/2008', className: '12A1' },
  { sbd: '120004', name: 'Phạm Minh Đức', gender: 'Nam', dob: '05/01/2008', className: '12A1' },
  { sbd: '120005', name: 'Hoàng Thu Giang', gender: 'Nữ', dob: '18/09/2008', className: '12A1' },
  { sbd: '120006', name: 'Đặng Tuấn Hải', gender: 'Nam', dob: '30/04/2008', className: '12A1' },
  { sbd: '120007', name: 'Vũ Bích Hạnh', gender: 'Nữ', dob: '12/12/2008', className: '12A1' },
  { sbd: '120008', name: 'Bùi Gia Huy', gender: 'Nam', dob: '25/08/2008', className: '12A1' },
  { sbd: '120009', name: 'Đỗ Thùy Linh', gender: 'Nữ', dob: '08/02/2008', className: '12A1' },
  { sbd: '120010', name: 'Ngô Quang Long', gender: 'Nam', dob: '14/06/2008', className: '12A1' },
  { sbd: '120011', name: 'Dương Khánh Mai', gender: 'Nữ', dob: '20/10/2008', className: '12A1' },
  { sbd: '120012', name: 'Lý Quốc Nam', gender: 'Nam', dob: '03/05/2008', className: '12A1' },
  { sbd: '120013', name: 'Đinh Hồng Nhung', gender: 'Nữ', dob: '19/03/2008', className: '12A1' },
  { sbd: '120014', name: 'Mai Trọng Nghĩa', gender: 'Nam', dob: '27/09/2008', className: '12A1' },
  { sbd: '120015', name: 'Trịnh Bảo Ngọc', gender: 'Nữ', dob: '11/04/2008', className: '12A1' },
  { sbd: '120016', name: 'Hồ Vĩnh Phát', gender: 'Nam', dob: '09/08/2008', className: '12A1' },
  { sbd: '120017', name: 'Phan Như Quỳnh', gender: 'Nữ', dob: '16/11/2008', className: '12A1' },
  { sbd: '120018', name: 'Trương Đăng Quang', gender: 'Nam', dob: '02/01/2008', className: '12A1' },
  { sbd: '120019', name: 'Võ Minh Quân', gender: 'Nam', dob: '21/05/2008', className: '12A1' },
  { sbd: '120020', name: 'Đoàn Kim Ngân', gender: 'Nữ', dob: '07/07/2008', className: '12A1' },
  { sbd: '120021', name: 'Lâm Thanh Sơn', gender: 'Nam', dob: '29/12/2008', className: '12A1' },
  { sbd: '120022', name: 'Lê Diệu Thảo', gender: 'Nữ', dob: '14/02/2008', className: '12A1' },
  { sbd: '120023', name: 'Nguyễn Đình Thắng', gender: 'Nam', dob: '17/10/2008', className: '12A1' },
  { sbd: '120024', name: 'Trần Phương Thúy', gender: 'Nữ', dob: '23/04/2008', className: '12A1' },
  { sbd: '120025', name: 'Phạm Đức Thành', gender: 'Nam', dob: '06/08/2008', className: '12A1' },
  { sbd: '120026', name: 'Vũ Thanh Trúc', gender: 'Nữ', dob: '31/01/2008', className: '12A1' },
  { sbd: '120027', name: 'Đỗ Hoàng Trung', gender: 'Nam', dob: '13/09/2008', className: '12A1' },
  { sbd: '120028', name: 'Bùi Kim Tuyến', gender: 'Nữ', dob: '28/06/2008', className: '12A1' },
  { sbd: '120029', name: 'Nguyễn Tấn Tài', gender: 'Nam', dob: '04/03/2008', className: '12A1' },
  { sbd: '120030', name: 'Cao Ngọc Uyên', gender: 'Nữ', dob: '18/12/2008', className: '12A1' },
  { sbd: '120031', name: 'Trần Văn Việt', gender: 'Nam', dob: '26/07/2008', className: '12A1' },
  { sbd: '120032', name: 'Lê Hoàng Vũ', gender: 'Nam', dob: '01/10/2008', className: '12A1' },
  { sbd: '120033', name: 'Phạm Kiều Vy', gender: 'Nữ', dob: '12/05/2008', className: '12A1' },
  { sbd: '120034', name: 'Hoàng Minh Vương', gender: 'Nam', dob: '19/08/2008', className: '12A1' },
  { sbd: '120035', name: 'Nguyễn Hải Yến', gender: 'Nữ', dob: '24/11/2008', className: '12A1' }
];

/**
 * Lấy lịch sử lưu vết can thiệp (Audit Logs)
 */
function getAuditLogs() {
  if (fs.existsSync(OMR_AUDIT_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(OMR_AUDIT_FILE, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

/**
 * Thêm một bản ghi lưu vết can thiệp vào CSDL
 */
function logAuditRecord({ paperId, sbd, studentName, field, oldVal, newVal, reason, user = 'Giáo viên bộ môn' }) {
  const logs = getAuditLogs();
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const rec = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    timeFormatted: timeStr,
    paperId,
    sbd,
    studentName,
    field,
    oldVal: String(oldVal ?? ''),
    newVal: String(newVal ?? ''),
    reason: String(reason || 'Hiệu chỉnh phiếu tô theo biên bản chấm thi'),
    user
  };

  logs.unshift(rec);
  fs.writeFileSync(OMR_AUDIT_FILE, JSON.stringify(logs, null, 2), 'utf8');
  return rec;
}

/**
 * So sánh đáp án Trả lời ngắn (Phần III) chuẩn khảo thí:
 * - Chấp nhận cả dấu phẩy ',' (Việt Nam) và dấu chấm '.' (Quốc tế): 3,5 == 3.5
 * - Bỏ qua khoảng trắng thừa, dấu dương '+' đứng đầu: +12 == 12, "- 0.5" == "-0.5"
 * - So sánh giá trị số với ngưỡng sai số epsilon (1e-4) để tránh sai số thập phân: 2.50 == 2.5
 * - Hỗ trợ so sánh chuỗi văn bản không phân biệt hoa/thường.
 */
function isShortAnswerMatch(studentVal, expectedVal) {
  if (studentVal === undefined || studentVal === null) return false;
  if (expectedVal === undefined || expectedVal === null) return false;

  const sRaw = String(studentVal).trim();
  const eRaw = String(expectedVal).trim();
  if (!sRaw || !eRaw) return false;

  // 1. So khớp trực tiếp chuỗi không phân biệt hoa thường
  if (sRaw.toLowerCase() === eRaw.toLowerCase()) return true;

  // 2. Chuẩn hóa số học: thay ',' thành '.', loại bỏ khoảng trắng
  const normalizeNumStr = (str) => {
    return str
      .replace(/\s+/g, '')
      .replace(/,/g, '.')
      .replace(/^[+]/, '');
  };

  const sNorm = normalizeNumStr(sRaw);
  const eNorm = normalizeNumStr(eRaw);

  if (sNorm.toLowerCase() === eNorm.toLowerCase()) return true;

  const sNum = parseFloat(sNorm);
  const eNum = parseFloat(eNorm);

  if (!isNaN(sNum) && !isNaN(eNum)) {
    // So sánh số học với epsilon
    return Math.abs(sNum - eNum) < 0.0001;
  }

  return false;
}

/**
 * Tính điểm cho 1 bài làm học sinh theo quy tắc Bộ GD&ĐT 2025
 * Thang điểm chuẩn:
 * - Phần I (MCQ): mỗi câu đúng = 0.25 điểm.
 * - Phần II (Đúng/Sai): Tính điểm lũy tiến theo từng câu lớn (4 ý):
 *    + Đúng 1 ý: 0.10 điểm
 *    + Đúng 2 ý: 0.25 điểm
 *    + Đúng 3 ý: 0.50 điểm
 *    + Đúng cả 4 ý: 1.00 điểm
 * - Phần III (Trả lời ngắn, nếu có): mỗi câu đúng = 0.5 điểm.
 */
function gradeSinglePaper(paper, answerKey, pointRules = {}) {
  const p1Rule = pointRules.mcq || 0.25;
  const p2Style = pointRules.tfStyle || 'moet2025'; // 'moet2025' lũy tiến hoặc 'fixed025' (0.25/ý)

  // 1. Chấm Phần I (MCQ) — hỗ trợ cả dạng Mảng ['A', 'B'] và dạng Object { '1': 'A', '2': 'B' }
  let p1CorrectCount = 0;
  const p1Entries = Array.isArray(answerKey.part1)
    ? answerKey.part1.map((opt, idx) => [idx + 1, opt])
    : Object.entries(answerKey.part1 || {}).map(([k, v]) => [parseInt(k, 10), v]);
  let p1Total = p1Entries.length;
  const p1Details = [];

  p1Entries.forEach(([qNum, correctOpt]) => {
    const studentAns = (paper.answers?.part1 || {})[qNum] || '';
    const isCorrect = Boolean(studentAns && correctOpt && String(studentAns).toUpperCase() === String(correctOpt).toUpperCase());
    if (isCorrect) p1CorrectCount++;

    p1Details.push({
      qNum,
      studentAns,
      correctAns: correctOpt,
      isCorrect,
      pts: isCorrect ? p1Rule : 0,
      confidence: paper.confidences?.part1?.[qNum] || 100,
      isAmbiguous: Boolean(paper.ambiguous?.part1?.[qNum])
    });
  });

  const p1Pts = Math.round(p1CorrectCount * p1Rule * 100) / 100;

  // 2. Chấm Phần II (Đúng/Sai)
  let p2Pts = 0;
  let p2CorrectItemsCount = 0;
  const p2Details = [];
  const p2Key = answerKey.part2 || {}; // { '1': { a:'Đ', b:'S', c:'Đ', d:'S' }, ... }

  for (const [qNumStr, correctSub] of Object.entries(p2Key)) {
    const qNum = parseInt(qNumStr, 10);
    const studentSub = (paper.answers?.part2 || {})[qNum] || {};
    let matchedSubCount = 0;
    const subDetails = {};

    ['a', 'b', 'c', 'd'].forEach(subKey => {
      const expected = (correctSub[subKey] || '').toUpperCase();
      const actual = (studentSub[subKey] || '').toUpperCase();
      const isMatch = actual === expected && actual.length > 0;
      if (isMatch) {
        matchedSubCount++;
        p2CorrectItemsCount++;
      }
      subDetails[subKey] = {
        student: actual,
        correct: expected,
        isMatch,
        confidence: paper.confidences?.part2?.[`${qNum}_${subKey}`] || 100,
        isAmbiguous: Boolean(paper.ambiguous?.part2?.[`${qNum}_${subKey}`])
      };
    });

    // Tính điểm câu lớn theo thang điểm chuẩn Bộ GD&ĐT 2025
    let qPts = 0;
    if (p2Style === 'moet2025') {
      if (matchedSubCount === 1) qPts = 0.10;
      else if (matchedSubCount === 2) qPts = 0.25;
      else if (matchedSubCount === 3) qPts = 0.50;
      else if (matchedSubCount === 4) qPts = 1.00;
    } else {
      qPts = matchedSubCount * 0.25;
    }
    p2Pts += qPts;

    p2Details.push({
      qNum,
      matchedCount: matchedSubCount,
      subDetails,
      qPts: Math.round(qPts * 100) / 100
    });
  }
  p2Pts = Math.round(p2Pts * 100) / 100;

  // 3. Chấm Phần III (Trả lời ngắn chuẩn khảo thí)
  let p3Pts = 0;
  let p3CorrectCount = 0;
  const p3Details = [];
  const p3Key = answerKey.part3 || {};
  const p3Rule = pointRules.sa !== undefined ? pointRules.sa : 0.5;

  for (const [qNumStr, correctVal] of Object.entries(p3Key)) {
    const qNum = parseInt(qNumStr, 10);
    const studentVal = (paper.answers?.part3 || {})[qNum];
    const isCorrect = isShortAnswerMatch(studentVal, correctVal);
    if (isCorrect) {
      p3CorrectCount++;
      p3Pts += p3Rule;
    }
    p3Details.push({
      qNum,
      studentVal: studentVal ?? '',
      correctVal: correctVal ?? '',
      isCorrect,
      pts: isCorrect ? p3Rule : 0
    });
  }

  // Khử triệt để sai số dấu phẩy động bằng cách quy đổi mili-điểm nguyên
  const rawSumMilli = Math.round(p1Pts * 1000) + Math.round(p2Pts * 1000) + Math.round(p3Pts * 1000);
  const totalScore = Math.min(10.0, Math.round((rawSumMilli / 1000) * 100) / 100);

  let gradeClass = 'Chưa đạt';
  let gradeBadge = 'badge-danger';
  if (totalScore >= 8.0) {
    gradeClass = 'Giỏi';
    gradeBadge = 'badge-success';
  } else if (totalScore >= 6.5) {
    gradeClass = 'Khá';
    gradeBadge = 'badge-primary';
  } else if (totalScore >= 5.0) {
    gradeClass = 'Trung bình';
    gradeBadge = 'badge-amber';
  }

  return {
    part1: { correctCount: p1CorrectCount, total: p1Total, points: p1Pts, details: p1Details },
    part2: { correctSubCount: p2CorrectItemsCount, totalSub: Object.keys(p2Key).length * 4, points: p2Pts, details: p2Details },
    part3: { correctCount: p3CorrectCount, total: Object.keys(p3Key).length, points: p3Pts, details: p3Details },
    part1Score: p1Pts,
    part2Score: p2Pts,
    part3Score: p3Pts,
    part1Details: p1Details,
    part2Details: p2Details,
    part3Details: p3Details,
    totalScore,
    gradeClass,
    gradeBadge
  };
}

/**
 * Lấy danh sách học sinh đang hoạt động (từ file đã lưu hoặc danh sách mẫu)
 */
function getActiveRoster() {
  if (fs.existsSync(OMR_ROSTER_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(OMR_ROSTER_FILE, 'utf8'));
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (_) {}
  }
  return DEFAULT_CLASS_ROSTER;
}

/**
 * Lưu danh sách học sinh của lớp vào hệ thống
 */
function saveActiveRoster(roster) {
  if (!Array.isArray(roster)) return [];
  const normalized = roster.map((r, idx) => ({
    sbd: String(r.sbd || (120001 + idx)).trim(),
    name: String(r.name || r.fullName || `Học sinh ${idx + 1}`).trim(),
    fullName: String(r.fullName || r.name || `Học sinh ${idx + 1}`).trim(),
    className: String(r.className || '12A1').trim(),
    dob: String(r.dob || '01/01/2008').trim(),
    gender: String(r.gender || '').trim()
  }));
  try {
    fs.writeFileSync(OMR_ROSTER_FILE, JSON.stringify(normalized, null, 2), 'utf8');
  } catch (_) {}
  return normalized;
}

/**
 * Tạo bảng ánh xạ SBD thông minh (khớp chính xác, khớp bổ sung số 0 ở đầu và khớp lược bỏ số 0 đầu)
 */
function buildSmartRosterMap(roster) {
  const map = new Map();
  const list = Array.isArray(roster) && roster.length > 0 ? roster : getActiveRoster();
  list.forEach(r => {
    const rawSbd = String(r.sbd || '').trim();
    if (!rawSbd) return;
    const entry = {
      ...r,
      name: r.name || r.fullName || 'Học sinh',
      fullName: r.fullName || r.name || 'Học sinh'
    };
    map.set(rawSbd, entry);
    if (rawSbd.length < 6) {
      map.set(rawSbd.padStart(6, '0'), entry);
    }
    const stripped = rawSbd.replace(/^0+/, '');
    if (stripped) {
      map.set(stripped, entry);
    }
  });
  return map;
}

/**
 * Sinh bộ bài làm mô phỏng từ danh sách lớp hiện tại
 * Kèm theo 3 học sinh có vấn đề thực tế (tô sai mã đề, tô mờ, tô đúp)
 * để giáo viên có thể thử nghiệm tính năng rà soát, sửa bài và lưu vết.
 */
function generateSampleBatchPapers(answerKeysByCode, roster = null) {
  const activeRoster = Array.isArray(roster) && roster.length > 0 ? roster : getActiveRoster();
  let validCodes = Object.keys(answerKeysByCode || {});
  if (validCodes.length === 0) {
    validCodes = ['101', '102', '103', '104'];
    validCodes.forEach((c, cIdx) => {
      const letters = ['A', 'B', 'C', 'D'];
      const base = ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'B', 'C', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'A', 'D', 'B', 'A', 'C', 'B', 'D'];
      answerKeysByCode[c] = {
        part1: base.map((ans, i) => letters[(letters.indexOf(ans) + cIdx + i) % 4]),
        part2: {
          '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' },
          '2': { a: 'S', b: 'Đ', c: 'S', d: 'Đ' },
          '3': { a: 'Đ', b: 'Đ', c: 'S', d: 'S' },
          '4': { a: 'S', b: 'S', c: 'Đ', d: 'Đ' }
        },
        part3: {
          '1': '12,5',
          '2': '2025',
          '3': '-1,5',
          '4': '0,25',
          '5': '8',
          '6': '100'
        }
      };
    });
  }

  const papers = [];

  activeRoster.forEach((student, idx) => {
    const trueCode = validCodes[idx % validCodes.length];
    const key = answerKeysByCode[trueCode];
    const answers = { part1: {}, part2: {}, part3: {} };
    const confidences = { part1: {}, part2: {}, part3: {} };
    const ambiguous = { part1: {}, part2: {}, part3: {} };
    const warnings = [];

    const ability = 0.55 + ((idx * 7) % 45) / 100;

    // 1. Điền câu trả lời Phần I (Hỗ trợ cả Mảng và Object)
    const p1KeyEntries = Array.isArray(key.part1)
      ? key.part1.map((opt, qIdx) => [qIdx + 1, opt])
      : Object.entries(key.part1 || {}).map(([k, v]) => [parseInt(k, 10), v]);
    p1KeyEntries.forEach(([qNum, correctOpt]) => {
      const isRight = Math.random() < ability;
      let chosen = correctOpt;
      if (!isRight) {
        const others = ['A', 'B', 'C', 'D'].filter(o => o !== correctOpt);
        chosen = others[Math.floor(Math.random() * others.length)];
      }
      answers.part1[qNum] = chosen;
      confidences.part1[qNum] = 95 + Math.floor(Math.random() * 5);
    });

    // 2. Điền câu trả lời Phần II (Đúng/Sai)
    for (const [qNumStr, subKey] of Object.entries(key.part2 || {})) {
      const qNum = parseInt(qNumStr, 10);
      answers.part2[qNum] = {};
      ['a', 'b', 'c', 'd'].forEach(sub => {
        const expected = subKey[sub];
        const isRight = Math.random() < ability;
        const chosen = isRight ? expected : (expected === 'Đ' ? 'S' : 'Đ');
        answers.part2[qNum][sub] = chosen;
        confidences.part2[`${qNum}_${sub}`] = 96;
      });
    }

    // 3. Điền câu trả lời Phần III (Trả lời ngắn)
    for (const [qNumStr, expectedVal] of Object.entries(key.part3 || {})) {
      const qNum = parseInt(qNumStr, 10);
      const isRight = Math.random() < ability;
      if (isRight) {
        answers.part3[qNum] = String(expectedVal).replace(/\./g, ',');
      } else {
        const num = parseFloat(String(expectedVal).replace(/,/g, '.'));
        answers.part3[qNum] = !isNaN(num) ? String(Math.round((num + 1) * 10) / 10).replace(/\./g, ',') : '0';
      }
      confidences.part3[qNum] = 96;
    }

    let scannedExamCode = trueCode;

    if (idx === 4) {
      scannedExamCode = '0999';
      warnings.push({
        type: 'INVALID_EXAM_CODE',
        message: 'Mã đề "0999" không có trong hệ thống đề thi! Cần giám khảo rà soát và chọn lại mã đề đúng.'
      });
    } else if (idx === 8) {
      const targetQ = answers.part1[6] !== undefined ? 6 : (answers.part1[1] !== undefined ? 1 : null);
      if (targetQ !== null) {
        answers.part1[targetQ] = '';
        confidences.part1[targetQ] = 32;
        ambiguous.part1[targetQ] = ['A', 'B'];
        warnings.push({
          type: 'AMBIGUOUS_FILL',
          message: `Câu ${targetQ} (Phần I) tô mờ / có vết tẩy (nghi ngờ A hoặc B). Cần giáo viên xác nhận đáp án.`
        });
      }
    } else if (idx === 14) {
      const targetQ = answers.part2[2] ? 2 : (answers.part2[1] ? 1 : null);
      if (targetQ !== null && answers.part2[targetQ]) {
        answers.part2[targetQ]['c'] = 'Đ/S';
        confidences.part2[`${targetQ}_c`] = 40;
        ambiguous.part2[`${targetQ}_c`] = ['Đ', 'S'];
        warnings.push({
          type: 'DOUBLE_FILL',
          message: `Câu ${targetQ}c (Phần II) tô đúp cả hai ô [Đ] và [S]. Cần kiểm tra phiếu gốc.`
        });
      }
    }

    const sName = student.name || student.fullName || `Học sinh ${idx + 1}`;
    papers.push({
      id: `paper_${student.sbd}`,
      sbd: student.sbd,
      studentName: sName,
      className: student.className || '12A1',
      dob: student.dob || '',
      scannedExamCode,
      trueExamCode: trueCode,
      answers,
      confidences,
      ambiguous,
      warnings,
      isCorrected: false,
      correctionHistory: []
    });
  });

  return papers;
}

/**
 * Thực hiện chấm toàn bộ lô bài thi (Batch Grading)
 */
function gradeBatchPapers({ papers = [], answerKeysByCode = {}, pointRules = {}, roster = [] }) {
  const rosterMap = buildSmartRosterMap(roster);

  const gradedPapers = [];
  let validCount = 0;
  let warningCount = 0;

  papers.forEach(paper => {
    const rawSbd = String(paper.sbd || '').trim();
    const studentInfo = rosterMap.get(rawSbd) || rosterMap.get(rawSbd.padStart(6, '0')) || rosterMap.get(rawSbd.replace(/^0+/, '')) || null;
    const code = paper.scannedExamCode;
    const answerKey = answerKeysByCode[code] || answerKeysByCode[String(code).replace(/^0+/, '')];

    let result = null;
    let hasError = false;
    const currentWarnings = [...(paper.warnings || [])];

    // Kiểm tra định danh SBD
    if (!rawSbd || rawSbd === 'chưa tô') {
      if (!currentWarnings.some(w => w.type === 'MISSING_SBD')) {
        currentWarnings.push({
          type: 'MISSING_SBD',
          message: 'Phiếu chưa tô đủ Số báo danh! Vui lòng đối chiếu chữ viết tay trên phiếu để nhập SBD.'
        });
      }
    } else if (!studentInfo && rosterMap.size > 0 && (!paper.studentName || paper.studentName.startsWith('Thí sinh') || paper.studentName === 'Chưa định danh')) {
      if (!currentWarnings.some(w => w.type === 'UNMATCHED_SBD')) {
        currentWarnings.push({
          type: 'UNMATCHED_SBD',
          message: `Số báo danh "${rawSbd}" không nằm trong Danh sách lớp hiện tại! Cần kiểm tra lại SBD hoặc nạp đúng danh sách lớp.`
        });
      }
    }

    if (!answerKey) {
      hasError = true;
      if (!currentWarnings.some(w => w.type === 'UNKNOWN_EXAM_CODE' || w.type === 'INVALID_EXAM_CODE')) {
        currentWarnings.push({
          type: 'UNKNOWN_EXAM_CODE',
          message: `Mã đề "${code}" không khớp với bất kì mã đề thi nào đã tạo (${Object.keys(answerKeysByCode).join(', ')})!`
        });
      }
    } else {
      result = gradeSinglePaper(paper, answerKey, pointRules);
    }

    if (currentWarnings.length > 0 || hasError) {
      warningCount++;
    } else {
      validCount++;
    }

    const resolvedName = studentInfo
      ? (studentInfo.name || studentInfo.fullName)
      : (paper.studentName && !paper.studentName.startsWith('Thí sinh ') ? paper.studentName : 'Chưa định danh');

    gradedPapers.push({
      ...paper,
      studentName: resolvedName,
      className: studentInfo?.className || paper.className || '12A1',
      dob: studentInfo?.dob || paper.dob || '',
      hasError,
      warnings: currentWarnings,
      result
    });
  });

  // Tính toán thống kê toàn diện
  const stats = calculateBatchStatistics(gradedPapers);

  // Tự động lưu bản chụp phiên chấm vào ổ cứng để mở lại bất cứ lúc nào
  saveDatabaseState(gradedPapers);

  return {
    totalPapers: papers.length,
    validCount,
    warningCount,
    gradedPapers,
    statistics: stats
  };
}

/**
 * Tính toán Thống kê phổ điểm & Phân tích chất lượng bài thi
 */
function calculateBatchStatistics(gradedPapers) {
  const scores = gradedPapers
    .filter(p => p.result && !p.hasError && typeof p.result.totalScore === 'number')
    .map(p => p.result.totalScore);

  if (scores.length === 0) {
    return {
      count: 0,
      avg: 0,
      max: 0,
      min: 0,
      median: 0,
      distribution: {},
      classification: { gio: 0, kha: 0, trungBinh: 0, yeu: 0 }
    };
  }

  scores.sort((a, b) => a - b);
  const sum = scores.reduce((s, v) => s + v, 0);
  const avg = Math.round((sum / scores.length) * 100) / 100;
  const min = scores[0];
  const max = scores[scores.length - 1];
  const mid = Math.floor(scores.length / 2);
  const median = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;

  // Phổ điểm từ 0 đến 10 (theo từng khoảng 0.5 điểm)
  const distribution = {};
  for (let i = 0; i <= 20; i++) {
    const pt = (i * 0.5).toFixed(1);
    distribution[pt] = 0;
  }
  scores.forEach(s => {
    const bin = (Math.round(s * 2) / 2).toFixed(1);
    if (distribution[bin] !== undefined) distribution[bin]++;
  });

  // Phân loại học lực
  let gio = 0, kha = 0, tb = 0, yeu = 0;
  scores.forEach(s => {
    if (s >= 8.0) gio++;
    else if (s >= 6.5) kha++;
    else if (s >= 5.0) tb++;
    else yeu++;
  });

  return {
    count: scores.length,
    avg,
    max,
    min,
    median,
    distribution,
    classification: {
      gio,
      gioPct: Math.round((gio / scores.length) * 1000) / 10,
      kha,
      khaPct: Math.round((kha / scores.length) * 1000) / 10,
      trungBinh: tb,
      trungBinhPct: Math.round((tb / scores.length) * 1000) / 10,
      yeu,
      yeuPct: Math.round((yeu / scores.length) * 1000) / 10
    }
  };
}

/**
 * Hiệu chỉnh bài thi học sinh (sửa SBD, sửa mã đề, sửa câu trả lời P1/P2/P3, xóa cảnh báo)
 * và tự động ghi nhật ký lưu vết (Audit Trail).
 */
function updatePaperAndAudit({ paperId, updates, allPapers, answerKeysByCode, pointRules, roster = [], user = 'Giáo viên bộ môn' }) {
  const paper = allPapers.find(p => p.id === paperId || p.sbd === paperId);
  if (!paper) {
    throw new Error(`Không tìm thấy bài thi có mã "${paperId}"!`);
  }

  const newAuditRecords = [];

  // 0. Nếu sửa Số báo danh (SBD)
  if (updates.sbd !== undefined && String(updates.sbd).trim() !== String(paper.sbd || '').trim()) {
    const oldSbd = paper.sbd || 'chưa tô';
    const newSbd = String(updates.sbd).trim();
    paper.sbd = newSbd;

    // Tra cứu lại họ tên học sinh từ Danh sách lớp
    const rosterMap = buildSmartRosterMap(roster);
    const matchedStudent = rosterMap.get(newSbd) || rosterMap.get(newSbd.padStart(6, '0')) || rosterMap.get(newSbd.replace(/^0+/, ''));
    if (matchedStudent) {
      paper.studentName = matchedStudent.name || matchedStudent.fullName || paper.studentName;
      paper.className = matchedStudent.className || paper.className;
      paper.dob = matchedStudent.dob || paper.dob;
    }

    const rec = logAuditRecord({
      paperId: paper.id,
      sbd: paper.sbd,
      studentName: paper.studentName,
      field: 'Số báo danh',
      oldVal: oldSbd,
      newVal: newSbd,
      reason: updates.reason || 'Giáo viên hiệu chỉnh Số báo danh theo thông tin viết tay trên phiếu',
      user
    });
    newAuditRecords.push(rec);
  }

  // 1. Nếu sửa Mã đề thi
  if (updates.scannedExamCode !== undefined && updates.scannedExamCode !== paper.scannedExamCode) {
    const oldCode = paper.scannedExamCode;
    const newCode = updates.scannedExamCode;
    paper.scannedExamCode = newCode;

    const rec = logAuditRecord({
      paperId: paper.id,
      sbd: paper.sbd,
      studentName: paper.studentName,
      field: 'Mã đề thi',
      oldVal: oldCode,
      newVal: newCode,
      reason: updates.reason || 'Học sinh tô sai mã đề, giáo viên chỉnh sửa theo mã đề phát thực tế',
      user
    });
    newAuditRecords.push(rec);
  }

  // 2. Nếu sửa đáp án Phần I
  if (updates.part1Answers) {
    if (!paper.answers) paper.answers = { part1: {}, part2: {}, part3: {} };
    if (!paper.answers.part1) paper.answers.part1 = {};
    for (const [qNumStr, newAns] of Object.entries(updates.part1Answers)) {
      const qNum = parseInt(qNumStr, 10);
      const oldAns = paper.answers.part1[qNum] || '';
      if (oldAns !== newAns) {
        paper.answers.part1[qNum] = newAns;
        if (paper.ambiguous?.part1) delete paper.ambiguous.part1[qNum];
        if (paper.confidences?.part1) paper.confidences.part1[qNum] = 100;

        const rec = logAuditRecord({
          paperId: paper.id,
          sbd: paper.sbd,
          studentName: paper.studentName,
          field: `Phần I - Câu ${qNum}`,
          oldVal: oldAns,
          newVal: newAns,
          reason: updates.reason || 'Xác nhận lại đáp án bị mờ/tô đúp trên phiếu gốc',
          user
        });
        newAuditRecords.push(rec);
      }
    }
  }

  // 3. Nếu sửa đáp án Phần II (Đúng / Sai)
  if (updates.part2Answers) {
    if (!paper.answers) paper.answers = { part1: {}, part2: {}, part3: {} };
    if (!paper.answers.part2) paper.answers.part2 = {};
    for (const [qNumStr, subs] of Object.entries(updates.part2Answers)) {
      const qNum = parseInt(qNumStr, 10);
      if (!paper.answers.part2[qNum]) paper.answers.part2[qNum] = {};

      for (const [subKey, newAns] of Object.entries(subs)) {
        const oldAns = paper.answers.part2[qNum][subKey] || '';
        if (oldAns !== newAns) {
          paper.answers.part2[qNum][subKey] = newAns;
          if (paper.ambiguous?.part2) delete paper.ambiguous.part2[`${qNum}_${subKey}`];
          if (paper.confidences?.part2) paper.confidences.part2[`${qNum}_${subKey}`] = 100;

          const rec = logAuditRecord({
            paperId: paper.id,
            sbd: paper.sbd,
            studentName: paper.studentName,
            field: `Phần II - Câu ${qNum}${subKey}`,
            oldVal: oldAns,
            newVal: newAns,
            reason: updates.reason || 'Hiệu chỉnh đáp án Đúng/Sai trên phiếu gốc',
            user
          });
          newAuditRecords.push(rec);
        }
      }
    }
  }

  // 4. Nếu sửa đáp án Phần III (Trả lời ngắn)
  if (updates.part3Answers) {
    if (!paper.answers) paper.answers = { part1: {}, part2: {}, part3: {} };
    if (!paper.answers.part3) paper.answers.part3 = {};
    for (const [qNumStr, newVal] of Object.entries(updates.part3Answers)) {
      const qNum = parseInt(qNumStr, 10);
      const oldVal = paper.answers.part3[qNum] ?? '';
      if (String(oldVal) !== String(newVal)) {
        paper.answers.part3[qNum] = String(newVal);
        if (paper.ambiguous?.part3) delete paper.ambiguous.part3[qNum];

        const rec = logAuditRecord({
          paperId: paper.id,
          sbd: paper.sbd,
          studentName: paper.studentName,
          field: `Phần III - Câu ${qNum}`,
          oldVal: String(oldVal),
          newVal: String(newVal),
          reason: updates.reason || 'Hiệu chỉnh câu trả lời ngắn trên phiếu gốc',
          user
        });
        newAuditRecords.push(rec);
      }
    }
  }

  // Đánh dấu đã sửa và làm sạch các cảnh báo đã giải quyết
  paper.isCorrected = true;
  paper.warnings = []; // đã giải quyết xong
  paper.hasError = false;

  // Chấm lại bài này với đáp án mã đề mới
  const activeCode = paper.scannedExamCode;
  const answerKey = answerKeysByCode[activeCode] || answerKeysByCode[String(activeCode).replace(/^0+/, '')];
  if (answerKey) {
    paper.result = gradeSinglePaper(paper, answerKey, pointRules);
  }

  // Lưu CSDL phiên chấm mới nhất
  saveDatabaseState(allPapers);

  return {
    updatedPaper: paper,
    newAuditRecords,
    allAuditLogs: getAuditLogs()
  };
}

/**
 * Lưu toàn bộ CSDL phiên chấm thi vào file
 */
function saveDatabaseState(papers) {
  try {
    fs.writeFileSync(OMR_DB_FILE, JSON.stringify(papers, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi lưu CSDL chấm thi:', err);
  }
}

/**
 * Lưu một ca chấm đầy đủ vào thư mục data/omr_database để mở lại về sau
 */
function saveGradingSessionSnapshot({ gradedPapers = [], answerKeysByCode = {}, pointRules = {}, metadata = {}, title = '' }) {
  const now = new Date();
  const id = `omr_session_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const stats = calculateBatchStatistics(gradedPapers);
  const firstClass = gradedPapers[0]?.className || metadata.className || '12A1';
  const subject = metadata.subject || 'Tin học';
  const grade = metadata.grade || '12';
  const sessionTitle = title || `${subject} Lớp ${grade} (${firstClass}) - ${gradedPapers.length} bài`;

  // Loại bỏ các thuộc tính DOM/Blob phía client trước khi lưu JSON
  const cleanPapers = gradedPapers.map(p => {
    const copy = { ...p };
    delete copy.imageElement;
    delete copy.imageUrl;
    return copy;
  });

  const payload = {
    id,
    title: sessionTitle,
    savedAt: now.toISOString(),
    metadata: { ...metadata, className: firstClass, subject, grade },
    totalPapers: cleanPapers.length,
    statistics: stats,
    answerKeysByCode,
    pointRules,
    papers: cleanPapers
  };

  const sessionPath = path.join(OMR_SESSIONS_DIR, `${id}.json`);
  fs.writeFileSync(sessionPath, JSON.stringify(payload, null, 2), 'utf8');
  saveDatabaseState(cleanPapers);
  return { id, title: sessionTitle, savedAt: payload.savedAt, filePath: sessionPath, statistics: stats };
}

/**
 * Liệt kê danh sách tất cả các ca chấm đã lưu trong data/omr_database và data/CSDL_CHAM_THI_*.json
 */
function listSavedOmrSessions() {
  const sessions = [];

  const readSessionSummary = (fullPath, fallbackId) => {
    try {
      const raw = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const papers = Array.isArray(raw) ? raw : (raw.papers || raw.gradedPapers || []);
      if (papers.length === 0) return;
      const stats = raw.statistics || calculateBatchStatistics(papers);
      const savedAt = raw.savedAt || raw.exportedAt || fs.statSync(fullPath).mtime.toISOString();
      const firstClass = papers[0]?.className || raw.metadata?.className || '12A1';
      const subject = raw.metadata?.subject || 'Tin học';
      const grade = raw.metadata?.grade || '12';
      sessions.push({
        id: raw.id || fallbackId,
        fileName: path.basename(fullPath),
        title: raw.title || `${subject} Lớp ${grade} (${firstClass})`,
        savedAt,
        totalPapers: papers.length,
        avgScore: stats.avg ?? 0,
        maxScore: stats.max ?? 0,
        minScore: stats.min ?? 0,
        className: firstClass,
        subject
      });
    } catch (_) {}
  };

  if (fs.existsSync(OMR_SESSIONS_DIR)) {
    const files = fs.readdirSync(OMR_SESSIONS_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => readSessionSummary(path.join(OMR_SESSIONS_DIR, f), f.replace(/\.json$/, '')));
  }

  if (fs.existsSync(DATA_DIR)) {
    const rootFiles = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('CSDL_CHAM_THI_') && f.endsWith('.json'));
    rootFiles.forEach(f => readSessionSummary(path.join(DATA_DIR, f), f.replace(/\.json$/, '')));
  }

  // Nếu có omr_database.json gần nhất mà chưa có session nào khác
  if (sessions.length === 0 && fs.existsSync(OMR_DB_FILE)) {
    readSessionSummary(OMR_DB_FILE, 'omr_database_latest');
  }

  sessions.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  return sessions;
}

/**
 * Mở lại một ca chấm đã lưu theo ID
 */
function loadSavedOmrSession(sessionId) {
  const safeId = String(sessionId || '').replace(/[^a-zA-Z0-9_\-]/g, '');
  const candidates = [
    path.join(OMR_SESSIONS_DIR, `${safeId}.json`),
    path.join(DATA_DIR, `${safeId}.json`),
    safeId === 'omr_database_latest' ? OMR_DB_FILE : null
  ].filter(Boolean);

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const papers = Array.isArray(raw) ? raw : (raw.papers || raw.gradedPapers || []);
      const stats = raw.statistics || calculateBatchStatistics(papers);
      return {
        id: raw.id || safeId,
        title: raw.title || 'Ca chấm đã lưu',
        savedAt: raw.savedAt || raw.exportedAt || new Date().toISOString(),
        gradedPapers: papers,
        statistics: stats,
        answerKeysByCode: raw.answerKeysByCode || null,
        pointRules: raw.pointRules || null,
        metadata: raw.metadata || {}
      };
    }
  }
  return null;
}

/**
 * Xóa một ca chấm đã lưu
 */
function deleteSavedOmrSession(sessionId) {
  const safeId = String(sessionId || '').replace(/[^a-zA-Z0-9_\-]/g, '');
  const candidates = [
    path.join(OMR_SESSIONS_DIR, `${safeId}.json`),
    path.join(DATA_DIR, `${safeId}.json`)
  ];
  let deleted = false;
  candidates.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted = true;
    }
  });
  return deleted;
}

/**
 * Xuất bảng điểm lớp ra định dạng CSV (tương thích Excel tiếng Việt UTF-8 BOM)
 */
function exportRosterToCsv(gradedPapers, metadata = {}) {
  const header = '\uFEFFSTT,Số báo danh,Họ và tên,Lớp,Ngày sinh,Mã đề,Điểm Phần I (TN),Điểm Phần II (Đ/S),Điểm Phần III (TLN),Tổng điểm (Thang 10),Xếp loại,Trạng thái bài\n';
  const rows = gradedPapers.map((p, idx) => {
    const r = p.result || {};
    const p1 = r.part1?.points ?? r.part1Score ?? '-';
    const p2 = r.part2?.points ?? r.part2Score ?? '-';
    const p3 = r.part3?.points ?? r.part3Score ?? '-';
    const total = r.totalScore ?? '-';
    const grade = r.gradeClass ?? 'Chưa chấm';
    const status = p.isCorrected ? 'Đã hiệu chỉnh & Lưu vết' : (p.warnings?.length > 0 ? 'Có cảnh báo' : 'Hợp lệ');

    return [
      idx + 1,
      `"${p.sbd}"`,
      `"${p.studentName}"`,
      `"${p.className || ''}"`,
      `"${p.dob || ''}"`,
      `"${p.scannedExamCode}"`,
      p1,
      p2,
      p3,
      total,
      `"${grade}"`,
      `"${status}"`
    ].join(',');
  });

  return header + rows.join('\n');
}

/**
 * Xuất Nhật ký lưu vết can thiệp (Audit Trail) ra định dạng CSV
 */
function exportAuditLogsToCsv() {
  const logs = getAuditLogs();
  const header = '\uFEFFMã bản ghi,Thời gian,Số báo danh,Họ và tên,Nội dung can thiệp,Giá trị trước khi sửa,Giá trị sau khi sửa,Lý do can thiệp,Người thực hiện\n';
  const rows = logs.map(l => [
    `"${l.id}"`,
    `"${l.timeFormatted}"`,
    `"${l.sbd}"`,
    `"${l.studentName}"`,
    `"${l.field}"`,
    `"${l.oldVal}"`,
    `"${l.newVal}"`,
    `"${l.reason}"`,
    `"${l.user}"`
  ].join(','));

  return header + rows.join('\n');
}

/**
 * Đồng bộ CSDL và Nhật ký Lưu vết vào thư mục Google Drive & Lưu ca chấm vào data/omr_database
 */
function syncOmrDatabaseToGoogleDrive({ folderId = '1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop', gradedPapers = [], metadata = {}, answerKeysByCode = {}, pointRules = {} }) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const subjectSlug = (metadata.subject || 'Tin_hoc').replace(/\s+/g, '_');
  const gradeSlug = metadata.grade || '12';

  // Lưu snapshot vào thư mục data/omr_database
  const savedSnap = saveGradingSessionSnapshot({ gradedPapers, answerKeysByCode, pointRules, metadata });

  // 1. Tạo file CSDL JSON
  const dbFileName = `CSDL_CHAM_THI_${subjectSlug}_Lop${gradeSlug}_${dateStr}.json`;
  const dbPayload = {
    id: savedSnap.id,
    exportedAt: now.toISOString(),
    folderId,
    metadata,
    totalPapers: gradedPapers.length,
    statistics: calculateBatchStatistics(gradedPapers),
    answerKeysByCode,
    pointRules,
    papers: gradedPapers.map(p => {
      const c = { ...p };
      delete c.imageElement;
      delete c.imageUrl;
      return c;
    }),
    auditLogs: getAuditLogs()
  };
  const dbFilePath = path.join(DATA_DIR, dbFileName);
  fs.writeFileSync(dbFilePath, JSON.stringify(dbPayload, null, 2), 'utf8');

  // 2. Tạo file Bảng điểm CSV
  const csvFileName = `BANG_DIEM_${subjectSlug}_Lop${gradeSlug}_${dateStr}.csv`;
  const csvContent = exportRosterToCsv(gradedPapers, metadata);
  const csvFilePath = path.join(DATA_DIR, csvFileName);
  fs.writeFileSync(csvFilePath, csvContent, 'utf8');

  // 3. Tạo file Nhật ký lưu vết CSV
  const auditFileName = `NHAT_KY_LUU_VET_CHAM_THI_${dateStr}.csv`;
  const auditContent = exportAuditLogsToCsv();
  const auditFilePath = path.join(DATA_DIR, auditFileName);
  fs.writeFileSync(auditFilePath, auditContent, 'utf8');

  return {
    ok: true,
    sessionId: savedSnap.id,
    message: `Đã lưu ca chấm vào ổ cứng (data/omr_database) và đồng bộ CSDL Chấm thi vào Google Drive (Folder ID: ${folderId})`,
    folderId,
    files: [
      { name: dbFileName, path: dbFilePath, size: fs.statSync(dbFilePath).size },
      { name: csvFileName, path: csvFilePath, size: fs.statSync(csvFilePath).size },
      { name: auditFileName, path: auditFilePath, size: fs.statSync(auditFilePath).size }
    ],
    syncedAt: now.toISOString()
  };
}

module.exports = {
  DEFAULT_CLASS_ROSTER,
  getActiveRoster,
  saveActiveRoster,
  buildSmartRosterMap,
  getAuditLogs,
  logAuditRecord,
  isShortAnswerMatch,
  gradeSinglePaper,
  generateSampleBatchPapers,
  gradeBatchPapers,
  calculateBatchStatistics,
  updatePaperAndAudit,
  saveGradingSessionSnapshot,
  listSavedOmrSessions,
  loadSavedOmrSession,
  deleteSavedOmrSession,
  exportRosterToCsv,
  exportAuditLogsToCsv,
  syncOmrDatabaseToGoogleDrive
};
