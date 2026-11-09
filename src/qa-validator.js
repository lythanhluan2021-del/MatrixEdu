/**
 * src/qa-validator.js
 * Bộ Kiểm định Chất lượng Chuyên môn (QA Engine) & Kiểm tra độc lập Đáp án / Phép tính
 * Đảm bảo sự thống nhất 4 chiều: Ma trận ↔ Bản đặc tả ↔ Đề kiểm tra ↔ Đáp án
 */

const { evaluateAlignment } = require('./content-alignment');
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
      const ptUnit = Number(pointRules[qt] || (qt === 'MCQ' ? 0.25 : qt === 'TF' ? 0.25 : qt === 'SA' ? 0.5 : 1.0));
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

  const levelPercentages = {};
  for (const lv of levels) {
    levelPercentages[lv] = totalPoints > 0
      ? Math.round((pointsByLevel[lv] / totalPoints) * 100)
      : 0;
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

  // 1. Kiểm tra quy định cấp học THPT (Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH)
  passedChecks.push(`Đúng quy định cấp THPT (Thông tư 22/2021/TT-BGDĐT & Công văn 7991/BGDĐT-GDTrH) với các mức độ: ${stats.levels.join(', ')}.`);

  // 2. Kiểm tra tổng điểm Ma trận = 10.0 điểm
  if (Math.abs(stats.totalPoints - 10.0) <= 0.01) {
    passedChecks.push(`Tổng điểm Ma trận chính xác: ${stats.totalPoints.toFixed(1)} / 10.0 điểm.`);
  } else {
    issues.push(`Tổng điểm Ma trận hiện tại là ${stats.totalPoints.toFixed(2)} điểm (chưa khớp thang điểm 10.0).`);
  }

  // 3. Kiểm tra đối chiếu Ma trận ↔ Bản đặc tả
  const matrixRows = matrix.rows || [];
  if (specs.length === matrixRows.length && matrixRows.length > 0) {
    passedChecks.push(`Bản đặc tả khớp 1-1 với Ma trận (${specs.length}/${matrixRows.length} đơn vị kiến thức).`);
  } else {
    issues.push(`Số đơn vị kiến thức trong Bản đặc tả (${specs.length}) chưa khớp với Ma trận (${matrixRows.length}).`);
  }

  // 4. Kiểm tra đối chiếu Ma trận ↔ Bộ câu hỏi trong Đề
  const qByType = {
    MCQ: questions.filter(q => q.type === 'MCQ').length,
    TF: questions.filter(q => q.type === 'TF').reduce((acc, q) => acc + ((q.statements || q.subItems || []).length || 4), 0),
    SA: questions.filter(q => q.type === 'SA').length,
    ESSAY: questions.filter(q => q.type === 'ESSAY').length
  };

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

  // 5. Kiểm tra tổng điểm các câu hỏi trong Đề
  const examTotalPoints = Math.round(questions.reduce((acc, q) => acc + Number(q.points || 0), 0) * 100) / 100;
  if (Math.abs(examTotalPoints - stats.totalPoints) <= 0.01) {
    passedChecks.push(`Tổng điểm các câu hỏi trong Đề kiểm tra (${examTotalPoints.toFixed(1)}đ) khớp tuyệt đối với Ma trận (${stats.totalPoints.toFixed(1)}đ).`);
  } else {
    issues.push(`Tổng điểm các câu hỏi trong Đề (${examTotalPoints.toFixed(2)}đ) lệch so với Ma trận (${stats.totalPoints.toFixed(2)}đ).`);
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
      if (uniqueOpts.size < opts.length) {
        warnings.push(`${qLabel}: Có phương án trả lời bị trùng lặp nội dung.`);
      }
      if (!['A', 'B', 'C', 'D'].includes(String(q.answer || '').trim().toUpperCase())) {
        missingAnswerCount++;
        issues.push(`${qLabel}: Đáp án '${q.answer}' không hợp lệ (phải là A, B, C hoặc D).`);
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
      if (q.answer === undefined || q.answer === null || String(q.answer).trim() === '') {
        missingAnswerCount++;
        issues.push(`${qLabel}: Câu trả lời ngắn thiếu đáp số chuẩn.`);
      }
    } else if (q.type === 'ESSAY') {
      if (!q.explanation && !q.rubric && !q.answer) {
        missingAnswerCount++;
        issues.push(`${qLabel}: Câu tự luận thiếu hướng dẫn chấm / biểu điểm.`);
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
      const alignRes = evaluateAlignment(q, targetRow, meta);
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

  // 7. Kiểm tra các mã đề trộn (Variants)
  if (variants.length > 0) {
    const allSameCount = variants.every(v => (v.questions || []).length === questions.length);
    if (allSameCount) {
      passedChecks.push(`Đã khởi tạo ${variants.length} mã đề (${variants.map(v => v.code).join(', ')}) đồng bộ số câu và bảng đáp án riêng.`);
    } else {
      issues.push('Một số mã đề nhân bản có số câu không khớp với đề gốc.');
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
 * Nhân bản & Trộn mã đề thực tế (Hoán vị câu hỏi trong cùng dạng thức và đảo phương án A/B/C/D, tự cập nhật đáp án)
 */
function generateShuffledVariants(baseQuestions, numVariants = 4, startCode = 101, customCodes = []) {
  const variants = [];
  // Chuẩn hóa danh sách mã đề tùy chỉnh nếu giáo viên chỉ định
  const userCodes = (Array.isArray(customCodes) ? customCodes : [])
    .map(c => String(c || '').trim())
    .filter(Boolean);

  const count = userCodes.length > 0
    ? userCodes.length
    : Math.max(1, Math.min(12, Number(numVariants) || 1));

  function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // Hàm PRNG có seed cố định theo mã đề để kết quả ổn định, tái lập được
  function createSeededRandom(seed) {
    let s = Math.abs(seed) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function shuffleArray(arr, rand) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  for (let vIdx = 0; vIdx < count; vIdx++) {
    const code = userCodes[vIdx] || String(startCode + vIdx);
    const clonedQuestions = JSON.parse(JSON.stringify(baseQuestions || []));

    if (vIdx === 0) {
      // Mã đề gốc (mã đầu tiên) giữ nguyên thứ tự câu hỏi chuẩn theo Ma trận,
      // nhưng nếu các câu MCQ gốc đang để mặc định đáp án 'A' thì đảo phương án A/B/C/D để phân bố đều
      const seed0 = hashString(code) + 101;
      const rand0 = createSeededRandom(seed0);
      const balancedFirst = clonedQuestions.map(q => {
        if (q.type === 'MCQ' && Array.isArray(q.options) && q.options.length === 4) {
          const isPositional = hasPositionalOptions(q.options) || Boolean(q.keepOptionOrder);
          if (!isPositional) {
            const labels = ['A', 'B', 'C', 'D'];
            const ansIdx = Math.max(0, labels.indexOf(String(q.answer || 'A').toUpperCase()));
            const indexedOpts = q.options.map((text, idx) => ({
              text: String(text).replace(/^[A-D][\.\)]\s*/, ''),
              isCorrect: idx === ansIdx
            }));
            const newOpts = shuffleArray(indexedOpts, rand0);
            q.options = newOpts.map(item => item.text);
            const newAnsIdx = newOpts.findIndex(item => item.isCorrect);
            q.answer = labels[newAnsIdx >= 0 ? newAnsIdx : 0];
          }
        }
        return q;
      });
      variants.push({ code, questions: balancedFirst });
      continue;
    }

    const seedVal = hashString(code) + (vIdx * 997) + (parseInt(code, 10) || 101);
    const rand = createSeededRandom(seedVal);

    // Tách theo nhóm dạng câu hỏi để chỉ trộn trong cùng Phần
    const mcqs = clonedQuestions.filter(q => q.type === 'MCQ');
    const tfs = clonedQuestions.filter(q => q.type === 'TF');
    const sas = clonedQuestions.filter(q => q.type === 'SA');
    const essays = clonedQuestions.filter(q => q.type === 'ESSAY'); // Giữ nguyên thứ tự Tự luận

    // Hoán vị câu MCQ và đảo 4 phương án A, B, C, D (NGOẠI TRỪ CÂU CÓ PHƯƠNG ÁN CHỈ ĐỊNH VỊ TRÍ)
    const shuffledMcqs = shuffleArray(mcqs, rand).map(q => {
      const isPositional = hasPositionalOptions(q.options) || Boolean(q.keepOptionOrder);
      if (!isPositional && Array.isArray(q.options) && q.options.length === 4) {
        const labels = ['A', 'B', 'C', 'D'];
        const ansIdx = Math.max(0, labels.indexOf(String(q.answer || 'A').toUpperCase()));
        const indexedOpts = q.options.map((text, idx) => ({
          text: String(text).replace(/^[A-D][\.\)]\s*/, ''),
          isCorrect: idx === ansIdx
        }));
        const newOpts = shuffleArray(indexedOpts, rand);
        q.options = newOpts.map(item => item.text);
        const newAnsIdx = newOpts.findIndex(item => item.isCorrect);
        q.answer = labels[newAnsIdx >= 0 ? newAnsIdx : 0];
      }
      return q;
    });

    // Hoán vị thứ tự các câu Đúng/Sai và Trả lời ngắn
    const shuffledTfs = shuffleArray(tfs, rand);
    const shuffledSas = shuffleArray(sas, rand);

    variants.push({
      code,
      questions: [...shuffledMcqs, ...shuffledTfs, ...shuffledSas, ...essays]
    });
  }

  return variants;
}

module.exports = {
  safeEvaluateMathExpression,
  computeMatrixStatistics,
  validateExamProfile,
  generateShuffledVariants,
  hasPositionalOptions
};

