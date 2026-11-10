/**
 * src/answer-key-parser.js
 * Mô-đun phân tích và chuẩn hóa Biểu đáp án nạp từ bên ngoài:
 * - Hỗ trợ File Excel (.xlsx) không cần thư viện ngoài (sử dụng readZipEntries)
 * - Hỗ trợ File CSV / TSV (.csv, .tsv)
 * - Hỗ trợ File Word (.docx) & File Văn bản (.txt)
 * - Hỗ trợ Chuỗi text copy từ Zalo, Email, Messenger (1A 2B 3C...)
 * - Hỗ trợ File JSON Hồ sơ Đề kiểm tra
 */

const { readZipEntries } = require('./zip-docx');

/**
 * Trích xuất XML chuỗi chia sẻ (shared strings) trong file .xlsx
 */
function parseXlsxSharedStrings(xmlStr) {
  const strings = [];
  if (!xmlStr) return strings;

  // Tách từng thẻ <si>...</si>
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let match;
  while ((match = siRegex.exec(xmlStr)) !== null) {
    const siContent = match[1];
    // Thu thập tất cả thẻ <t> bên trong <si>
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
    let tMatch;
    let str = '';
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      str += tMatch[1];
    }
    strings.push(decodeXmlEntities(str));
  }
  return strings;
}

/**
 * Giải mã các ký tự XML cơ bản
 */
function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Phân tích sheet1.xml của file .xlsx thành ma trận hàng/cột
 */
function parseXlsxSheetRows(xmlStr, sharedStrings) {
  const rows = [];
  if (!xmlStr) return rows;

  const rowRegex = /<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(xmlStr)) !== null) {
    const rowIdx = parseInt(rowMatch[1], 10);
    const rowContent = rowMatch[2];
    const cellMap = {};

    const cellRegex = /<c\b[^>]*\br="([A-Z]+)(\d+)"(?:\b[^>]*\bt="([a-z]+)")?[^>]*>(?:[\s\S]*?<v>([\s\S]*?)<\/v>)?/gi;
    let cMatch;
    while ((cMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetters = cMatch[1];
      const type = cMatch[3];
      const rawVal = cMatch[4];

      let val = '';
      if (rawVal !== undefined) {
        if (type === 's') {
          const sIdx = parseInt(rawVal, 10);
          val = sharedStrings[sIdx] || '';
        } else {
          val = decodeXmlEntities(rawVal);
        }
      }
      cellMap[colLetters] = val.trim();
    }
    rows.push({ rowIdx, cells: cellMap });
  }
  return rows;
}

/**
 * Chuyển đổi chỉ số cột ký tự (A, B, ..., Z, AA) thành số (0, 1, ...)
 */
function colLettersToIndex(col) {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
}

/**
 * Phân tích file Buffer .xlsx thành cấu trúc AnswerKeysByCode
 */
function parseXlsxBuffer(buffer) {
  const zip = readZipEntries(buffer);
  let sharedStringsXml = '';
  let sheet1Xml = '';

  for (const [name, buf] of zip.entries()) {
    if (name.toLowerCase().endsWith('sharedstrings.xml')) {
      sharedStringsXml = buf.toString('utf8');
    } else if (name.toLowerCase().includes('sheet1.xml') || name.toLowerCase().includes('sheet.xml')) {
      sheet1Xml = buf.toString('utf8');
    }
  }

  const sharedStrings = parseXlsxSharedStrings(sharedStringsXml);
  const rows = parseXlsxSheetRows(sheet1Xml, sharedStrings);
  if (rows.length === 0) return {};

  // Chuyển rows thành ma trận 2D
  const matrix2D = [];
  rows.forEach(r => {
    const rowArr = [];
    for (const [colLetters, val] of Object.entries(r.cells)) {
      const colIdx = colLettersToIndex(colLetters);
      rowArr[colIdx] = val;
    }
    matrix2D.push(rowArr);
  });

  return parseMatrix2DToKeys(matrix2D);
}

/**
 * Phân tích ma trận 2D (từ Excel hoặc CSV) thành answerKeysByCode
 */
