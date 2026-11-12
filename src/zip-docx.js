/**
 * src/zip-docx.js
 * Bộ đọc và tạo file Microsoft Word (.docx - OpenXML chuẩn A4, Times New Roman 13-14pt)
 * Không phụ thuộc thư viện ngoài, sử dụng zlib & buffer tích hợp của Node.js.
 */

const zlib = require('zlib');

// ============================================================================
// 1. CRC32 & ZIP ARCHIVE READER / WRITER
// ============================================================================

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Đọc danh sách file từ buffer ZIP (.docx)
 */
function readZipEntries(buffer) {
  const entries = {};
  // Tìm End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('File không đúng định dạng ZIP/DOCX (không tìm thấy EOCD).');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let ptr = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > buffer.length || buffer.readUInt32LE(ptr) !== 0x02014b50) break;
    const compressionMethod = buffer.readUInt16LE(ptr + 10);
    const compressedSize = buffer.readUInt32LE(ptr + 20);
    const fileNameLen = buffer.readUInt16LE(ptr + 28);
    const extraLen = buffer.readUInt16LE(ptr + 30);
    const commentLen = buffer.readUInt16LE(ptr + 32);
    const localHeaderOffset = buffer.readUInt32LE(ptr + 42);
    const fileName = buffer.slice(ptr + 46, ptr + 46 + fileNameLen).toString('utf8');

    // Đọc Local File Header
    if (localHeaderOffset + 30 <= buffer.length && buffer.readUInt32LE(localHeaderOffset) === 0x04034b50) {
      const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedData = buffer.slice(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        entries[fileName] = compressedData;
      } else if (compressionMethod === 8) {
        entries[fileName] = zlib.inflateRawSync(compressedData);
      }
    }

    ptr += 46 + fileNameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * Đóng gói danh sách file { [path]: string | Buffer } thành Buffer ZIP (.docx)
 */
function createZipBuffer(filesMap) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const [name, content] of Object.entries(filesMap)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const rawBuf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    const compressedBuf = zlib.deflateRawSync(rawBuf, { level: 6 });
    const fileCrc = crc32(rawBuf);

    // Local file header (30 bytes + filename)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // Signature
    lh.writeUInt16LE(20, 4);         // Version needed (2.0)
    lh.writeUInt16LE(0x0800, 6);     // General purpose bit flag (UTF-8)
    lh.writeUInt16LE(8, 8);          // Compression method: Deflate (8)
    lh.writeUInt16LE(0x4000, 10);    // Last mod file time
    lh.writeUInt16LE(0x5663, 12);    // Last mod file date
    lh.writeUInt32LE(fileCrc, 14);   // CRC-32
    lh.writeUInt32LE(compressedBuf.length, 18); // Compressed size
    lh.writeUInt32LE(rawBuf.length, 22);        // Uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26);       // File name length
    lh.writeUInt16LE(0, 28);                    // Extra field length
    nameBuf.copy(lh, 30);

    localHeaders.push(lh, compressedBuf);

    // Central directory file header (46 bytes + filename)
    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0); // Signature
    ch.writeUInt16LE(20, 4);         // Version made by
    ch.writeUInt16LE(20, 6);         // Version needed
    ch.writeUInt16LE(0x0800, 8);     // UTF-8 flag
    ch.writeUInt16LE(8, 10);         // Compression method: Deflate
    ch.writeUInt16LE(0x4000, 12);    // File time
    ch.writeUInt16LE(0x5663, 14);    // File date
    ch.writeUInt32LE(fileCrc, 16);   // CRC-32
    ch.writeUInt32LE(compressedBuf.length, 20);
    ch.writeUInt32LE(rawBuf.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);         // Extra field length
    ch.writeUInt16LE(0, 32);         // File comment length
    ch.writeUInt16LE(0, 34);         // Disk number start
    ch.writeUInt16LE(0, 36);         // Internal file attributes
    ch.writeUInt32LE(0, 38);         // External file attributes
    ch.writeUInt32LE(offset, 42);    // Relative offset of local header
    nameBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += lh.length + compressedBuf.length;
  }

  const cdBuffer = Buffer.concat(centralHeaders);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralHeaders.length, 8);
  eocd.writeUInt16LE(centralHeaders.length, 10);
  eocd.writeUInt32LE(cdBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, cdBuffer, eocd]);
}

// ============================================================================
// 2. DOCX PARSER (BÓC TÁCH VĂN BẢN & BẢNG BIỂU TỪ FILE .DOCX)
// ============================================================================

function decodeXmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractParagraphText(pXml) {
  let text = '';
  const tokenRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/?>|<w:br\s*\/?>/g;
  let match;
  while ((match = tokenRegex.exec(pXml)) !== null) {
    if (match[0].startsWith('<w:tab')) text += '\t';
    else if (match[0].startsWith('<w:br')) text += '\n';
    else text += decodeXmlEntities(match[1]);
  }
  return text.trim();
}

/**
 * Trích xuất chi tiết đoạn văn bản kèm định dạng gạch chân (<w:u>) để phát hiện đáp án chính xác
 */
function extractParagraphDetails(pXml) {
  let plainText = '';
  let taggedText = '';
  const underlinedParts = [];

  const rRegex = /<w:r\b[\s\S]*?<\/w:r>|<w:tab\s*\/?>|<w:br\s*\/?>/g;
  let rMatch;
  while ((rMatch = rRegex.exec(pXml)) !== null) {
    const item = rMatch[0];
    if (item.startsWith('<w:tab')) {
      plainText += '\t';
      taggedText += '\t';
      continue;
    }
    if (item.startsWith('<w:br')) {
      plainText += '\n';
      taggedText += '\n';
      continue;
    }

    const isUnderlined = /<w:u\b/.test(item) && !/<w:u\s+w:val="none"/i.test(item);

    let runText = '';
    const tRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(item)) !== null) {
      runText += decodeXmlEntities(tMatch[1]);
    }

    if (runText) {
      plainText += runText;
      if (isUnderlined) {
        taggedText += `<u>${runText}</u>`;
        underlinedParts.push(runText.trim());
      } else {
        taggedText += runText;
      }
    }
  }

  if (!plainText) {
    plainText = extractParagraphText(pXml);
    taggedText = plainText;
  }

  return {
    text: plainText.trim(),
    taggedText: taggedText.trim(),
    underlinedParts,
    isUnderlined: underlinedParts.length > 0
  };
}

/**
 * Đọc nội dung văn bản và bảng biểu từ file .docx
 */
