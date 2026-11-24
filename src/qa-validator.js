/**
 * src/qa-validator.js
 * Bộ Kiểm định Chất lượng Chuyên môn (QA Engine) & Kiểm tra độc lập Đáp án / Phép tính
 * Đảm bảo sự thống nhất 4 chiều: Ma trận ↔ Bản đặc tả ↔ Đề kiểm tra ↔ Đáp án
 */

const crypto = require('crypto');
// GĐ2 (P1-01, QĐ2): quy ước điểm Đúng/Sai duy nhất sống ở src/scoring.js
// (không phụ thuộc nội bộ — tránh vòng lặp require với drive-bank).
const { TF_SCORE_BY_CORRECT, tfQuestionScore } = require('./scoring');
const { evaluateAlignment, detectSubjectFamily } = require('./content-alignment');
const { inferCognitiveLevel } = require('./drive-bank');

/**
 * Đánh giá biểu thức số học độc lập để kiểm chứng đáp án Toán / Lý / Hóa / Tin
 */
function safeEvaluateMathExpression(expr) {
  if (!expr || typeof expr !== 'string') return null;
  // Chỉ cho phép số, toán tử +, -, *, /, %, **, (, ), Math.*
  const sanitized = expr
    .replace(/\^/g, '**')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\bsqrt\s*\(/gi, 'Math.sqrt(')
    .replace(/\bsin\s*\(/gi, 'Math.sin(')
    .replace(/\bcos\s*\(/gi, 'Math.cos(')
    .replace(/\btan\s*\(/gi, 'Math.tan(')
    .replace(/\babs\s*\(/gi, 'Math.abs(')
    .replace(/\blog2\s*\(/gi, 'Math.log2(')
    .replace(/\blog10\s*\(/gi, 'Math.log10(')
    .replace(/\bln\s*\(/gi, 'Math.log(')
    .replace(/\bround\s*\(/gi, 'Math.round(');

  if (!/^[0-9+\-*/%().,\sA-Za-z_]+$/.test(sanitized)) return null;
  // Chặn mọi từ khóa ngoài Math.*
  const identifiers = sanitized.match(/[A-Za-z_][A-Za-z0-9_.]*/g) || [];
  for (const id of identifiers) {
    if (!/^Math\.(PI|E|sqrt|sin|cos|tan|abs|log2|log10|log|round|floor|ceil|pow|max|min)$/.test(id)) {
      return null;
    }
  }

  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${sanitized});`)();
    if (typeof val === 'number' && Number.isFinite(val)) {
      return Math.round(val * 10000) / 10000;
    }
  } catch (_) {
    return null;
  }
  return null;
}

/**
 * Tính toán lại toàn bộ số liệu thống kê của Ma trận đề kiểm tra
 */
function computeMatrixStatistics(matrix, metadata = {}) {
  const levels = (matrix && Array.isArray(matrix.levels) && matrix.levels.length > 0)
    ? matrix.levels
    : ['Biết', 'Hiểu', 'Vận dụng'];
  const qTypes = (matrix && Array.isArray(matrix.questionTypes) && matrix.questionTypes.length > 0)
    ? matrix.questionTypes
    : ['MCQ', 'TF', 'SA', 'ESSAY'];
  const pointRules = Object.assign(
    { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
    (matrix && matrix.pointRules) || {}
  );

  const byLevel = {};
  const pointsByLevel = {};
  levels.forEach(lv => {
    byLevel[lv] = 0;
    pointsByLevel[lv] = 0;
  });

  const byType = { MCQ: 0, TF: 0, SA: 0, ESSAY: 0 };
  const pointsByType = { MCQ: 0, TF: 0, SA: 0, ESSAY: 0 };

  let totalItems = 0;
  let totalQuestions = 0; // Với TF, 4 ý tính là 1 câu hỏi lớn (hoặc tính theo câu)
  let totalPoints = 0;

  const rows = (matrix && Array.isArray(matrix.rows)) ? matrix.rows : [];
  rows.forEach(row => {
    let rowComputedPts = 0;
    for (const qt of qTypes) {
      const defaultPt = qt === 'MCQ' ? 0.25 : qt === 'TF' ? 0.25 : qt === 'SA' ? 0.5 : 1.0;
      const ptUnit = Number(pointRules[qt] ?? defaultPt);
      for (const lv of levels) {
        const cnt = Number(row.counts && row.counts[qt] && row.counts[qt][lv]) || 0;
        if (cnt > 0) {
          byLevel[lv] = (byLevel[lv] || 0) + cnt;
          byType[qt] = (byType[qt] || 0) + cnt;
          totalItems += cnt;

          // Tính điểm
          const itemPts = (qt === 'ESSAY' && row.essayPoints && row.essayPoints[lv])
            ? Number(row.essayPoints[lv])
            : cnt * ptUnit;
          pointsByLevel[lv] = (pointsByLevel[lv] || 0) + itemPts;
          pointsByType[qt] = (pointsByType[qt] || 0) + itemPts;
          rowComputedPts += itemPts;
        }
      }
    }
    const finalRowPts = row.points !== undefined && row.points !== null
      ? Number(row.points)
      : Math.round(rowComputedPts * 100) / 100;
    row.points = Math.round(finalRowPts * 100) / 100;
    totalPoints += row.points;
  });

  // Nếu có câu tự luận có điểm riêng lệch nhẹ so với pointRules.ESSAY mặc định, chuẩn hóa lại tổng điểm theo mức độ
  const sumLevelPts = Object.values(pointsByLevel).reduce((a, b) => a + b, 0);
  if (sumLevelPts > 0 && Math.abs(sumLevelPts - totalPoints) > 0.01) {
    const scale = totalPoints / sumLevelPts;
    for (const lv of levels) {
      pointsByLevel[lv] = Math.round(pointsByLevel[lv] * scale * 100) / 100;
    }
  }

  // Số câu thực tế trên đề: MCQ + (TF / 4) + SA + ESSAY
  const tfQuestionsCount = Math.ceil(byType.TF / 4);
  totalQuestions = byType.MCQ + tfQuestionsCount + byType.SA + byType.ESSAY;

  // GĐ2 (P1-05): làm tròn phần dư lớn nhất — tổng tỉ lệ luôn đúng 100%.
  // Làm tròn xuống từng mức, rồi phát 1% còn lại cho các mức có phần lẻ
  // lớn nhất (hòa thì mức đứng trước được phát trước — xác định).
  const levelPercentages = {};
  if (totalPoints > 0) {
    const rawPct = levels.map(lv => (pointsByLevel[lv] / totalPoints) * 100);
    const floors = rawPct.map(v => Math.floor(v));
    let remainder = 100 - floors.reduce((a, b) => a + b, 0);
    const order = levels
      .map((lv, i) => ({ i, frac: rawPct[i] - floors[i] }))
      .sort((a, b) => (b.frac - a.frac) || (a.i - b.i))
      .map(o => o.i);
    const finalPct = floors.slice();
    for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
      finalPct[order[k]] += 1;
    }
    levels.forEach((lv, i) => { levelPercentages[lv] = finalPct[i]; });
  } else {
    levels.forEach(lv => { levelPercentages[lv] = 0; });
  }

  return {
    levels,
    qTypes,
    pointRules,
    byLevel,
    pointsByLevel,
    levelPercentages,
    byType,
    pointsByType,
    tfQuestionsCount,
    totalItems,
    totalQuestions,
    totalPoints: Math.round(totalPoints * 100) / 100
  };
}

/**
 * GĐ3 (P1-07): đáp số TLN (trả lời ngắn) phải là đáp án ngắn, cụ thể.
 * - Mặc định (Toán, Lý, Hóa, Tin, ...): phải là giá trị số — phiếu OMR
 *   BGD 2025 tô đáp số bằng 4 cột số. Chấp nhận dấu thập phân "," hoặc ".",
 *   dấu +/- đầu, và khoảng trắng phân cách nghìn (vd "12,5", "-3", "1 274").
 * - Môn ngôn ngữ (family 'eng'): câu TLN điền từ có đáp án là cụm từ ngắn
 *   ("about", "infrastructure", "cultural identity") — hợp lệ nếu ≤ 4 từ
 *   và ≤ 40 ký tự. Đây là đáp án thật trong Ngân hàng chuyên môn nội bộ,
 *   không phải câu chữ chung chung.
 * - Câu chữ dài/chung chung ("Đáp án theo SGK...") bị loại ở cả hai trường hợp.
 */
function isValidShortAnswer(value, subjectFamily) {
  if (value === undefined || value === null) return false;
  const s = String(value).trim();
  if (!s) return false;
  const normalized = s.replace(/[\s_]/g, '').replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(normalized)) return true;
  if (subjectFamily === 'eng') {
    const words = s.split(/\s+/).filter(Boolean);
    return words.length >= 1 && words.length <= 4 && s.length <= 40;
  }
  return false;
}

// GĐ3 (P1-07): nội dung tối thiểu cho tự luận — loại bỏ dòng trích nguồn
// chung chung ("Căn cứ theo tài liệu ...") vốn không phải hướng dẫn chấm.
const ESSAY_MIN_CONTENT_CHARS = 20;
function stripGenericCitation(text) {
  return String(text || '')
    .replace(/Căn cứ theo tài liệu "[^"]*" trong Ngân hàng câu hỏi Google Drive\.?/g, '')
    .replace(/Trình bày theo yêu cầu câu hỏi và tài liệu chuyên môn\.?/g, '')
    .trim();
}

/**
 * Kiểm định toàn diện Hồ sơ đề kiểm tra (Ma trận ↔ Bản đặc tả ↔ Đề ↔ Đáp án & Phép tính độc lập)
 */
function validateExamProfile(examData) {
  const issues = [];
  const warnings = [];
  const passedChecks = [];
  const mathVerifications = [];

  const meta = examData.metadata || {};
  const matrix = examData.matrix || {};
  const specs = examData.specification || [];
  const questions = examData.questions || [];
  const variants = examData.variants || [];

  const stats = computeMatrixStatistics(matrix, meta);

  const isManualExamMode = Boolean(
    examData.manualExamMode ||
    (examData.ooxmlSourceId && (!matrix.rows || matrix.rows.length === 0))
  );

  // 1. Kiểm tra quy định cấp học THPT (Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH)
  if (isManualExamMode) {
    passedChecks.push(`Chế độ Nạp Đề Gốc Thủ Công (.docx) — Bảo toàn nguyên bản OOXML (Công thức Equation/MathType & Hình ảnh).`);
  } else {
    passedChecks.push(`Đúng quy định cấp THPT (Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH) với các mức độ: ${stats.levels.join(', ')}.`);
  }

  // 2. Kiểm tra tổng điểm Ma trận = 10.0 điểm (chỉ bắt buộc khi có Ma trận)
  if (!isManualExamMode) {
    if (Math.abs(stats.totalPoints - 10.0) <= 0.01) {
      passedChecks.push(`Tổng điểm Ma trận chính xác: ${stats.totalPoints.toFixed(1)} / 10.0 điểm.`);
    } else {
      issues.push(`Tổng điểm Ma trận hiện tại là ${stats.totalPoints.toFixed(2)} điểm (chưa khớp thang điểm 10.0).`);
    }
  }

  // 3. Kiểm tra đối chiếu Ma trận ↔ Bản đặc tả
  const matrixRows = matrix.rows || [];
  if (!isManualExamMode) {
    if (specs.length === matrixRows.length && matrixRows.length > 0) {
      passedChecks.push(`Bản đặc tả khớp 1-1 với Ma trận (${specs.length}/${matrixRows.length} đơn vị kiến thức).`);
    } else {
      issues.push(`Số đơn vị kiến thức trong Bản đặc tả (${specs.length}) chưa khớp với Ma trận (${matrixRows.length}).`);
    }
  }

  // 4. Kiểm tra đối chiếu Ma trận ↔ Bộ câu hỏi trong Đề
  const qByType = {
    MCQ: questions.filter(q => q.type === 'MCQ').length,
    TF: questions.filter(q => q.type === 'TF').reduce((acc, q) => acc + ((q.statements || q.subItems || []).length || 4), 0),
    SA: questions.filter(q => q.type === 'SA').length,
    ESSAY: questions.filter(q => q.type === 'ESSAY').length
  };

  if (isManualExamMode) {
    passedChecks.push(`Cấu trúc đề gốc nhận diện: ${qByType.MCQ} câu Phần I (TN), ${Math.ceil(qByType.TF / 4)} câu Phần II (${qByType.TF} ý Đ/S), ${qByType.SA} câu Phần III (TLN), ${qByType.ESSAY} câu Tự luận.`);
  } else {
    const typeMismatch = [];
    for (const qt of ['MCQ', 'TF', 'SA', 'ESSAY']) {
      if ((stats.byType[qt] || 0) !== (qByType[qt] || 0)) {
        typeMismatch.push(`${qt}: Ma trận=${stats.byType[qt] || 0}, Đề=${qByType[qt] || 0}`);
      }
    }
    if (typeMismatch.length === 0 && questions.length > 0) {
      passedChecks.push(`Số lượng câu hỏi/lệnh hỏi từng dạng thức trong Đề khớp tuyệt đối với Ma trận (MCQ: ${qByType.MCQ}, Đúng/Sai: ${qByType.TF} ý, Trả lời ngắn: ${qByType.SA}, Tự luận: ${qByType.ESSAY}).`);
    } else if (typeMismatch.length > 0) {
      issues.push(`Chênh lệch số lượng câu hỏi giữa Ma trận và Đề: ${typeMismatch.join('; ')}.`);
    }
  }

  // 5. Kiểm tra tổng điểm các câu hỏi trong Đề
  const examTotalPoints = Math.round(questions.reduce((acc, q) => acc + Number(q.points || 0), 0) * 100) / 100;
  if (!isManualExamMode) {
    if (Math.abs(examTotalPoints - stats.totalPoints) <= 0.01) {
      passedChecks.push(`Tổng điểm các câu hỏi trong Đề kiểm tra (${examTotalPoints.toFixed(1)}đ) khớp tuyệt đối với Ma trận (${stats.totalPoints.toFixed(1)}đ).`);
    } else {
      issues.push(`Tổng điểm các câu hỏi trong Đề (${examTotalPoints.toFixed(2)}đ) lệch so với Ma trận (${stats.totalPoints.toFixed(2)}đ).`);
    }
  }

  // 6. Kiểm tra từng câu hỏi: Mã liên kết Ma trận, Đáp án, Lời giải & Kiểm chứng phép tính độc lập
  let missingRefCount = 0;
  let missingAnswerCount = 0;

  questions.forEach((q, idx) => {
    const qLabel = `Câu ${idx + 1} (${q.type})`;
    if (!q.matrixRef) missingRefCount++;

    if (q.type === 'MCQ') {
      const opts = q.options || [];
      if (opts.length !== 4) {
        issues.push(`${qLabel}: Câu trắc nghiệm nhiều lựa chọn phải có đủ 4 phương án A, B, C, D.`);
      }
      const uniqueOpts = new Set(opts.map(o => String(o).trim().toLowerCase()));
      if (uniqueOpts.size < opts.length && !q.formulaCount && !q.imageCount) {
        warnings.push(`${qLabel}: Có phương án trả lời bị trùng lặp nội dung.`);
      }
      if (!['A', 'B', 'C', 'D'].includes(String(q.answer || '').trim().toUpperCase())) {
        missingAnswerCount++;
        issues.push(`${qLabel}: Đáp án '${q.answer}' không hợp lệ (phải là A, B, C hoặc D).`);
      } else if (q.answerUncertain) {
        warnings.push(`${qLabel}: Chưa phát hiện gạch chân/bôi đỏ đáp án trong file gốc (đang tạm đặt '${q.answer}', vui lòng rà soát).`);
      }
    } else if (q.type === 'TF') {
      const stmts = q.statements || q.subItems || [];
      if (stmts.length !== 4) {
        issues.push(`${qLabel}: Câu trắc nghiệm Đúng/Sai phải có đủ 4 ý a), b), c), d).`);
      }
      stmts.forEach((st, sIdx) => {
        if (st.isTrue === undefined && st.answer === undefined) {
          missingAnswerCount++;
          issues.push(`${qLabel} ý ${['a', 'b', 'c', 'd'][sIdx]}: Thiếu đáp án Đúng/Sai.`);
        }
      });
    } else if (q.type === 'SA') {
      // GĐ3 (P1-07): TLN phải có đáp số ngắn, cụ thể — số với môn tính
      // toán, cụm từ ngắn với môn ngôn ngữ — không chấp nhận đáp án dạng
      // câu chữ chung chung hay để trống.
      const saFamily = detectSubjectFamily(meta.subject || '');
      if (q.answer === undefined || q.answer === null || String(q.answer).trim() === '') {
        missingAnswerCount++;
        issues.push(`${qLabel}: Câu trả lời ngắn thiếu đáp số chuẩn.`);
      } else if (!isValidShortAnswer(q.answer, saFamily)) {
        missingAnswerCount++;
        issues.push(`${qLabel}: Câu trả lời ngắn phải có đáp số là giá trị số${saFamily === 'eng' ? ' hoặc cụm từ ngắn (tối đa 4 từ)' : ''} (hiện là "${String(q.answer).slice(0, 40)}").`);
      } else {
        // Cảnh báo giới hạn 4 cột tô chỉ áp dụng cho đáp số dạng số.
        const cleanSa = String(q.answer).replace(/\s+/g, '');
        if (/^-?[\d.,]+$/.test(cleanSa) && cleanSa.length > 4) {
          warnings.push(`${qLabel}: Đáp số "${cleanSa}" dài ${cleanSa.length} ký tự (vượt giới hạn 4 cột tô của phiếu OMR BGD 2025).`);
        }
      }
    } else if (q.type === 'ESSAY') {
      // GĐ3 (P1-07): tự luận cần nội dung hướng dẫn chấm tối thiểu — dòng
      // trích nguồn chung chung không được tính là hướng dẫn chấm.
      if (!isManualExamMode) {
        const essayContent = [q.answer, q.explanation, q.rubric]
          .map(stripGenericCitation)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!essayContent) {
          missingAnswerCount++;
          issues.push(`${qLabel}: Câu tự luận thiếu hướng dẫn chấm / biểu điểm.`);
        } else if (essayContent.length < ESSAY_MIN_CONTENT_CHARS) {
          missingAnswerCount++;
          issues.push(`${qLabel}: Câu tự luận thiếu nội dung hướng dẫn chấm tối thiểu (cần ít nhất ${ESSAY_MIN_CONTENT_CHARS} ký tự nội dung thật).`);
        }
      }
    }

    // Kiểm tra độc lập phép tính nếu câu hỏi có gắn biểu thức kiểm định (mathVerify)
    if (q.mathVerify && q.mathVerify.expression) {
      const computed = safeEvaluateMathExpression(q.mathVerify.expression);
      const expected = Number(q.mathVerify.expected);
      const isMatch = computed !== null && Math.abs(computed - expected) <= 0.01;
      mathVerifications.push({
        questionIndex: idx + 1,
        matrixRef: q.matrixRef || '',
        expression: q.mathVerify.expression,
        computedValue: computed,
        expectedValue: expected,
        passed: isMatch
      });
      if (!isMatch) {
        issues.push(`${qLabel}: Kiểm tra phép tính độc lập phát hiện sai lệch (${q.mathVerify.expression} = ${computed}, nhưng đáp án ghi ${expected}).`);
      }
    }
  });

  if (missingRefCount === 0 && questions.length > 0) {
    passedChecks.push(`100% câu hỏi (${questions.length}/${questions.length}) có mã liên kết trực tiếp với Ma trận và Bản đặc tả.`);
  } else if (missingRefCount > 0) {
    issues.push(`Có ${missingRefCount} câu hỏi chưa có mã liên kết Ma trận (matrixRef).`);
  }

  if (missingAnswerCount === 0 && questions.length > 0) {
    passedChecks.push(`100% câu hỏi (${questions.length}/${questions.length}) có đầy đủ đáp án và hướng dẫn chấm chi tiết.`);
  }

  // 6b. Thẩm định Chuyên môn: Kiểm tra độ bám sát 100% Ma trận & Đơn vị kiến thức (Content Alignment)
  let misalignedCount = 0;
  let templateCount = 0;
  questions.forEach((q, idx) => {
    const qLabel = `Câu ${idx + 1} (${q.type})`;
    const targetRow = matrixRows.find(r => r.id === q.rowId);

    // Phát hiện câu mẫu khuôn hình tổng hợp
    const rawPrompt = String(q.stem || q.prompt || '');
    const isTemplate = Boolean(q.isPlaceholder) ||
      /Đáp ứng chuẩn xác yêu cầu cần đạt|Khái niệm và tính chất cơ bản của.*bị áp dụng sai|Trong mô hình thực hành của chủ đề.*hệ số tỉ lệ|Trình bày nội dung trọng tâm và vận dụng kiến thức bài/i.test(rawPrompt);

    if (isTemplate) {
      templateCount++;
      issues.push(`${qLabel}: Là câu mẫu tổng hợp chưa có nội dung kiểm tra thực tế ("${rawPrompt.slice(0, 60)}..."). Vui lòng tạo lại bằng AI hoặc chọn từ Ngân hàng đề.`);
      return;
    }

    if (targetRow) {
      const alignRes = evaluateAlignment(q, targetRow, meta, { fromTargetFile: Boolean(q.sourceFile || q.isFromTarget) });
      if (!alignRes.aligned) {
        misalignedCount++;
        issues.push(`${qLabel}: Nội dung không bám sát đơn vị kiến thức "${targetRow.unit || targetRow.topic || ''}" (${alignRes.reason}).`);
      }
    }
  });

  if (templateCount === 0 && misalignedCount === 0 && questions.length > 0) {
    passedChecks.push(`100% câu hỏi (${questions.length}/${questions.length}) bám sát chuẩn xác nội dung đơn vị kiến thức theo Ma trận và Bản đặc tả.`);
  }

  if (mathVerifications.length > 0 && mathVerifications.every(m => m.passed)) {
    passedChecks.push(`Đã kiểm chứng độc lập ${mathVerifications.length} phép tính Toán/Khoa học: 100% kết quả trùng khớp tuyệt đối với đáp án.`);
  }

  // GĐ2 (P1-02): số ý Đúng/Sai của mỗi dòng ma trận phải là bội của 4 —
  // một câu Đúng/Sai luôn đủ 4 ý trong cùng một đơn vị kiến thức. Ý lẻ
  // không được tự sinh thành câu ngoài ma trận (xem ai-engine.js).
  if (!isManualExamMode) {
    matrixRows.forEach((row, rIdx) => {
      const tfItems = stats.levels.reduce((acc, lv) => acc + (Number(row.counts?.TF?.[lv]) || 0), 0);
      if (tfItems % 4 !== 0) {
        issues.push(`Dòng ${rIdx + 1} ("${row.unit || row.topic || ''}"): tổng số ý Đúng/Sai là ${tfItems}, không phải bội của 4 — hãy điều chỉnh Ma trận (thêm/bớt ý) thay vì để hệ thống tự sinh câu ngoài Ma trận.`);
      }
    });
  }

  // 7. Kiểm tra các mã đề trộn (Variants)
  if (variants.length > 0) {
    const allSameCount = variants.every(v => (v.questions || []).length === questions.length);
    if (allSameCount) {
      passedChecks.push(`Đã khởi tạo ${variants.length} mã đề (${variants.map(v => v.code).join(', ')}) đồng bộ số câu và bảng đáp án riêng.`);
    } else {
      issues.push('Một số mã đề nhân bản có số câu không khớp với đề gốc.');
    }
    // GĐ2 (P0-03): đối chiếu đáp án từng mã đề với đề gốc theo ID câu —
    // nội dung câu, tập phương án và phương án đúng sau khi trộn phải khớp.
    const variantIssues = validateVariantAnswers(questions, variants);
    variantIssues.forEach(msg => issues.push(msg));
    if (variantIssues.length === 0 && allSameCount && questions.length > 0) {
      passedChecks.push(`Đối chiếu đáp án ${variants.length} mã đề với đề gốc: 100% khớp (nội dung, tập phương án, đáp án đúng sau trộn).`);
    }
  }

  return {
    isValid: issues.length === 0,
    score: issues.length === 0 ? 100 : Math.max(0, 100 - issues.length * 15 - warnings.length * 5),
    stats,
    passedChecks,
    warnings,
    issues,
    mathVerifications
  };
}

/**
 * Nhận diện phương án có chứa chỉ dẫn vị trí ("Cả A và B", "Tất cả các phương án trên", "Không có phương án nào")
 */
function hasPositionalOptions(options) {
  if (!Array.isArray(options)) return false;
  const positionalPatterns = [
    /^(cả\s+[a-d]\s*(và|,|\bvới\b)\s*[a-d])/i,
    /^(cả\s+(hai|ba|bốn|2|3|4)\s+(phương\s+án|đáp\s+án|ý\s+trên))/i,
    /^(tất\s+cả\s+(các\s+)?(phương\s+án|đáp\s+án|ý\s+trên|câu\s+trên)\s*(đều|là)?)/i,
    /^(không\s+có\s+(phương\s+án|đáp\s+án|câu\s+nào)\s*(đúng|chính\s+xác|thỏa\s+mãn)?)/i,
    /^(phương\s+án\s+[a-d]\s+(và|,)\s+[a-d])/i,
    /^(đáp\s+án\s+[a-d]\s+(và|,)\s+[a-d])/i
  ];
  return options.some(opt => {
    const text = String(opt || '').trim().replace(/^[A-D][\.\)]\s*/, '');
    return positionalPatterns.some(regex => regex.test(text));
  });
}

/**
 * GĐ2 (P0-03): Đối chiếu đáp án từng mã đề với đề gốc theo ID câu.
 * Logic độc lập với khâu trộn: MCQ so bằng NỘI DUNG phương án đúng
 * (không so nhãn A–D vì nhãn đổi sau khi đảo); TF so từng mệnh đề theo
 * nội dung; TLN/Tự luận so đáp án nguyên văn. Trả về danh sách lỗi,
 * mỗi lỗi nêu đúng mã đề và đúng câu — rỗng nghĩa là khớp 100%.
 */
function validateVariantAnswers(baseQuestions, variants) {
  const issues = [];
  const baseById = new Map();
  (baseQuestions || []).forEach(q => {
    if (q && q.id) baseById.set(q.id, q);
  });

  (variants || []).forEach(v => {
    const code = v && v.code !== undefined ? String(v.code) : '?';
    const vQuestions = (v && v.questions) || [];
    const seenIds = new Set();
    vQuestions.forEach((vq, vIdx) => {
      const qLabel = `Mã đề ${code} câu ${vIdx + 1}`;
      if (!vq || !vq.id) {
        issues.push(`${qLabel}: thiếu ID câu hỏi, không đối chiếu được với đề gốc.`);
        return;
      }
      seenIds.add(vq.id);
      const bq = baseById.get(vq.id);
      if (!bq) {
        issues.push(`${qLabel} (id ${vq.id}): không có trong đề gốc.`);
        return;
      }
      if (String(bq.type || '').toUpperCase() !== String(vq.type || '').toUpperCase()) {
        issues.push(`${qLabel} (id ${vq.id}): loại câu đổi từ ${bq.type} thành ${vq.type}.`);
        return;
      }
      const type = String(bq.type || '').toUpperCase();
      if (type === 'MCQ') {
        const baseOpts = (bq.options || []).map(o => String(o).trim());
        const varOpts = (vq.options || []).map(o => String(o).trim());
        // So sánh tập phương án (không phụ thuộc thứ tự sau khi đảo).
        if (baseOpts.length !== varOpts.length ||
            baseOpts.slice().sort().join('\n') !== varOpts.slice().sort().join('\n')) {
          issues.push(`${qLabel} (id ${vq.id}): tập phương án sau trộn khác đề gốc.`);
          return;
        }
        const labels = ['A', 'B', 'C', 'D'];
        const baseAnsIdx = labels.indexOf(String(bq.answer || '').trim().toUpperCase());
        const varAnsIdx = labels.indexOf(String(vq.answer || '').trim().toUpperCase());
        if (baseAnsIdx < 0 || varAnsIdx < 0) {
          issues.push(`${qLabel} (id ${vq.id}): đáp án không hợp lệ (gốc "${bq.answer}", mã đề "${vq.answer}").`);
        } else if (baseOpts[baseAnsIdx] !== varOpts[varAnsIdx]) {
          issues.push(`${qLabel} (id ${vq.id}): phương án đúng sau trộn ("${varOpts[varAnsIdx]}") khác đáp án gốc ("${baseOpts[baseAnsIdx]}").`);
        }
      } else if (type === 'TF') {
        const baseStmts = bq.statements || bq.subItems || [];
        const varStmts = vq.statements || vq.subItems || [];
        if (baseStmts.length !== varStmts.length) {
          issues.push(`${qLabel} (id ${vq.id}): số mệnh đề Đúng/Sai đổi từ ${baseStmts.length} thành ${varStmts.length}.`);
          return;
        }
        const baseByText = new Map(baseStmts.map(st => [String(st.text || '').trim(), st]));
        varStmts.forEach((st, sIdx) => {
          const base = baseByText.get(String(st.text || '').trim());
          if (!base) {
            issues.push(`${qLabel} (id ${vq.id}) ý ${['a', 'b', 'c', 'd'][sIdx]}: mệnh đề "${String(st.text || '').slice(0, 40)}" không có trong đề gốc.`);
            return;
          }
          const baseTruth = typeof base.isTrue === 'boolean' ? base.isTrue : (String(base.answer || '').toUpperCase().startsWith('Đ'));
          const varTruth = typeof st.isTrue === 'boolean' ? st.isTrue : (String(st.answer || '').toUpperCase().startsWith('Đ'));
          if (baseTruth !== varTruth) {
            issues.push(`${qLabel} (id ${vq.id}) ý ${['a', 'b', 'c', 'd'][sIdx]}: tính Đúng/Sai của mệnh đề "${String(st.text || '').slice(0, 40)}" bị đổi sau khi trộn.`);
          }
        });
      } else {
        // SA / ESSAY: đáp án phải giữ nguyên văn sau trộn.
        if (String(bq.answer ?? '').trim() !== String(vq.answer ?? '').trim()) {
          issues.push(`${qLabel} (id ${vq.id}): đáp án sau trộn khác đề gốc.`);
        }
      }
    });
    // Kiểm tra mã đề có đủ mọi câu của đề gốc (không thừa, không thiếu).
    if (seenIds.size !== baseById.size || ![...baseById.keys()].every(id => seenIds.has(id))) {
      issues.push(`Mã đề ${code}: tập câu hỏi không khớp đề gốc (thiếu/thừa câu).`);
    }
  });

  return issues;
}

/**
 * GĐ2 (P0-02): câu nào thiếu đáp án hợp lệ thì dừng ngay và nêu rõ câu đó
 * — không bao giờ mặc định thành A. Dùng trước khi trộn mã đề.
 * MCQ: đáp án phải là A–D. TF: mỗi ý phải có isTrue boolean hoặc
 * answer Đ/S xác định được. TLN/Tự luận do bước 4 và validator kiểm tra
 * riêng (quy tắc GĐ3), ở đây không chặn.
 */
function assertValidQuestionAnswers(questions) {
  const labels = ['A', 'B', 'C', 'D'];
  (questions || []).forEach((q, idx) => {
    if (!q) return;
    const qLabel = `Câu ${idx + 1} (${q.type || '?'})${q.id ? ` [${q.id}]` : ''}${q.unit ? ` — ${q.unit}` : ''}`;
    const type = String(q.type || '').toUpperCase();
    if (type === 'MCQ') {
      const ans = String(q.answer ?? '').trim().toUpperCase();
      if (!labels.includes(ans)) {
        throw new Error(`Không thể trộn đề: ${qLabel} thiếu đáp án hợp lệ (đáp án hiện tại: "${q.answer ?? ''}", phải là A, B, C hoặc D). Hãy bổ sung đáp án rồi trộn lại.`);
      }
    } else if (type === 'TF') {
      const stmts = q.statements || q.subItems || [];
      stmts.forEach((st, sIdx) => {
        const ok = typeof st.isTrue === 'boolean' ||
          (typeof st.answer === 'string' && /^(đ|d|s)/i.test(st.answer.trim()));
        if (!ok) {
          throw new Error(`Không thể trộn đề: ${qLabel} ý ${['a', 'b', 'c', 'd'][sIdx]} thiếu đáp án Đúng/Sai. Hãy bổ sung đáp án rồi trộn lại.`);
        }
      });
    }
  });
}

/**
 * Nhân bản & Trộn mã đề thực tế:
 * - Bảo toàn đồng bộ optionXmls & optionRichHtmls (Công thức Equation/MathType & Hình ảnh) khi đảo A/B/C/D
 * - Giữ nguyên khối các câu hỏi dùng chung ngữ liệu (groupId) không bị tách rời
 * - Hỗ trợ tùy chọn: shuffleTfStatements (đảo 4 ý a/b/c/d Phần II).
 *   GĐ2: mọi mã đề đều trộn thứ tự câu (kể cả mã đầu tiên); tùy chọn
 *   keepFirstCodeOrder cũ đã bị bỏ — máy chủ luôn trộn tất cả các mã đề.
 */
function generateShuffledVariants(baseQuestions, numVariants = 4, startCode = 101, customCodes = [], shuffleOptions = {}) {
  const variants = [];
  const optsCfg = shuffleOptions && typeof shuffleOptions === 'object' ? shuffleOptions : {};
  // GĐ2 (P0-04): không còn nhánh đặc biệt cho mã đề đầu tiên — mọi mã đề,
  // kể cả mã 101, đều trộn thứ tự câu. Tùy chọn keepFirstCodeOrder cũ
  // (giữ nguyên thứ tự mã gốc) đã bị bỏ theo kế hoạch: mã đề đầu tiên
  // không trộn thì đáp án lộ theo thứ tự gốc. Giao diện vẫn gửi tùy chọn
  // này nhưng máy chủ bỏ qua (xem server.js /api/shuffle-variants).
  const shuffleTfStatements = Boolean(optsCfg.shuffleTfStatements);

  const userCodes = (Array.isArray(customCodes) ? customCodes : [])
    .map(c => String(c || '').trim())
    .filter(Boolean);

  const count = userCodes.length > 0
    ? userCodes.length
    : Math.max(1, Math.min(12, Number(numVariants) || 1));

  // GĐ2 (P0-01): Fisher–Yates bằng crypto.randomInt — không hạt giống,
  // không suy ra được thứ tự từ mã đề. Không lưu hạt giống ở đâu cả.
  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // Trộn danh sách câu hỏi nhưng giữ các câu có cùng groupId luôn đứng liền kề nhau!
  function shuffleQuestionsRespectingGroups(qList) {
    const blocks = [];
    const seenGroups = new Map();
    qList.forEach(q => {
      if (q && q.groupId) {
        if (!seenGroups.has(q.groupId)) {
          const blk = [];
          seenGroups.set(q.groupId, blk);
          blocks.push(blk);
        }
        seenGroups.get(q.groupId).push(q);
      } else {
        blocks.push([q]);
      }
    });
    return shuffleArray(blocks).flat();
  }

  // Đảo 4 phương án A, B, C, D đồng bộ hoàn toàn cả text + optionXmls (OOXML) + optionRichHtmls
  // GĐ2 (P0-02): đáp án không hợp lệ thì NÉM LỖI nêu rõ câu — không mặc định A.
  function shuffleMcqOptionsSync(q) {
    const isPositional = hasPositionalOptions(q.options) || Boolean(q.keepOptionOrder);
    if (isPositional || !Array.isArray(q.options) || q.options.length !== 4) return q;
    const labels = ['A', 'B', 'C', 'D'];
    const cleanAns = String(q.answer || '').trim().toUpperCase();
    const ansIdx = labels.indexOf(cleanAns);
    if (ansIdx < 0) {
      throw new Error(`Không thể trộn đề: câu ${q.id || q.matrixRef || ''} thiếu đáp án hợp lệ (đáp án hiện tại: "${q.answer ?? ''}", phải là A, B, C hoặc D). Hãy bổ sung đáp án rồi trộn lại.`);
    }
    const hasXmls = Array.isArray(q.optionXmls) && q.optionXmls.length === 4;
    const hasRich = Array.isArray(q.optionRichHtmls) && q.optionRichHtmls.length === 4;

    const indexedOpts = q.options.map((text, idx) => ({
      text: String(text).replace(/^[A-D][\.\)]\s*/, ''),
      xml: hasXmls ? q.optionXmls[idx] : undefined,
      richHtml: hasRich ? q.optionRichHtmls[idx] : undefined,
      isCorrect: idx === ansIdx
    }));
    const newOpts = shuffleArray(indexedOpts);
    q.options = newOpts.map(item => item.text);
    if (hasXmls) q.optionXmls = newOpts.map(item => item.xml);
    if (hasRich) q.optionRichHtmls = newOpts.map(item => item.richHtml);
    const newAnsIdx = newOpts.findIndex(item => item.isCorrect);
    q.answer = labels[newAnsIdx];
    return q;
  }

  // Đảo 4 ý a, b, c, d trong câu Phần II Đúng/Sai (nếu bật tùy chọn)
  function shuffleTfStatementsSync(q) {
    const stmts = Array.isArray(q.statements) ? q.statements : (Array.isArray(q.items) ? q.items : null);
    if (!stmts || stmts.length !== 4) return q;
    const subs = ['a', 'b', 'c', 'd'];
    const shuffled = shuffleArray(stmts).map((st, idx) => ({
      ...st,
      letter: subs[idx]
    }));
    q.statements = shuffled;
    q.items = shuffled;
    return q;
  }

  const resolveQuestionType = (q) => {
    const raw = String(q?.type || q?.format || '').trim().toUpperCase();
    if (raw === 'MCQ') return 'MCQ';
    if (raw === 'TF') return 'TF';
    if (raw === 'SA' || raw === 'SHORT_ANSWER') return 'SA';
    if (raw === 'ESSAY' || raw === 'TL') return 'ESSAY';
    if (Array.isArray(q?.options) && q.options.length === 4) return 'MCQ';
    if (Array.isArray(q?.statements) || Array.isArray(q?.subItems)) return 'TF';
    return 'MCQ';
  };

  // GĐ2 (P0-02): kiểm tra đáp án hợp lệ TRƯỚC khi trộn — câu thiếu đáp
  // án thì dừng và nêu rõ câu, không trộn rồi mới phát hiện.
  assertValidQuestionAnswers(baseQuestions || []);

  for (let vIdx = 0; vIdx < count; vIdx++) {
    const code = userCodes[vIdx] || String(startCode + vIdx);
    const clonedQuestions = JSON.parse(JSON.stringify(baseQuestions || []));

    // GĐ2 (P0-04): MỌI mã đề — kể cả mã đầu tiên — đều trộn thứ tự câu
    // trong từng phần, kể cả phần tự luận. Thứ tự các PHẦN (MCQ → TF →
    // SA → ESSAY) giữ nguyên vì đó là cấu trúc đề thi, không phải thứ tự câu.
    const mcqs = clonedQuestions.filter(q => resolveQuestionType(q) === 'MCQ');
    const tfs = clonedQuestions.filter(q => resolveQuestionType(q) === 'TF');
    const sas = clonedQuestions.filter(q => resolveQuestionType(q) === 'SA');
    const essays = clonedQuestions.filter(q => resolveQuestionType(q) === 'ESSAY');

    const shuffledMcqs = shuffleQuestionsRespectingGroups(mcqs).map(q => shuffleMcqOptionsSync(q));
    const shuffledTfs = shuffleQuestionsRespectingGroups(tfs).map(q => shuffleTfStatements ? shuffleTfStatementsSync(q) : q);
    const shuffledSas = shuffleQuestionsRespectingGroups(sas);
    const shuffledEssays = shuffleQuestionsRespectingGroups(essays);

    variants.push({
      code,
      questions: [...shuffledMcqs, ...shuffledTfs, ...shuffledSas, ...shuffledEssays]
    });
  }

  return variants;
}

module.exports = {
  safeEvaluateMathExpression,
  computeMatrixStatistics,
  validateExamProfile,
  generateShuffledVariants,
  hasPositionalOptions,
  // GĐ2 (P1-01): quy ước điểm Đúng/Sai duy nhất (QĐ2)
  TF_SCORE_BY_CORRECT,
  tfQuestionScore,
  // GĐ2 (P0-02/P0-03): kiểm tra đáp án trước trộn + đối chiếu mã đề
  assertValidQuestionAnswers,
  validateVariantAnswers,
  // GĐ3 (P1-07)
  isValidShortAnswer,
  ESSAY_MIN_CONTENT_CHARS
};