function parseMatrix2DToKeys(matrix2D) {
  const result = {};
  if (!matrix2D || matrix2D.length === 0) return result;

  // 1. Kiểm tra Dạng A: Hàng đầu tiên (hoặc hàng 2) chứa các Mã đề
  // Ví dụ: ['Câu', '101', '102', '103', '104']
  let headerRowIdx = -1;
  const codeCols = [];

  for (let i = 0; i < Math.min(5, matrix2D.length); i++) {
    const row = matrix2D[i] || [];
    const foundCodes = [];
    row.forEach((cell, cIdx) => {
      const str = String(cell || '').trim();
      const m = str.match(/([0-9]{3,4})/);
      if (m && m[1].length >= 3) {
        foundCodes.push({ colIdx: cIdx, code: m[1] });
      }
    });

    if (foundCodes.length >= 2 || (foundCodes.length === 1 && matrix2D.length > 5)) {
      headerRowIdx = i;
      foundCodes.forEach(fc => codeCols.push(fc));
      break;
    }
  }

  if (headerRowIdx !== -1 && codeCols.length > 0) {
    codeCols.forEach(cc => {
      result[cc.code] = { part1: [], part2: {}, part3: {} };
    });

    for (let r = headerRowIdx + 1; r < matrix2D.length; r++) {
      const row = matrix2D[r] || [];
      const firstCell = String(row[0] || '').trim();

      // Kiểm tra câu số mấy
      const qNumMatch = firstCell.match(/([0-9]{1,2})/);
      const qNum = qNumMatch ? parseInt(qNumMatch[1], 10) : (r - headerRowIdx);

      codeCols.forEach(cc => {
        const val = String(row[cc.colIdx] || '').trim().toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(val)) {
          result[cc.code].part1[qNum - 1] = val;
        } else if (val.includes('Đ') || val.includes('S') || /^[T|F|D|S]/i.test(val)) {
          // Đúng/Sai
          const tfVal = (val.includes('S') || val.toUpperCase() === 'F') ? 'S' : 'Đ';
          const subMatch = firstCell.match(/([0-9]{1,2})\s*([a-d])/i);
          if (subMatch) {
            const mainQ = subMatch[1];
            const subQ = subMatch[2].toLowerCase();
            if (!result[cc.code].part2[mainQ]) result[cc.code].part2[mainQ] = {};
            result[cc.code].part2[mainQ][subQ] = tfVal;
          }
        }
      });
    }

    return result;
  }

  // 2. Kiểm tra Dạng B: Bảng dọc [Mã đề, Câu, Đáp án]
  let colCode = -1, colQ = -1, colAns = -1;
  const header = matrix2D[0] || [];
  header.forEach((h, idx) => {
    const s = String(h || '').toLowerCase();
    if (s.includes('mã') || s.includes('code') || s.includes('đề')) colCode = idx;
    if (s.includes('câu') || s.includes('question') || s.includes('stt')) colQ = idx;
    if (s.includes('đáp') || s.includes('ans') || s.includes('chọn')) colAns = idx;
  });

  if (colCode !== -1 && colAns !== -1) {
    for (let r = 1; r < matrix2D.length; r++) {
      const row = matrix2D[r] || [];
      const codeMatch = String(row[colCode] || '').match(/([0-9]{3,4})/);
      if (!codeMatch) continue;
      const code = codeMatch[1];
      if (!result[code]) result[code] = { part1: [], part2: {}, part3: {} };

      const qNumMatch = String(row[colQ !== -1 ? colQ : 1] || '').match(/([0-9]{1,2})/);
      const qNum = qNumMatch ? parseInt(qNumMatch[1], 10) : (result[code].part1.length + 1);
      const ansVal = String(row[colAns] || '').trim().toUpperCase();

      if (['A', 'B', 'C', 'D'].includes(ansVal)) {
        result[code].part1[qNum - 1] = ansVal;
      }
    }
    return result;
  }

  return result;
}

/**
 * Phân tích chuỗi Text hoặc CSV (hỗ trợ Zalo, Email, copy-paste)
 */
