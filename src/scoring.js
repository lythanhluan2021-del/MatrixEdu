/**
 * src/scoring.js — Quy ước tính điểm dùng chung duy nhất (GĐ2, P1-01, QĐ2).
 * Module này KHÔNG require bất kỳ module nội bộ nào để tránh vòng lặp
 * require (zip-docx → qa-validator → drive-bank → zip-docx).
 *
 * Điểm câu Đúng/Sai (4 ý, mỗi câu 1,0đ) theo thang trong hướng dẫn chấm
 * file Word: đúng 1 ý 0,1đ; 2 ý 0,25đ; 3 ý 0,5đ; 4 ý 1,0đ.
 * Ma trận, sinh đề, xuất Word và chấm OMR đều gọi tfQuestionScore —
 * không định nghĩa thang điểm ở nơi nào khác.
 */
const TF_SCORE_BY_CORRECT = Object.freeze([0, 0.1, 0.25, 0.5, 1.0]);

function tfQuestionScore(correctCount) {
  const n = Math.max(0, Math.min(4, Math.floor(Number(correctCount) || 0)));
  return TF_SCORE_BY_CORRECT[n];
}

module.exports = {
  TF_SCORE_BY_CORRECT,
  tfQuestionScore
};
