const fs = require('fs');

function cleanOptionText(text) {
  if (!text) return '';
  let str = text.trim();

  // 1. Cắt bỏ tiêu đề phần tiếp theo hoặc dạng câu hỏi tiếp theo ở cuối phương án:
  // - "\n2. Câu trắc nghiệm đúng sai."
  // - "\n2. CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI"
  // - "\n2. DẠNG CÂU HỎI D2"
  // - "\nII. CÂU HỎI TRẮC NGHIỆM ĐÚNG – SAI:"
  // - "\nTRẮC NGHIỆM Đ/S" hoặc "\nBẢNG ĐÁP ÁN"
  const sectionCutRegex = /(?:[\r\n\t]+|\s{2,})(?:(?:\d+\.|\b(?:PHẦN|DẠNG|D2)\b|[I|V|X]+\b|\bII\b|\bIII\b)[\s\.:\-_]*(?:câu\s*(?:hỏi|trắc\s*nghiệm)|trắc\s*nghiệm|đúng|sai|dạng|tự\s*luận|trả\s*lời|bảng\s*đáp\s*án)|TRẮC\s*NGHIỆM\s*Đ[\/-]?S|BẢNG\s*ĐÁP\s*ÁN)[\s\S]*$/i;
  str = str.replace(sectionCutRegex, '').trim();

  // 2. Cắt bỏ nhãn mức độ nhận thức (kèm số thứ tự mục hoặc đứng độc lập) ở cuối phương án:
  // Ví dụ: "\nTHÔNG HIỂU", "1.2. Thông hiểu", "1.3. Dạng vận dụng", "\nVẬN DỤNG", "(Đúng, Biết)"
  const levelCutRegex = /(?:[\r\n\t]+|\s{2,}|\.\s+|\s+)(?:(?:\d+\.)*\d+\.?\s*(?:dạng\s*)?|\((?:đúng|sai)[,\s]+)?(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng(?:\s*cao)?)\s*[:.)]?\s*$/i;
  str = str.replace(levelCutRegex, '').trim();

  // 3. Cắt bỏ nhãn chỉ dẫn đáp án kèm mức độ ở cuối dòng: ví dụ "(Đúng, Biết)" hoặc "(Sai, Vận dụng)"
  str = str.replace(/\s*\((?:Đúng|Sai)[,\s]+(?:Biết|Hiểu|Vận\s*dụng)\)\s*$/i, '').trim();

  // 4. Cắt bỏ nếu có câu hỏi tiếp theo bị dính: "\nCâu 12: ..." hoặc "\nCâu hỏi 5: ..."
  const nextQCuttRegex = /(?:[\r\n\t]+|\s{2,})(?:Câu\s*hỏi|Câu)\s+\d+[\s\S]*$/i;
  str = str.replace(nextQCuttRegex, '').trim();

  // 5. Nếu có tùy chọn tiếp theo bị nuốt (ví dụ "\nD Một hệ thống..." hoặc "\nD, Tin nhắn..."):
  str = str.replace(/(?:[\r\n\t]+|\s{2,})([A-D])[\s,.:][\s\S]*$/, '').trim();

  // 6. Chuẩn hóa khoảng trắng và dấu xuống dòng không cần thiết (trừ khi là thẻ code HTML)
  if (!/<[a-z][\s\S]*>/i.test(str)) {
    str = str.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  return str;
}

const userRaw = "Kết nối với mạng.\n2. Câu trắc nghiệm đúng sai.";
console.log('Result for user test:', JSON.stringify(cleanOptionText(userRaw)));
