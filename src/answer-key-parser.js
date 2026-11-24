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
 * Giải mã các ký tự XML/HTML cơ bản (bao gồm ký tự số)
 */
function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function indexToColLetters(idx) {
  let n = idx;
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

/**
 * Phân tích sheet XML của file .xlsx thành ma trận hàng/cột
 * Hỗ trợ đầy đủ: thứ tự thuộc tính bất kỳ (t="..." trước/sau r="..."),
 * thẻ tự đóng <c r="A5"/> không nuốt <v> của ô kế tiếp, và kiểu inlineStr (<is><t>).
 */
function parseXlsxSheetRows(xmlStr, sharedStrings) {
  const rows = [];
  if (!xmlStr) return rows;

  const rowRegex = /<row\b([^>]*)>([\s\S]*?)<\/row>/gi;
  let rowMatch;
  let fallbackRowIdx = 0;

  while ((rowMatch = rowRegex.exec(xmlStr)) !== null) {
    fallbackRowIdx += 1;
    const rowAttrs = rowMatch[1] || '';
    const rAttrMatch = rowAttrs.match(/\br\s*=\s*"(\d+)"/i);
    const rowIdx = rAttrMatch ? parseInt(rAttrMatch[1], 10) : fallbackRowIdx;
    const rowContent = rowMatch[2];
    const cellMap = {};

    const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/gi;
    let cMatch;
    let autoColIdx = 0;

    while ((cMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cMatch[1] || '';
      const inner = cMatch[2]; // undefined nếu là thẻ tự đóng <c .../>

      const refMatch = attrs.match(/\br\s*=\s*"([A-Z]+)\d+"/i);
      const colLetters = refMatch ? refMatch[1].toUpperCase() : indexToColLetters(autoColIdx);
      autoColIdx = refMatch ? (colLettersToIndex(colLetters) + 1) : (autoColIdx + 1);

      if (inner === undefined) {
        cellMap[colLetters] = '';
        continue;
      }

      const typeMatch = attrs.match(/\bt\s*=\s*"([^"]+)"/i);
      const type = typeMatch ? typeMatch[1] : '';

      let val = '';
      if (type === 'inlineStr' || /<is\b/i.test(inner)) {
        const isBlockMatch = inner.match(/<is\b[^>]*>([\s\S]*?)<\/is>/i);
        const searchArea = isBlockMatch ? isBlockMatch[1] : inner;
        const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
        let tMatch;
        let combined = '';
        while ((tMatch = tRegex.exec(searchArea)) !== null) {
          combined += tMatch[1];
        }
        val = decodeXmlEntities(combined);
      } else {
        const vMatch = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
        if (vMatch) {
          const rawVal = vMatch[1];
          if (type === 's') {
            const sIdx = parseInt(rawVal, 10);
            val = sharedStrings[sIdx] !== undefined ? sharedStrings[sIdx] : '';
          } else {
            val = decodeXmlEntities(rawVal);
          }
        }
      }

      cellMap[colLetters] = String(val || '').trim();
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

function isOle2BinaryXls(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 8 &&
    buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
}

function isZipArchive(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length >= 4 &&
    buffer[0] === 0x50 && buffer[1] === 0x4B;
}

function parseHtmlTablesToMatrices(htmlStr) {
  const tables = [];
  if (!htmlStr || !/<table\b/i.test(htmlStr)) return tables;
  const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tMatch;
  while ((tMatch = tableRegex.exec(htmlStr)) !== null) {
    const matrix = [];
    const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    while ((trMatch = trRegex.exec(tMatch[1])) !== null) {
      const row = [];
      const tdRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let tdMatch;
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        const clean = decodeXmlEntities(tdMatch[1].replace(/<[^>]+>/g, ' '))
          .replace(/\s+/g, ' ')
          .trim();
        row.push(clean);
      }
      if (row.some(Boolean)) matrix.push(row);
    }
    if (matrix.length > 0) tables.push(matrix);
  }
  return tables;
}

function parseSpreadsheetMlToMatrices(xmlStr) {
  const matrices = [];
  if (!xmlStr || !/<(?:ss:)?Row\b/i.test(xmlStr)) return matrices;
  const wsBlocks = xmlStr.match(/<(?:ss:)?Worksheet\b[\s\S]*?<\/(?:ss:)?Worksheet>/gi) || [xmlStr];
  for (const ws of wsBlocks) {
    const matrix = [];
    const rowRegex = /<(?:ss:)?Row\b[^>]*>([\s\S]*?)<\/(?:ss:)?Row>/gi;
    let rMatch;
    while ((rMatch = rowRegex.exec(ws)) !== null) {
      const row = [];
      let colIdx = 0;
      const cellRegex = /<(?:ss:)?Cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:ss:)?Cell>)/gi;
      let cMatch;
      while ((cMatch = cellRegex.exec(rMatch[1])) !== null) {
        const idxAttr = (cMatch[1] || '').match(/(?:ss:)?Index\s*=\s*"(\d+)"/i);
        if (idxAttr) colIdx = parseInt(idxAttr[1], 10) - 1;
        const inner = cMatch[2] || '';
        const dataMatch = inner.match(/<(?:ss:)?Data\b[^>]*>([\s\S]*?)<\/(?:ss:)?Data>/i);
        const val = dataMatch ? decodeXmlEntities(dataMatch[1].replace(/<[^>]+>/g, '')).trim() : '';
        row[colIdx] = val;
        colIdx += 1;
      }
      if (row.some(Boolean)) matrix.push(row);
    }
    if (matrix.length > 0) matrices.push(matrix);
  }
  return matrices;
}

function rowsToMatrix2D(rows) {
  const matrix2D = [];
  rows.forEach(r => {
    const rowArr = [];
    for (const [colLetters, val] of Object.entries(r.cells || {})) {
      const colIdx = colLettersToIndex(colLetters);
      rowArr[colIdx] = val;
    }
    matrix2D.push(rowArr);
  });
  return matrix2D;
}

function extractAllSheetsFromXlsxBuffer(buffer) {
  if (isOle2BinaryXls(buffer)) {
    throw new Error('File Excel nhị phân cũ (.xls 97-2003) chưa hỗ trợ đọc trực tiếp. Vui lòng mở bằng Excel/Google Sheets rồi Chọn File -> Lưu thành (.xlsx) hoặc (.csv)!');
  }

  if (!isZipArchive(buffer)) {
    const rawStr = buffer.toString('utf8');
    if (/<table\b/i.test(rawStr)) {
      return parseHtmlTablesToMatrices(rawStr).map((m, idx) => ({ name: `html_table_${idx + 1}`, matrix2D: m }));
    }
    if (/<(?:ss:)?Worksheet\b/i.test(rawStr) || /<(?:ss:)?Row\b/i.test(rawStr)) {
      return parseSpreadsheetMlToMatrices(rawStr).map((m, idx) => ({ name: `xml_sheet_${idx + 1}`, matrix2D: m }));
    }
    return [];
  }

  const zip = readZipEntries(buffer);
  let sharedStringsXml = '';
  const sheetEntries = [];

  for (const [name, buf] of Object.entries(zip || {})) {
    const lower = name.toLowerCase();
    if (lower.endsWith('sharedstrings.xml')) {
      sharedStringsXml = buf.toString('utf8');
    } else if (/worksheets\/sheet\d*\.xml$/i.test(lower) || (!lower.includes('_rels') && lower.includes('sheet') && lower.endsWith('.xml'))) {
      const numMatch = lower.match(/sheet(\d+)\.xml$/i);
      const order = numMatch ? parseInt(numMatch[1], 10) : 999;
      sheetEntries.push({ name, order, xml: buf.toString('utf8') });
    }
  }

  sheetEntries.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const sharedStrings = parseXlsxSharedStrings(sharedStringsXml);

  return sheetEntries
    .map(entry => ({
      name: entry.name,
      matrix2D: rowsToMatrix2D(parseXlsxSheetRows(entry.xml, sharedStrings))
    }))
    .filter(s => s.matrix2D.length > 0);
}

function mergeAnswerKeyMaps(target, incoming) {
  for (const [code, src] of Object.entries(incoming || {})) {
    if (!src) continue;
    if (!target[code]) {
      target[code] = { part1: [], part2: {}, part3: {} };
    }
    const dst = target[code];
    if (Array.isArray(src.part1)) {
      src.part1.forEach((ans, idx) => {
        if (ans && !dst.part1[idx]) dst.part1[idx] = ans;
      });
    }
    if (src.part2 && typeof src.part2 === 'object') {
      for (const [qNum, subs] of Object.entries(src.part2)) {
        if (!dst.part2[qNum]) dst.part2[qNum] = {};
        for (const [sub, tf] of Object.entries(subs || {})) {
          if (tf && !dst.part2[qNum][sub]) dst.part2[qNum][sub] = tf;
        }
      }
    }
    if (src.part3 && typeof src.part3 === 'object') {
      for (const [qNum, val] of Object.entries(src.part3)) {
        if (val !== undefined && val !== '' && !dst.part3[qNum]) {
          dst.part3[qNum] = val;
        }
      }
    }
  }
  return target;
}

function pruneAndNormalizeAnswerKeys(keysMap) {
  const clean = {};
  for (const [code, data] of Object.entries(keysMap || {})) {
    if (!data) continue;
    const p1 = Array.isArray(data.part1) ? data.part1.map(v => v || '') : [];
    const p2 = (data.part2 && typeof data.part2 === 'object') ? data.part2 : {};
    const p3 = (data.part3 && typeof data.part3 === 'object') ? data.part3 : {};
    const hasP1 = p1.some(Boolean);
    const hasP2 = Object.values(p2).some(subs => subs && Object.keys(subs).length > 0);
    const hasP3 = Object.keys(p3).length > 0;
    if (hasP1 || hasP2 || hasP3) {
      clean[code] = { part1: p1, part2: p2, part3: p3 };
    }
  }
  return clean;
}

/**
 * Phân tích file Buffer .xlsx thành cấu trúc AnswerKeysByCode
 */
function parseXlsxBuffer(buffer) {
  const sheets = extractAllSheetsFromXlsxBuffer(buffer);
  const merged = {};
  for (const sheet of sheets) {
    const keys = parseMatrix2DToKeys(sheet.matrix2D);
    mergeAnswerKeyMaps(merged, keys);
  }
  if (Object.keys(merged).length === 0 && !isZipArchive(buffer)) {
    return parseTextAnswerKey(buffer.toString('utf8'));
  }
  return pruneAndNormalizeAnswerKeys(merged);
}

function normalizeTfAnswerToken(rawVal) {
  const vUp = String(rawVal || '').trim().toUpperCase();
  if (!vUp) return '';
  if (/^(?:S|F|SAI|FALSE|0)(?:$|[\s.,;:)!?\-\/(])/.test(vUp)) return 'S';
  if (/^(?:Đ|D|T|ĐÚNG|DUNG|TRUE|1|X)(?:$|[\s.,;:)!?\-\/(])/.test(vUp)) return 'Đ';
  return '';
}

/**
 * Tách ô Đúng/Sai dạng gộp 4 ý trong 1 ô (chuẩn TNMaker 2025, McMIX, Azota, SmartTest):
 * VD: "ĐSĐS", "DSDS", "TFFT", "Đ-S-Đ-S", "Đ, S, Đ, S", "Đúng, Sai, Đúng, Sai", "a) Đ b) S c) Đ d) S", "a-Đ, b-S, c-Đ, d-S"
 */
function parseCompactTfCell(rawVal) {
  const s = String(rawVal || '').trim();
  if (!s || s.length < 4) return null;

  // 1. Dạng có nhãn a, b, c, d: "a) Đ b) S c) Đ d) S" hoặc "a-Đ, b-S, c-Đ, d-S"
  const labeled = [...s.matchAll(/\b([a-d])\s*[\)\.\-:\s]\s*(đúng|dung|sai|true|false|[đdstf])\b/gi)];
  if (labeled.length >= 2) {
    const out = {};
    labeled.forEach(m => {
      const val = normalizeTfAnswerToken(m[2]);
      if (val) out[m[1].toLowerCase()] = val;
    });
    if (Object.keys(out).length >= 2) return out;
  }

  // 2. Dạng 4 chữ cái viết liền không khoảng trắng: "ĐSĐS", "DSDS", "TFFT", "đsđs"
  const bare4 = s.toUpperCase().replace(/[\s\-_,;|\/]+/g, '');
  if (/^[ĐDSTF]{4}$/.test(bare4)) {
    const letters = ['a', 'b', 'c', 'd'];
    const out = {};
    for (let i = 0; i < 4; i++) {
      const ch = bare4[i];
      out[letters[i]] = (ch === 'S' || ch === 'F') ? 'S' : 'Đ';
    }
    return out;
  }

  // 3. Dạng 4 từ phân cách: "Đúng, Sai, Đúng, Sai" hoặc "Đ - S - Đ - S"
  const tokens = s.split(/[\s,;\-\/|]+/).map(t => t.trim()).filter(Boolean);
  if (tokens.length === 4) {
    const mapped = tokens.map(t => normalizeTfAnswerToken(t));
    if (mapped.every(Boolean)) {
      return { a: mapped[0], b: mapped[1], c: mapped[2], d: mapped[3] };
    }
  }

  return null;
}