function parseDocxBuffer(buffer) {
  const entries = readZipEntries(buffer);
  const docXmlBuf = entries['word/document.xml'];
  if (!docXmlBuf) {
    throw new Error('Không tìm thấy word/document.xml trong file .docx.');
  }
  const xml = docXmlBuf.toString('utf8');

  const lines = [];
  const details = [];
  const tables = [];

  // Duyệt theo thứ tự xuất hiện của <w:tbl> và <w:p> trong <w:body>
  const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/);
  const bodyXml = bodyMatch ? bodyMatch[1] : xml;

  // Tách bảng biểu và đoạn văn
  let lastIndex = 0;
  const tblRegex = /<w:tbl\b[\s\S]*?<\/w:tbl>/g;
  let tblMatch;

  function processParagraphSegment(segmentXml) {
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
    let pMatch;
    while ((pMatch = pRegex.exec(segmentXml)) !== null) {
      const pDetail = extractParagraphDetails(pMatch[1]);
      if (pDetail.text) {
        lines.push(pDetail.text);
        details.push(pDetail);
      }
    }
  }

  while ((tblMatch = tblRegex.exec(bodyXml)) !== null) {
    if (tblMatch.index > lastIndex) {
      processParagraphSegment(bodyXml.slice(lastIndex, tblMatch.index));
    }
    const tblXml = tblMatch[0];
    const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
    const tableRows = [];
    let trMatch;
    while ((trMatch = trRegex.exec(tblXml)) !== null) {
      const tcRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
      const rowCells = [];
      let tcMatch;
      while ((tcMatch = tcRegex.exec(trMatch[1])) !== null) {
        const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        const cellParas = [];
        let pMatch;
        while ((pMatch = pRegex.exec(tcMatch[1])) !== null) {
          const t = extractParagraphText(pMatch[1]);
          if (t) cellParas.push(t);
        }
        rowCells.push(cellParas.join(' '));
      }
      if (rowCells.some(c => c.length > 0)) {
        tableRows.push(rowCells);
        const rowText = '| ' + rowCells.join(' | ') + ' |';
        lines.push(rowText);
        details.push({
          text: rowText,
          taggedText: rowText,
          underlinedParts: []
        });
      }
    }
    if (tableRows.length > 0) tables.push(tableRows);
    lastIndex = tblMatch.index + tblXml.length;
  }

  if (lastIndex < bodyXml.length) {
    processParagraphSegment(bodyXml.slice(lastIndex));
  }

  return {
    text: lines.join('\n'),
    paragraphs: lines,
    paragraphDetails: details,
    tables
  };
}

// ============================================================================
// 3. MATH & FORMULA NORMALIZER FOR WORD (HIỂN THỊ CÔNG THỨC & KÝ HIỆU RÕ RÀNG)
// ============================================================================

/**
 * Chuyển đổi ký hiệu LaTeX / Toán / Lý / Hóa sang chuỗi Unicode & chỉ số trên/dưới rõ ràng trong Word
 */
function normalizeMathForWord(input) {
  if (input === null || input === undefined) return '';
  let s = String(input);

  // Loại bỏ cặp dấu $ bao quanh công thức LaTeX nhưng giữ nội dung bên trong
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^$\n]+?)\$/g, '$1');

  // Xử lý phân số \frac{a}{b} -> (a)/(b) hoặc a/b
  for (let i = 0; i < 3; i++) {
    s = s.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
      const n = num.trim();
      const d = den.trim();
      const nWrap = /[+\-\s]/.test(n) ? `(${n})` : n;
      const dWrap = /[+\-\s]/.test(d) ? `(${d})` : d;
      return `${nWrap}/${dWrap}`;
    });
  }

  // Căn bậc hai \sqrt[n]{x} và \sqrt{x}
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, ' căn bậc $1 của ($2)');
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, (_, inner) => {
    return inner.length <= 2 ? `√${inner}` : `√(${inner})`;
  });

  // Tích phân, giới hạn, tổng, vectơ
  s = s.replace(/\\int_\{([^{}]+)\}\^\{([^{}]+)\}/g, '∫(từ $1 đến $2) ');
  s = s.replace(/\\int/g, '∫');
  s = s.replace(/\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g, '∑($1→$2) ');
  s = s.replace(/\\sum/g, '∑');
  s = s.replace(/\\lim_\{([^{}]+)\}/g, 'lim($1) ');
  s = s.replace(/\\overrightarrow\{([^{}]+)\}/g, 'vectơ($1)');
  s = s.replace(/\\vec\{([^{}]+)\}/g, 'vectơ($1)');

  // Các ký hiệu Toán - Lý - Hóa phổ biến
  const latexSymbols = [
    [/\\pm/g, '±'], [/\\mp/g, '∓'], [/\\times/g, '×'], [/\\cdot/g, '·'], [/\\div/g, '÷'],
    [/\\le(?!q)/g, '≤'], [/\\leq/g, '≤'], [/\\ge(?!q)/g, '≥'], [/\\geq/g, '≥'],
    [/\\ne(?!q)/g, '≠'], [/\\neq/g, '≠'], [/\\approx/g, '≈'], [/\\equiv/g, '≡'],
    [/\\infty/g, '∞'], [/\\pi/g, 'π'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'], [/\\delta/g, 'δ'], [/\\Delta/g, 'Δ'], [/\\theta/g, 'θ'],
    [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'], [/\\omega/g, 'ω'], [/\\Omega/g, 'Ω'],
    [/\\sigma/g, 'σ'], [/\\phi/g, 'φ'], [/\\varphi/g, 'φ'],
    [/\\in\b/g, '∈'], [/\\notin\b/g, '∉'], [/\\subset/g, '⊂'], [/\\subseteq/g, '⊆'],
    [/\\cup/g, '∪'], [/\\cap/g, '∩'], [/\\emptyset/g, '∅'],
    [/\\mathbb\{R\}/g, 'ℝ'], [/\\mathbb\{Z\}/g, 'ℤ'], [/\\mathbb\{N\}/g, 'ℕ'], [/\\mathbb\{Q\}/g, 'ℚ'],
    [/\\rightarrow/g, '→'], [/\\to\b/g, '→'], [/\\Rightarrow/g, '⇒'],
    [/\\leftrightarrow/g, '↔'], [/\\Leftrightarrow/g, '⇔'], [/\\iff/g, '⇔'],
    [/\\perp/g, '⊥'], [/\\parallel/g, '∥'], [/\\angle/g, '∠'], [/\\triangle/g, '△'],
    [/\\circ/g, '°'], [/\\degree/g, '°'], [/\\left\(/g, '('], [/\\right\)/g, ')'],
    [/\\left\[/g, '['], [/\\right\]/g, ']'], [/\\left\\\{/g, '{'], [/\\right\\\}/g, '}'],
    [/\\left\|/g, '|'], [/\\right\|/g, '|'], [/\\,/g, ' '], [/\\;/g, ' '], [/\\quad/g, '  ']
  ];
  for (const [pattern, replacement] of latexSymbols) {
    s = s.replace(pattern, replacement);
  }

  return s;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Dựng chuỗi <w:r> hỗ trợ in đậm, nghiêng, gạch chân và chỉ số trên/dưới (x^2, H_2O, cm^3...)
 */
function buildFormattedRuns(rawText, opts = {}) {
  const text = normalizeMathForWord(rawText);
  const sz = opts.fontSizeHalfPt || 26; // Mặc định 13pt (26 half-points)
  const color = opts.color ? `<w:color w:val="${opts.color}"/>` : '';
  const boldTag = opts.bold ? '<w:b/><w:bCs/>' : '';
  const italicTag = opts.italic ? '<w:i/><w:iCs/>' : '';
  const underlineTag = opts.underline ? '<w:u w:val="single"/>' : '';

  const baseRPr = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${boldTag}${italicTag}${underlineTag}${color}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;

  // Tách các token có mũ ^{...}, ^2, hoặc chỉ số dưới _{...}, _2, công thức hóa học H2O, CO2, SO4...
  const tokenRegex = /(\^\{[^{}]+\}|\^[0-9+\-nxyz]+|_\{[^{}]+\}|_[0-9+\-nxyz]+)/g;
  const parts = text.split(tokenRegex);
  let xml = '';

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('^')) {
      const supText = part.startsWith('^{') ? part.slice(2, -1) : part.slice(1);
      xml += `<w:r><w:rPr>${baseRPr}<w:vertAlign w:val="superscript"/></w:rPr><w:t xml:space="preserve">${escapeXml(supText)}</w:t></w:r>`;
    } else if (part.startsWith('_')) {
      const subText = part.startsWith('_{') ? part.slice(2, -1) : part.slice(1);
      xml += `<w:r><w:rPr>${baseRPr}<w:vertAlign w:val="subscript"/></w:rPr><w:t xml:space="preserve">${escapeXml(subText)}</w:t></w:r>`;
    } else {
      // Hỗ trợ xuống dòng trong cùng đoạn
      const lines = part.split('\n');
      lines.forEach((line, idx) => {
        if (idx > 0) {
          xml += `<w:r><w:rPr>${baseRPr}</w:rPr><w:br/></w:r>`;
        }
        if (line.length > 0) {
          xml += `<w:r><w:rPr>${baseRPr}</w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`;
        }
      });
    }
  }

  return xml || `<w:r><w:rPr>${baseRPr}</w:rPr><w:t></w:t></w:r>`;
}

