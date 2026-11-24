/**
 * OMR ENGINE - BỘ MÁY CHẤM PHIẾU TRẢ LỜI TRẮC NGHIỆM BỘ GD&ĐT 2025
 * Tương thích chuẩn "Phiếu TLTN 2025 mã đề 4 số đen trắng.pdf"
 * Hỗ trợ chấm theo mã đề, quy tắc tính điểm Bộ GD&ĐT 2025,
 * phát hiện lỗi tô (tô mờ, sai mã đề, tô đúp), lưu vết can thiệp (Audit Trail),
 * thống kê phổ điểm & đồng bộ CSDL vào Google Drive.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
// GĐ3 (P1-08, QĐ4): ghi nguyên tử + sao lưu ngày + khóa ghi + chặn ghi demo.
const { atomicWriteJson, atomicWriteFile } = require('./storage');
// GĐ2 (P1-01, QĐ2): điểm Đúng/Sai chỉ có MỘT quy ước — hàm dùng chung
// tfQuestionScore (1 ý 0,1đ; 2 ý 0,25đ; 3 ý 0,5đ; 4 ý 1,0đ).
const { tfQuestionScore } = require('./scoring');

/**
 * GĐ2 (P0-09): Biểu điểm chuẩn phía MÁY CHỦ cho chấm OMR — client gửi
 * pointRules nào lên cũng bị bỏ qua, máy chủ luôn chấm theo bảng này.
 */
const SERVER_POINT_RULES = Object.freeze({ mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 });

// Đường dẫn lưu trữ CSDL cục bộ và đồng bộ (Hỗ trợ cả môi trường Serverless Read-Only như Vercel)
const BUNDLED_DATA_DIR = path.join(__dirname, '..', 'data');
function resolveWritableDataDir() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'matrixedu_data');
  }
  try {
    const testDir = path.join(BUNDLED_DATA_DIR, 'omr_database');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    return BUNDLED_DATA_DIR;
  } catch (_) {
    return path.join(os.tmpdir(), 'matrixedu_data');
  }
}

const DATA_DIR = resolveWritableDataDir();
const OMR_DB_FILE = path.join(DATA_DIR, 'omr_database.json');
const OMR_AUDIT_FILE = path.join(DATA_DIR, 'omr_audit_logs.json');
const OMR_ROSTER_FILE = path.join(DATA_DIR, 'omr_active_roster.json');
const BUNDLED_ROSTER_FILE = path.join(BUNDLED_DATA_DIR, 'omr_active_roster.json');
const OMR_ROSTERS_FILE = path.join(DATA_DIR, 'omr_rosters.json');
const BUNDLED_ROSTERS_FILE = path.join(BUNDLED_DATA_DIR, 'omr_rosters.json');
const OMR_SESSIONS_DIR = path.join(DATA_DIR, 'omr_database');
// Thư mục lưu biểu đáp án ngoài do máy chủ tự trích xuất (parse-answer-key)
// — khóa đáp án chấm bài chỉ lấy từ đây / hồ sơ đề / ca chấm đã lưu,
// không bao giờ lấy từ body client gửi lên (xem server.js).
const EXTERNAL_KEYS_DIR = path.join(DATA_DIR, 'omr_answer_keys');
const EXTERNAL_KEYS_LATEST_FILE = path.join(EXTERNAL_KEYS_DIR, 'latest.json');

// Khởi tạo thư mục data và omr_database an toàn
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(OMR_SESSIONS_DIR)) {
    fs.mkdirSync(OMR_SESSIONS_DIR, { recursive: true });
  }
} catch (_) { }

/**
 * Danh sách lớp mẫu (DỮ LIỆU GIẢ ĐỊNH — chỉ dùng cho demo/thử nghiệm,
 * không phải học sinh thật; không ghi vào dữ liệu chấm thật)
 */
const DEFAULT_CLASS_ROSTER = [
  { sbd: '120001', name: 'Học sinh Mẫu 01', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120002', name: 'Học sinh Mẫu 02', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120003', name: 'Học sinh Mẫu 03', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120004', name: 'Học sinh Mẫu 04', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120005', name: 'Học sinh Mẫu 05', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120006', name: 'Học sinh Mẫu 06', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120007', name: 'Học sinh Mẫu 07', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120008', name: 'Học sinh Mẫu 08', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120009', name: 'Học sinh Mẫu 09', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120010', name: 'Học sinh Mẫu 10', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120011', name: 'Học sinh Mẫu 11', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120012', name: 'Học sinh Mẫu 12', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120013', name: 'Học sinh Mẫu 13', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120014', name: 'Học sinh Mẫu 14', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120015', name: 'Học sinh Mẫu 15', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120016', name: 'Học sinh Mẫu 16', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120017', name: 'Học sinh Mẫu 17', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120018', name: 'Học sinh Mẫu 18', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120019', name: 'Học sinh Mẫu 19', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120020', name: 'Học sinh Mẫu 20', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120021', name: 'Học sinh Mẫu 21', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120022', name: 'Học sinh Mẫu 22', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120023', name: 'Học sinh Mẫu 23', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120024', name: 'Học sinh Mẫu 24', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120025', name: 'Học sinh Mẫu 25', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120026', name: 'Học sinh Mẫu 26', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120027', name: 'Học sinh Mẫu 27', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120028', name: 'Học sinh Mẫu 28', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120029', name: 'Học sinh Mẫu 29', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120030', name: 'Học sinh Mẫu 30', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120031', name: 'Học sinh Mẫu 31', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120032', name: 'Học sinh Mẫu 32', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120033', name: 'Học sinh Mẫu 33', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
  { sbd: '120034', name: 'Học sinh Mẫu 34', gender: 'Nữ', dob: '01/01/2008', className: '12A1' },
  { sbd: '120035', name: 'Học sinh Mẫu 35', gender: 'Nam', dob: '01/01/2008', className: '12A1' },
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
  // GĐ3 (P1-08): ghi nhật ký bằng ghi nguyên tử; lỗi ghi được log ra
  // console thay vì nuốt im lặng (nhật ký là dữ liệu phụ nên không chặn
  // luồng chấm chính khi ghi lỗi).
  try {
    atomicWriteJson(OMR_AUDIT_FILE, logs);
  } catch (err) {
    console.error('Lỗi ghi nhật ký lưu vết (omr_audit_logs.json):', err.message);
  }
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
  const p1Rule = pointRules.mcq !== undefined && pointRules.mcq !== null ? Number(pointRules.mcq) : 0.25;
  // GĐ2 (P1-01, QĐ2): Đúng/Sai LUÔN chấm theo thang chung tfQuestionScore
  // (1 ý 0,1đ; 2 ý 0,25đ; 3 ý 0,5đ; 4 ý 1,0đ). Không còn kiểu chia đều
  // 0,25đ/ý ('fixed025') — pointRules.tfStyle do client gửi bị bỏ qua.

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

    // Tính điểm câu lớn theo thang điểm chuẩn Bộ GD&ĐT 2025 (QĐ2) —
    // một hàm duy nhất tfQuestionScore, khớp hướng dẫn chấm trong Word.
    const qPts = tfQuestionScore(matchedSubCount);
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
  const p3Total = Object.keys(p3Key).length;
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
  const omrScore = Math.min(10.0, Math.round((rawSumMilli / 1000) * 100) / 100);
  const rawEssay = paper?.essayScore;
  const hasEssayScore = rawEssay !== undefined && rawEssay !== null && rawEssay !== '' && !Number.isNaN(Number(rawEssay));
  const essayScore = hasEssayScore ? Math.max(0, Math.round(Number(rawEssay) * 100) / 100) : null;
  const totalScore = hasEssayScore
    ? Math.min(10.0, Math.round(((Math.round(omrScore * 1000) + Math.round(essayScore * 1000)) / 1000) * 100) / 100)
    : omrScore;

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
    omrScore,
    essayScore,
    part1Details: p1Details,
    part2Details: p2Details,
    part3Details: p3Details,
    totalScore,
    gradeClass,
    gradeBadge
  };
}

