function detectMatrixColumnsRefined(headerRow0 = [], headerRow1 = [], headerRow2 = []) {
  const combined = headerRow1.join(' | ') + ' || ' + headerRow0.join(' | ');

  const hasMcq = /nhiều\s*lựa\s*chọn|nlc|mcq|trắc\s*nghiệm/i.test(combined);
  const hasTf = /đúng\s*[\/\-]\s*sai|đúng\s*sai|đ-s|đs|\btf\b/i.test(combined);
  const hasSa = /trả\s*lời\s*ngắn|tln|điền\s*khuyết|\bsa\b/i.test(combined);
  const hasEssay = /tự\s*luận|thực\s*hành|bài\s*tập\s*lớn|\bessay\b/i.test(combined);

  console.log('Result for:', combined.substring(0, 80));
  console.log({ hasMcq, hasTf, hasSa, hasEssay });
}

detectMatrixColumnsRefined(
  ['STT', 'Chương/ chủ đề', 'Nội dung/đơn vị kiến thức', 'Mức độ đánh giá'],
  ['', '', '', 'TNKQ nhiều lựa chọn', 'TNKQ Đúng / Sai', 'TNKQ Trả lời ngắn'],
  ['', '', '', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD', 'Biết', 'Hiểu', 'VD']
);