function parseTextAnswerKey(rawText) {
  const result = {};
  if (!rawText || typeof rawText !== 'string') return result;

  // 1. Thử giải mã JSON nếu file là JSON
  try {
    const json = JSON.parse(rawText);
    if (json.answerKeysByCode) return json.answerKeysByCode;
    if (typeof json === 'object' && Object.keys(json).length > 0) {
      const firstVal = Object.values(json)[0];
      if (firstVal && (firstVal.part1 || Array.isArray(firstVal))) {
        return json;
      }
    }
  } catch (e) { }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return result;

  // 2. Thử phân tích dạng CSV / TSV bảng
  if (lines.length > 1 && (lines[0].includes(',') || lines[0].includes('\t') || lines[0].includes(';'))) {
    const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const matrix2D = lines.map(line => line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
    const parsedMatrix = parseMatrix2DToKeys(matrix2D);
    if (Object.keys(parsedMatrix).length > 0) {
      return parsedMatrix;
    }
  }

  // 3. Phân tích văn bản tự do (Dạng phổ biến giáo viên nhắn Zalo/Email)
  // Ví dụ:
  // "Mã đề 101: 1A 2B 3C 4D 5A 6B..."
  // "[101] 1.A 2.B 3.C..."
  // "Phần II: Câu 1: a-Đ, b-S..."
  let currentCode = '101';
  let isPart2Context = false;

  lines.forEach(line => {
    // Tìm mã đề mới trên dòng
    const codeMatch = line.match(/(?:mã đề|mã|code|đề|\[)\s*([0-9]{3,4})/i);
    if (codeMatch) {
      currentCode = codeMatch[1];
      isPart2Context = false;
      if (!result[currentCode]) result[currentCode] = { part1: [], part2: {}, part3: {} };
    }

    if (!result[currentCode]) result[currentCode] = { part1: [], part2: {}, part3: {} };

    // Kiểm tra ngữ cảnh Phần II
    if (/phần\s*ii\b|đúng[\s\/\-]sai/i.test(line)) {
      isPart2Context = true;
    } else if (/phần\s*i\b|trắc\s*nghiệm/i.test(line)) {
      isPart2Context = false;
    }

    // 3.1. Tìm Đúng/Sai: VD "1a: Đ 1b: S" hoặc "Câu 1: a-Đ, b-S, c-Đ, d-S"
    const tfSubPairs = [...line.matchAll(/([0-9]{1,2})\s*([a-d])\s*[\.:\-_=\s]\s*([ĐDSđdsTFtf])/gi)];
    if (tfSubPairs.length > 0) {
      tfSubPairs.forEach(p => {
        const qNum = p[1];
        const sub = p[2].toLowerCase();
        const val = /^[sStTfF]/i.test(p[3]) && !/^[tT]/i.test(p[3]) ? 'S' : (p[3].toUpperCase() === 'S' ? 'S' : 'Đ');
        if (!result[currentCode].part2[qNum]) result[currentCode].part2[qNum] = {};
        result[currentCode].part2[qNum][sub] = val;
      });
    } else if (isPart2Context) {
      // Dạng "Câu 1: a: Đ, b: S..."
      const mainQMatch = line.match(/(?:câu|bài)\s*([0-9]{1,2})/i);
      if (mainQMatch) {
        const qNum = mainQMatch[1];
        const subs = [...line.matchAll(/([a-d])\s*[\.:\-_=\s]\s*([ĐDSđdsTFtf])/gi)];
        if (subs.length > 0) {
          if (!result[currentCode].part2[qNum]) result[currentCode].part2[qNum] = {};
          subs.forEach(s => {
            const sub = s[1].toLowerCase();
            const val = (s[2].toUpperCase() === 'S' || s[2].toUpperCase() === 'F') ? 'S' : 'Đ';
            result[currentCode].part2[qNum][sub] = val;
          });
        }
      }
    }

    // 3.2. Tìm Trắc nghiệm Phần I: 1A, 2.B, 3-C, 4: D, 5A, 6B
    if (!isPart2Context) {
      const pairs = [...line.matchAll(/([0-9]{1,2})\s*[\.:\-_]?\s*([A-D])\b/gi)];
      pairs.forEach(p => {
        const qNum = parseInt(p[1], 10);
        const opt = p[2].toUpperCase();
        result[currentCode].part1[qNum - 1] = opt;
      });
    }
  });

  // Điền giá trị rỗng cho các vị trí còn thiếu trong part1
  for (const code of Object.keys(result)) {
    const p1 = result[code].part1;
    for (let i = 0; i < p1.length; i++) {
      if (!p1[i]) p1[i] = 'A';
    }
  }

  return result;
}

/**
 * Phân tích tổng quát mọi loại file tải lên
 */
function parseAnyAnswerKeyFile(filename, buffer) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsxBuffer(buffer);
  }

  const textContent = buffer.toString('utf8');
  return parseTextAnswerKey(textContent);
}