/**
 * Chuẩn hóa một bản ghi học sinh
 */
function normalizeRosterStudent(r, idx = 0, fallbackClass = '') {
  const cls = String(r?.className || fallbackClass || '').replace(/\s+/g, ' ').trim();
  const name = String(r?.name || r?.fullName || `Học sinh ${idx + 1}`).replace(/\s+/g, ' ').trim();
  const fullName = String(r?.fullName || r?.name || `Học sinh ${idx + 1}`).replace(/\s+/g, ' ').trim();
  return {
    sbd: String(r?.sbd ?? '').trim(),
    name,
    fullName,
    className: cls || 'Chưa phân lớp',
    dob: String(r?.dob || '').trim(),
    gender: String(r?.gender || '').trim()
  };
}

/**
 * Đọc Kho Danh sách Nhiều Lớp (KHÔNG tự động bơm 35 học sinh ảo 12A1 nếu chưa có danh sách thật)
 */
function readMultiClassRostersStore() {
  for (const candidate of [OMR_ROSTERS_FILE, BUNDLED_ROSTERS_FILE]) {
    if (fs.existsSync(candidate)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (parsed && parsed.classes && typeof parsed.classes === 'object') {
          const classNames = Object.keys(parsed.classes).filter(k => Array.isArray(parsed.classes[k]) && parsed.classes[k].length > 0);
          return {
            activeClass: parsed.activeClass !== undefined ? parsed.activeClass : (classNames[0] || ''),
            classes: parsed.classes,
            updatedAt: parsed.updatedAt || new Date().toISOString()
          };
        }
      } catch (_) { }
    }
  }

  let legacyList = [];
  for (const candidate of [OMR_ROSTER_FILE, BUNDLED_ROSTER_FILE]) {
    if (fs.existsSync(candidate)) {
      try {
        const saved = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (Array.isArray(saved) && saved.length > 0) {
          legacyList = saved;
          break;
        }
      } catch (_) { }
    }
  }

  const classes = {};
  legacyList.forEach((r, idx) => {
    const norm = normalizeRosterStudent(r, idx);
    if (!classes[norm.className]) classes[norm.className] = [];
    classes[norm.className].push(norm);
  });
  const classNames = Object.keys(classes);
  return {
    activeClass: classNames.length > 1 ? '__ALL__' : (classNames[0] || ''),
    classes,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Ghi Kho Danh sách Nhiều Lớp xuống đĩa và đồng bộ omr_active_roster.json
 */
function writeMultiClassRostersStore(store) {
  store.updatedAt = new Date().toISOString();
  // GĐ3 (P1-08): roster là dữ liệu chính — ghi nguyên tử, lỗi ghi lộ ra
  // cho route xử lý thay vì nuốt im lặng.
  atomicWriteJson(OMR_ROSTERS_FILE, store);

  const activeList = store.activeClass === '__ALL__'
    ? Object.values(store.classes || {}).flat()
    : (store.classes?.[store.activeClass] || Object.values(store.classes || {})[0] || []);
  atomicWriteJson(OMR_ROSTER_FILE, activeList);
  return store;
}

/**
 * Lấy tóm tắt toàn bộ các lớp trong Kho Danh sách Học sinh
 */
function listClassRostersSummary() {
  const store = readMultiClassRostersStore();
  const classNames = Object.keys(store.classes || {}).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  const classes = classNames.map(cls => {
    const students = store.classes[cls] || [];
    return {
      className: cls,
      count: students.length,
      sampleSbds: students.slice(0, 3).map(s => s.sbd)
    };
  });
  const allRoster = classNames.flatMap(cls => store.classes[cls] || []);
  return {
    activeClass: store.activeClass,
    totalClasses: classNames.length,
    classes,
    totalStudents: allRoster.length,
    activeRoster: getActiveRoster(),
    allRoster,
    classesMap: store.classes
  };
}

/**
 * Lấy danh sách học sinh đang hoạt động (theo lớp đang chọn hoặc toàn khối)
 */
function getActiveRoster(classNameOverride = null) {
  const store = readMultiClassRostersStore();
  const target = classNameOverride !== null && classNameOverride !== undefined ? classNameOverride : store.activeClass;
  if (!target) {
    return [];
  }
  if (target === '__ALL__') {
    return Object.keys(store.classes || {})
      .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
      .flatMap(cls => store.classes[cls] || []);
  }
  if (store.classes?.[target] && store.classes[target].length > 0) {
    return store.classes[target];
  }
  return [];
}

/**
 * Lưu danh sách một lớp hoặc tách tự động nhiều lớp từ một bảng danh sách chung
 */
function saveClassRoster({ className = '', roster = [], autoSplitByClass = true, setActive = true } = {}) {
  if (!Array.isArray(roster) || roster.length === 0) return listClassRostersSummary();
  const store = readMultiClassRostersStore();
  if (!store.classes) store.classes = {};

  const targetFallback = String(className || '').replace(/\s+/g, ' ').trim();
  const normalized = roster.map((r, idx) => {
    const norm = normalizeRosterStudent(r, idx, targetFallback);
    if (targetFallback && !autoSplitByClass) {
      norm.className = targetFallback;
    }
    return norm;
  });

  if (autoSplitByClass && !targetFallback) {
    const grouped = {};
    normalized.forEach(s => {
      if (!grouped[s.className]) grouped[s.className] = [];
      grouped[s.className].push(s);
    });
    const newClassNames = Object.keys(grouped);
    newClassNames.forEach(cls => {
      store.classes[cls] = grouped[cls];
    });
    if (setActive) {
      store.activeClass = newClassNames.length > 1 ? '__ALL__' : (newClassNames[0] || store.activeClass);
    }
  } else {
    const finalCls = targetFallback || normalized[0]?.className || 'Lớp thi';
    store.classes[finalCls] = normalized.map(s => ({ ...s, className: finalCls }));
    if (setActive) {
      store.activeClass = finalCls;
    }
  }

  writeMultiClassRostersStore(store);
  return listClassRostersSummary();
}

/**
 * Chuyển lớp đang chấm (hoặc '__ALL__' để đối chiếu SBD toàn khối)
 */
function setActiveRosterClass(className) {
  const store = readMultiClassRostersStore();
  const target = String(className || '').trim();
  if (target === '__ALL__' || (store.classes && store.classes[target])) {
    store.activeClass = target;
    writeMultiClassRostersStore(store);
  }
  return listClassRostersSummary();
}

/**
 * Xóa một lớp khỏi Kho Danh sách Học sinh
 */
function deleteClassRoster(className) {
  const store = readMultiClassRostersStore();
  const target = String(className || '').trim();
  if (store.classes && store.classes[target]) {
    delete store.classes[target];
  }
  const remaining = Object.keys(store.classes || {}).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  if (remaining.length === 0) {
    store.classes = {};
    store.activeClass = '';
  } else if (store.activeClass === target) {
    store.activeClass = remaining[0];
  }
  writeMultiClassRostersStore(store);
  return listClassRostersSummary();
}

/**
 * Lưu danh sách học sinh của lớp vào hệ thống (giữ tương thích ngược)
 */
function saveActiveRoster(roster, options = {}) {
  if (!Array.isArray(roster)) return [];
  const store = readMultiClassRostersStore();
  const targetClass = String(options.className || '').replace(/\s+/g, ' ').trim();
  const normalized = roster.map((r, idx) => normalizeRosterStudent(r, idx, targetClass || (options.isDefaultReset ? '12A1' : '')));

  if (options.isDefaultReset) {
    store.classes['12A1'] = normalized;
    store.activeClass = '12A1';
  } else if (targetClass) {
    store.classes[targetClass] = normalized.map(s => ({ ...s, className: targetClass }));
    store.activeClass = targetClass;
  } else {
    const grouped = {};
    normalized.forEach(s => {
      if (!grouped[s.className]) grouped[s.className] = [];
      grouped[s.className].push(s);
    });
    const keys = Object.keys(grouped);
    if (keys.length === 1) {
      store.classes[keys[0]] = grouped[keys[0]];
      store.activeClass = keys[0];
    } else if (keys.length > 1) {
      keys.forEach(k => { store.classes[k] = grouped[k]; });
      store.activeClass = '__ALL__';
    }
  }

  writeMultiClassRostersStore(store);
  // GĐ3 (P1-08): ghi nguyên tử, lỗi ghi lộ ra cho route xử lý.
  atomicWriteJson(OMR_ROSTER_FILE, normalized);
  return normalized;
}

/**
 * Tạo bảng ánh xạ SBD thông minh (khớp chính xác, khớp bổ sung số 0 ở đầu và khớp lược bỏ số 0 đầu)
 */
function buildSmartRosterMap(roster) {
  const map = new Map();
  const list = Array.isArray(roster) ? roster : getActiveRoster();
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
 * Tra cứu học sinh trong rosterMap theo SBD gốc, pad 6 số, hoặc bỏ số 0 ở đầu
 */
function lookupStudentInRosterMap(rosterMap, rawSbd) {
  const clean = String(rawSbd || '').trim();
  if (!clean || !rosterMap || rosterMap.size === 0) return null;
  return (
    rosterMap.get(clean)
    || rosterMap.get(clean.padStart(6, '0'))
    || rosterMap.get(clean.replace(/^0+/, ''))
    || null
  );
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
 * Tra cứu đáp án theo mã đề (hỗ trợ chuẩn hóa số 0 đầu 3/4 chữ số)
 */
function findAnswerKeyByCode(answerKeysByCode, codeVal) {
  if (!answerKeysByCode || typeof answerKeysByCode !== 'object') return null;
  const raw = String(codeVal || '').trim();
  if (!raw || raw === 'chưa tô') return null;
  const stripped = raw.replace(/^0+/, '');
  const p3 = stripped ? stripped.padStart(3, '0') : '';
  const p4 = stripped ? stripped.padStart(4, '0') : '';
  return answerKeysByCode[raw] ||
    (stripped && answerKeysByCode[stripped]) ||
    (p3 && answerKeysByCode[p3]) ||
    (p4 && answerKeysByCode[p4]) ||
    null;
}

/**
 * Thực hiện chấm toàn bộ lô bài thi (Batch Grading)
 */
function gradeBatchPapers({ papers = [], answerKeysByCode = {}, pointRules = {}, roster = null, targetClassName = '', persistDbState = true }) {
  const safeRoster = Array.isArray(roster) ? roster : getActiveRoster(targetClassName && targetClassName !== '__ALL__' ? targetClassName : null);
  const rosterMap = buildSmartRosterMap(safeRoster);
  const safeKeys = answerKeysByCode && typeof answerKeysByCode === 'object' ? answerKeysByCode : {};
  const availableCodes = Object.keys(safeKeys);
  const fallbackClass = String(targetClassName || '').trim() || safeRoster[0]?.className || '';
  const gradedPapers = [];
  let validCount = 0;
  let warningCount = 0;

  (Array.isArray(papers) ? papers : []).forEach((paper, idx) => {
    try {
      const rawSbd = String(paper?.sbd || '').trim();
      const studentInfo = (rawSbd && rawSbd !== 'chưa tô')
        ? lookupStudentInRosterMap(rosterMap, rawSbd)
        : null;
      const rawCode = String(paper?.scannedExamCode || '').trim();
      const answerKey = findAnswerKeyByCode(safeKeys, rawCode);

      let result = null;
      let hasError = false;
      const currentWarnings = Array.isArray(paper?.warnings) ? [...paper.warnings] : [];

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
            message: availableCodes.length > 0
              ? `Mã đề "${rawCode || 'chưa tô'}" không khớp với bất kì mã đề thi nào đã tạo (${availableCodes.join(', ')})!`
              : 'Chưa có Biểu đáp án mã đề để đối chiếu! Vui lòng chọn đề hoặc nạp file đáp án.'
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
        id: paper.id || `paper_${Date.now()}_${idx}`,
        sbd: rawSbd || 'chưa tô',
        scannedExamCode: rawCode,
        studentName: resolvedName,
        className: studentInfo?.className || fallbackClass || paper.className || '',
        dob: studentInfo?.dob || paper.dob || '',
        hasError,
        warnings: currentWarnings,
        result
      });
    } catch (paperErr) {
      warningCount++;
      gradedPapers.push({
        ...(paper || {}),
        id: paper?.id || `paper_err_${Date.now()}_${idx}`,
        sbd: paper?.sbd || 'chưa tô',
        studentName: paper?.studentName || 'Lỗi đọc phiếu',
        className: paper?.className || fallbackClass,
        hasError: true,
        warnings: [{
          type: 'PAPER_PARSE_ERROR',
          message: `Không thể chấm phiếu này (${paperErr.message || 'dữ liệu không hợp lệ'}). Vui lòng bấm Sửa phiếu để kiểm tra.`
        }],
        result: null
      });
    }
  });

  // Tính toán thống kê toàn diện
  const stats = calculateBatchStatistics(gradedPapers);

  // Tự động lưu bản chụp phiên chấm vào ổ cứng (trừ chế độ Demo mô phỏng)
  // GĐ3 (P1-08): lỗi lưu không được làm mất kết quả chấm đã tính — ghi nhận
  // vào persistenceError để route báo rõ cho người dùng.
  let persistenceError = null;
  if (persistDbState) {
    try {
      saveDatabaseState(gradedPapers);
    } catch (err) {
      persistenceError = err.message;
    }
  }

  return {
    totalPapers: gradedPapers.length,
    validCount,
    warningCount,
    gradedPapers,
    statistics: stats,
    persistenceError
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

  // 5. Nếu cập nhật điểm Tự luận (khi đề hỗn hợp Trắc nghiệm + Tự luận)
  if (updates.essayScore !== undefined) {
    const oldEssay = paper.essayScore ?? '';
    const parsedEssay = updates.essayScore === '' || updates.essayScore === null ? null : Math.max(0, Number(updates.essayScore));
    if (!Number.isNaN(parsedEssay) && String(oldEssay) !== String(parsedEssay ?? '')) {
      paper.essayScore = parsedEssay;
      const rec = logAuditRecord({
        paperId: paper.id,
        sbd: paper.sbd,
        studentName: paper.studentName,
        field: 'Điểm Tự luận',
        oldVal: oldEssay === '' ? 'Chưa nhập' : String(oldEssay),
        newVal: parsedEssay === null ? 'Xóa điểm TL' : String(parsedEssay),
        reason: updates.reason || 'Giáo viên nhập/điều chỉnh điểm phần Tự luận',
        user
      });
      newAuditRecords.push(rec);
    }
  }

  // Chấm lại bài này với đáp án mã đề mới và đánh giá lại cảnh báo trung thực
  const activeCode = String(paper.scannedExamCode || '').trim();
  const answerKey = findAnswerKeyByCode(answerKeysByCode, activeCode);
  const nextWarnings = [];
  if (!activeCode || /^(chưa|---|unknown)/i.test(activeCode)) {
    nextWarnings.push({
      type: 'MISSING_EXAM_CODE',
      message: 'Chưa xác định Mã đề hợp lệ trên phiếu.'
    });
  } else if (!answerKey) {
    nextWarnings.push({
      type: 'UNKNOWN_EXAM_CODE',
      message: `Mã đề "${activeCode}" không tồn tại trong biểu đáp án hiện tại (${Object.keys(answerKeysByCode || {}).join(', ')}).`
    });
  }
  if (Array.isArray(roster) && roster.length > 0) {
    const cleanSbd = String(paper.sbd || '').trim();
    const rosterMap = buildSmartRosterMap(roster);
    if (!cleanSbd || /^(chưa|unknown|---)/i.test(cleanSbd)) {
      nextWarnings.push({ type: 'MISSING_SBD', message: 'Chưa có Số báo danh trên phiếu.' });
    } else if (!lookupStudentInRosterMap(rosterMap, cleanSbd)) {
      nextWarnings.push({ type: 'UNMATCHED_SBD', message: `SBD "${cleanSbd}" chưa có trong Danh sách lớp đang chọn.` });
    }
  }

  paper.isCorrected = nextWarnings.length === 0;
  paper.warnings = nextWarnings;
  paper.hasError = nextWarnings.length > 0;

  if (answerKey) {
    paper.result = gradeSinglePaper(paper, answerKey, pointRules);
  } else {
    paper.result = {
      totalScore: 0,
      part1Score: 0, part2Score: 0, part3Score: 0,
      part1Correct: 0, part1Total: 0,
      part2CorrectSubs: 0, part2TotalSubs: 0,
      part3Correct: 0, part3Total: 0,
      details: { part1: {}, part2: {}, part3: {} },
      hasKey: false
    };
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
  // GĐ3 (P1-08): ghi nguyên tử; lỗi ghi lộ ra (kèm log) thay vì nuốt —
  // nơi gọi quyết định xử lý (gradeBatchPapers ghi nhận persistenceError,
  // snapshot thì báo về route).
  try {
    atomicWriteJson(OMR_DB_FILE, papers);
  } catch (err) {
    console.error('Lỗi lưu CSDL chấm thi:', err);
    throw err;
  }
}

/**
 * Suy luận tên lớp chủ đạo của lô bài làm
 */
function resolveBatchClassName(gradedPapers = [], explicitClass = '', metadata = {}) {
  if (explicitClass && String(explicitClass).trim() && explicitClass !== '__ALL__') {
    return String(explicitClass).trim();
  }
  const counts = {};
  (gradedPapers || []).forEach(p => {
    const cls = String(p?.className || '').trim();
    if (cls) counts[cls] = (counts[cls] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) return sorted[0][0];
  return String(metadata?.className || '12A1').trim() || '12A1';
}

/**
 * Lưu một ca chấm đầy đủ vào thư mục data/omr_database (gắn liền Đề thi × Lớp)
 */
function saveGradingSessionSnapshot({
  gradedPapers = [],
  answerKeysByCode = {},
  pointRules = {},
  metadata = {},
  title = '',
  examId = '',
  examTitle = '',
  className = '',
  templateId = '',
  overwriteSameExamClass = false,
  sessionId = ''
}) {
  const now = new Date();
  const resolvedClass = resolveBatchClassName(gradedPapers, className, metadata);
  const resolvedExamId = String(examId || metadata?.examId || '').replace(/[^a-zA-Z0-9_\-]/g, '');
  const subject = metadata.subject || 'Tin học';
  const grade = metadata.grade || '12';
  const resolvedExamTitle = examTitle || metadata.examTitle || `${subject} Lớp ${grade}${metadata.examPeriod ? ' - ' + metadata.examPeriod : ''}`;

  let id = '';
  if (sessionId) {
    id = String(sessionId).replace(/[^a-zA-Z0-9_\-]/g, '');
  } else if (overwriteSameExamClass && resolvedExamId && resolvedClass) {
    const classSlug = resolvedClass.replace(/[^a-zA-Z0-9_\-]/g, '_');
    id = `omr_exam_${resolvedExamId}__${classSlug}`;
  } else {
    id = `omr_session_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  }

  const stats = calculateBatchStatistics(gradedPapers);
  const sessionTitle = title || `${resolvedExamTitle} (${resolvedClass}) - ${gradedPapers.length} bài`;

  // Loại bỏ các thuộc tính DOM/Blob phía client trước khi lưu JSON
  const cleanPapers = gradedPapers.map(p => {
    const copy = { ...p };
    delete copy.imageElement;
    delete copy.imageUrl;
    return copy;
  });

  const warningCount = cleanPapers.filter(p => p.hasError || (p.warnings && p.warnings.length > 0)).length;
  const payload = {
    id,
    title: sessionTitle,
    savedAt: now.toISOString(),
    examId: resolvedExamId,
    examTitle: resolvedExamTitle,
    className: resolvedClass,
    templateId: templateId || metadata.templateId || '',
    metadata: { ...metadata, className: resolvedClass, subject, grade, examId: resolvedExamId, examTitle: resolvedExamTitle },
    totalPapers: cleanPapers.length,
    warningCount,
    statistics: stats,
    answerKeysByCode,
    pointRules,
    papers: cleanPapers
  };

  const sessionPath = path.join(OMR_SESSIONS_DIR, `${id}.json`);
  // GĐ3 (P1-08): ghi phiên chấm bằng ghi nguyên tử — tắt tiến trình đột
  // ngột giữa chừng cũng không làm hỏng file phiên cũ. Lỗi ghi lộ ra để
  // route grade-batch báo rõ (persistence) thay vì nuốt.
  atomicWriteJson(sessionPath, payload);
  saveDatabaseState(cleanPapers);
  return {
    id,
    title: sessionTitle,
    examId: resolvedExamId,
    examTitle: resolvedExamTitle,
    className: resolvedClass,
    savedAt: payload.savedAt,
    filePath: sessionPath,
    statistics: stats
  };
}

/**
 * Cập nhật lại dữ liệu bài thi trong một file session đã tồn tại
 */
function syncSessionPapers(sessionId, updatedPapers) {
  if (!sessionId || !Array.isArray(updatedPapers)) return false;
  const safeId = String(sessionId).replace(/[^a-zA-Z0-9_\-]/g, '');
  const filePath = path.join(OMR_SESSIONS_DIR, `${safeId}.json`);
  if (!fs.existsSync(filePath)) return false;
  // GĐ3 (P1-08): ghi nguyên tử; lỗi ghi lộ ra (ném lỗi) thay vì trả false
  // im lặng — route update-paper sẽ báo rõ cho người dùng.
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const cleanPapers = updatedPapers.map(p => {
    const c = { ...p };
    delete c.imageElement;
    delete c.imageUrl;
    return c;
  });
  raw.papers = cleanPapers;
  raw.totalPapers = cleanPapers.length;
  raw.warningCount = cleanPapers.filter(p => p.hasError || (p.warnings && p.warnings.length > 0)).length;
  raw.statistics = calculateBatchStatistics(cleanPapers);
  raw.savedAt = new Date().toISOString();
  atomicWriteJson(filePath, raw);
  return true;
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
      const firstClass = raw.className || papers[0]?.className || raw.metadata?.className || '12A1';
      const subject = raw.metadata?.subject || 'Tin học';
      const grade = raw.metadata?.grade || '12';
      const examId = raw.examId || raw.metadata?.examId || '';
      const examTitle = raw.examTitle || raw.metadata?.examTitle || `${subject} Lớp ${grade}${raw.metadata?.examPeriod ? ' - ' + raw.metadata.examPeriod : ''}`;
      const warningCount = raw.warningCount ?? papers.filter(p => p.hasError || (p.warnings && p.warnings.length > 0)).length;
      sessions.push({
        id: raw.id || fallbackId,
        fileName: path.basename(fullPath),
        title: raw.title || `${examTitle} (${firstClass})`,
        examId,
        examTitle,
        savedAt,
        totalPapers: papers.length,
        warningCount,
        avgScore: stats.avg ?? 0,
        maxScore: stats.max ?? 0,
        minScore: stats.min ?? 0,
        medianScore: stats.median ?? 0,
        classification: stats.classification || {},
        tfStyle: 'moet2025',
        templateId: raw.templateId || raw.metadata?.templateId || '',
        className: firstClass,
        subject,
        grade
      });
    } catch (_) { }
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
        examId: raw.examId || raw.metadata?.examId || '',
        examTitle: raw.examTitle || raw.metadata?.examTitle || '',
        className: raw.className || papers[0]?.className || raw.metadata?.className || '',
        templateId: raw.templateId || raw.metadata?.templateId || '',
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
 * GĐ2 (P0-02 + P0-09): Dựng biểu đáp án từ hồ sơ đề một cách NGHIÊM NGẶT —
 * không mặc định đáp án. Câu nào thiếu đáp án hợp lệ thì ghi vào problems
 * (kèm mã đề + mã câu) và toàn bộ bộ khóa bị coi là không dùng được: máy
 * chủ từ chối chấm thay vì chấm bằng đáp án A bịa ra.
 * Trả về { keys, problems }: keys = { code: { part1: [], part2: {}, part3: {} } }.
 */
function buildStrictAnswerKeysFromExam(examData = {}) {
  const variants = Array.isArray(examData.variants) && examData.variants.length > 0
    ? examData.variants
    : (Array.isArray(examData.questions) && examData.questions.length > 0
      ? [{ code: examData.selectedVariantCode || '101', questions: examData.questions }]
      : []);
  const keys = {};
  const problems = [];

  variants.forEach(v => {
    const code = String(v.code || '101').trim();
    const p1 = [];
    const p2 = {};
    const p3 = {};
    (v.questions || []).forEach((q, qi) => {
      const qLabel = `mã đề ${code} câu ${qi + 1}${q.id ? ` [${q.id}]` : ''}`;
      const type = String(q.type || '').toUpperCase();
      if (type === 'MCQ' || (!type && Array.isArray(q.options) && q.options.length === 4)) {
        const ans = String(q.answer ?? q.correctAnswer ?? '').trim().toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(ans)) {
          problems.push(`${qLabel}: đáp án trắc nghiệm không hợp lệ ("${q.answer ?? q.correctAnswer ?? ''}", phải là A, B, C hoặc D).`);
          p1.push(null);
        } else {
          p1.push(ans);
        }
      } else if (type === 'TF' || (!type && (Array.isArray(q.statements) || Array.isArray(q.subItems)))) {
        const stmts = q.statements || q.subItems || [];
        const resolveTf = (item) => {
          if (!item) return null;
          if (typeof item.isTrue === 'boolean') return item.isTrue ? 'Đ' : 'S';
          if (typeof item.correctAnswer === 'string') {
            const c = item.correctAnswer.trim().toUpperCase();
            if (c.startsWith('S')) return 'S';
            if (c.startsWith('Đ') || c.startsWith('D')) return 'Đ';
            return null;
          }
          if (typeof item.answer === 'string') {
            const c = item.answer.trim().toUpperCase();
            if (c.startsWith('S')) return 'S';
            if (c.startsWith('Đ') || c.startsWith('D')) return 'Đ';
            return null;
          }
          return null;
        };
        const entry = {};
        ['a', 'b', 'c', 'd'].forEach((letter, sIdx) => {
          const val = resolveTf(stmts[sIdx]);
          if (val === null) {
            problems.push(`${qLabel} ý ${letter}: thiếu đáp án Đúng/Sai xác định được.`);
            entry[letter] = null;
          } else {
            entry[letter] = val;
          }
        });
        p2[String(Object.keys(p2).length + 1)] = entry;
      } else if (type === 'SA') {
        const ans = q.answer ?? q.correctAnswer ?? '';
        if (ans === undefined || ans === null || String(ans).trim() === '') {
          problems.push(`${qLabel}: câu trả lời ngắn thiếu đáp số.`);
          p3[String(Object.keys(p3).length + 1)] = '';
        } else {
          p3[String(Object.keys(p3).length + 1)] = String(ans);
        }
      }
    });
    keys[code] = { part1: p1, part2: p2, part3: p3 };
  });

  return { keys, problems };
}

/**
 * GĐ2 (P0-09): Kho biểu đáp án ngoài do MÁY CHỦ trích xuất và lưu giữ.
 * Chỉ route /api/omr/parse-answer-key (đã đăng nhập) mới được ghi vào đây;
 * grade-batch/update-paper chỉ ĐỌC từ đây, không bao giờ lấy khóa từ body.
 */
function sanitizeExternalKeySetId(rawId) {
  return String(rawId || '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'external_keys';
}

function saveExternalAnswerKeys(keySetId, answerKeysByCode, sourceLabel = '') {
  const safeId = sanitizeExternalKeySetId(keySetId);
  if (!fs.existsSync(EXTERNAL_KEYS_DIR)) fs.mkdirSync(EXTERNAL_KEYS_DIR, { recursive: true });
  const payload = {
    keySetId: safeId,
    sourceLabel: String(sourceLabel || ''),
    savedAt: new Date().toISOString(),
    answerKeysByCode: answerKeysByCode || {}
  };
  atomicWriteJson(path.join(EXTERNAL_KEYS_DIR, `${safeId}.json`), payload);
  atomicWriteJson(EXTERNAL_KEYS_LATEST_FILE, { keySetId: safeId, sourceLabel: payload.sourceLabel, savedAt: payload.savedAt });
  return safeId;
}

function loadExternalAnswerKeys(keySetId) {
  const safeId = sanitizeExternalKeySetId(keySetId);
  const filePath = path.join(EXTERNAL_KEYS_DIR, `${safeId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!raw || typeof raw.answerKeysByCode !== 'object') return null;
    return raw.answerKeysByCode;
  } catch (_) {
    return null;
  }
}

function loadLatestExternalAnswerKeys() {
  if (!fs.existsSync(EXTERNAL_KEYS_LATEST_FILE)) return null;
  try {
    const pointer = JSON.parse(fs.readFileSync(EXTERNAL_KEYS_LATEST_FILE, 'utf8'));
    if (!pointer || !pointer.keySetId) return null;
    return loadExternalAnswerKeys(pointer.keySetId);
  } catch (_) {
    return null;
  }
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
 * Tổng hợp báo cáo đa lớp & toàn khối theo Đề thi (examId)
 */
function aggregateGradeReportByExam(examId = '') {
  const allSessions = [];
  if (fs.existsSync(OMR_SESSIONS_DIR)) {
    const files = fs.readdirSync(OMR_SESSIONS_DIR).filter(f => f.endsWith('.json'));
    files.forEach(f => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(OMR_SESSIONS_DIR, f), 'utf8'));
        const papers = Array.isArray(raw) ? raw : (raw.papers || raw.gradedPapers || []);
        if (papers.length > 0) {
          const id = raw.id || f.replace(/\.json$/, '');
          const resolvedExamId = raw.examId || raw.metadata?.examId || 'unlinked';
          const resolvedExamTitle = raw.examTitle || raw.metadata?.examTitle || `${raw.metadata?.subject || 'Tin học'} Lớp ${raw.metadata?.grade || '12'}`;
          const cls = raw.className || papers[0]?.className || raw.metadata?.className || '12A1';
          allSessions.push({
            sessionId: id,
            examId: resolvedExamId,
            examTitle: resolvedExamTitle,
            className: cls,
            savedAt: raw.savedAt || fs.statSync(path.join(OMR_SESSIONS_DIR, f)).mtime.toISOString(),
            metadata: raw.metadata || {},
            statistics: raw.statistics || calculateBatchStatistics(papers),
            papers
          });
        }
      } catch (_) { }
    });
  }

  // Xây dựng mục lục các Đề thi đã từng có ca chấm
  const examsMap = new Map();
  allSessions.forEach(s => {
    const key = s.examId !== 'unlinked' ? s.examId : s.examTitle;
    if (!examsMap.has(key)) {
      examsMap.set(key, {
        examKey: key,
        examId: s.examId,
        examTitle: s.examTitle,
        classNames: new Set(),
        totalPapers: 0,
        latestAt: s.savedAt
      });
    }
    const entry = examsMap.get(key);
    entry.classNames.add(s.className);
    entry.totalPapers += s.papers.length;
    if (String(s.savedAt) > String(entry.latestAt)) entry.latestAt = s.savedAt;
  });

  const examsIndex = Array.from(examsMap.values()).map(e => {
    const classList = Array.from(e.classNames).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
    return {
      examKey: e.examKey,
      examId: e.examId,
      examTitle: e.examTitle,
      classes: classList,
      totalClasses: classList.length,
      totalPapers: e.totalPapers,
      latestAt: e.latestAt
    };
  }).sort((a, b) => String(b.latestAt).localeCompare(String(a.latestAt)));

  const targetKey = examId || (examsIndex[0]?.examKey || '');
  const matchedSessions = targetKey
    ? allSessions.filter(s => s.examId === targetKey || s.examTitle === targetKey || (targetKey === '__ALL__'))
    : allSessions;

  // Giữ bản mới nhất cho mỗi lớp thuộc cùng đề thi này
  const latestByClass = new Map();
  matchedSessions
    .slice()
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
    .forEach(s => {
      if (!latestByClass.has(s.className)) {
        latestByClass.set(s.className, s);
      }
    });

  const sortedClassSessions = Array.from(latestByClass.values())
    .sort((a, b) => a.className.localeCompare(b.className, 'vi', { numeric: true }));

  const classes = sortedClassSessions.map(s => {
    const st = s.statistics || calculateBatchStatistics(s.papers);
    const warningCount = s.papers.filter(p => p.hasError || (p.warnings && p.warnings.length > 0)).length;
    return {
      sessionId: s.sessionId,
      className: s.className,
      count: s.papers.length,
      totalPapers: s.papers.length,
      avg: st.avg,
      max: st.max,
      min: st.min,
      median: st.median,
      classification: st.classification,
      warningCount,
      savedAt: s.savedAt
    };
  });

  const allPapers = sortedClassSessions.flatMap(s => s.papers.map(p => ({ ...p, className: p.className || s.className })));
  const overallStats = calculateBatchStatistics(allPapers);

  return {
    ok: true,
    examKey: targetKey,
    examTitle: sortedClassSessions[0]?.examTitle || examsIndex[0]?.examTitle || 'Chưa có dữ liệu',
    examsIndex,
    totalClasses: classes.length,
    classes,
    overall: {
      totalClasses: classes.length,
      totalPapers: allPapers.length,
      ...overallStats
    },
    allPapers
  };
}

/**
 * Xuất bảng điểm lớp ra định dạng CSV (tương thích Excel tiếng Việt UTF-8 BOM)
 */
function exportRosterToCsv(gradedPapers, metadata = {}, options = {}) {
  const list = Array.isArray(gradedPapers) ? gradedPapers : [];
  const hasEssay = Boolean(options.hasEssay) || list.some(p => p?.essayScore !== undefined && p?.essayScore !== null && p?.essayScore !== '');
  const header = hasEssay
    ? '\uFEFFSTT,Số báo danh,Họ và tên,Lớp,Ngày sinh,Mã đề,Điểm Phần I (TN),Điểm Phần II (Đ/S),Điểm Phần III (TLN),Điểm Tự luận,Tổng điểm (Thang 10),Xếp loại,Trạng thái bài\n'
    : '\uFEFFSTT,Số báo danh,Họ và tên,Lớp,Ngày sinh,Mã đề,Điểm Phần I (TN),Điểm Phần II (Đ/S),Điểm Phần III (TLN),Tổng điểm (Thang 10),Xếp loại,Trạng thái bài\n';
  const rows = list.map((p, idx) => {
    const r = p.result || {};
    const p1 = r.part1?.points ?? r.part1Score ?? '-';
    const p2 = r.part2?.points ?? r.part2Score ?? '-';
    const p3 = r.part3?.points ?? r.part3Score ?? '-';
    const essay = p.essayScore ?? r.essayScore ?? '-';
    const total = r.totalScore ?? '-';
    const grade = r.gradeClass ?? 'Chưa chấm';
    const status = p.isCorrected ? 'Đã hiệu chỉnh & Lưu vết' : (p.warnings?.length > 0 ? 'Có cảnh báo' : 'Hợp lệ');

    const baseCols = [
      idx + 1,
      `"${p.sbd}"`,
      `"${p.studentName}"`,
      `"${p.className || ''}"`,
      `"${p.dob || ''}"`,
      `"${p.scannedExamCode}"`,
      p1,
      p2,
      p3
    ];
    if (hasEssay) baseCols.push(essay);
    baseCols.push(total, `"${grade}"`, `"${status}"`);
    return baseCols.join(',');
  });

  return header + rows.join('\n');
}

/**
 * Xuất Báo cáo Bảng điểm Toàn Khối (nhiều lớp) ra định dạng CSV UTF-8 BOM
 */
function exportMultiClassGradeCsv(gradeReport) {
  const lines = ['\uFEFFBÁO CÁO TỔNG HỢP ĐIỂM TOÀN KHỐI - MATRIXEDU'];
  lines.push(`"Đề kiểm tra","${(gradeReport.examTitle || '').replace(/"/g, '""')}"`);
  lines.push(`"Tổng số lớp","${gradeReport.totalClasses || 0}","Tổng số bài","${gradeReport.overall?.count || 0}","Điểm TB khối","${gradeReport.overall?.avg || 0}"`);
  lines.push('');
  lines.push('Lớp,Sĩ số chấm,Điểm TB,Cao nhất,Thấp nhất,Trung vị,Giỏi (SL),Giỏi (%),Khá (SL),Khá (%),Trung bình (SL),TB (%),Yếu/Chưa đạt (SL),Yếu (%)');

  (gradeReport.classes || []).forEach(c => {
    const cl = c.classification || {};
    lines.push([
      `"${c.className}"`,
      c.count,
      c.avg,
      c.max,
      c.min,
      c.median,
      cl.gio || 0,
      cl.gioPct || 0,
      cl.kha || 0,
      cl.khaPct || 0,
      cl.trungBinh || 0,
      cl.trungBinhPct || 0,
      cl.yeu || 0,
      cl.yeuPct || 0
    ].join(','));
  });

  const ov = gradeReport.overall || {};
  const ovCl = ov.classification || {};
  lines.push([
    '"TOÀN KHỐI"',
    ov.count || 0,
    ov.avg || 0,
    ov.max || 0,
    ov.min || 0,
    ov.median || 0,
    ovCl.gio || 0,
    ovCl.gioPct || 0,
    ovCl.kha || 0,
    ovCl.khaPct || 0,
    ovCl.trungBinh || 0,
    ovCl.trungBinhPct || 0,
    ovCl.yeu || 0,
    ovCl.yeuPct || 0
  ].join(','));

  lines.push('');
  lines.push('CHI TIẾT ĐIỂM TỪNG HỌC SINH');
  const detailCsv = exportRosterToCsv(gradeReport.allPapers || []).replace(/^\uFEFF/, '');
  return lines.join('\n') + '\n' + detailCsv;
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
 * GĐ3 (P1-09): XUẤT BẢN SAO LƯU CỤC BỘ của CSDL chấm thi (đổi tên từ
 * syncOmrDatabaseToGoogleDrive — tên cũ gây hiểu nhầm là "đồng bộ lên
 * Google Drive" trong khi hàm chỉ ghi file cục bộ và trả nội dung để
 * trình duyệt tải về. Không có OAuth nên không thể upload thật lên Drive;
 * giáo viên tải file về rồi đưa lên Drive thủ công).
 * - Lưu snapshot vào thư mục CSDL (`data/omr_database` hoặc /tmp trên Vercel)
 * - Trả về nội dung JSON/CSV thật để trình duyệt tải xuống.
 * - KHÔNG bao giờ báo là đã upload lên Drive (remoteDriveUploaded: false).
 */
function exportOmrDatabaseLocalBackup({ folderId = '', gradedPapers = [], metadata = {}, answerKeysByCode = {}, pointRules = {} }) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const subjectSlug = (metadata.subject || 'De_Thi').replace(/\s+/g, '_');
  const gradeSlug = metadata.grade || '';
  const cleanFolderId = String(folderId || '').trim();

  // Lưu snapshot vào thư mục CSDL
  const savedSnap = saveGradingSessionSnapshot({
    gradedPapers,
    answerKeysByCode,
    pointRules,
    metadata,
    examTitle: metadata.examTitle || '',
    className: metadata.className || ''
  });

  // 1. Tạo file CSDL JSON
  const dbFileName = `CSDL_CHAM_THI_${subjectSlug}${gradeSlug ? '_Lop' + gradeSlug : ''}_${dateStr}.json`;
  const dbPayload = {
    id: savedSnap.id,
    exportedAt: now.toISOString(),
    folderId: cleanFolderId,
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
  const dbJsonStr = JSON.stringify(dbPayload, null, 2);
  // GĐ3 (P1-08): ghi nguyên tử; lỗi ghi lộ ra thay vì nuốt.
  atomicWriteFile(dbFilePath, Buffer.from(dbJsonStr, 'utf8'));

  // 2. Tạo file Bảng điểm CSV
  const csvFileName = `BANG_DIEM_${subjectSlug}${gradeSlug ? '_Lop' + gradeSlug : ''}_${dateStr}.csv`;
  const csvContent = exportRosterToCsv(gradedPapers, metadata);
  const csvFilePath = path.join(DATA_DIR, csvFileName);
  atomicWriteFile(csvFilePath, Buffer.from(csvContent, 'utf8'));

  // 3. Tạo file Nhật ký lưu vết CSV
  const auditFileName = `NHAT_KY_LUU_VET_CHAM_THI_${dateStr}.csv`;
  const auditContent = exportAuditLogsToCsv();
  const auditFilePath = path.join(DATA_DIR, auditFileName);
  atomicWriteFile(auditFilePath, Buffer.from(auditContent, 'utf8'));

  const isVercelEphemeral = Boolean(process.env.VERCEL);
  const msg = isVercelEphemeral
    ? `Đã xuất bản sao lưu cục bộ (tạm trên Vercel /tmp) gồm CSDL (${dbFileName}, ${csvFileName}). CHƯA upload lên Google Drive — hệ thống không tự upload lên Drive cá nhân (không có OAuth); hãy tải các tệp về rồi đưa lên Drive thủ công.`
    : `Đã xuất bản sao lưu cục bộ vào máy chủ (${DATA_DIR}) và chuẩn bị tệp tải về (${csvFileName}). CHƯA upload lên Google Drive — hãy tải các tệp về rồi đưa lên thư mục Drive của bạn.`;

  return {
    ok: true,
    syncMode: 'local_backup_export',
    isVercelEphemeral,
    remoteDriveUploaded: false,
    sessionId: savedSnap.id,
    message: msg,
    folderId: cleanFolderId,
    files: [
      { name: dbFileName, path: dbFilePath, size: fs.existsSync(dbFilePath) ? fs.statSync(dbFilePath).size : Buffer.byteLength(dbJsonStr, 'utf8'), content: dbJsonStr, mime: 'application/json' },
      { name: csvFileName, path: csvFilePath, size: fs.existsSync(csvFilePath) ? fs.statSync(csvFilePath).size : Buffer.byteLength(csvContent, 'utf8'), content: csvContent, mime: 'text/csv;charset=utf-8' },
      { name: auditFileName, path: auditFilePath, size: fs.existsSync(auditFilePath) ? fs.statSync(auditFilePath).size : Buffer.byteLength(auditContent, 'utf8'), content: auditContent, mime: 'text/csv;charset=utf-8' }
    ],
    syncedAt: now.toISOString()
  };
}

// Tên cũ, giữ lại để tương thích — KHÔNG dùng trong code mới.
// (Đã đổi tên ở trên vì tên cũ gây hiểu nhầm là đã đồng bộ lên Google Drive.)
const syncOmrDatabaseToGoogleDrive = exportOmrDatabaseLocalBackup;

function clearAllRosters() {
  writeMultiClassRostersStore({ activeClass: '', classes: {} });
  return listClassRostersSummary();
}

module.exports = {
  DEFAULT_CLASS_ROSTER,
  getActiveRoster,
  saveActiveRoster,
  listClassRostersSummary,
  saveClassRoster,
  setActiveRosterClass,
  deleteClassRoster,
  clearAllRosters,
  buildSmartRosterMap,
  findAnswerKeyByCode,
  getAuditLogs,
  logAuditRecord,
  isShortAnswerMatch,
  gradeSinglePaper,
  generateSampleBatchPapers,
  gradeBatchPapers,
  calculateBatchStatistics,
  updatePaperAndAudit,
  saveGradingSessionSnapshot,
  syncSessionPapers,
  listSavedOmrSessions,
  loadSavedOmrSession,
  deleteSavedOmrSession,
  aggregateGradeReportByExam,
  exportRosterToCsv,
  exportMultiClassGradeCsv,
  exportAuditLogsToCsv,
  exportOmrDatabaseLocalBackup,
  // GĐ2 (P0-09): chấm lại phía máy chủ — khóa đáp án + biểu điểm chuẩn.
  SERVER_POINT_RULES,
  buildStrictAnswerKeysFromExam,
  saveExternalAnswerKeys,
  loadExternalAnswerKeys,
  loadLatestExternalAnswerKeys,
  // Tên cũ, chỉ để tương thích — code mới dùng exportOmrDatabaseLocalBackup.
  syncOmrDatabaseToGoogleDrive
};