function wParagraph(text, opts = {}) {
  const align = opts.align || 'left'; // left, center, right, both
  const spaceBefore = opts.spaceBefore !== undefined ? opts.spaceBefore : 60;
  const spaceAfter = opts.spaceAfter !== undefined ? opts.spaceAfter : 80;
  const line = opts.line || 276; // 1.15 line spacing
  const indentFirst = opts.indentFirst ? `<w:ind w:firstLine="${opts.indentFirst}"/>` : '';
  const keepNext = opts.keepNext ? '<w:keepNext/>' : '';
  const pageBreakBefore = opts.pageBreakBefore ? '<w:pageBreakBefore/>' : '';

  const pPr = `<w:pPr>${keepNext}${pageBreakBefore}<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="${line}" w:lineRule="auto"/>${indentFirst}<w:jc w:val="${align}"/></w:pPr>`;

  if (Array.isArray(text)) {
    // Mảng các đoạn run có định dạng khác nhau trên cùng 1 dòng
    const runsXml = text.map(seg => buildFormattedRuns(seg.text, { ...opts, ...seg })).join('');
    return `<w:p>${pPr}${runsXml}</w:p>`;
  }
  return `<w:p>${pPr}${buildFormattedRuns(text, opts)}</w:p>`;
}

function wPageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

/**
 * Tạo bảng Word chuẩn khổ A4, tự động co giãn vừa trang (không bao giờ tràn trang)
 * @param {Array} headers - Mảng tiêu đề cột: [{ text, widthPct }]
 * @param {Array} rows - Mảng dòng: mỗi dòng là mảng ô (string hoặc { text, align, bold, bg, fontSizeHalfPt })
 */
function wTable(headers, rows, opts = {}) {
  const fontSize = opts.fontSizeHalfPt || 24; // 12pt-13pt cho bảng nhiều cột để không tràn
  const borderColor = opts.borderColor || '333333';
  const headerBg = opts.headerBg || 'E8EEF5';

  const tblPr = `
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:jc w:val="center"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="${borderColor}"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="${borderColor}"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="70" w:type="dxa"/>
        <w:left w:w="90" w:type="dxa"/>
        <w:bottom w:w="70" w:type="dxa"/>
        <w:right w:w="90" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblLayout w:type="autofit"/>
    </w:tblPr>`;

  // Hàng tiêu đề lặp lại khi sang trang (<w:tblHeader/>)
  let headerRowXml = '<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>';
  for (const h of headers) {
    const label = typeof h === 'object' ? h.text : String(h);
    const wPct = (typeof h === 'object' && h.widthPct) ? Math.round(h.widthPct * 50) : Math.round(5000 / headers.length);
    headerRowXml += `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${wPct}" w:type="pct"/>
          <w:shd w:val="clear" w:color="auto" w:fill="${headerBg}"/>
          <w:vAlign w:val="center"/>
        </w:tcPr>
        ${wParagraph(label, { bold: true, align: 'center', fontSizeHalfPt: fontSize, spaceBefore: 40, spaceAfter: 40 })}
      </w:tc>`;
  }
  headerRowXml += '</w:tr>';

  // Các hàng dữ liệu
  let bodyRowsXml = '';
  for (const row of rows) {
    bodyRowsXml += '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
    row.forEach((cell, idx) => {
      const h = headers[idx] || {};
      const wPct = h.widthPct ? Math.round(h.widthPct * 50) : Math.round(5000 / headers.length);
      const isObj = cell !== null && typeof cell === 'object' && !Array.isArray(cell);
      const cellText = isObj ? cell.text : cell;
      const cellAlign = isObj && cell.align ? cell.align : 'left';
      const cellBold = isObj ? !!cell.bold : false;
      const cellItalic = isObj ? !!cell.italic : false;
      const cellBg = isObj && cell.bg ? `<w:shd w:val="clear" w:color="auto" w:fill="${cell.bg}"/>` : '';
      const cellFontSz = isObj && cell.fontSizeHalfPt ? cell.fontSizeHalfPt : fontSize;

      bodyRowsXml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${wPct}" w:type="pct"/>
            ${cellBg}
            <w:vAlign w:val="center"/>
          </w:tcPr>
          ${wParagraph(cellText, { bold: cellBold, italic: cellItalic, align: cellAlign, fontSizeHalfPt: cellFontSz, spaceBefore: 30, spaceAfter: 30 })}
        </w:tc>`;
    });
    bodyRowsXml += '</w:tr>';
  }

  return `<w:tbl>${tblPr}${headerRowXml}${bodyRowsXml}</w:tbl>`;
}

/**
 * Bảng không viền (Borderless Table) chuẩn Word OpenXML
 * Dùng để căn chỉnh tuyệt đối các cột phương án trắc nghiệm A, B, C, D không bao giờ bị xô lệch
 */
function wBorderlessTable(rows, opts = {}) {
  let tblPr = `
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:jc w:val="left"/>
      <w:tblBorders>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="20" w:type="dxa"/>
        <w:left w:w="40" w:type="dxa"/>
        <w:bottom w:w="20" w:type="dxa"/>
        <w:right w:w="40" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblLayout w:type="autofit"/>
    </w:tblPr>`;

  let bodyRowsXml = '';
  for (const row of rows) {
    bodyRowsXml += '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
    for (const cell of row) {
      const wPct = Math.round((cell.widthPct || 25) * 50); // 25% -> 1250, 50% -> 2500
      bodyRowsXml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${wPct}" w:type="pct"/>
            <w:vAlign w:val="top"/>
          </w:tcPr>
          ${wParagraph([
            { text: cell.label, bold: true, fontSizeHalfPt: 26, underline: cell.isUnderlined },
            { text: cell.text, bold: false, fontSizeHalfPt: 26, underline: cell.isUnderlined }
          ], { spaceBefore: 20, spaceAfter: 20, line: 260 })}
        </w:tc>`;
    }
    bodyRowsXml += '</w:tr>';
  }

  return `<w:tbl>${tblPr}${bodyRowsXml}</w:tbl>`;
}

/**
 * Căn chỉnh thông minh các phương án trắc nghiệm A, B, C, D chuẩn thể thức đề thi Bộ GD&ĐT
 * - Dàn 1 hàng 4 cột (mỗi cột 25%): khi cả 4 phương án đều ngắn (maxLen <= 18 và totalLen <= 68)
 * - Dàn 2 hàng 2 cột (mỗi cột 50%): khi độ dài trung bình (maxLen <= 45), A & C thẳng hàng, B & D thẳng hàng
 * - Dàn 4 dòng: khi có phương án dài (> 45 ký tự)
 */
function renderMcqOptionsWord(rawOpts, correctAnswer = null, showUnderline = false) {
  const opts = (rawOpts || []).map(o => String(o || '').replace(/^[A-D][\.\)]\s*/, '').trim());
  const labels = ['A', 'B', 'C', 'D'];
  const maxLen = Math.max(...opts.map(o => o.length), 0);
  const totalLen = opts.reduce((s, o) => s + o.length, 0);

  const makeCell = (idx, widthPct) => ({
    label: `${labels[idx]}. `,
    text: opts[idx] || '',
    isUnderlined: showUnderline && (correctAnswer === labels[idx]),
    widthPct
  });

  // 1. Trường hợp cả 4 phương án đều ngắn (maxLen <= 18 và tổng độ dài <= 68) -> Dàn 1 hàng 4 cột thẳng tắp (mỗi cột 25%)
  if (opts.length === 4 && maxLen <= 18 && totalLen <= 68) {
    return wBorderlessTable([
      [makeCell(0, 25), makeCell(1, 25), makeCell(2, 25), makeCell(3, 25)]
    ]);
  }

  // 2. Trường hợp độ dài trung bình (maxLen <= 45) -> Dàn 2 hàng 2 cột thẳng tắp (mỗi cột 50%)
  // Hàng 1: A và B; Hàng 2: C và D
  if (opts.length === 4 && maxLen <= 45) {
    return wBorderlessTable([
      [makeCell(0, 50), makeCell(1, 50)],
      [makeCell(2, 50), makeCell(3, 50)]
    ]);
  }

  // 3. Trường hợp phương án dài (> 45 ký tự hoặc chứa xuống dòng) -> Mỗi phương án 1 dòng riêng biệt
  let xml = '';
  opts.forEach((optText, oIdx) => {
    const lbl = labels[oIdx];
    const isUnderlined = showUnderline && (correctAnswer === lbl);
    xml += wParagraph([
      { text: `    ${lbl}. `, bold: true, fontSizeHalfPt: 26, underline: isUnderlined },
      { text: optText, fontSizeHalfPt: 26, underline: isUnderlined }
    ], { spaceBefore: 20, spaceAfter: 30, align: 'both' });
  });
  return xml;
}