/**
 * Trích xuất ma trận 2D từ Buffer .xlsx (dùng chung cho cả Đáp án và Danh sách học sinh)
 */
function extractMatrix2DFromXlsxBuffer(buffer) {
  const zip = readZipEntries(buffer);
  let sharedStringsXml = '';
  let sheet1Xml = '';

  for (const [name, buf] of zip.entries()) {
    if (name.toLowerCase().endsWith('sharedstrings.xml')) {
      sharedStringsXml = buf.toString('utf8');
    } else if (name.toLowerCase().includes('sheet1.xml') || name.toLowerCase().includes('sheet.xml')) {
      sheet1Xml = buf.toString('utf8');
    }
  }

  const sharedStrings = parseXlsxSharedStrings(sharedStringsXml);
  const rows = parseXlsxSheetRows(sheet1Xml, sharedStrings);
  if (rows.length === 0) return [];

  const matrix2D = [];
  rows.forEach(r => {
    const rowArr = [];
    for (const [colLetters, val] of Object.entries(r.cells)) {
      const colIdx = colLettersToIndex(colLetters);
      rowArr[colIdx] = val;
    }
    matrix2D.push(rowArr);
  });
  return matrix2D;
}

/**
 * Chuyển đổi ma trận 2D thành Danh sách học sinh chuẩn:
 * [{ sbd: '120001', fullName: 'Nguyễn Văn An', className: '12A1', dob: '15/03/2008' }, ...]
 */
function parseMatrix2DToRoster(matrix2D) {
  const roster = [];
  if (!Array.isArray(matrix2D) || matrix2D.length === 0) return roster;

  let headerRowIdx = -1;
  let colSbd = -1;
  let colFullName = -1;
  let colFirstName = -1;
  let colLastName = -1;
  let colClass = -1;
  let colDob = -1;

  // Tìm dòng tiêu đề trong 6 dòng đầu
  for (let r = 0; r < Math.min(6, matrix2D.length); r++) {
    const row = matrix2D[r] || [];
    let sbdIdx = -1, nameIdx = -1, lastIdx = -1, firstIdx = -1, clsIdx = -1, dobIdx = -1;

    row.forEach((cell, cIdx) => {
      const s = String(cell || '').trim().toLowerCase();
      if (!s) return;
      if (s === 'sbd' || s.includes('số báo danh') || s.includes('mã hs') || s.includes('mã học sinh') || s.includes('mã định danh') || s.includes('mã thí sinh')) {
        sbdIdx = cIdx;
      } else if (s.includes('họ và tên') || s.includes('họ tên') || s === 'tên học sinh' || s === 'thí sinh' || s === 'fullname' || s === 'full name') {
        nameIdx = cIdx;
      } else if (s === 'họ' || s.includes('họ đệm') || s.includes('họ và chữ lót')) {
        lastIdx = cIdx;
      } else if (s === 'tên' || s === 'first name') {
        firstIdx = cIdx;
      } else if (s === 'lớp' || s.includes('tên lớp') || s === 'class') {
        clsIdx = cIdx;
      } else if (s.includes('ngày sinh') || s.includes('năm sinh') || s === 'dob' || s.includes('birth')) {
        dobIdx = cIdx;
      }
    });

    if (sbdIdx !== -1 || nameIdx !== -1 || (lastIdx !== -1 && firstIdx !== -1)) {
      headerRowIdx = r;
      colSbd = sbdIdx;
      colFullName = nameIdx;
      colLastName = lastIdx;
      colFirstName = firstIdx;
      colClass = clsIdx;
      colDob = dobIdx;
      break;
    }
  }

  const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

  for (let r = startRow; r < matrix2D.length; r++) {
    const row = (matrix2D[r] || []).map(c => String(c || '').trim());
    if (row.every(c => !c)) continue;

    let sbd = '';
    let fullName = '';
    let className = '';
    let dob = '';

    if (headerRowIdx !== -1) {
      if (colSbd !== -1) sbd = row[colSbd] || '';
      if (colFullName !== -1) {
        fullName = row[colFullName] || '';
      } else if (colLastName !== -1 && colFirstName !== -1) {
        fullName = `${row[colLastName] || ''} ${row[colFirstName] || ''}`.trim();
      } else if (colFirstName !== -1) {
        fullName = row[colFirstName] || '';
      }
      if (colClass !== -1) className = row[colClass] || '';
      if (colDob !== -1) dob = row[colDob] || '';
    } else {
      // Tự động suy luận cột nếu không có dòng tiêu đề
      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (!val) continue;
        if (!sbd && /^[0-9]{4,8}$/.test(val)) {
          sbd = val;
        } else if (!dob && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(val)) {
          dob = val;
        } else if (!className && /^[0-9]{1,2}[A-Za-z\/][0-9A-Za-z]*$/.test(val) && val.length <= 7) {
          className = val;
        } else if (!fullName && /[a-zA-ZÀ-ỹ]/.test(val) && val.includes(' ') && !/^\d/.test(val)) {
          fullName = val;
        }
      }
      // Nếu vẫn chưa tìm thấy tên nhưng có cột chữ
      if (!fullName) {
        const textCells = row.filter(c => /[a-zA-ZÀ-ỹ]{2,}/.test(c) && c !== className);
        if (textCells.length >= 2 && !textCells[0].includes(' ')) {
          fullName = `${textCells[0]} ${textCells[1]}`.trim();
        } else if (textCells.length >= 1) {
          fullName = textCells[0];
        }
      }
    }

    // Bỏ qua dòng tiêu đề lặp lại hoặc dòng trống không có tên
    if (!fullName || /^(họ và tên|họ tên|stt|số báo danh)$/i.test(fullName)) continue;

    // Chuẩn hóa SBD (nếu chưa có SBD thì tự đánh SBD 6 số từ 120001)
    const cleanSbdDigits = sbd.replace(/[^0-9]/g, '');
    if (cleanSbdDigits) {
      sbd = cleanSbdDigits.length < 6 ? cleanSbdDigits.padStart(6, '0') : cleanSbdDigits;
    } else {
      sbd = String(120001 + roster.length);
    }

    roster.push({
      sbd,
      fullName: fullName.replace(/\s+/g, ' ').trim(),
      className: className || '12A1',
      dob: dob || '01/01/2008'
    });
  }

  return roster;
}