function trimLeadingEmptyColumns(rawMatrix2D) {
  if (!Array.isArray(rawMatrix2D) || rawMatrix2D.length === 0) return [];
  let minCol = Infinity;
  for (const row of rawMatrix2D) {
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      if (String(row[c] ?? '').trim() !== '') {
        if (c < minCol) minCol = c;
        break;
      }
    }
  }
  if (!isFinite(minCol) || minCol === 0) return rawMatrix2D;
  return rawMatrix2D.map(row => (Array.isArray(row) ? row.slice(minCol) : []));
}

function extractHeaderCodeCandidate(cellStr) {
  const s = String(cellStr || '').trim();
  if (!s) return null;
  const explicit = s.match(/^(?:mã(?:\s*đề)?|đề(?:\s*thi|\s*số)?|md|code)\s*[:\.\-#]?\s*([0-9]{3,4})\b(?:\s*\([^)]*\))?$/i) ||
    s.match(/(?:mã(?:\s*đề)?|đề(?:\s*số)?|md)\s*[:\.\-#]?\s*([0-9]{3,4})\b/i);
  if (explicit) return { code: explicit[1], explicit: true };

  const bare = s.match(/^([0-9]{3,4})(?:\s*\([^)]*\))?$/);
  if (bare) return { code: bare[1], explicit: false };
  return null;
}

function normalizeMcqAnswerToken(rawVal) {
  let val = String(rawVal || '').trim().toUpperCase();
  if (!val) return '';
  if (val === '1') val = 'A';
  else if (val === '2') val = 'B';
  else if (val === '3') val = 'C';
  else if (val === '4') val = 'D';
  return ['A', 'B', 'C', 'D'].includes(val) ? val : '';
}

function normalizePart3AnswerToken(rawVal) {
  let val = String(rawVal || '').trim().replace(/\s+/g, '').replace(/,/g, '.');
  if (!val) return '';
  // Chấp nhận số nguyên, số âm, số thập phân, phân số (VD: 12.5, -3, 0.25, 100, 1/2, 4)
  if (/^-?\d+(?:\.\d+)?$/.test(val) || /^-?\d+\/\d+$/.test(val)) {
    return val;
  }
  return '';
}

function parseHorizontalMatrixToKeys(matrix2D) {
  const result = {};
  if (!matrix2D || matrix2D.length < 2) return result;

  // Dạng TNMaker chuỗi đáp án gộp theo từng dòng: [Mã đề | Chuỗi P1 (ABCD...) | Chuỗi P2 (ĐSĐS...) | Chuỗi P3 (12.5;-3;0.25;100)]
  const compactResult = {};
  let compactMatched = 0;
  for (let r = 0; r < matrix2D.length; r++) {
    const row = matrix2D[r] || [];
    let code = '';
    let codeCol = -1;
    for (let c = 0; c < Math.min(3, row.length); c++) {
      const cand = extractHeaderCodeCandidate(row[c]);
      if (cand) { code = cand.code; codeCol = c; break; }
    }
    if (!code) continue;
    const restCells = row.slice(codeCol + 1).map(x => String(x || '').trim()).filter(Boolean);
    const mcqStrCell = restCells.find(c => /^[A-Da-d\s\-_,;]{6,}$/.test(c) && c.replace(/[^A-Da-d]/g, '').length >= 6);
    if (mcqStrCell) {
      const letters = mcqStrCell.toUpperCase().replace(/[^A-D]/g, '').split('');
      if (!compactResult[code]) compactResult[code] = { part1: [], part2: {}, part3: {} };
      compactResult[code].part1 = letters;
      compactMatched++;
      let nextP3Idx = 1;
      // Kiểm tra các ô còn lại xem có Phần II gộp (VD: "ĐSĐS SĐSĐ" hoặc "1:ĐSĐS; 2:SĐSĐ") hoặc Phần III (VD: "12.5; -3; 0.25; 100") không
      restCells.forEach(cell => {
        if (cell === mcqStrCell) return;
        const tfChunks = cell.split(/[\s,;\/|]+/).map(t => t.trim()).filter(Boolean);
        let qIdx = 1;
        let matchedAnyTf = false;
        tfChunks.forEach(ch => {
          const m = ch.match(/^(?:(?:câu|c)?\s*([1-8])\s*[:\.\-=])?([ĐDSTFđdstf]{4})$/i);
          if (m) {
            const qNum = m[1] ? parseInt(m[1], 10) : qIdx++;
            const parsed = parseCompactTfCell(m[2]);
            if (parsed) {
              compactResult[code].part2[qNum] = parsed;
              matchedAnyTf = true;
            }
          }
        });
        if (matchedAnyTf) return;

        // Nếu không phải Phần II -> kiểm tra Phần III (Trả lời ngắn): "12.5; -3; 0.25; 100" hoặc "1:12.5; 2:-3" hoặc từng ô số riêng lẻ
        const singleNum = normalizePart3AnswerToken(cell);
        if (singleNum && nextP3Idx <= 6) {
          compactResult[code].part3[nextP3Idx++] = singleNum;
          return;
        }
        const p3Chunks = cell.split(/[;|\t]+/).map(t => t.trim()).filter(Boolean);
        const tokensToCheck = p3Chunks.length > 1 ? p3Chunks : cell.split(/\s+/).map(t => t.trim()).filter(Boolean);
        tokensToCheck.forEach(tk => {
          if (nextP3Idx > 6) return;
          const labeled = tk.match(/^(?:(?:câu|c|p3\.?|iii\.?)?\s*([1-6])\s*[:=])\s*(.+)$/i);
          if (labeled) {
            const qNum = parseInt(labeled[1], 10);
            const numVal = normalizePart3AnswerToken(labeled[2]);
            if (numVal) {
              compactResult[code].part3[qNum] = numVal;
              nextP3Idx = Math.max(nextP3Idx, qNum + 1);
            }
          } else {
            const numVal = normalizePart3AnswerToken(tk);
            if (numVal) {
              compactResult[code].part3[nextP3Idx++] = numVal;
            }
          }
        });
      });
    }
  }
  if (compactMatched > 0) {
    return pruneAndNormalizeAnswerKeys(compactResult);
  }

  for (let r = 0; r < Math.min(8, matrix2D.length - 1); r++) {
    const headerRow = matrix2D[r] || [];
    const qCols = [];
    const seenP1Nums = new Set();

    headerRow.forEach((cell, cIdx) => {
      if (cIdx === 0) return;
      const s = String(cell || '').trim();
      if (!s) return;
      // VD: "1a", "1.a", "1_a", "Câu 1a", "II.1a", "P2.1a", "P2_1a", "TF1a", "ĐS1a", "DS1a"
      const tfSubMatch = s.match(/^(?:(?:phần|p)?\s*(?:ii|2)\s*[\.\-\/:_]?|(?:tf|đs|ds)\s*[\.\-\/:_]?)?\s*(?:câu|c)?\s*([0-9]{1,2})\s*[\.\-_]?\s*([a-d])$/i);
      if (tfSubMatch) {
        qCols.push({ colIdx: cIdx, part: 'part2', qNum: parseInt(tfSubMatch[1], 10), sub: tfSubMatch[2].toLowerCase() });
        return;
      }
      // VD: "P2.1", "P2_1", "II.1", "TF1", "ĐS1", "DS1" (ô chứa chuỗi gộp ĐSĐS)
      const tfCompactMatch = s.match(/^(?:p(?:hần)?\s*(?:ii|2)|ii|tf|đs|ds)\s*[\.\-\/:_]?\s*(?:câu|c)?\s*([1-8])$/i);
      if (tfCompactMatch) {
        qCols.push({ colIdx: cIdx, part: 'part2_compact', qNum: parseInt(tfCompactMatch[1], 10) });
        return;
      }
      // VD: "P3.1", "P3_1", "III.1", "TLN1", "SA1", "Điền khuyết 1"
      const p3Match = s.match(/^(?:p(?:hần)?\s*(?:iii|3)|iii|tln|sa|điền\s*khuyết)\s*[\.\-\/:_]?\s*(?:câu|c)?\s*([1-6])$/i);
      if (p3Match) {
        qCols.push({ colIdx: cIdx, part: 'part3', qNum: parseInt(p3Match[1], 10) });
        return;
      }
      // VD: "1", "Câu 1", "I.1", "P1.1", "P1_1", "TN1", "MCQ1", "C1"
      const p1Match = s.match(/^(?:(?:p(?:hần)?\s*(?:i|1)|tn|mcq)\s*[\.\-\/:_]?\s*)?(?:câu|c|q)?\s*[\.\-\/:_]?\s*([0-9]{1,2})$/i);
      if (p1Match) {
        const qNum = parseInt(p1Match[1], 10);
        // Nếu số thứ tự câu lặp lại từ 1 sau khi đã có Phần I (TNMaker gộp P1 + P2/P3 trong 1 bảng ngang)
        const isRepeatedNum = seenP1Nums.has(qNum);
        if (!isRepeatedNum) seenP1Nums.add(qNum);
        qCols.push({ colIdx: cIdx, part: isRepeatedNum ? 'auto_extra' : 'part1', qNum });
      }
    });

    if (qCols.length < 4) continue;

    // Cột mã đề nằm ngay bên trái cụm cột câu hỏi đầu tiên
    const firstQCol = qCols[0].colIdx;
    const codeColCandidates = [];
    for (let c = 0; c < firstQCol; c++) codeColCandidates.push(c);
    if (codeColCandidates.length === 0) continue;

    let matchedRows = 0;
    for (let rr = r + 1; rr < matrix2D.length; rr++) {
      const dataRow = matrix2D[rr] || [];
      let code = '';
      for (const cIdx of codeColCandidates) {
        const cand = extractHeaderCodeCandidate(dataRow[cIdx]);
        if (cand) { code = cand.code; break; }
      }
      if (!code) continue;
      matchedRows++;
      if (!result[code]) result[code] = { part1: [], part2: {}, part3: {} };

      for (const qc of qCols) {
        const rawCell = String(dataRow[qc.colIdx] || '').trim();
        if (!rawCell) continue;
        if (qc.part === 'part2') {
          const tfVal = normalizeTfAnswerToken(rawCell);
          if (tfVal) {
            if (!result[code].part2[qc.qNum]) result[code].part2[qc.qNum] = {};
            result[code].part2[qc.qNum][qc.sub] = tfVal;
          }
        } else if (qc.part === 'part2_compact') {
          const parsedTf = parseCompactTfCell(rawCell);
          if (parsedTf) result[code].part2[qc.qNum] = parsedTf;
        } else if (qc.part === 'part3') {
          result[code].part3[qc.qNum] = rawCell.replace(',', '.');
        } else if (qc.part === 'auto_extra') {
          const parsedTf = parseCompactTfCell(rawCell);
          if (parsedTf) {
            result[code].part2[qc.qNum] = parsedTf;
          } else if (qc.qNum >= 1 && qc.qNum <= 6 && /^[+\-]?\d+(?:[.,]\d+)?(?:\/\d+)?$/.test(rawCell)) {
            result[code].part3[qc.qNum] = rawCell.replace(',', '.');
          }
        } else {
          const mcq = normalizeMcqAnswerToken(rawCell);
          if (mcq) {
            result[code].part1[qc.qNum - 1] = mcq;
          } else {
            const parsedTf = parseCompactTfCell(rawCell);
            if (parsedTf) {
              result[code].part2[qc.qNum] = parsedTf;
            }
          }
        }
      }
    }

    if (matchedRows > 0) {
      return pruneAndNormalizeAnswerKeys(result);
    }
  }
  return {};
}

/**
 * Phân tích ma trận 2D (từ Excel, HTML table, Word table hoặc CSV) thành answerKeysByCode
 */
function parseMatrix2DToKeys(rawMatrix2D, options = {}) {
  const result = {};
  const matrix2D = trimLeadingEmptyColumns(rawMatrix2D);
  if (!matrix2D || matrix2D.length === 0) return result;

  // 1. Kiểm tra Dạng A: Hàng chứa các Mã đề ở đầu bảng (chọn hàng ghi điểm cao nhất, bỏ qua dòng tiêu đề trường / năm học 2025-2026)
  let bestHeader = null;
  const maxScan = Math.min(12, matrix2D.length);

  for (let i = 0; i < maxScan; i++) {
    const row = matrix2D[i] || [];
    const foundCodes = [];
    row.forEach((cell, cIdx) => {
      if (cIdx < 1) return;
      const cand = extractHeaderCodeCandidate(cell);
      if (cand) {
        foundCodes.push({ colIdx: cIdx, code: cand.code, explicit: cand.explicit });
      }
    });

    if (foundCodes.length === 0) continue;

    const firstCodeCol = foundCodes[0].colIdx;
    const leftCells = row.slice(0, firstCodeCol).map(c => String(c || '').trim().toLowerCase());
    const hasQLabel = leftCells.some(s => /^(?:câu|câu\s*hỏi|stt|tt|question|q\.?|mã\s*câu|#)$/i.test(s));
    if (foundCodes.length === 1 && !hasQLabel && !foundCodes[0].explicit && matrix2D.length <= 5) continue;
    const rowBannerStr = row.map(c => String(c || '')).join(' ').toLowerCase();
    const looksLikeTitleBanner = /(?:năm\s*học|học\s*kỳ|trường\s*thpt|sở\s*gd|school\s*year)/i.test(rowBannerStr) &&
      !foundCodes.some(fc => fc.explicit) && !hasQLabel;
    const allLookLikeYears = foundCodes.every(fc => {
      const n = parseInt(fc.code, 10);
      return !fc.explicit && n >= 2020 && n <= 2035;
    }) && !hasQLabel;

    if (looksLikeTitleBanner || allLookLikeYears) continue;

    let score = foundCodes.length * 2;
    if (hasQLabel) score += 10;
    score += foundCodes.filter(fc => fc.explicit).length * 5;
    if (foundCodes.length >= 2) score += 3;

    if (!bestHeader || score > bestHeader.score) {
      bestHeader = { rowIdx: i, codeCols: foundCodes, score };
    }
  }

  if (bestHeader && bestHeader.codeCols.length > 0) {
    const headerRowIdx = bestHeader.rowIdx;
    const codeCols = bestHeader.codeCols;
    codeCols.forEach(cc => {
      result[cc.code] = { part1: [], part2: {}, part3: {} };
    });

    // Xác định cột câu hỏi & cột ý phụ (VD: "STT | Câu | Ý | 101" hoặc "Câu | Ý | 101" hoặc "Câu | 101")
    const headerRow = matrix2D[headerRowIdx] || [];
    const firstCodeCol = codeCols[0].colIdx;
    let qColIdx = 0;
    let explicitSubCol = -1;
    for (let c = 0; c < firstCodeCol; c++) {
      const h = String(headerRow[c] || '').trim().toLowerCase();
      if (/^(?:ý|sub|mục)$/i.test(h)) {
        explicitSubCol = c;
      } else if (/^(?:câu|câu\s*hỏi|question|mã\s*câu|#)$/i.test(h)) {
        qColIdx = c;
      }
    }
    if (explicitSubCol === -1 && firstCodeCol >= 2) {
      // Cột ngay trước mã đề đầu tiên có thể chứa a,b,c,d còn qColIdx nằm bên trái
      qColIdx = Math.max(0, firstCodeCol - 2);
      const maybeQ = String(headerRow[firstCodeCol - 1] || '').trim().toLowerCase();
      if (/^(?:câu|stt|tt|câu\s*hỏi|question)$/i.test(maybeQ)) {
        qColIdx = firstCodeCol - 1;
      }
    }

    // Tự động nhận diện bảng Word chỉ chứa riêng Phần III (<= 6 dòng số liệu, không có A-D/Đ-S, có số âm/thập phân/số lớn/5..9)
    let looksLikeStandalonePart3 = false;
    let p3IndicatorCount = 0;
    let mcqOrTfIndicatorCount = 0;
    let dataRowCount = 0;
    for (let r = headerRowIdx + 1; r < matrix2D.length; r++) {
      const row = matrix2D[r] || [];
      const rowStr = row.map(c => String(c || '')).join(' ').trim();
      if (!rowStr) continue;
      dataRowCount++;
      for (const cc of codeCols) {
        const val = String(row[cc.colIdx] || '').trim();
        if (!val) continue;
        if (/^[A-Da-d]$/.test(val) || /^(?:Đ|D|S|F|ĐÚNG|SAI|TRUE|FALSE)$/i.test(val)) {
          mcqOrTfIndicatorCount++;
        } else if (/^(?:-\d+(?:[.,]\d+)?|\d+[.,]\d+|\d+\/\d+|0|[5-9]|\d{2,})$/.test(val)) {
          p3IndicatorCount++;
        }
      }
    }
    if (dataRowCount > 0 && dataRowCount <= 6 && p3IndicatorCount > 0 && mcqOrTfIndicatorCount === 0) {
      looksLikeStandalonePart3 = true;
    }

    let currentSection = (options && options.defaultSection)
      ? options.defaultSection
      : (looksLikeStandalonePart3 ? 'part3' : 'part1'); // 'part1', 'part2', 'part3', 'essay'
    let lastP2MainQ = 0;

    for (let r = headerRowIdx + 1; r < matrix2D.length; r++) {
      const row = matrix2D[r] || [];
      const qCellRaw = String(row[qColIdx] || row[0] || '').trim();
      const adjCellRaw = firstCodeCol >= 2 ? String(row[explicitSubCol !== -1 ? explicitSubCol : (firstCodeCol - 1)] || '').trim() : '';
      const rowFullStr = row.map(c => String(c || '')).join(' ').toLowerCase();

      // Bỏ qua dòng hoàn toàn rỗng
      if (!qCellRaw && row.every(c => !String(c || '').trim())) continue;

      // Nhận diện dòng chuyển phân đoạn đề thi (Phần I, Phần II, Phần III, Tự luận)
      if (qCellRaw.startsWith('#') || qCellRaw.startsWith('//') ||
        /(?:phần\s*(?:iii|iv|3|4)\b.*tự\s*luận|hướng\s*dẫn\s*chấm\s*tự\s*luận|^tự\s*luận\b)/i.test(rowFullStr) ||
        /phần\s*(?:iii|3)\b|trả\s*lời\s*ngắn|điền\s*khuyết/i.test(rowFullStr) ||
        /phần\s*(?:ii|2)\b|đúng[\s\/\-]sai/i.test(rowFullStr) ||
        /phần\s*(?:i|1)\b|trắc\s*nghiệm/i.test(rowFullStr)) {
        if (/(?:tự\s*luận)/i.test(rowFullStr)) {
          currentSection = 'essay';
        } else if (/phần\s*(?:iii|3)\b|trả\s*lời\s*ngắn|điền\s*khuyết/i.test(rowFullStr)) {
          currentSection = 'part3';
        } else if (/phần\s*(?:ii|2)\b|đúng[\s\/\-]sai/i.test(rowFullStr)) {
          currentSection = 'part2';
        } else if (/phần\s*(?:i|1)\b|trắc\s*nghiệm/i.test(rowFullStr)) {
          currentSection = 'part1';
        }
        continue;
      }

      if (currentSection === 'essay') continue;

      // Bỏ qua dòng lặp lại tiêu đề cột giữa bảng (VD: "Câu | Ý | 101 | 102")
      if (/^(?:câu|câu\s*hỏi|stt|tt|question|#)$/i.test(qCellRaw) && !normalizeMcqAnswerToken(row[codeCols[0].colIdx])) {
        continue;
      }

      // Cột phụ (a, a), b), c), d) hoặc Ý a) khi có cột riêng trước cột mã đề đầu tiên (kể cả ô Câu bị trộn dọc trong Word!)
      const adjSubMatch = firstCodeCol >= 2 ? adjCellRaw.match(/^(?:ý\s*)?([a-d])[\)\.\:]?$/i) : null;
      const hasSeparateSubCol = Boolean(adjSubMatch);
      const qMainNumMatch = qCellRaw.match(/(?:câu\s*)?([0-9]{1,2})/i);
      const resolvedMainQForSub = qMainNumMatch ? parseInt(qMainNumMatch[1], 10) : (lastP2MainQ > 0 ? lastP2MainQ : 1);

      const subMatch = qCellRaw.match(/([0-9]{1,2})\s*[\.\-_]?\s*([a-d])[\)\.]?\b/i) ||
        (hasSeparateSubCol ? [null, String(resolvedMainQForSub), adjSubMatch[1]] : null);

      if (subMatch) {
        // PHẦN II: CÂU HỎI ĐÚNG / SAI (từng dòng a, b, c, d)
        const mainQ = parseInt(subMatch[1], 10);
        const subQ = subMatch[2].toLowerCase();
        lastP2MainQ = mainQ;

        codeCols.forEach(cc => {
          const tfVal = normalizeTfAnswerToken(row[cc.colIdx]);
          if (tfVal) {
            if (!result[cc.code].part2[mainQ]) result[cc.code].part2[mainQ] = {};
            result[cc.code].part2[mainQ][subQ] = tfVal;
          }
        });
      } else if (currentSection === 'part3' || /^(?:p3|iii)[_\s\.\-]?([1-6])\b/i.test(qCellRaw)) {
        // PHẦN III: TRẢ LỜI NGẮN (ĐIỀN SỐ NGUYÊN / THẬP PHÂN / PHÂN SỐ — kể cả số 1 chữ số 1..4!)
        const p3Match = qCellRaw.match(/([1-6])/);
        if (p3Match) {
          const qNum = parseInt(p3Match[1], 10);
          codeCols.forEach(cc => {
            const normVal = normalizePart3AnswerToken(row[cc.colIdx]);
            if (normVal) {
              result[cc.code].part3[qNum] = normVal;
            }
          });
        }
      } else {
        // PHẦN I (MCQ) HOẶC PHẦN II DẠNG GỘP 4 Ý TRONG 1 Ô (TNMaker: Câu 1 | ĐSĐS | SĐSĐ)
        const qMatch = qCellRaw.match(/([0-9]{1,2})/);
        const qNum = qMatch ? parseInt(qMatch[1], 10) : (r - headerRowIdx);
        const isCompactP2Row = currentSection === 'part2' ||
          codeCols.some(cc => Boolean(parseCompactTfCell(row[cc.colIdx])));

        if (isCompactP2Row && qNum >= 1 && qNum <= 8) {
          codeCols.forEach(cc => {
            const parsedTf = parseCompactTfCell(row[cc.colIdx]);
            if (parsedTf) {
              result[cc.code].part2[qNum] = { ...(result[cc.code].part2[qNum] || {}), ...parsedTf };
            }
          });
        } else {
          codeCols.forEach(cc => {
            const rawCellVal = String(row[cc.colIdx] || '').trim();
            const mcq = normalizeMcqAnswerToken(rawCellVal);
            if (mcq) {
              result[cc.code].part1[qNum - 1] = mcq;
            } else {
              const tfVal = normalizeTfAnswerToken(rawCellVal);
              const m = qCellRaw.match(/([0-9]{1,2})\s*([a-d])/i);
              if (tfVal && m) {
                const mainQ = m[1];
                const subQ = m[2].toLowerCase();
                if (!result[cc.code].part2[mainQ]) result[cc.code].part2[mainQ] = {};
                result[cc.code].part2[mainQ][subQ] = tfVal;
              } else if (/^(?:-\d+(?:[.,]\d+)?|\d+[.,]\d+|\d+\/\d+|0|[5-9]|\d{2,})$/.test(rawCellVal) && qNum >= 1 && qNum <= 6) {
                result[cc.code].part3[qNum] = normalizePart3AnswerToken(rawCellVal);
              }
            }
          });
        }
      }
    }

    const cleaned = pruneAndNormalizeAnswerKeys(result);
    if (Object.keys(cleaned).length > 0) return cleaned;
  }

  // 2. Kiểm tra Dạng C: Bảng ngang (Hàng là Mã đề: 101 | A | B | C...; Cột là Câu 1..N)
  const horizontalKeys = parseHorizontalMatrixToKeys(matrix2D);
  if (Object.keys(horizontalKeys).length > 0) {
    return horizontalKeys;
  }

  // 3. Kiểm tra Dạng B: Bảng dọc [Mã đề, (Phần), Câu/Ý, Đáp án] (quét tối đa 8 dòng đầu để bỏ qua dòng tiêu đề)
  let bHeaderRow = -1, colCode = -1, colQ = -1, colAns = -1, colPart = -1;
  for (let r = 0; r < Math.min(8, matrix2D.length); r++) {
    const header = matrix2D[r] || [];
    let cCode = -1, cQ = -1, cAns = -1, cPart = -1;
    header.forEach((h, idx) => {
      const s = String(h || '').toLowerCase();
      if (s.includes('mã') || s.includes('code') || s.includes('đề')) cCode = idx;
      if (s.includes('phần') || s.includes('part')) cPart = idx;
      if (s.includes('câu') || s.includes('question') || s.includes('stt')) cQ = idx;
      if (s.includes('đáp') || s.includes('ans') || s.includes('chọn') || s.includes('key')) cAns = idx;
    });
    if (cCode !== -1 && cAns !== -1) {
      bHeaderRow = r;
      colCode = cCode;
      colQ = cQ;
      colAns = cAns;
      colPart = cPart;
      break;
    }
  }

  if (bHeaderRow !== -1 && colCode !== -1 && colAns !== -1) {
    for (let r = bHeaderRow + 1; r < matrix2D.length; r++) {
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
        const tfVal = normalizeTfAnswerToken(ansVal);
        if (tfVal) {
          if (!result[code].part2[mainQ]) result[code].part2[mainQ] = {};
          result[code].part2[mainQ][subQ] = tfVal;
        }
      } else if (partCell.includes('iii') || partCell.includes('ngắn')) {
        // Phần III
        const qNum = parseInt(qCell.match(/([1-6])/)?.[1] || '1', 10);
        if (ansVal) result[code].part3[qNum] = ansVal.replace(',', '.');
      } else {
        // Phần I
        const qNum = parseInt(qCell.match(/([0-9]{1,2})/)?.[1] || (result[code].part1.length + 1), 10);
        const opt = normalizeMcqAnswerToken(ansVal);
        if (opt) result[code].part1[qNum - 1] = opt;
      }
    }
    return pruneAndNormalizeAnswerKeys(result);
  }

  return pruneAndNormalizeAnswerKeys(result);
}

/**
 * Phân tích chuỗi Text hoặc CSV (hỗ trợ Zalo, Email, copy-paste)
 */
function parseTextAnswerKey(rawText) {
  const result = {};
  if (!rawText || typeof rawText !== 'string') return result;
  rawText = rawText.replace(/^\uFEFF/, '');

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

  // 2. Thử phân tích dạng CSV / TSV bảng (kiểm tra trong 5 dòng đầu phòng trường hợp dòng 0 là tiêu đề)
  const delimLine = lines.slice(0, 5).find(l => l.includes('\t') || l.includes(';') || l.includes(','));
  if (lines.length > 1 && delimLine) {
    const sep = delimLine.includes('\t') ? '\t' : (delimLine.includes(';') ? ';' : ',');
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

    // 3.2. Tìm Phần II (Đúng/Sai): VD "1a: Đ 1b: S", "Câu 1: a-Đ, b-S, c-Đ, d-S", hoặc dạng TNMaker gộp "Câu 1: ĐSĐS" / "1: Đ-S-Đ-S"
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
      // Dạng "Câu 1: a: Đ, b: S..." hoặc "Câu 1: ĐSĐS" / "1: Đ-S-Đ-S"
      const mainQMatch = line.match(/(?:câu|bài|c)?\s*([1-8])\s*[:\.\-=\s]\s*(.+)$/i);
      if (mainQMatch) {
        const qNum = mainQMatch[1];
        const rest = mainQMatch[2].trim();
        const compactParsed = parseCompactTfCell(rest);
        if (compactParsed) {
          result[currentCode].part2[qNum] = { ...(result[currentCode].part2[qNum] || {}), ...compactParsed };
        } else {
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
      }
      return;
    }

    // 3.3. Tìm Trắc nghiệm Phần I: 1A, 2.B, 3-C, 4: D, 5A, 6B hoặc chuỗi liền TNMaker "101: ABCDABCD..."
    if (!isPart2Context && !isPart3Context) {
      const pairs = [...line.matchAll(/([0-9]{1,2})\s*[\.:\-_]?\s*([A-D])\b/gi)];
      if (pairs.length > 0) {
        pairs.forEach(p => {
          const qNum = parseInt(p[1], 10);
          const opt = p[2].toUpperCase();
          result[currentCode].part1[qNum - 1] = opt;
        });
      } else {
        // Dạng chuỗi liền TNMaker: "Mã đề 101: ABCDABCD..." hoặc dòng chỉ chứa "A B C D A B C D..."
        const afterColon = line.includes(':') ? line.split(':').slice(1).join(':').trim() : line;
        const stripped = afterColon.replace(/[\s,;\-\|]+/g, '');
        if (/^[A-Da-d]{6,50}$/.test(stripped)) {
          const letters = stripped.toUpperCase().split('');
          const startIdx = result[currentCode].part1.length;
          letters.forEach((opt, i) => {
            result[currentCode].part1[startIdx + i] = opt;
          });
        }
      }
    }
  });

  // Giữ nguyên các vị trí chưa có đáp án là chuỗi rỗng '' (không tự ý bịa 'A' gây chấm sai)
  for (const code of Object.keys(result)) {
    const p1 = result[code].part1;
    for (let i = 0; i < p1.length; i++) {
      if (!p1[i]) p1[i] = '';
    }
  }

  return pruneAndNormalizeAnswerKeys(result);
}

/**
 * Đọc toàn bộ bảng trong file Word (.docx) kèm ngữ cảnh tiêu đề đứng ngay trước bảng:
 * - Nhận diện phân đoạn PHẦN I (TN), PHẦN II (Đúng/Sai), PHẦN III (Trả lời ngắn) và bỏ qua bảng PHẦN TỰ LUẬN
 * - Hỗ trợ bảng đa mã đề (Câu | 101 | 102 |...) kèm ngữ cảnh Phần III (kể cả đáp án 1 chữ số 1..4)
 * - Hỗ trợ bảng Phần II riêng từng mã đề (| Câu | Ý a) | Ý b) | Ý c) | Ý d) | hoặc dọc | Câu | Ý | Đáp án |)
 * - Hỗ trợ bảng Phần I & Phần III ngang 2 dòng nối tiếp theo từng mã đề (| Câu | 1 | 2 |...| và | Đáp án | ... |)
 * - Hỗ trợ bảng Phần I & Phần III dọc 2 cột theo từng mã đề (| Câu | Đáp án |)
 */
function parseDocxContextualParagraphs(paragraphs = [], metaOut = null) {
  const result = {};
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return result;

  let activeCode = '';
  let activeSection = ''; // '', 'part1', 'part2', 'part3', 'essay'
  let tablesSeen = 0;
  let i = 0;

  while (i < paragraphs.length) {
    const line = String(paragraphs[i] || '').trim();
    if (!line) { i++; continue; }

    // Nếu không phải dòng bảng "| ... |", kiểm tra tiêu đề chuyển Phần / Mã đề
    if (!(line.startsWith('|') && line.endsWith('|'))) {
      const lower = line.toLowerCase();
      const isEssayHeading = /(?:phần\s*(?:iii|iv|3|4)\b[^\n]*tự\s*luận|hướng\s*dẫn\s*chấm\s*(?:phần\s*)?tự\s*luận|đáp\s*án\s*(?:phần\s*)?tự\s*luận|^(?:[ivx]+\.\s*)?tự\s*luận\b)/i.test(lower);
      const isPart3Heading = !isEssayHeading && /(?:phần\s*(?:iii|3)\b|trả\s*lời\s*ngắn|điền\s*khuyết)/i.test(lower);
      const isPart2Heading = /(?:phần\s*(?:ii|2)\b|đúng[\s\/\-]sai)/i.test(lower);
      const isPart1Heading = /(?:phần\s*(?:i|1)\b|trắc\s*nghiệm\s*nhiều|nhiều\s*(?:phương\s*án|lựa\s*chọn))/i.test(lower);

      if (isEssayHeading) activeSection = 'essay';
      else if (isPart3Heading) activeSection = 'part3';
      else if (isPart2Heading) activeSection = 'part2';
      else if (isPart1Heading) activeSection = 'part1';

      const allCodesInLine = [...line.matchAll(/\b([0-9]{3,4})\b/g)].map(m => m[1]).filter(c => {
        const n = parseInt(c, 10);
        return !(n >= 2020 && n <= 2035);
      });
      const explicitCode = line.match(/(?:mã\s*đề(?:\s*thi)?|mã\s*số|đề\s*số|mã)\s*[:\.\-#]?\s*([0-9]{3,4})\b/i);
      if (explicitCode && allCodesInLine.length === 1) {
        activeCode = explicitCode[1];
        if (activeSection === 'essay' && !isEssayHeading) {
          activeSection = '';
        }
      }
      i++;
      continue;
    }

    // Gom toàn bộ các dòng liên tiếp thuộc cùng một bảng Word
    const tableRows = [];
    while (i < paragraphs.length) {
      const tLine = String(paragraphs[i] || '').trim();
      if (!(tLine.startsWith('|') && tLine.endsWith('|'))) break;
      const cells = tLine.slice(1, -1).split('|').map(c => c.trim());
      tableRows.push(cells);
      i++;
    }
    tablesSeen++;

    if (tableRows.length < 2) continue;
    if (activeSection === 'essay') continue;

    // Ưu tiên kiểm tra bảng đa mã đề (kèm ngữ cảnh defaultSection từ tiêu đề đứng ngay phía trên!)
    const multiCodeKeys = parseMatrix2DToKeys(tableRows, {
      defaultSection: activeSection || undefined
    });
    if (Object.keys(multiCodeKeys).length > 0) {
      mergeAnswerKeyMaps(result, multiCodeKeys);
      continue;
    }

    if (!activeCode) continue;

    const header = tableRows[0].map(c => String(c || '').trim());

    // DẠNG 1: Bảng Phần II theo cột Ý a) | Ý b) | Ý c) | Ý d) (Chuẩn MatrixEdu & Bộ GD 2025)
    const subColMap = {};
    let qColIdx = 0;
    header.forEach((h, cIdx) => {
      const m = h.match(/^(?:ý\s*)?([a-d])[\)\.\:]?$/i);
      if (m) subColMap[m[1].toLowerCase()] = cIdx;
      else if (/^(?:câu|câu\s*hỏi|stt|tt)$/i.test(h)) qColIdx = cIdx;
    });
    if (subColMap.a !== undefined && subColMap.b !== undefined && subColMap.c !== undefined && subColMap.d !== undefined) {
      if (!result[activeCode]) result[activeCode] = { part1: [], part2: {}, part3: {} };
      let autoQ = 1;
      for (let r = 1; r < tableRows.length; r++) {
        const row = tableRows[r] || [];
        const qNumMatch = String(row[qColIdx] || '').match(/([0-9]{1,2})/);
        const qNum = qNumMatch ? parseInt(qNumMatch[1], 10) : autoQ;
        autoQ = qNum + 1;
        const entry = {};
        ['a', 'b', 'c', 'd'].forEach(sub => {
          const tf = normalizeTfAnswerToken(row[subColMap[sub]]);
          if (tf) entry[sub] = tf;
        });
        if (Object.keys(entry).length > 0) {
          result[activeCode].part2[qNum] = { ...(result[activeCode].part2[qNum] || {}), ...entry };
        }
      }
      continue;
    }

    // DẠNG 2: Bảng ngang 2 dòng nối tiếp (Câu | 1 | 2 |...| N  /  Đáp án | ... |) cho cả Phần I và Phần III
    const firstHeaderLabel = String(header[0] || '').toLowerCase();
    const numericHeaders = header.slice(1).filter(h => /^(?:câu\s*)?[0-9]{1,2}$/i.test(h));
    const minHorizCols = activeSection === 'part3' ? 2 : 4;
    if (numericHeaders.length >= minHorizCols && (/câu|stt|question/i.test(firstHeaderLabel) || /^[0-9]{1,2}$/.test(header[0]))) {
      if (!result[activeCode]) result[activeCode] = { part1: [], part2: {}, part3: {} };
      // Xác định đây là bảng Phần I (A/B/C/D) hay Phần III (Trả lời ngắn - số thực/nguyên)
      let letterCnt = 0;
      let p3NumCnt = 0;
      let maxQ = 0;
      for (let r = 0; r + 1 < tableRows.length; r += 2) {
        const qRow = tableRows[r] || [];
        const aRow = tableRows[r + 1] || [];
        const startC = /^[0-9]{1,2}$/.test(qRow[0]) ? 0 : 1;
        for (let c = startC; c < qRow.length; c++) {
          const qNum = parseInt(String(qRow[c] || '').replace(/[^0-9]/g, ''), 10);
          if (qNum > maxQ) maxQ = qNum;
          const rawAns = String(aRow[c] || '').trim();
          if (/^[A-Da-d]$/.test(rawAns)) letterCnt++;
          else if (normalizePart3AnswerToken(rawAns)) p3NumCnt++;
        }
      }
      const isPart3Horiz = (activeSection === 'part3' && letterCnt === 0 && p3NumCnt > 0) ||
        (letterCnt === 0 && p3NumCnt > 0 && maxQ <= 6);

      for (let r = 0; r + 1 < tableRows.length; r += 2) {
        const qRow = tableRows[r] || [];
        const aRow = tableRows[r + 1] || [];
        const startC = /^[0-9]{1,2}$/.test(qRow[0]) ? 0 : 1;
        for (let c = startC; c < qRow.length; c++) {
          const qNum = parseInt(String(qRow[c] || '').replace(/[^0-9]/g, ''), 10);
          if (isPart3Horiz) {
            const p3Val = normalizePart3AnswerToken(aRow[c]);
            if (qNum >= 1 && qNum <= 6 && p3Val) {
              result[activeCode].part3[qNum] = p3Val;
            }
          } else {
            const opt = normalizeMcqAnswerToken(aRow[c]);
            if (qNum >= 1 && qNum <= 60 && opt) {
              result[activeCode].part1[qNum - 1] = opt;
            }
          }
        }
      }
      continue;
    }

    // DẠNG 3 & 4: Bảng dọc theo từng mã đề (Câu | Ý | Đáp án) hoặc (Câu | Đáp án)
    let colSub = -1, colAns = -1, colQ = 0;
    header.forEach((h, cIdx) => {
      const hl = h.toLowerCase();
      if (/^(?:ý|mục|sub)$/i.test(hl)) colSub = cIdx;
      else if (/^(?:đáp\s*án|chọn|kết\s*quả|trả\s*lời|ans|key)$/i.test(hl)) colAns = cIdx;
      else if (/^(?:câu|câu\s*hỏi|stt)$/i.test(hl)) colQ = cIdx;
    });
    if (colSub !== -1 && colAns !== -1) {
      if (!result[activeCode]) result[activeCode] = { part1: [], part2: {}, part3: {} };
      let lastQ = 1;
      for (let r = 1; r < tableRows.length; r++) {
        const row = tableRows[r] || [];
        const qMatch = String(row[colQ] || '').match(/(?:câu\s*)?([0-9]{1,2})/i);
        if (qMatch) lastQ = parseInt(qMatch[1], 10);
        const sMatch = String(row[colSub] || '').match(/^(?:ý\s*)?([a-d])[\)\.\:]?$/i);
        const tf = normalizeTfAnswerToken(row[colAns]);
        if (sMatch && tf) {
          if (!result[activeCode].part2[lastQ]) result[activeCode].part2[lastQ] = {};
          result[activeCode].part2[lastQ][sMatch[1].toLowerCase()] = tf;
        }
      }
      continue;
    }

    // DẠNG 4: Bảng dọc 2-3 cột (| Câu | Đáp án |) cho Phần III (hoặc Phần I/II gộp) theo từng mã đề
    if (colSub === -1 && colAns !== -1) {
      if (!result[activeCode]) result[activeCode] = { part1: [], part2: {}, part3: {} };
      let letterCnt = 0, p3NumCnt = 0, compactTfCnt = 0;
      for (let r = 1; r < tableRows.length; r++) {
        const val = String((tableRows[r] || [])[colAns] || '').trim();
        if (!val) continue;
        if (/^[A-Da-d]$/.test(val)) letterCnt++;
        else if (parseCompactTfCell(val)) compactTfCnt++;
        else if (normalizePart3AnswerToken(val)) p3NumCnt++;
      }
      const isP3Vert = (activeSection === 'part3' && letterCnt === 0 && p3NumCnt > 0) ||
        (letterCnt === 0 && compactTfCnt === 0 && p3NumCnt > 0 && (tableRows.length - 1) <= 6);

      for (let r = 1; r < tableRows.length; r++) {
        const row = tableRows[r] || [];
        const qMatch = String(row[colQ] || '').match(/([0-9]{1,2})/);
        if (!qMatch) continue;
        const qNum = parseInt(qMatch[1], 10);
        const rawAns = String(row[colAns] || '').trim();
        if (isP3Vert) {
          const p3Val = normalizePart3AnswerToken(rawAns);
          if (qNum >= 1 && qNum <= 6 && p3Val) {
            result[activeCode].part3[qNum] = p3Val;
          }
        } else if (compactTfCnt > 0) {
          const parsedTf = parseCompactTfCell(rawAns);
          if (qNum >= 1 && qNum <= 8 && parsedTf) {
            result[activeCode].part2[qNum] = { ...(result[activeCode].part2[qNum] || {}), ...parsedTf };
          }
        } else {
          const opt = normalizeMcqAnswerToken(rawAns);
          if (qNum >= 1 && qNum <= 60 && opt) {
            result[activeCode].part1[qNum - 1] = opt;
          }
        }
      }
    }
  }

  if (metaOut && typeof metaOut === 'object') {
    metaOut.tablesSeen = tablesSeen;
  }
  return pruneAndNormalizeAnswerKeys(result);
}

/**
 * Phân tích tổng quát mọi loại file tải lên:
 * - Hỗ trợ Excel (.xlsx, .xls - gồm ZIP XML, HTML table, SpreadsheetML)
 * - Hỗ trợ Word (.docx) ghép tất cả các Bảng biểu (Phần I, II, III) & bảng tách theo mã đề từ MatrixEdu, TNMaker, McMIX, SmartTest
 * - Hỗ trợ File Text (.csv, .tsv, .txt, .json) từ TNMaker, QM Test, Zalo
 */
function parseAnyAnswerKeyFile(filename, buffer) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return parseXlsxBuffer(buffer);
  }

  if (ext === 'docx') {
    try {
      const docxData = parseDocxBuffer(buffer);
      const mergedDocxKeys = {};
      const docParagraphs = Array.isArray(docxData.paragraphs) ? docxData.paragraphs : [];
      const contextualMeta = { tablesSeen: 0 };

      // 1. Ưu tiên duyệt toàn bộ file Word theo ngữ cảnh tiêu đề (PHẦN I/II/III, bỏ qua TỰ LUẬN, tách Mã đề)
      if (docParagraphs.length > 0) {
        const contextualKeys = parseDocxContextualParagraphs(docParagraphs, contextualMeta);
        if (Object.keys(contextualKeys).length > 0) {
          mergeAnswerKeyMaps(mergedDocxKeys, contextualKeys);
        }
      }
      // 2. Fallback duyệt trực tiếp docxData.tables nếu có 2 bảng dính liền không có đoạn văn ngăn cách hoặc chưa đọc được từ ngữ cảnh
      if (docxData.tables && docxData.tables.length > 0 &&
        (Object.keys(mergedDocxKeys).length === 0 || docxData.tables.length > contextualMeta.tablesSeen)) {
        for (const tbl of docxData.tables) {
          const matrix2D = tbl.map(row => row.map(cell => (cell || '').trim()));
          const keys = parseMatrix2DToKeys(matrix2D);
          if (Object.keys(keys).length > 0) {
            mergeAnswerKeyMaps(mergedDocxKeys, keys);
          }
        }
      }
      // 3. Nếu file Word không có bảng đáp án (chỉ viết dạng văn bản thuần), fallback đọc text
      if (Object.keys(mergedDocxKeys).length === 0 && docParagraphs.length > 0) {
        const plainLines = docParagraphs.filter(p => !(String(p).trim().startsWith('|') && String(p).trim().endsWith('|')));
        const textKeys = parseTextAnswerKey(plainLines.join('\n'));
        if (Object.keys(textKeys).length > 0) {
          mergeAnswerKeyMaps(mergedDocxKeys, textKeys);
        }
      }
      const cleanDocx = pruneAndNormalizeAnswerKeys(mergedDocxKeys);
      if (Object.keys(cleanDocx).length > 0) return cleanDocx;
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
  const sheets = extractAllSheetsFromXlsxBuffer(buffer);
  return sheets.length > 0 ? sheets[0].matrix2D : [];
}

/**
 * Chuyển đổi ma trận 2D thành Danh sách học sinh chuẩn:
 * [{ sbd: '120001', fullName: 'Nguyễn Văn An', className: '12A1', dob: '15/03/2008' }, ...]
 */
function parseMatrix2DToRoster(matrix2D, options = {}) {
  const defaultClassName = String(options.defaultClassName || '').trim();
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

    // Chuẩn hóa SBD thực tế (không tự ý bịa SBD 120001+ nếu cột SBD trống)
    const cleanSbdDigits = sbd.replace(/[^0-9]/g, '');
    if (cleanSbdDigits) {
      sbd = cleanSbdDigits.length < 6 ? cleanSbdDigits.padStart(6, '0') : cleanSbdDigits;
    } else {
      sbd = sbd.trim();
    }

    roster.push({
      sbd,
      fullName: fullName.replace(/\s+/g, ' ').trim(),
      className: (className || defaultClassName || '').replace(/\s+/g, ' ').trim(),
      dob: dob || ''
    });
  }

  return roster;
}

/**
 * Thống kê nhanh danh sách học sinh theo từng lớp trong một danh sách chung
 */
function summarizeRosterByClass(roster) {
  const counts = {};
  (Array.isArray(roster) ? roster : []).forEach(r => {
    const cls = String(r?.className || '').replace(/\s+/g, ' ').trim() || 'Chưa phân lớp';
    counts[cls] = (counts[cls] || 0) + 1;
  });
  const classes = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  return {
    classes,
    counts,
    totalStudents: Array.isArray(roster) ? roster.length : 0
  };
}

/**
 * Phân tích Danh sách học sinh từ chuỗi văn bản (CSV, TSV, Copy-Paste từ Excel/Word)
 */
function parseStudentRosterText(rawText, options = {}) {
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

  return parseMatrix2DToRoster(matrix2D, options);
}

/**
 * Phân tích file Danh sách học sinh (.xlsx, .csv, .txt, .json)
 */
function parseStudentRosterFile(filename, buffer, options = {}) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const matrix2D = extractMatrix2DFromXlsxBuffer(buffer);
    return parseMatrix2DToRoster(matrix2D, options);
  }
  const textContent = buffer.toString('utf8');
  return parseStudentRosterText(textContent, options);
}

module.exports = {
  parseXlsxBuffer,
  parseTextAnswerKey,
  parseAnyAnswerKeyFile,
  parseMatrix2DToKeys,
  parseMatrix2DToRoster,
  parseStudentRosterText,
  parseStudentRosterFile,
  summarizeRosterByClass,
  generateSampleAnswerKeyCsv
};

