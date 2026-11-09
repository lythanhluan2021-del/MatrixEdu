/**
 * src/doc-parser.js
 * Bộ đọc tài liệu đa định dạng (.docx, .pdf, .txt, .md, hình ảnh)
 * Hỗ trợ nhận dạng và bóc tách trực tiếp BẢNG MA TRẬN & BẢNG ĐẶC TẢ chuẩn của nhà trường từ file Word (.docx).
 */

const zlib = require('zlib');
const { parseDocxBuffer } = require('./zip-docx');

/**
 * Bóc tách văn bản từ file PDF cơ bản
 */
function parsePdfBuffer(buffer) {
  const rawLatin = buffer.toString('latin1');
  const extractedChunks = [];

  function extractTextFromPdfStreamContent(streamStr) {
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(streamStr)) !== null) {
      const block = match[1];
      const strRegex = /\((?:\\.|[^\\()])*\)/g;
      let sm;
      const lineParts = [];
      while ((sm = strRegex.exec(block)) !== null) {
        let s = sm[0].slice(1, -1)
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        if (s.trim()) lineParts.push(s);
      }
      if (lineParts.length > 0) {
        extractedChunks.push(lineParts.join(''));
      }
    }
  }

  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let sMatch;
  while ((sMatch = streamRegex.exec(rawLatin)) !== null) {
    const streamBody = Buffer.from(sMatch[1], 'latin1');
    try {
      const decompressed = zlib.inflateSync(streamBody).toString('utf8');
      extractTextFromPdfStreamContent(decompressed);
    } catch (_) {
      extractTextFromPdfStreamContent(sMatch[1]);
    }
  }

  const text = extractedChunks.join('\n').trim();
  return {
    text: text || '[Tài liệu PDF dạng ảnh quét hoặc mã hóa font đặc biệt - Sẵn sàng gửi qua AI Vision/Document API]',
    paragraphs: text ? text.split(/\r?\n/).filter(Boolean) : [],
    tables: []
  };
}

/**
 * Đọc tài liệu tải lên theo tên file và Buffer
 */