/**
 * Phân tích Danh sách học sinh từ chuỗi văn bản (CSV, TSV, Copy-Paste từ Excel/Word)
 */
function parseStudentRosterText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.roster)) return parsed.roster;
  } catch (_) { }

  const lines = rawText.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Chuyển từng dòng thành mảng cột (tách theo Tab, dấu chấm phẩy, dấu phẩy hoặc gạch ngang)
  const matrix2D = lines.map(line => {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    if (line.includes(';')) {
      return line.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    if (line.includes(',')) {
      return line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    }
    if (line.includes('|')) {
      return line.split('|').map(c => c.trim());
    }
    // Dạng tự do: "120001 - Nguyễn Văn An - 12A1 - 15/03/2008"
    if (line.includes(' - ')) {
      return line.split(' - ').map(c => c.trim());
    }
    // Dạng "120001 Nguyễn Văn An 12A1"
    const m = line.match(/^([0-9]{4,8})\s+(.+?)(?:\s+([0-9]{1,2}[A-Za-z][0-9A-Za-z]*))?(?:\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}))?$/);
    if (m) {
      return [m[1], m[2], m[3] || '', m[4] || ''];
    }
    return [line];
  });

  return parseMatrix2DToRoster(matrix2D);
}

/**
 * Phân tích file Danh sách học sinh (.xlsx, .csv, .txt, .json)
 */
function parseStudentRosterFile(filename, buffer) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const matrix2D = extractMatrix2DFromXlsxBuffer(buffer);
    return parseMatrix2DToRoster(matrix2D);
  }
  const textContent = buffer.toString('utf8');
  return parseStudentRosterText(textContent);
}

module.exports = {
  parseXlsxBuffer,
  parseTextAnswerKey,
  parseAnyAnswerKeyFile,
  parseMatrix2DToKeys,
  parseMatrix2DToRoster,
  parseStudentRosterText,
  parseStudentRosterFile
};

