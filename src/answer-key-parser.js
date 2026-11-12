/**
 * src/answer-key-parser.js
 * Mô-đun phân tích và chuẩn hóa Biểu đáp án nạp từ bên ngoài:
 * - Hỗ trợ File Excel (.xlsx, .xls) không cần thư viện ngoài (sử dụng readZipEntries)
 * - Hỗ trợ File CSV / TSV (.csv, .tsv) từ TnMaker, Google Sheets, Azota
 * - Hỗ trợ File Word (.docx) & File Văn bản (.txt) từ McMIX, SmartTest, QM Test
 * - Hỗ trợ Chuỗi text copy từ Zalo, Email, Messenger (1A 2B 3C...)
 * - Hỗ trợ đầy đủ 3 Phần chuẩn Bộ GD&ĐT 2025:
 *   + Phần I: Trắc nghiệm 4 lựa chọn (A, B, C, D)
 *   + Phần II: Trắc nghiệm Đúng/Sai (Đ/S, a/b/c/d)
 *   + Phần III: Trả lời ngắn (điền số thực/nguyên/phân số)
 */

const { readZipEntries, parseDocxBuffer } = require('./zip-docx');

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

  // 1. Kiểm tra Dạng A: Hàng chứa các Mã đề (quét tối đa 10 hàng đầu để bỏ qua tiêu đề trường/kỳ thi)
  // Ví dụ: ['Câu', '101', '102', '103', '104'] hoặc ['STT', 'Mã 101', 'Mã 102'...]
  let headerRowIdx = -1;
  const codeCols = [];

  for (let i = 0; i < Math.min(10, matrix2D.length); i++) {
    const row = matrix2D[i] || [];
    const foundCodes = [];
    row.forEach((cell, cIdx) => {
      const str = String(cell || '').trim();
      const m = str.match(/(?:mã|đề|md)?\s*([0-9]{3,4})\b/i);
      if (m && m[1].length >= 3 && cIdx >= 1) {
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

    let currentSection = 'part1'; // 'part1', 'part2', 'part3'

    for (let r = headerRowIdx + 1; r < matrix2D.length; r++) {
      const row = matrix2D[r] || [];
      const firstCell = String(row[0] || '').trim();
      const secondCell = String(row[1] || '').trim();
      const rowFullStr = row.map(c => String(c || '')).join(' ').toLowerCase();

      // Bỏ qua dòng hoàn toàn rỗng
      if (!firstCell && row.every(c => !String(c || '').trim())) continue;

      // Nhận diện dòng chuyển phân đoạn đề thi (Phần I, Phần II, Phần III)
      if (firstCell.startsWith('#') || firstCell.startsWith('//') ||
        /phần\s*(?:iii|3)\b|trả\s*lời\s*ngắn/i.test(rowFullStr) ||
        /phần\s*(?:ii|2)\b|đúng[\s\/\-]sai/i.test(rowFullStr) ||
        /phần\s*(?:i|1)\b|trắc\s*nghiệm/i.test(rowFullStr)) {
        if (/phần\s*(?:iii|3)\b|trả\s*lời\s*ngắn/i.test(rowFullStr)) {
          currentSection = 'part3';
        } else if (/phần\s*(?:ii|2)\b|đúng[\s\/\-]sai/i.test(rowFullStr)) {
          currentSection = 'part2';
        } else if (/phần\s*(?:i|1)\b|trắc\s*nghiệm/i.test(rowFullStr)) {
          currentSection = 'part1';
        }
        continue;
      }

      // Cột phụ (a, b, c, d) chỉ tồn tại nếu có cột riêng trước cột mã đề đầu tiên
      const hasSeparateSubCol = codeCols[0].colIdx >= 2 && /^[a-d]$/i.test(secondCell);
      const subMatch = firstCell.match(/([0-9]{1,2})\s*([a-d])\b/i) ||
        (hasSeparateSubCol && /^[0-9]{1,2}$/.test(firstCell) ? [null, firstCell, secondCell] : null);

      if (subMatch) {
        // PHẦN II: CÂU HỎI ĐÚNG / SAI
        const mainQ = parseInt(subMatch[1], 10);
        const subQ = subMatch[2].toLowerCase();

        codeCols.forEach(cc => {
          const rawVal = String(row[cc.colIdx] || '').trim();
          if (!rawVal) return;
          const vUp = rawVal.toUpperCase();
          const tfVal = (vUp === 'S' || vUp === 'F' || vUp === 'SAI' || vUp === 'FALSE' || vUp.startsWith('S') || vUp.startsWith('F')) ? 'S' : 'Đ';
          if (!result[cc.code].part2[mainQ]) result[cc.code].part2[mainQ] = {};
          result[cc.code].part2[mainQ][subQ] = tfVal;
        });
      } else if (currentSection === 'part3' || /^(?:p3|iii)[_\s\.\-]?([1-6])\b/i.test(firstCell)) {
        // PHẦN III: TRẢ LỜI NGẮN (ĐIỀN SỐ NGUYÊN / THẬP PHÂN / PHÂN SỐ)
        const p3Match = firstCell.match(/([1-6])/);
        if (p3Match) {
          const qNum = parseInt(p3Match[1], 10);
          codeCols.forEach(cc => {
            const rawVal = String(row[cc.colIdx] || '').trim().replace(',', '.');
            if (rawVal) {
              result[cc.code].part3[qNum] = rawVal;
            }
          });
        }
      } else {
        // PHẦN I: TRẮC NGHIỆM 4 LỰA CHỌN (A, B, C, D)
        const qMatch = firstCell.match(/([0-9]{1,2})/);
        const qNum = qMatch ? parseInt(qMatch[1], 10) : (r - headerRowIdx);

        codeCols.forEach(cc => {
          let val = String(row[cc.colIdx] || '').trim().toUpperCase();
          if (!val) return;
          // Chuẩn hóa 1->A, 2->B, 3->C, 4->D nếu phần mềm khác xuất dạng số
          if (val === '1') val = 'A';
          else if (val === '2') val = 'B';
          else if (val === '3') val = 'C';
          else if (val === '4') val = 'D';

          if (['A', 'B', 'C', 'D'].includes(val)) {
            result[cc.code].part1[qNum - 1] = val;
          } else if (val.includes('Đ') || val.includes('S') || /^[T|F|D|S]/i.test(val)) {
            // Trường hợp file không có phân đoạn nhưng dòng có chứa Đ/S
            const tfVal = (val.includes('S') || val === 'F') ? 'S' : 'Đ';
            const m = firstCell.match(/([0-9]{1,2})\s*([a-d])/i);
            if (m) {
              const mainQ = m[1];
              const subQ = m[2].toLowerCase();
              if (!result[cc.code].part2[mainQ]) result[cc.code].part2[mainQ] = {};
              result[cc.code].part2[mainQ][subQ] = tfVal;
            }
          }
        });
      }
    }

    return result;
  }

  // 2. Kiểm tra Dạng B: Bảng dọc [Mã đề, Câu/Ý, Đáp án]
  let colCode = -1, colQ = -1, colAns = -1, colPart = -1;
  const header = matrix2D[0] || [];
  header.forEach((h, idx) => {
    const s = String(h || '').toLowerCase();
    if (s.includes('mã') || s.includes('code') || s.includes('đề')) colCode = idx;
    if (s.includes('phần') || s.includes('part')) colPart = idx;
    if (s.includes('câu') || s.includes('question') || s.includes('stt')) colQ = idx;
    if (s.includes('đáp') || s.includes('ans') || s.includes('chọn') || s.includes('key')) colAns = idx;
  });

  if (colCode !== -1 && colAns !== -1) {
    for (let r = 1; r < matrix2D.length; r++) {
      const row = matrix2D[r] || [];
      const codeMatch = String(row[colCode] || '').match(/([0-9]{3,4})/);
      if (!codeMatch) continue;
      const code = codeMatch[1];
      if (!result[code]) result[code] = { part1: [], part2: {}, part3: {} };

      const qCell = String(row[colQ !== -1 ? colQ : 1] || '').trim();
      const partCell = colPart !== -1 ? String(row[colPart] || '').toLowerCase() : '';
      const ansVal = String(row[colAns] || '').trim();

      const subMatch = qCell.match(/([0-9]{1,2})\s*([a-d])/i);
      if (subMatch || partCell.includes('ii') || partCell.includes('đúng')) {
        // Phần II
        const mainQ = subMatch ? subMatch[1] : (qCell.match(/([0-9]{1,2})/)?.[1] || '1');
        const subQ = subMatch ? subMatch[2].toLowerCase() : (qCell.match(/([a-d])/i)?.[1]?.toLowerCase() || 'a');
        const vUp = ansVal.toUpperCase();
        const tfVal = (vUp === 'S' || vUp === 'F' || vUp === 'SAI') ? 'S' : 'Đ';
        if (!result[code].part2[mainQ]) result[code].part2[mainQ] = {};
        result[code].part2[mainQ][subQ] = tfVal;
      } else if (partCell.includes('iii') || partCell.includes('ngắn')) {
        // Phần III
        const qNum = parseInt(qCell.match(/([1-6])/)?.[1] || '1', 10);
        result[code].part3[qNum] = ansVal.replace(',', '.');
      } else {
        // Phần I
        const qNum = parseInt(qCell.match(/([0-9]{1,2})/)?.[1] || (result[code].part1.length + 1), 10);
        let opt = ansVal.toUpperCase();
        if (opt === '1') opt = 'A';
        else if (opt === '2') opt = 'B';
        else if (opt === '3') opt = 'C';
        else if (opt === '4') opt = 'D';

        if (['A', 'B', 'C', 'D'].includes(opt)) {
          result[code].part1[qNum - 1] = opt;
        }
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

  // 3. Phân tích văn bản tự do (Dạng phổ biến giáo viên nhắn Zalo/Email hoặc xuất TXT từ McMIX, TnMaker)
  let currentCode = '101';
  let isPart2Context = false;
  let isPart3Context = false;

  lines.forEach(line => {
    // 3.0. Tìm mã đề mới trên dòng (Hỗ trợ: "Mã đề 101", "Mã 101", "Đề 101", "[101]", "DE: 101", "MD101")
    const codeMatch = line.match(/(?:mã đề|mã|code|đề|de|md|\[)\s*:?\s*([0-9]{3,4})/i) || line.match(/^\[([0-9]{3,4})\]/);
    if (codeMatch) {
      currentCode = codeMatch[1];
      isPart2Context = false;
      isPart3Context = false;
      if (!result[currentCode]) result[currentCode] = { part1: [], part2: {}, part3: {} };
    }

    if (!result[currentCode]) result[currentCode] = { part1: [], part2: {}, part3: {} };

    // Kiểm tra chuyển phân đoạn Phần I, II, III
    if (/phần\s*iii\b|trả\s*lời\s*ngắn|\biii\b/i.test(line)) {
      isPart3Context = true;
      isPart2Context = false;
      return;
    } else if (/phần\s*ii\b|đúng[\s\/\-]sai|\bii\b/i.test(line)) {
      isPart2Context = true;
      isPart3Context = false;
      return;
    } else if (/phần\s*i\b|trắc\s*nghiệm|\bi\b/i.test(line)) {
      isPart2Context = false;
      isPart3Context = false;
      return;
    }

    // 3.1. Tìm Phần III (Trả lời ngắn: Điền số nguyên, thập phân, âm, phân số)
    if (isPart3Context) {
      const saPairs = [...line.matchAll(/(?:câu\s*)?([1-6])\s*[\.:\-_=\s]\s*([+\-]?[0-9]+(?:[\.,][0-9]+)?(?:\/[0-9]+)?)/gi)];
      if (saPairs.length > 0) {
        saPairs.forEach(p => {
          const qNum = parseInt(p[1], 10);
          const val = p[2].replace(',', '.');
          result[currentCode].part3[qNum] = val;
        });
      } else {
        // Dạng dòng đơn: "Câu 1: 15.5" hoặc "1. 3.25"
        const singleSa = line.match(/^(?:câu\s*)?([1-6])\s*[\.:\-_=\s]\s*(.+)$/i);
        if (singleSa) {
          const qNum = parseInt(singleSa[1], 10);
          const val = singleSa[2].trim().replace(',', '.');
          if (val) result[currentCode].part3[qNum] = val;
        }
      }
      return;
    }

    // 3.2. Tìm Phần II (Đúng/Sai): VD "1a: Đ 1b: S" hoặc "Câu 1: a-Đ, b-S, c-Đ, d-S"
    const tfSubPairs = [...line.matchAll(/([0-9]{1,2})\s*([a-d])\s*[\.:\-_=\s]\s*([ĐDSđdsTFtf]|đúng|sai|true|false)/gi)];
    if (tfSubPairs.length > 0) {
      tfSubPairs.forEach(p => {
        const qNum = p[1];
        const sub = p[2].toLowerCase();
        const rawV = p[3].toUpperCase();
        const val = (rawV === 'S' || rawV === 'F' || rawV === 'SAI' || rawV === 'FALSE') ? 'S' : 'Đ';
        if (!result[currentCode].part2[qNum]) result[currentCode].part2[qNum] = {};
        result[currentCode].part2[qNum][sub] = val;
      });
      return; // Dòng này là phân đoạn Đúng/Sai, không quét Trắc nghiệm Phần I
    } else if (isPart2Context) {
      // Dạng "Câu 1: a: Đ, b: S..."
      const mainQMatch = line.match(/(?:câu|bài)\s*([0-9]{1,2})/i);
      if (mainQMatch) {
        const qNum = mainQMatch[1];
        const subs = [...line.matchAll(/([a-d])\s*[\.:\-_=\s]\s*([ĐDSđdsTFtf]|đúng|sai|true|false)/gi)];
        if (subs.length > 0) {
          if (!result[currentCode].part2[qNum]) result[currentCode].part2[qNum] = {};
          subs.forEach(s => {
            const sub = s[1].toLowerCase();
            const rawV = s[2].toUpperCase();
            const val = (rawV === 'S' || rawV === 'F' || rawV === 'SAI' || rawV === 'FALSE') ? 'S' : 'Đ';
            result[currentCode].part2[qNum][sub] = val;
          });
        }
      }
      return;
    }

    // 3.3. Tìm Trắc nghiệm Phần I: 1A, 2.B, 3-C, 4: D, 5A, 6B (McMIX, TnMaker, SmartTest)
    if (!isPart2Context && !isPart3Context) {
      const pairs = [...line.matchAll(/([0-9]{1,2})\s*[\.:\-_]?\s*([A-D])\b/gi)];
      pairs.forEach(p => {
        const qNum = parseInt(p[1], 10);
        const opt = p[2].toUpperCase();
        result[currentCode].part1[qNum - 1] = opt;
      });
    }
  });

  // Điền giá trị rỗng cho các vị trí còn thiếu trong part1 nếu cần
  for (const code of Object.keys(result)) {
    const p1 = result[code].part1;
    for (let i = 0; i < p1.length; i++) {
      if (!p1[i]) p1[i] = 'A';
    }
  }

  return result;
}

/**
 * Phân tích tổng quát mọi loại file tải lên:
 * - Hỗ trợ Excel (.xlsx, .xls)
 * - Hỗ trợ Word (.docx) chứa Bảng biểu hoặc văn bản từ McMIX, SmartTest
 * - Hỗ trợ File Text (.csv, .tsv, .txt, .json) từ TnMaker, QM Test
 */
function parseAnyAnswerKeyFile(filename, buffer) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsxBuffer(buffer);
  }

  if (ext === 'docx') {
    try {
      const docxData = parseDocxBuffer(buffer);
      // 1. Nếu có bảng trong Word (rất phổ biến cho bảng đáp án McMIX, SmartTest)
      if (docxData.tables && docxData.tables.length > 0) {
        for (const tbl of docxData.tables) {
          const matrix2D = tbl.map(row => row.map(cell => (cell || '').trim()));
          const keys = parseMatrix2DToKeys(matrix2D);
          if (Object.keys(keys).length > 0) return keys;
        }
      }
      // 2. Nếu là văn bản dạng text trong Word
      if (docxData.lines && docxData.lines.length > 0) {
        const textContent = docxData.lines.join('\n');
        const keys = parseTextAnswerKey(textContent);
        if (Object.keys(keys).length > 0) return keys;
      }
    } catch (err) {
      console.warn('Lỗi phân tích file Word .docx, fallback đọc UTF-8 text:', err);
    }
  }

  const textContent = buffer.toString('utf8');
  return parseTextAnswerKey(textContent);
}

/**
 * Tạo chuỗi mẫu CSV biểu đáp án chuẩn Bộ GD&ĐT 2025 (3 phần)
 * để giáo viên tải về máy điền hoặc lưu trữ
 */
function generateSampleAnswerKeyCsv() {
  const lines = [
    'Câu,101,102,103,104',
    '# PHẦN I: TRẮC NGHIỆM 4 LỰA CHỌN (A/B/C/D),,,,',
  ];
  const mcqPattern = ['A', 'B', 'C', 'D'];
  for (let i = 1; i <= 18; i++) {
    lines.push(`${i},${mcqPattern[(i - 1) % 4]},${mcqPattern[i % 4]},${mcqPattern[(i + 1) % 4]},${mcqPattern[(i + 2) % 4]}`);
  }
  lines.push('# PHẦN II: CÂU HỎI ĐÚNG / SAI (Đ/S),,,,');
  const subs = ['a', 'b', 'c', 'd'];
  for (let q = 1; q <= 4; q++) {
    subs.forEach((s, sIdx) => {
      const v1 = (q + sIdx) % 2 === 0 ? 'Đ' : 'S';
      const v2 = (q + sIdx + 1) % 2 === 0 ? 'Đ' : 'S';
      lines.push(`${q}${s},${v1},${v2},${v1},${v2}`);
    });
  }
  lines.push('# PHẦN III: CÂU HỎI TRẢ LỜI NGẮN (ĐIỀN SỐ),,,,');
  const sampleP3 = ['12.5', '-3', '0.25', '100', '4.5', '2025'];
  for (let q = 1; q <= 6; q++) {
    lines.push(`${q},${sampleP3[q - 1]},${sampleP3[q % 6]},${sampleP3[(q + 1) % 6]},${sampleP3[(q + 2) % 6]}`);
  }
  return lines.join('\n');
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
  parseStudentRosterFile,
  generateSampleAnswerKeyCsv
};