function extractDocumentContent(fileName, buffer, mimeType = '') {
  const ext = (fileName || '').toLowerCase().split('.').pop();

  if (ext === 'docx') {
    const parsed = parseDocxBuffer(buffer);
    const structured = parseSchoolMatrixAndSpecFromDocx(parsed.tables, parsed.paragraphs, fileName);
    return {
      fileName,
      fileType: 'docx',
      text: parsed.text,
      paragraphs: parsed.paragraphs,
      tables: parsed.tables,
      detectedMatrix: structured.matrix,
      detectedSpec: structured.specification,
      detectedUnits: structured.units,
      detectedMetadata: structured.metadata
    };
  }

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    const parsed = parsePdfBuffer(buffer);
    return {
      fileName,
      fileType: 'pdf',
      text: parsed.text,
      paragraphs: parsed.paragraphs,
      tables: parsed.tables,
      base64: buffer.toString('base64'),
      mimeType: 'application/pdf'
    };
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || mimeType.startsWith('image/')) {
    return {
      fileName,
      fileType: 'image',
      text: `[Hình ảnh tài liệu/mẫu đề đã tải lên: ${fileName} (${Math.round(buffer.length / 1024)} KB)]`,
      paragraphs: [],
      tables: [],
      base64: buffer.toString('base64'),
      mimeType: mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`
    };
  }

  const text = buffer.toString('utf8');
  const paragraphs = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return {
    fileName,
    fileType: 'text',
    text,
    paragraphs,
    tables: []
  };
}

/**
 * Tách số câu/ý và mã câu hỏi từ ô bảng Ma trận nhà trường
 * Ví dụ:
 * - "1 MC(1)" -> { count: 1, ref: "MC(1)" }
 * - "2 MC(1112)" -> { count: 2, ref: "MC(11,12)" }
 * - "3 MC(14,15, 24)" -> { count: 3, ref: "MC(14,15,24)" }
 * - "1 VDC" -> { count: 1, ref: "VDC", isVDC: true }
 * - "2" -> { count: 2, ref: "" }
 */
function parseMatrixCellValue(cellStr) {
  const s = String(cellStr || '').trim();
  if (!s) return { count: 0, ref: '', raw: '' };

  // Khớp số nguyên đứng đầu chuỗi: "1 MC(1)", "2 MC(1112)", "3 MC(14,15, 24)", "1 VDC", "2"
  const m = s.match(/^(\d+)\s*(.*)$/);
  if (m) {
    const count = parseInt(m[1], 10) || 0;
    let rest = (m[2] || '').trim();
    if (count === 2 && /MC\((\d{2})(\d{2})\)/i.test(rest)) {
      rest = rest.replace(/MC\((\d{2})(\d{2})\)/i, 'MC($1,$2)');
    }
    return {
      count,
      ref: rest || '',
      isVDC: /VDC/i.test(rest),
      raw: s
    };
  }

  // Trường hợp viết kiểu "MC(1,2)" không có số đầu
  const parenMatch = s.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const items = parenMatch[1].split(/[,\s]+/).filter(Boolean);
    return { count: Math.max(1, items.length), ref: s, raw: s };
  }

  return { count: 0, ref: '', raw: s };
}

/**
 * Nhận diện thông tin hành chính (Trường, Tổ, Môn, Khối lớp, Kỳ kiểm tra, Thời gian) từ bảng tiêu đề hoặc tên file
 */
function detectMetadataFromTablesAndText(tables = [], paragraphs = [], fileName = '') {
  const meta = {};
  const combinedHeader = [
    fileName,
    ...(paragraphs.slice(0, 6)),
    ...((tables[0] && tables[0][0]) ? tables[0][0] : [])
  ].join(' | ');

  // Tên trường & Tổ
  if (tables[0] && tables[0][0] && tables[0][0][0]) {
    const leftBanner = String(tables[0][0][0]).trim();
    const schoolMatch = leftBanner.match(/(TRƯỜNG\s+[^\n\r]+?)(?:\s+TỔ\s+|\s+BỘ MÔN|$)/i);
    if (schoolMatch) meta.schoolName = schoolMatch[1].trim();
    const deptMatch = leftBanner.match(/(TỔ\s+[^\n\r]+)$/i);
    if (deptMatch) meta.departmentName = deptMatch[1].trim();
  }

  // Năm học
  const yearMatch = combinedHeader.match(/20\d{2}\s*-\s*20\d{2}/);
  if (yearMatch) meta.schoolYear = yearMatch[0].replace(/\s+/g, ' ');

  // Kỳ kiểm tra
  if (/giữa\s*(học\s*)?k[ìỳ]\s*(1|i)\b|ktgk\s*(1|i)\b/i.test(combinedHeader)) {
    meta.examPeriod = 'Giữa học kỳ I';
  } else if (/cuối\s*(học\s*)?k[ìỳ]\s*(1|i)\b|ktck\s*(1|i)\b/i.test(combinedHeader)) {
    meta.examPeriod = 'Cuối học kỳ I';
  } else if (/giữa\s*(học\s*)?k[ìỳ]\s*(2|ii)\b|ktgk\s*(2|ii)\b/i.test(combinedHeader)) {
    meta.examPeriod = 'Giữa học kỳ II';
  } else if (/cuối\s*(học\s*)?k[ìỳ]\s*(2|ii)\b|ktck\s*(2|ii)\b/i.test(combinedHeader)) {
    meta.examPeriod = 'Cuối học kỳ II';
  }

  // Thời gian làm bài
  const durMatch = combinedHeader.match(/(\d{2,3})\s*phút/i);
  if (durMatch) meta.duration = parseInt(durMatch[1], 10);

  // Khối lớp & Cấp học (Chuẩn cấp THPT: Lớp 10, 11, 12)
  const gradeMatch = combinedHeader.match(/(?:lớp|khối|tin|toán|văn|anh|lý|lí|hóa|sử|địa|sinh)\s*(1[012])\b/i);
  if (gradeMatch) {
    meta.grade = String(gradeMatch[1]);
    meta.level = 'THPT';
  }

  // Môn học
  const subjPatterns = [
    [/môn\s*[:\-]?\s*tin\s*học|\btin\s*1[012]\b|\btin\s*học\b/i, 'Tin học'],
    [/môn\s*[:\-]?\s*toán|\btoán\s*\d/i, 'Toán'],
    [/môn\s*[:\-]?\s*ngữ\s*văn|\bngữ\s*văn\b/i, 'Ngữ văn'],
    [/môn\s*[:\-]?\s*tiếng\s*anh|\btiếng\s*anh\b/i, 'Tiếng Anh'],
    [/môn\s*[:\-]?\s*vật\s*l[íý]|\bvật\s*l[íý]\b/i, 'Vật lí'],
    [/môn\s*[:\-]?\s*h[óo]a\s*học|\bh[óo]a\s*học\b/i, 'Hóa học'],
    [/môn\s*[:\-]?\s*sinh\s*học|\bsinh\s*học\b/i, 'Sinh học'],
    [/môn\s*[:\-]?\s*lịch\s*sử\s*và\s*địa\s*l[íý]/i, 'Lịch sử và Địa lí'],
    [/môn\s*[:\-]?\s*lịch\s*sử/i, 'Lịch sử'],
    [/môn\s*[:\-]?\s*địa\s*l[íý]/i, 'Địa lí'],
    [/môn\s*[:\-]?\s*khoa\s*học\s*tự\s*nhiên|\bkhtn\b/i, 'Khoa học tự nhiên'],
    [/môn\s*[:\-]?\s*tiếng\s*việt/i, 'Tiếng Việt']
  ];
  for (const [regex, subjName] of subjPatterns) {
    if (regex.test(combinedHeader)) {
      meta.subject = subjName;
      break;
    }
  }

  return meta;
}

/**
 * Bóc tách trực tiếp BẢNG MA TRẬN và BẢNG ĐẶC TẢ từ danh sách bảng trong file .docx của giáo viên
 */
function parseSchoolMatrixAndSpecFromDocx(tables = [], paragraphs = [], fileName = '') {
  const detectedMeta = detectMetadataFromTablesAndText(tables, paragraphs, fileName);
  const levels = ['Biết', 'Hiểu', 'Vận dụng'];

  let matrixTable = null;
  let specTable = null;

  for (const tbl of tables) {
    if (!Array.isArray(tbl) || tbl.length < 4) continue;
    const headerDump = tbl.slice(0, 3).map(r => r.join(' ')).join(' ');

    if (/yêu\s*cầu\s*cần\s*đạt|đặc\s*tả/i.test(headerDump)) {
      specTable = tbl;
    } else if (/mức\s*độ\s*đánh\s*giá|tnkq|nhiều\s*lựa\s*chọn|đúng\s*-\s*sai|biết.*hiểu/i.test(headerDump)) {
      if (!matrixTable) matrixTable = tbl;
    }
  }

  // 1. Phân tích BẢNG ĐẶC TẢ (nếu có trong file .docx) để lấy Yêu cầu cần đạt chi tiết từng bài
  const specByUnitKey = [];
  if (specTable) {
    let lastTopic = '';
    for (let rIdx = 1; rIdx < specTable.length; rIdx++) {
      const row = specTable[rIdx];
      if (!row || row.length < 4) continue;

      const c0 = String(row[0] || '').trim();
      const c1 = String(row[1] || '').trim();
      const c2 = String(row[2] || '').trim();
      const c3 = String(row[3] || '').trim();

      // Bỏ qua các hàng tiêu đề phụ hoặc hàng Tổng/Tỉ lệ
      if (/^(tt|stt|chương|tổng|tỉ\s*lệ|tỷ\s*lệ)/i.test(c0) || /^(chương|chủ\s*đề|tỉ\s*lệ)/i.test(c1) && /nội\s*dung/i.test(c2)) {
        continue;
      }
      if (/^(tổng|tỉ\s*lệ|tỷ\s*lệ)/i.test(c0) || /^(tổng|tỉ\s*lệ|tỷ\s*lệ)/i.test(c1) || /^(16\s*B|B\s*\+\s*H)/i.test(c2)) {
        continue;
      }
      if (!c2 || /^(trắc\s*nghiệm|nhiều\s*lựa\s*chọn)/i.test(c2)) continue;

      if (c1) lastTopic = c1;
      const outcomes = parseOutcomesFromText(c3, levels, c2, detectedMeta);
      specByUnitKey.push({
        topic: lastTopic || `Chủ đề ${specByUnitKey.length + 1}`,
        unit: c2,
        rawYccd: c3,
        outcomes,
        mcqSpecText: String(row[4] || '').trim(),
        tfSpecText: String(row[5] || '').trim(),
        essaySpecText: String(row[6] || '').trim()
      });
    }
  }

  // 2. Phân tích BẢNG MA TRẬN (nếu có trong file .docx)
  if (matrixTable) {
    const pointRules = { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 };
    const matrixRows = [];
    const specificationRows = [];
    const extractedUnits = [];

    // Kiểm tra các loại câu hỏi trong các hàng tiêu đề (Row 0, 1, 2)
    // Hỗ trợ linh hoạt: 2 phần (MCQ + TF), 3 phần (MCQ + TF + SA), hoặc đầy đủ 4 phần (MCQ + TF + SA + Tự luận)
    const headerRow0 = (matrixTable[0] || []).join(' | ');
    const headerRow1 = (matrixTable[1] || []).join(' | ');
    const headerRow2 = (matrixTable[2] || []).join(' | ');
    const combinedHeader = headerRow0 + ' || ' + headerRow1 + ' || ' + headerRow2;

    const hasSA = /trả\s*lời\s*ngắn|tln|điền\s*khuyết|\bsa\b/i.test(combinedHeader);
    const hasEssay = /tự\s*luận|thực\s*hành|bài\s*tập\s*lớn|\bessay\b/i.test(combinedHeader);
    const hasBothSaAndEssay = hasSA && hasEssay;

    let lastTopic = '';
    let lastStt = '';

    for (let rIdx = 1; rIdx < matrixTable.length; rIdx++) {
      const row = matrixTable[rIdx];
      if (!row || row.length < 6) continue;

      const c0 = String(row[0] || '').trim();
      const c1 = String(row[1] || '').trim();
      const c2 = String(row[2] || '').trim();

      // Bỏ qua các dòng tiêu đề bảng (Row 0, Row 1, Row 2)
      if (/^(stt|tt)$/i.test(c0) || /mức\s*độ\s*đánh\s*giá/i.test(row[3] || '')) continue;
      if (!c0 && !c1 && !c2 && (/tnkq|biết|hiểu/i.test(row[3] || '') || /tnkq|biết|hiểu/i.test(row[4] || ''))) continue;

      // Dừng hoặc xử lý dòng Tổng số câu / Tỉ lệ % ở cuối bảng
      if (/^(tổng|tỉ\s*lệ|tỷ\s*lệ|cộng)/i.test(c0) || /^(tổng|tỉ\s*lệ|tỷ\s*lệ)/i.test(c1)) {
        continue;
      }

      if (!c2) continue; // Không có tên Bài / Đơn vị kiến thức

      // Kế thừa Chương/Chủ đề từ dòng trên nếu ô bị gộp dọc (vMerge) trong Word
      if (c0) lastStt = c0;
      if (c1) lastTopic = c1;
      const topicName = lastTopic || `Chủ đề ${matrixRows.length + 1}`;
      const unitName = c2;

      // Đọc các cột mức độ đánh giá:
      // Phần I: TNKQ nhiều lựa chọn (Biết, Hiểu, VD) - Cột 3, 4, 5
      const mcqB = parseMatrixCellValue(row[3]);
      const mcqH = parseMatrixCellValue(row[4]);
      const mcqVD = parseMatrixCellValue(row[5]);

      // Phần II: TNKQ Đúng - Sai (Biết, Hiểu, VD/VDC) - Cột 6, 7, 8
      const tfB = parseMatrixCellValue(row[6]);
      const tfH = parseMatrixCellValue(row[7]);
      const tfVD = parseMatrixCellValue(row[8]);

      // Phần III & IV: Trả lời ngắn (SA) và/hoặc Tự luận (ESSAY)
      let saB = { count: 0, ref: '', raw: '' };
      let saH = { count: 0, ref: '', raw: '' };
      let saVD = { count: 0, ref: '', raw: '' };

      let essayB = { count: 0, ref: '', raw: '' };
      let essayH = { count: 0, ref: '', raw: '' };
      let essayVD = { count: 0, ref: '', raw: '' };

      if (hasBothSaAndEssay) {
        // Có đầy đủ cả 4 phần: Cột 9, 10, 11 là Trả lời ngắn; Cột 12, 13, 14 là Tự luận
        saB = parseMatrixCellValue(row[9]);
        saH = parseMatrixCellValue(row[10]);
        saVD = parseMatrixCellValue(row[11]);

        essayB = parseMatrixCellValue(row[12]);
        essayH = parseMatrixCellValue(row[13]);
        essayVD = parseMatrixCellValue(row[14]);
      } else if (hasSA) {
        // Chỉ có Phần III Trả lời ngắn (như môn Toán): Cột 9, 10, 11
        saB = parseMatrixCellValue(row[9]);
        saH = parseMatrixCellValue(row[10]);
        saVD = parseMatrixCellValue(row[11]);
      } else if (hasEssay) {
        // Có Tự luận (như Tiếng Anh hoặc Tin học có cột tự luận): Cột 9, 10, 11
        essayB = parseMatrixCellValue(row[9]);
        essayH = parseMatrixCellValue(row[10]);
        essayVD = parseMatrixCellValue(row[11]);
      }

      const counts = {
        MCQ: { [levels[0]]: mcqB.count, [levels[1]]: mcqH.count, [levels[2]]: mcqVD.count },
        TF: { [levels[0]]: tfB.count, [levels[1]]: tfH.count, [levels[2]]: tfVD.count },
        SA: { [levels[0]]: saB.count, [levels[1]]: saH.count, [levels[2]]: saVD.count },
        ESSAY: { [levels[0]]: essayB.count, [levels[1]]: essayH.count, [levels[2]]: essayVD.count }
      };

      const totalRowMcq = mcqB.count + mcqH.count + mcqVD.count;
      const totalRowTf = tfB.count + tfH.count + tfVD.count;
      const totalRowSa = saB.count + saH.count + saVD.count;
      const totalRowEssay = essayB.count + essayH.count + essayVD.count;

      const rowPoints = Math.round((
        totalRowMcq * pointRules.MCQ +
        totalRowTf * pointRules.TF +
        totalRowSa * pointRules.SA +
        totalRowEssay * pointRules.ESSAY
      ) * 100) / 100;

      const rowId = `row_${matrixRows.length + 1}`;
      const rawPercentCol = String(row[15] || row[row.length - 1] || '').trim();

      // Lưu thông tin mã câu hỏi gốc trong Ma trận (ví dụ: "1 MC(1)", "2 MC(13,23)", "1 VDC")
      const cellCodes = {
        MCQ: { [levels[0]]: mcqB.ref, [levels[1]]: mcqH.ref, [levels[2]]: mcqVD.ref },
        TF: { [levels[0]]: tfB.ref, [levels[1]]: tfH.ref, [levels[2]]: tfVD.ref },
        SA: { [levels[0]]: saB.ref, [levels[1]]: saH.ref, [levels[2]]: saVD.ref },
        ESSAY: { [levels[0]]: essayB.ref, [levels[1]]: essayH.ref, [levels[2]]: essayVD.ref }
      };

      const cellRefs = {
        MCQ: [mcqB.raw, mcqH.raw, mcqVD.raw].filter(Boolean),
        TF: [
          tfB.count ? `${tfB.count}B` : '',
          tfH.count ? `${tfH.count}H` : '',
          tfVD.count ? `${tfVD.count}${tfVD.isVDC ? 'VDC' : 'VD'}` : ''
        ].filter(Boolean),
        SA: [saB.raw, saH.raw, saVD.raw].filter(Boolean),
        ESSAY: [essayB.raw, essayH.raw, essayVD.raw].filter(Boolean)
      };

      matrixRows.push({
        id: rowId,
        stt: lastStt || String(matrixRows.length + 1),
        topic: topicName,
        unit: unitName,
        counts,
        cellCodes,
        cellRefs,
        groupPercentLabel: rawPercentCol,
        points: rowPoints
      });

      // Tìm dòng tương ứng trong Bảng Đặc tả (Table 4)
      const matchedSpec = specByUnitKey[matrixRows.length - 1] ||
        specByUnitKey.find(s => normalizeCompare(s.unit) === normalizeCompare(unitName)) ||
        null;

      const outcomes = matchedSpec
        ? matchedSpec.outcomes
        : parseOutcomesFromText('', levels, unitName, detectedMeta);

      extractedUnits.push({
        id: `unit_${matrixRows.length}`,
        topic: topicName,
        unit: unitName,
        outcomes,
        rawYccd: matchedSpec ? matchedSpec.rawYccd : ''
      });

      specificationRows.push({
        rowId,
        topic: topicName,
        unit: unitName,
        outcomes,
        questionRefs: {
          MCQ: cellRefs.MCQ.length > 0 ? cellRefs.MCQ : (matchedSpec?.mcqSpecText ? [matchedSpec.mcqSpecText] : []),
          TF: cellRefs.TF.length > 0 ? cellRefs.TF : (matchedSpec?.tfSpecText ? [matchedSpec.tfSpecText] : []),
          SA: cellRefs.SA.length > 0 ? cellRefs.SA : [],
          ESSAY: cellRefs.ESSAY.length > 0 ? cellRefs.ESSAY : (matchedSpec?.essaySpecText ? [matchedSpec.essaySpecText] : [])
        }
      });
    }

    if (matrixRows.length > 0) {
      const totalMcqAll = matrixRows.reduce((s, r) => s + (r.counts.MCQ?.[levels[0]] || 0) + (r.counts.MCQ?.[levels[1]] || 0) + (r.counts.MCQ?.[levels[2]] || 0), 0);
      const totalTfAll = matrixRows.reduce((s, r) => s + (r.counts.TF?.[levels[0]] || 0) + (r.counts.TF?.[levels[1]] || 0) + (r.counts.TF?.[levels[2]] || 0), 0);
      const totalSaAll = matrixRows.reduce((s, r) => s + (r.counts.SA?.[levels[0]] || 0) + (r.counts.SA?.[levels[1]] || 0) + (r.counts.SA?.[levels[2]] || 0), 0);
      const totalEssayAll = matrixRows.reduce((s, r) => s + (r.counts.ESSAY?.[levels[0]] || 0) + (r.counts.ESSAY?.[levels[1]] || 0) + (r.counts.ESSAY?.[levels[2]] || 0), 0);

      const partsDesc = [];
      if (totalMcqAll > 0) partsDesc.push(`Phần I (MCQ): ${totalMcqAll} câu (${(totalMcqAll * pointRules.MCQ).toFixed(1)}đ)`);
      if (totalTfAll > 0) partsDesc.push(`Phần II (Đúng/Sai): ${Math.ceil(totalTfAll / 4)} câu lớn / ${totalTfAll} ý (${(totalTfAll * pointRules.TF).toFixed(1)}đ)`);
      if (totalSaAll > 0) partsDesc.push(`Phần III (Trả lời ngắn): ${totalSaAll} câu (${(totalSaAll * pointRules.SA).toFixed(1)}đ)`);
      if (totalEssayAll > 0) partsDesc.push(`Tự luận: ${totalEssayAll} câu (${(totalEssayAll * pointRules.ESSAY).toFixed(1)}đ)`);

      detectedMeta.localGuidelines = `Đã nhận dạng trực tiếp Ma trận nhà trường từ file "${fileName}": ${matrixRows.length} đơn vị kiến thức | ${partsDesc.join(' | ')}. Tổng = 10,0 điểm.`;

      return {
        metadata: detectedMeta,
        units: extractedUnits,
        matrix: {
          levels,
          questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
          pointRules,
          rows: matrixRows,
          importedFromDocx: true,
          sourceFileName: fileName
        },
        specification: specificationRows
      };
    }
  }

  return { metadata: detectedMeta, units: null, matrix: null, specification: null };
}

function normalizeCompare(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/^(bài|chủ đề|chương)\s*\d*[\s\.:–\-]*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phân tích văn bản KHGD / SGK / Phạm vi kiến thức hoặc Ma trận đã bóc tách
 */
function analyzeEducationalText(rawText, tables = [], metadata = {}) {
  // Ưu tiên 1: Kiểm tra xem trong `tables` có Bảng Ma trận & Bảng Đặc tả chuẩn của trường học không
  if (Array.isArray(tables) && tables.length > 0) {
    const structured = parseSchoolMatrixAndSpecFromDocx(tables, String(rawText || '').split(/\r?\n/), '');
    if (structured.matrix && Array.isArray(structured.units) && structured.units.length > 0) {
      return {
        totalLines: String(rawText || '').split(/\r?\n/).length,
        totalTables: tables.length,
        levels: structured.matrix.levels,
        regulation: 'Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH (Biết, Hiểu, Vận dụng)',
        units: structured.units,
        detectedMatrix: structured.matrix,
        detectedSpec: structured.specification,
        detectedMetadata: structured.metadata
      };
    }
  }

  const levels = ['Biết', 'Hiểu', 'Vận dụng'];

  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const extractedUnits = [];
  let currentTopic = '';
  let currentUnit = null;

  // 2. Phân tích từ các dòng văn bản (Chủ đề / Chương / Bài / Unit / Nội dung / Yêu cầu cần đạt)
  const topicRegex = /^(chủ đề|chương|phần|mạch nội dung|unit|topic)\s*([0-9IVX]+|[A-Z])?[\s\.:–\-]*(.+)$/i;
  const unitRegex = /^(bài|nội dung|đơn vị kiến thức|tiết|section|lesson|\d+[\.\)])\s*([0-9]+)?[\s\.:–\-]*(.+)$/i;

  for (const line of lines) {
    if (line.startsWith('|')) continue;

    const tMatch = line.match(topicRegex);
    if (tMatch && line.length < 140) {
      currentTopic = line;
      continue;
    }

    const uMatch = line.match(unitRegex);
    if (uMatch && line.length < 150) {
      if (currentUnit) extractedUnits.push(currentUnit);
      currentUnit = {
        topic: currentTopic || `Chủ đề ${extractedUnits.length + 1}: ${metadata.subject || 'Kiến thức trọng tâm'}`,
        unit: line,
        rawLines: [],
        outcomes: {},
        weight: 1
      };
      continue;
    }

    if (currentUnit) {
      currentUnit.rawLines.push(line);
    } else if (line.length > 15 && line.length < 130 && /^[-•*+]/.test(line)) {
      currentUnit = {
        topic: currentTopic || `Chủ đề trọng tâm - ${metadata.subject || ''} Lớp ${metadata.grade || ''}`,
        unit: line.replace(/^[-•*+\s]+/, ''),
        rawLines: [],
        outcomes: {},
        weight: 1
      };
    }
  }

  if (currentUnit) {
    extractedUnits.push(currentUnit);
  }

  const normalizedUnits = extractedUnits.map((u, idx) => {
    const joinedRaw = (u.rawLines || []).join('\n');
    const outcomes = Object.keys(u.outcomes || {}).length > 0
      ? u.outcomes
      : parseOutcomesFromText(joinedRaw, levels, u.unit, metadata);

    return {
      id: `unit_${idx + 1}`,
      topic: u.topic || `Chủ đề ${idx + 1}`,
      unit: u.unit || `Đơn vị kiến thức ${idx + 1}`,
      outcomes,
      keyFacts: u.rawLines || []
    };
  });

  return {
    totalLines: lines.length,
    totalTables: (tables || []).length,
    levels,
    regulation: 'Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH (Biết, Hiểu, Vận dụng)',
    units: normalizedUnits
  };
}

function parseOutcomesFromText(text, levels, unitTitle = '', metadata = {}) {
  const res = {};
  const cleanUnit = String(unitTitle || metadata.subject || 'nội dung bài học').replace(/^(bài|nội dung|\d+[\.\)])\s*\d*[\s\.:–\-]*/i, '');
  const raw = String(text || '').trim();

  // Tách theo nhãn "Nhận biết:", "Thông hiểu:" / "Hiểu/ Vận dụng:", "Vận dụng:" trong cùng 1 ô (như trong Bảng đặc tả của giáo viên)
  if (/(nhận\s*biết|thông\s*hiểu|hiểu\s*\/\s*vận\s*dụng|vận\s*dụng)\s*:/i.test(raw)) {
    const nbMatch = raw.match(/(?:nhận\s*biết|biết)\s*:\s*([\s\S]*?)(?=(?:thông\s*hiểu|hiểu\s*\/\s*vận\s*dụng|hiểu|vận\s*dụng)\s*:|$)/i);
    const thMatch = raw.match(/(?:thông\s*hiểu|hiểu\s*\/\s*vận\s*dụng|hiểu)\s*:\s*([\s\S]*?)(?=(?:vận\s*dụng(?:\s*cao)?)\s*:|$)/i);
    const vdMatch = raw.match(/vận\s*dụng(?:\s*cao)?\s*:\s*([\s\S]*?)$/i);

    res[levels[0]] = (nbMatch && nbMatch[1].trim()) || `Nhận biết các khái niệm, đặc điểm cơ bản thuộc bài: ${cleanUnit}.`;
    res[levels[1]] = (thMatch && thMatch[1].trim()) || `Hiểu và giải thích được nội dung trọng tâm thuộc bài: ${cleanUnit}.`;
    res[levels[2]] = (vdMatch && vdMatch[1].trim()) || (thMatch && /hiểu\s*\/\s*vận\s*dụng/i.test(raw) ? thMatch[1].trim() : `Vận dụng kiến thức bài "${cleanUnit}" vào tình huống thực tế.`);
    return res;
  }

  const lines = raw.split(/\r?\n|;/).map(s => s.trim()).filter(Boolean);
  const bucket0 = [];
  const bucket1 = [];
  const bucket2 = [];

  for (const l of lines) {
    if (/^(mức\s*1|nhận biết|biết)\b/i.test(l)) {
      bucket0.push(l.replace(/^(mức\s*1|nhận biết|biết)[\s:–\-]*/i, ''));
    } else if (/^(mức\s*2|thông hiểu|hiểu|kết nối)\b/i.test(l)) {
      bucket1.push(l.replace(/^(mức\s*2|thông hiểu|hiểu|kết nối)[\s:–\-]*/i, ''));
    } else if (/^(mức\s*3|vận dụng|vận dụng cao)\b/i.test(l)) {
      bucket2.push(l.replace(/^(mức\s*3|vận dụng(?:\s*cao)?)[\s:–\-]*/i, ''));
    } else {
      if (/(nêu được|nhận biết|chỉ ra|liệt kê|kể tên|xác định được công thức|đọc được|viết được)/i.test(l)) {
        bucket0.push(l);
      } else if (/(giải thích|phân biệt|so sánh|tính được|rút gọn|biến đổi|trình bày|vẽ được|mô tả)/i.test(l)) {
        bucket1.push(l);
      } else if (/(vận dụng|giải quyết|thực tiễn|chứng minh|tối ưu|tổng hợp|đánh giá|viết bài|viết đoạn|kết nối được|thực hành)/i.test(l)) {
        bucket2.push(l);
      } else {
        if (bucket0.length <= bucket1.length) bucket0.push(l);
        else bucket1.push(l);
      }
    }
  }

  res[levels[0]] = bucket0.length > 0
    ? bucket0.join('; ')
    : `Nhận biết, nêu đúng khái niệm, đặc điểm và kiến thức cơ bản thuộc nội dung: ${cleanUnit}.`;
  res[levels[1]] = bucket1.length > 0
    ? bucket1.join('; ')
    : `Hiểu, giải thích và thực hiện được các bước suy luận, phân tích chuẩn thuộc nội dung: ${cleanUnit}.`;
  res[levels[2]] = bucket2.length > 0
    ? bucket2.join('; ')
    : `Vận dụng kiến thức về "${cleanUnit}" để giải quyết vấn đề thực tiễn.`;

  return res;
}

module.exports = {
  extractDocumentContent,
  analyzeEducationalText,
  parseSchoolMatrixAndSpecFromDocx,
  parseOutcomesFromText
};