/**
 * Bảng tiêu đề hành chính không viền (2 cột: Sở/Phòng/Trường bên trái, Quốc hiệu/Kỳ thi bên phải)
 */
function wHeaderBanner(meta, docTitle, subTitle, variantCode = null) {
  const schoolName = (meta.schoolName || 'TRƯỜNG ........................').toUpperCase();
  const deptName = (meta.departmentName || `TỔ ${meta.subject || 'CHUYÊN MÔN'}`).toUpperCase();
  const periodName = (meta.examPeriod || 'KIỂM TRA ĐỊNH KỲ').toUpperCase();
  const schoolYear = meta.schoolYear || '2026 - 2027';

  return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="666666"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="2100" w:type="pct"/></w:tcPr>
          ${wParagraph(schoolName, { bold: true, align: 'center', fontSizeHalfPt: 24, spaceBefore: 20, spaceAfter: 20 })}
          ${wParagraph(deptName, { bold: false, align: 'center', fontSizeHalfPt: 24, spaceBefore: 10, spaceAfter: 20 })}
          ${wParagraph('───────', { bold: true, align: 'center', fontSizeHalfPt: 20, spaceBefore: 0, spaceAfter: 40 })}
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="2900" w:type="pct"/></w:tcPr>
          ${wParagraph(docTitle, { bold: true, align: 'center', fontSizeHalfPt: 26, spaceBefore: 20, spaceAfter: 20 })}
          ${wParagraph(`${periodName} - NĂM HỌC ${schoolYear}`, { bold: true, align: 'center', fontSizeHalfPt: 24, spaceBefore: 10, spaceAfter: 20 })}
          ${wParagraph(`Môn: ${meta.subject || ''} - Lớp ${meta.grade || ''} (${meta.textbook || 'CT GDPT 2018'})`, { bold: true, align: 'center', fontSizeHalfPt: 26, spaceBefore: 10, spaceAfter: 20 })}
          ${wParagraph(`Thời gian làm bài: ${meta.duration || 45} phút (không kể thời gian phát đề)`, { italic: true, align: 'center', fontSizeHalfPt: 24, spaceBefore: 10, spaceAfter: 40 })}
          ${variantCode ? wParagraph(`MÃ ĐỀ: ${variantCode}`, { bold: true, align: 'center', fontSizeHalfPt: 26, spaceBefore: 10, spaceAfter: 40 }) : (subTitle ? wParagraph(subTitle, { italic: true, align: 'center', fontSizeHalfPt: 24, spaceBefore: 10, spaceAfter: 40 }) : '')}
        </w:tc>
      </w:tr>
    </w:tbl>`;
}

// ============================================================================
// 4. DỰNG NỘI DUNG TỪNG PHẦN HỒ SƠ ĐỀ KIỂM TRA TRONG WORD
// ============================================================================

function buildMatrixSectionXml(examData) {
  const meta = examData.metadata || {};
  const matrix = examData.matrix || {};
  const levels = matrix.levels || ['Biết', 'Hiểu', 'Vận dụng'];
  const rows = matrix.rows || [];
  const qTypes = matrix.questionTypes || ['MCQ', 'TF', 'SA', 'ESSAY'];

  const qTypeLabels = {
    MCQ: 'TN nhiều lựa chọn',
    TF: 'TN Đúng/Sai (ý)',
    SA: 'TN Trả lời ngắn',
    ESSAY: 'Tự luận'
  };

  let xml = '';
  xml += wHeaderBanner(meta, 'MA TRẬN ĐỀ KIỂM TRA ĐỊNH KỲ', 'Quy chuẩn áp dụng: Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH');
  xml += wParagraph('', { spaceBefore: 40, spaceAfter: 40 });

  // Thiết kế cột bảng Ma trận gọn gàng, vừa khổ A4
  const headers = [
    { text: 'TT', widthPct: 5 },
    { text: 'Chủ đề / Chương', widthPct: 20 },
    { text: 'Nội dung / Đơn vị kiến thức', widthPct: 24 }
  ];

  const levelWidth = Math.floor(33 / levels.length);
  for (const lv of levels) {
    headers.push({ text: `${lv}\n(Số câu / Loại)`, widthPct: levelWidth });
  }
  headers.push({ text: 'Tổng câu / ý', widthPct: 9 });
  headers.push({ text: 'Điểm số (Tỷ lệ %)', widthPct: 9 });

  const tableRows = [];
  const levelTotals = {};
  const levelPoints = {};
  levels.forEach(lv => { levelTotals[lv] = 0; levelPoints[lv] = 0; });
  let grandTotalItems = 0;
  let grandTotalPoints = 0;

  rows.forEach((r, idx) => {
    let rowTotalItems = 0;
    const rowCells = [
      { text: String(idx + 1), align: 'center' },
      { text: r.topic || '', bold: true },
      { text: r.unit || '' }
    ];

    for (const lv of levels) {
      const details = [];
      for (const qt of qTypes) {
        const cnt = (r.counts && r.counts[qt] && Number(r.counts[qt][lv])) || 0;
        if (cnt > 0) {
          const shortLabel = qt === 'MCQ' ? 'TN' : qt === 'TF' ? 'ĐS(ý)' : qt === 'SA' ? 'TLN' : 'TL';
          const codeStr = (r.cellCodes && r.cellCodes[qt] && r.cellCodes[qt][lv]) ? ` (${r.cellCodes[qt][lv]})` : '';
          details.push(`${cnt} ${shortLabel}${codeStr}`);
          rowTotalItems += cnt;
          levelTotals[lv] += cnt;

          // Ước tính điểm theo mức độ
          const ptPerItem = (matrix.pointRules && matrix.pointRules[qt]) || (qt === 'MCQ' ? 0.25 : qt === 'TF' ? 0.25 : qt === 'SA' ? 0.5 : 1.0);
          levelPoints[lv] += cnt * ptPerItem;
        }
      }
      rowCells.push({
        text: details.length > 0 ? details.join('\n') : '-',
        align: 'center'
      });
    }

    const rowPt = Number(r.points || 0);
    grandTotalItems += rowTotalItems;
    grandTotalPoints += rowPt;
    const pct = Math.round(rowPt * 10);

    rowCells.push({ text: String(rowTotalItems), align: 'center', bold: true });
    rowCells.push({ text: `${rowPt.toFixed(2).replace(/\.00$/, '.0')}đ (${pct}%)`, align: 'center', bold: true });
    tableRows.push(rowCells);
  });

  // Hàng tổng cộng
  const sumRow = [
    { text: '', align: 'center', bg: 'F2F5F8' },
    { text: 'TỔNG CỘNG TOÀN ĐỀ', bold: true, align: 'center', bg: 'F2F5F8' },
    { text: `${rows.length} đơn vị kiến thức`, italic: true, align: 'center', bg: 'F2F5F8' }
  ];
  for (const lv of levels) {
    const lvPt = levelPoints[lv];
    const lvPct = grandTotalPoints > 0 ? Math.round((lvPt / grandTotalPoints) * 100) : 0;
    sumRow.push({
      text: `${levelTotals[lv]} câu/ý\n(~${lvPt.toFixed(2).replace(/\.00$/, '.0')}đ | ${lvPct}%)`,
      bold: true,
      align: 'center',
      bg: 'F2F5F8'
    });
  }
  sumRow.push({ text: String(grandTotalItems), bold: true, align: 'center', bg: 'F2F5F8' });
  sumRow.push({ text: `${grandTotalPoints.toFixed(1)}đ (100%)`, bold: true, align: 'center', bg: 'F2F5F8' });
  tableRows.push(sumRow);

  xml += wTable(headers, tableRows, { fontSizeHalfPt: 23 });

  if (meta.localGuidelines) {
    xml += wParagraph([
      { text: 'Ghi chú / Hướng dẫn chuyên môn áp dụng: ', bold: true, fontSizeHalfPt: 24 },
      { text: meta.localGuidelines, italic: true, fontSizeHalfPt: 24 }
    ], { spaceBefore: 120, spaceAfter: 80 });
  }

  return xml;
}

function buildSpecificationSectionXml(examData) {
  const meta = examData.metadata || {};
  const matrix = examData.matrix || {};
  const levels = matrix.levels || ['Biết', 'Hiểu', 'Vận dụng'];
  const specs = examData.specification || [];

  let xml = '';
  xml += wHeaderBanner(meta, 'BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KỲ', 'Chi tiết Yêu cầu cần đạt và vị trí câu hỏi theo Chương trình GDPT 2018');
  xml += wParagraph('', { spaceBefore: 40, spaceAfter: 40 });

  const headers = [
    { text: 'TT', widthPct: 5 },
    { text: 'Chủ đề / Chương', widthPct: 18 },
    { text: 'Nội dung / Đơn vị kiến thức', widthPct: 18 },
    { text: 'Mức độ đánh giá & Yêu cầu cần đạt', widthPct: 41 },
    { text: 'Mã câu hỏi & Dạng thức', widthPct: 18 }
  ];

  const tableRows = [];
  specs.forEach((sp, idx) => {
    const outcomeLines = [];
    for (const lv of levels) {
      const text = (sp.outcomes && sp.outcomes[lv]) || '';
      if (text) {
        outcomeLines.push(`• ${lv}: ${text}`);
      }
    }

    const refLines = [];
    if (sp.questionRefs) {
      for (const [qt, refs] of Object.entries(sp.questionRefs)) {
        if (Array.isArray(refs) && refs.length > 0) {
          const qtLabel = qt === 'MCQ' ? 'TN nhiều lựa chọn' : qt === 'TF' ? 'TN Đúng/Sai' : qt === 'SA' ? 'Trả lời ngắn' : 'Tự luận';
          refLines.push(`${qtLabel}: ${refs.join(', ')}`);
        }
      }
    }

    tableRows.push([
      { text: String(idx + 1), align: 'center' },
      { text: sp.topic || '', bold: true },
      { text: sp.unit || '' },
      { text: outcomeLines.join('\n') || 'Bám sát yêu cầu cần đạt của chương trình.' },
      { text: refLines.join('\n') || '-', align: 'center', bold: true }
    ]);
  });

  xml += wTable(headers, tableRows, { fontSizeHalfPt: 24 });
  return xml;
}

/**
 * Dựng ĐỀ KIỂM TRA HỌC SINH (Tuyệt đối KHÔNG chứa đáp án, KHÔNG chứa lời giải, KHÔNG lộ mức độ nhận thức)
 */
function buildStudentExamVariantXml(examData, variantObj) {
  const meta = examData.metadata || {};
  const variantCode = variantObj.code || '101';
  const questions = variantObj.questions || examData.questions || [];

  let xml = '';
  xml += wHeaderBanner(meta, 'ĐỀ KIỂM TRA CHÍNH THỨC', '(Đề kiểm tra có đầy đủ các phần theo quy định)', variantCode);
  xml += wParagraph('', { spaceBefore: 40, spaceAfter: 40 });

  // Khung thông tin Học sinh (Họ tên, Lớp, SBD)
  xml += wTable(
    [
      { text: 'Họ và tên học sinh: ........................................................................', widthPct: 55 },
      { text: 'Lớp: .................   Số báo danh: .................', widthPct: 45 }
    ],
    [],
    { fontSizeHalfPt: 25, headerBg: 'FFFFFF' }
  );
  xml += wParagraph('', { spaceBefore: 40, spaceAfter: 60 });

  // Nếu có Ngữ liệu chung (ví dụ Listening Transcript bị ẩn đối với học sinh, chỉ hiện Reading Passage hoặc Ngữ liệu Đọc hiểu Ngữ văn)
  if (examData.readingPassage && examData.readingPassage.trim()) {
    xml += wParagraph('NGỮ LIỆU ĐỌC HIỂU:', { bold: true, underline: true, fontSizeHalfPt: 26, spaceBefore: 80, spaceAfter: 60 });
    for (const para of examData.readingPassage.split('\n')) {
      if (para.trim()) {
        xml += wParagraph(para.trim(), { align: 'both', fontSizeHalfPt: 26, spaceBefore: 40, spaceAfter: 60 });
      }
    }
  }

  // Nhóm câu hỏi theo từng Phần (MCQ, TF, SA, ESSAY)
  const mcqList = questions.filter(q => q.type === 'MCQ');
  const tfList = questions.filter(q => q.type === 'TF');
  const saList = questions.filter(q => q.type === 'SA');
  const essayList = questions.filter(q => q.type === 'ESSAY');

  let partIndex = 1;
  const roman = ['I', 'II', 'III', 'IV', 'V'];

  // PHẦN TRẮC NGHIỆM NHIỀU LỰA CHỌN
  if (mcqList.length > 0) {
    const totalMcqPts = mcqList.reduce((acc, q) => acc + Number(q.points || 0.25), 0);
    xml += wParagraph(
      `PHẦN ${roman[partIndex - 1]}. TRẮC NGHIỆM NHIỀU LỰA CHỌN (${totalMcqPts.toFixed(2).replace(/\.00$/, '.0')} điểm)`,
      { bold: true, fontSizeHalfPt: 26, spaceBefore: 120, spaceAfter: 40, keepNext: true }
    );
    xml += wParagraph(
      `Thí sinh trả lời từ câu 1 đến câu ${mcqList.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án đúng nhất (A, B, C hoặc D).`,
      { italic: true, fontSizeHalfPt: 25, spaceBefore: 20, spaceAfter: 80 }
    );
    partIndex++;

    mcqList.forEach((q, idx) => {
      if (q.passage && q.passage.trim()) {
        xml += wParagraph(q.passage.trim(), { italic: true, align: 'both', fontSizeHalfPt: 26, spaceBefore: 60, spaceAfter: 40 });
      }
      xml += wParagraph([
        { text: `Câu ${idx + 1}: `, bold: true, fontSizeHalfPt: 26 },
        { text: q.stem || '', bold: false, fontSizeHalfPt: 26 }
      ], { align: 'both', spaceBefore: 60, spaceAfter: 40, keepNext: true });

      xml += renderMcqOptionsWord(q.options || []);
    });
  }

  // PHẦN TRẮC NGHIỆM ĐÚNG - SAI (Mỗi câu có 4 ý a, b, c, d)
  if (tfList.length > 0) {
    const totalTfPts = tfList.reduce((acc, q) => acc + Number(q.points || 1.0), 0);
    xml += wParagraph(
      `PHẦN ${roman[partIndex - 1]}. TRẮC NGHIỆM ĐÚNG - SAI (${totalTfPts.toFixed(2).replace(/\.00$/, '.0')} điểm)`,
      { bold: true, fontSizeHalfPt: 26, spaceBefore: 140, spaceAfter: 40, keepNext: true }
    );
    xml += wParagraph(
      `Thí sinh trả lời từ câu 1 đến câu ${tfList.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng (Đ) hoặc Sai (S).`,
      { italic: true, fontSizeHalfPt: 25, spaceBefore: 20, spaceAfter: 80 }
    );
    partIndex++;

    tfList.forEach((q, idx) => {
      xml += wParagraph([
        { text: `Câu ${idx + 1}: `, bold: true, fontSizeHalfPt: 26 },
        { text: q.stem || '', bold: false, fontSizeHalfPt: 26 }
      ], { align: 'both', spaceBefore: 80, spaceAfter: 40, keepNext: true });

      const subItems = q.statements || q.subItems || [];
      const subLabels = ['a)', 'b)', 'c)', 'd)'];
      subItems.forEach((item, sIdx) => {
        const stmtText = typeof item === 'object' ? (item.text || item.statement || '') : String(item);
        const cleanStmt = stmtText.replace(/^[a-d][\.\)]\s*/i, '');
        xml += wParagraph([
          { text: `    ${subLabels[sIdx] || `${sIdx + 1})`} `, bold: true, fontSizeHalfPt: 26 },
          { text: cleanStmt, fontSizeHalfPt: 26 }
        ], { align: 'both', spaceBefore: 20, spaceAfter: 30 });
      });
    });
  }

  // PHẦN TRẮC NGHIỆM TRẢ LỜI NGẮN
  if (saList.length > 0) {
    const totalSaPts = saList.reduce((acc, q) => acc + Number(q.points || 0.5), 0);
    xml += wParagraph(
      `PHẦN ${roman[partIndex - 1]}. TRẮC NGHIỆM TRẢ LỜI NGẮN (${totalSaPts.toFixed(2).replace(/\.00$/, '.0')} điểm)`,
      { bold: true, fontSizeHalfPt: 26, spaceBefore: 140, spaceAfter: 40, keepNext: true }
    );
    xml += wParagraph(
      `Thí sinh trả lời từ câu 1 đến câu ${saList.length} bằng cách ghi kết quả/đáp số ngắn gọn vào bài làm.`,
      { italic: true, fontSizeHalfPt: 25, spaceBefore: 20, spaceAfter: 80 }
    );
    partIndex++;

    saList.forEach((q, idx) => {
      xml += wParagraph([
        { text: `Câu ${idx + 1}: `, bold: true, fontSizeHalfPt: 26 },
        { text: q.stem || '', bold: false, fontSizeHalfPt: 26 }
      ], { align: 'both', spaceBefore: 60, spaceAfter: 40 });
      xml += wParagraph('Đáp số: ................................................', { italic: true, fontSizeHalfPt: 25, spaceBefore: 20, spaceAfter: 60 });
    });
  }

  // PHẦN TỰ LUẬN (Hoặc Đọc hiểu & Viết đối với môn Ngữ văn)
  if (essayList.length > 0) {
    const totalEssayPts = essayList.reduce((acc, q) => acc + Number(q.points || 1.0), 0);
    const isLiterature = (meta.subject || '').toLowerCase().includes('ngữ văn') || (meta.subject || '').toLowerCase().includes('tiếng việt');
    const sectionHeader = isLiterature && mcqList.length === 0 && tfList.length === 0 && saList.length === 0
      ? `NỘI DUNG ĐỀ KIỂM TRA (${totalEssayPts.toFixed(2).replace(/\.00$/, '.0')} điểm)`
      : `PHẦN ${roman[partIndex - 1]}. TỰ LUẬN (${totalEssayPts.toFixed(2).replace(/\.00$/, '.0')} điểm)`;

    xml += wParagraph(sectionHeader, { bold: true, fontSizeHalfPt: 26, spaceBefore: 140, spaceAfter: 60, keepNext: true });

    essayList.forEach((q, idx) => {
      if (q.sectionTitle) {
        xml += wParagraph(q.sectionTitle, { bold: true, fontSizeHalfPt: 26, spaceBefore: 100, spaceAfter: 40, keepNext: true });
      }
      if (q.passage && q.passage.trim()) {
        for (const line of q.passage.split('\n')) {
          if (line.trim()) {
            xml += wParagraph(line.trim(), { align: 'both', fontSizeHalfPt: 26, spaceBefore: 30, spaceAfter: 40 });
          }
        }
      }
      const ptLabel = Number(q.points || 1.0).toFixed(2).replace(/\.00$/, '.0');
      xml += wParagraph([
        { text: `Câu ${idx + 1} (${ptLabel} điểm): `, bold: true, fontSizeHalfPt: 26 },
        { text: q.stem || '', bold: false, fontSizeHalfPt: 26 }
      ], { align: 'both', spaceBefore: 60, spaceAfter: 60 });
    });
  }

  xml += wParagraph('─────────────── HẾT ───────────────', { bold: true, align: 'center', fontSizeHalfPt: 26, spaceBefore: 160, spaceAfter: 40 });
  xml += wParagraph('(Thí sinh không được sử dụng tài liệu. Giám thị không giải thích gì thêm)', { italic: true, align: 'center', fontSizeHalfPt: 24, spaceBefore: 20, spaceAfter: 80 });

  return xml;
}

/**
 * Dựng ĐÁP ÁN, HƯỚNG DẪN CHẤM VÀ THANG ĐIỂM CHI TIẾT (Bao gồm cả Transcript nghe Tiếng Anh nếu có)
 */
function buildAnswerKeySectionXml(examData) {
  const meta = examData.metadata || {};
  const variants = (examData.variants && examData.variants.length > 0)
    ? examData.variants
    : [{ code: '101', questions: examData.questions || [] }];

  let xml = '';
  xml += wHeaderBanner(meta, 'ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM CHI TIẾT', `Áp dụng cho ${variants.length} mã đề: ${variants.map(v => v.code).join(', ')}`);
  xml += wParagraph('', { spaceBefore: 40, spaceAfter: 40 });

  // Nếu có bài nghe Tiếng Anh (Listening Transcript / Tapescript) -> In rõ trong Hướng dẫn chấm cho giáo viên
  if (examData.listeningTranscript && examData.listeningTranscript.trim()) {
    xml += wParagraph('NỘI DUNG BÀI NGHE (LISTENING TAPESCRIPT / TRANSCRIPT DÀNH CHO GIÁO VIÊN):', {
      bold: true,
      underline: true,
      fontSizeHalfPt: 26,
      spaceBefore: 80,
      spaceAfter: 40
    });
    for (const line of examData.listeningTranscript.split('\n')) {
      if (line.trim()) {
        xml += wParagraph(line.trim(), { italic: true, align: 'both', fontSizeHalfPt: 25, spaceBefore: 20, spaceAfter: 30 });
      }
    }
    xml += wParagraph('', { spaceBefore: 40, spaceAfter: 40 });
  }

  // 1. Bảng tổng hợp đáp án nhanh cho tất cả các mã đề (Phần MCQ)
  const baseQuestions = variants[0].questions || [];
  const mcqCount = baseQuestions.filter(q => q.type === 'MCQ').length;

  if (mcqCount > 0) {
    xml += wParagraph('I. BẢNG ĐÁP ÁN TRẮC NGHIỆM NHIỀU LỰA CHỌN (CÁC MÃ ĐỀ):', {
      bold: true,
      fontSizeHalfPt: 26,
      spaceBefore: 80,
      spaceAfter: 40,
      keepNext: true
    });

    const headers = [{ text: 'Câu', widthPct: 12 }];
    const colW = Math.floor(88 / variants.length);
    for (const v of variants) {
      headers.push({ text: `Mã đề ${v.code}`, widthPct: colW });
    }

    const ansRows = [];
    for (let i = 0; i < mcqCount; i++) {
      const row = [{ text: `Câu ${i + 1}`, align: 'center', bold: true }];
      for (const v of variants) {
        const vMcqs = (v.questions || []).filter(q => q.type === 'MCQ');
        const q = vMcqs[i];
        row.push({ text: (q && q.answer) ? String(q.answer) : 'A', align: 'center', bold: true });
      }
      ansRows.push(row);
    }
    xml += wTable(headers, ansRows, { fontSizeHalfPt: 24 });
    xml += wParagraph('', { spaceBefore: 40, spaceAfter: 40 });
  }

  // 2. Bảng đáp án Đúng - Sai, Trả lời ngắn, Tự luận và lời giải chi tiết (theo mã đề gốc 101 & ánh xạ)
  for (let vIdx = 0; vIdx < variants.length; vIdx++) {
    const v = variants[vIdx];
    const vQuestions = v.questions || [];
    const tfList = vQuestions.filter(q => q.type === 'TF');
    const saList = vQuestions.filter(q => q.type === 'SA');
    const essayList = vQuestions.filter(q => q.type === 'ESSAY');

    if (tfList.length > 0) {
      xml += wParagraph(`ĐÁP ÁN TRẮC NGHIỆM ĐÚNG - SAI (MÃ ĐỀ ${v.code}):`, {
        bold: true,
        fontSizeHalfPt: 26,
        spaceBefore: 80,
        spaceAfter: 30,
        keepNext: true
      });
      xml += wParagraph(
        'Quy tắc tính điểm mỗi câu Đúng/Sai (4 ý): Đúng 1 ý được 0,1 điểm; đúng 2 ý được 0,25 điểm; đúng 3 ý được 0,5 điểm; đúng cả 4 ý được 1,0 điểm.',
        { italic: true, fontSizeHalfPt: 24, spaceBefore: 10, spaceAfter: 40 }
      );

      const tfHeaders = [
        { text: 'Câu', widthPct: 12 },
        { text: 'Ý a)', widthPct: 14 },
        { text: 'Ý b)', widthPct: 14 },
        { text: 'Ý c)', widthPct: 14 },
        { text: 'Ý d)', widthPct: 14 },
        { text: 'Mã Ma trận', widthPct: 18 },
        { text: 'Điểm tối đa', widthPct: 14 }
      ];
      const tfRows = tfList.map((q, idx) => {
        const stmts = q.statements || q.subItems || [];
        return [
          { text: `Câu ${idx + 1}`, align: 'center', bold: true },
          { text: stmts[0] && (stmts[0].isTrue || stmts[0].answer === 'Đ' || stmts[0].answer === true) ? 'Đúng (Đ)' : 'Sai (S)', align: 'center', bold: true },
          { text: stmts[1] && (stmts[1].isTrue || stmts[1].answer === 'Đ' || stmts[1].answer === true) ? 'Đúng (Đ)' : 'Sai (S)', align: 'center', bold: true },
          { text: stmts[2] && (stmts[2].isTrue || stmts[2].answer === 'Đ' || stmts[2].answer === true) ? 'Đúng (Đ)' : 'Sai (S)', align: 'center', bold: true },
          { text: stmts[3] && (stmts[3].isTrue || stmts[3].answer === 'Đ' || stmts[3].answer === true) ? 'Đúng (Đ)' : 'Sai (S)', align: 'center', bold: true },
          { text: q.matrixRef || '-', align: 'center' },
          { text: `${Number(q.points || 1.0).toFixed(2).replace(/\.00$/, '.0')}đ`, align: 'center', bold: true }
        ];
      });
      xml += wTable(tfHeaders, tfRows, { fontSizeHalfPt: 24 });
    }

    if (saList.length > 0) {
      xml += wParagraph(`ĐÁP ÁN TRẮC NGHIỆM TRẢ LỜI NGẮN (MÃ ĐỀ ${v.code}):`, {
        bold: true,
        fontSizeHalfPt: 26,
        spaceBefore: 80,
        spaceAfter: 30,
        keepNext: true
      });
      const saHeaders = [
        { text: 'Câu', widthPct: 15 },
        { text: 'Đáp số chuẩn', widthPct: 35 },
        { text: 'Mã Ma trận & Mức độ', widthPct: 30 },
        { text: 'Điểm số', widthPct: 20 }
      ];
      const saRows = saList.map((q, idx) => [
        { text: `Câu ${idx + 1}`, align: 'center', bold: true },
        { text: String(q.answer !== undefined ? q.answer : ''), align: 'center', bold: true },
        { text: `${q.matrixRef || ''} (${q.level || ''})`, align: 'center' },
        { text: `${Number(q.points || 0.5).toFixed(2).replace(/\.00$/, '.0')}đ`, align: 'center', bold: true }
      ]);
      xml += wTable(saHeaders, saRows, { fontSizeHalfPt: 24 });
    }

    // Chỉ cần in hướng dẫn giải chi tiết ở mã đề đầu tiên để tránh trùng lặp dài dòng, hoặc in đầy đủ cho phần tự luận
    if (vIdx === 0) {
      if (essayList.length > 0) {
        xml += wParagraph('HƯỚNG DẪN CHẤM VÀ BIỂU ĐIỂM TỰ LUẬN CHI TIẾT:', {
          bold: true,
          fontSizeHalfPt: 26,
          spaceBefore: 100,
          spaceAfter: 40,
          keepNext: true
        });
        const essayHeaders = [
          { text: 'Câu / Phần', widthPct: 14 },
          { text: 'Nội dung yêu cầu / Hướng dẫn chấm chi tiết', widthPct: 72 },
          { text: 'Điểm', widthPct: 14 }
        ];
        const essayRows = essayList.map((q, idx) => [
          { text: `Câu ${idx + 1}\n(${q.matrixRef || q.level || ''})`, align: 'center', bold: true },
          { text: q.explanation || q.rubric || q.answer || 'Học sinh trình bày đúng phương pháp, lập luận chặt chẽ, kết quả chính xác được điểm tối đa.' },
          { text: `${Number(q.points || 1.0).toFixed(2).replace(/\.00$/, '.0')}đ`, align: 'center', bold: true }
        ]);
        xml += wTable(essayHeaders, essayRows, { fontSizeHalfPt: 24 });
      }

      // Lời giải chi tiết cho các câu Trắc nghiệm / Đúng Sai / Trả lời ngắn
      const nonEssayList = vQuestions.filter(q => q.type !== 'ESSAY');
      if (nonEssayList.length > 0) {
        xml += wParagraph(`LỜI GIẢI CHI TIẾT VÀ ĐỐI CHIẾU MA TRẬN (MÃ ĐỀ GỐC ${v.code}):`, {
          bold: true,
          fontSizeHalfPt: 26,
          spaceBefore: 100,
          spaceAfter: 40,
          keepNext: true
        });
        nonEssayList.forEach((q, idx) => {
          const typeLabel = q.type === 'MCQ' ? 'TN' : q.type === 'TF' ? 'Đúng/Sai' : 'TLN';
          let ansSummary = q.answer || '';
          if (q.type === 'TF' && Array.isArray(q.statements)) {
            ansSummary = q.statements.map((s, si) => `${['a', 'b', 'c', 'd'][si]}:${(s.isTrue || s.answer === 'Đ' || s.answer === true) ? 'Đ' : 'S'}`).join(', ');
          }
          xml += wParagraph([
            { text: `• Câu ${idx + 1} [${typeLabel} | Mã: ${q.matrixRef || 'MT'} | Mức: ${q.level || ''} | ${q.points || 0.25}đ] — Đáp án: ${ansSummary}. `, bold: true, fontSizeHalfPt: 25 },
            { text: q.explanation || 'Áp dụng trực tiếp kiến thức chuẩn trong phạm vi bài học.', fontSizeHalfPt: 25 }
          ], { align: 'both', spaceBefore: 30, spaceAfter: 40 });
        });
      }
    }
  }

  return xml;
}

// ============================================================================
// 5. ĐÓNG GÓI FILE .DOCX HOÀN CHỈNH (CHUẨN A4, TIMES NEW ROMAN 13-14PT)
// ============================================================================

/**
 * Tạo Buffer file .docx theo chế độ xuất:
 * - mode = 'full'   : Toàn bộ hồ sơ (Ma trận + Đặc tả + Đề các mã + Đáp án)
 * - mode = 'matrix' : Chỉ Ma trận
 * - mode = 'spec'   : Chỉ Bản đặc tả
 * - mode = 'exam'   : Chỉ Đề kiểm tra học sinh (TUYỆT ĐỐI KHÔNG CÓ ĐÁP ÁN)
 * - mode = 'answer' : Chỉ Đáp án & Hướng dẫn chấm
 */
function generateExamDocx(examData, mode = 'full', targetVariantCode = null) {
  const variants = (examData.variants && examData.variants.length > 0)
    ? examData.variants
    : [{ code: '101', questions: examData.questions || [] }];

  let bodyContentXml = '';

  if (mode === 'matrix') {
    bodyContentXml += buildMatrixSectionXml(examData);
  } else if (mode === 'spec') {
    bodyContentXml += buildSpecificationSectionXml(examData);
  } else if (mode === 'matrix_spec') {
    bodyContentXml += buildMatrixSectionXml(examData);
    bodyContentXml += wPageBreak();
    bodyContentXml += buildSpecificationSectionXml(examData);
  } else if (mode === 'exam') {
    const selectedVariants = targetVariantCode
      ? variants.filter(v => String(v.code) === String(targetVariantCode))
      : variants;
    const list = selectedVariants.length > 0 ? selectedVariants : [variants[0]];
    list.forEach((v, idx) => {
      if (idx > 0) bodyContentXml += wPageBreak();
      bodyContentXml += buildStudentExamVariantXml(examData, v);
    });
  } else if (mode === 'answer') {
    bodyContentXml += buildAnswerKeySectionXml(examData);
  } else {
    // mode === 'full': Trọn bộ hồ sơ
    bodyContentXml += buildMatrixSectionXml(examData);
    bodyContentXml += wPageBreak();
    bodyContentXml += buildSpecificationSectionXml(examData);
    variants.forEach(v => {
      bodyContentXml += wPageBreak();
      bodyContentXml += buildStudentExamVariantXml(examData, v);
    });
    bodyContentXml += wPageBreak();
    bodyContentXml += buildAnswerKeySectionXml(examData);
  }

  // Thiết lập trang khổ A4 chuẩn: Rộng 210mm (11906 dxa), Cao 297mm (16838 dxa)
  // Lề chuẩn: Trên 2.0cm (1134 dxa), Dưới 2.0cm (1134 dxa), Trái 2.5cm (1418 dxa), Phải 1.8cm (1020 dxa)
  const sectPr = `
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/>
      <w:pgMar w:top="1134" w:right="1020" w:bottom="1134" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/>
    </w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyContentXml}
    ${sectPr}
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
        <w:sz w:val="26"/>
        <w:szCs w:val="26"/>
        <w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="80" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return createZipBuffer({
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': rootRelsXml,
    'word/_rels/document.xml.rels': docRelsXml,
    'word/styles.xml': stylesXml,
    'word/document.xml': documentXml
  });
}

/**
 * Tạo file .docx tài liệu giáo dục (KHGD / Phạm vi kiến thức / Mẫu ma trận) dùng cho kiểm thử thực tế
 */
function createMaterialDocx(title, paragraphs = [], tables = []) {
  let bodyXml = wParagraph(title, { bold: true, align: 'center', fontSizeHalfPt: 28, spaceBefore: 80, spaceAfter: 120 });
  for (const p of paragraphs) {
    bodyXml += wParagraph(p, { align: 'both', fontSizeHalfPt: 26, spaceBefore: 40, spaceAfter: 60 });
  }
  for (const t of tables) {
    if (t.title) {
      bodyXml += wParagraph(t.title, { bold: true, fontSizeHalfPt: 26, spaceBefore: 80, spaceAfter: 40 });
    }
    bodyXml += wTable(t.headers, t.rows, { fontSizeHalfPt: 24 });
  }
  const sectPr = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1020" w:bottom="1134" w:left="1418"/></w:sectPr>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}${sectPr}</w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:styles>`;
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return createZipBuffer({
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': rootRelsXml,
    'word/_rels/document.xml.rels': docRelsXml,
    'word/styles.xml': stylesXml,
    'word/document.xml': documentXml
  });
}

module.exports = {
  readZipEntries,
  createZipBuffer,
  parseDocxBuffer,
  generateExamDocx,
  createMaterialDocx,
  normalizeMathForWord
};

