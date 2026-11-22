function detectMatrixColumns(headerRow0 = [], headerRow1 = [], headerRow2 = []) {
  const combined = headerRow1.join(' | ') + ' || ' + headerRow0.join(' | ');
  console.log('Header text:', combined);

  const hasMcq = /nhiều\s*lựa\s*chọn|nlc|mcq|trắc\s*nghiệm/i.test(combined);
  const hasTf = /đúng\s*-\s*sai|đúng\/sai|đ-s|đs/i.test(combined);
  const hasSa = /trả\s*lời\s*ngắn|tln|điền\s*khuyết/i.test(combined);
  const hasEssay = /tự\s*luận|thực\s*hành|bài\s*tập\s*lớn/i.test(combined);

  console.log({ hasMcq, hasTf, hasSa, hasEssay });
}

// Test Case 1: Tin học THPT (hiện tại của user: MCQ, TF, Tự luận - trong đó tự luận = 0)
detectMatrixColumns(
  ['STT', 'Chương/ chủ đề', 'Nội dung/đơn vị kiến thức', 'Mức độ đánh giá', 'Tổng', 'Tỉ lệ % Điểm'],
  ['', '', '', 'TNKQ-NLC', 'TNKQ-ĐS', 'Tự luận', '', ''],
  ['', '', '', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD']
);

// Test Case 2: Toán THPT (MCQ, TF, Trả lời ngắn)
detectMatrixColumns(
  ['STT', 'Chương/ chủ đề', 'Nội dung/đơn vị kiến thức', 'Mức độ đánh giá'],
  ['', '', '', 'TNKQ nhiều lựa chọn', 'TNKQ Đúng / Sai', 'TNKQ Trả lời ngắn'],
  ['', '', '', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD']
);

// Test Case 3: Đầy đủ 4 phần (Tiếng Anh, Tiểu học, hoặc Ma trận tổng hợp: MCQ, TF, SA, Essay)
detectMatrixColumns(
  ['TT', 'Chủ đề', 'Nội dung', 'Mức độ đánh giá'],
  ['', '', '', 'Phần I: TN Nhiều lựa chọn', 'Phần II: TN Đúng - Sai', 'Phần III: Trả lời ngắn', 'Phần IV: Tự luận'],
  ['', '', '', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD']
);

