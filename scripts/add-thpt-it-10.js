const fs = require('fs');
const path = require('path');

const sampleMatPath = path.join(__dirname, '..', 'src', 'sample-materials.js');
let content = fs.readFileSync(sampleMatPath, 'utf8');

const thptIt10Obj = `  // ==========================================================================
  // TÌNH HUỐNG 3E: THPT - TIN HỌC LỚP 10 - TRƯỜNG THPT NGUYỄN SINH SẮC (GIỮA KÌ I)
  // Ma trận & Bản đặc tả chuẩn 2026-2027 kèm Phiếu TLTN 2025 mã đề 4 số
  // ==========================================================================
  thpt_it_10: {
    id: 'thpt_it_10',
    name: 'MA_TRAN_KTGK1_TIN_10_THPT_NGUYEN_SINH_SAC.docx',
    title: 'KẾ HOẠCH & MA TRẬN KIỂM TRA GIỮA KÌ I MÔN TIN HỌC LỚP 10 - TRƯỜNG THPT NGUYỄN SINH SẮC (CÔNG VĂN 7991)',
    metadata: {
      schoolName: 'TRƯỜNG THPT NGUYỄN SINH SẮC',
      departmentName: 'TỔ TIN HỌC',
      schoolYear: '2026 - 2027',
      level: 'THPT',
      grade: '10',
      subject: 'Tin học',
      textbook: 'Kết nối tri thức với cuộc sống',
      examPeriod: 'Giữa học kỳ I',
      duration: 45,
      numVariants: 4,
      regulation: 'CV7991_TT22',
      localGuidelines: 'Cấu trúc đề Tin học 10 THPT Nguyễn Sinh Sắc: Phần I gồm 20 câu TN nhiều lựa chọn (5,0đ); Phần II gồm 2 câu TN Đúng/Sai - 8 ý (2,0đ); Tự luận gồm 3 câu (3,0đ). Tổng cộng 10,0 điểm (Biết 40%, Hiểu 30%, Vận dụng 30%).'
    },
    paragraphs: [
      'Chủ đề 1: Máy tính và xã hội tri thức (Thông tin, xử lí thông tin và thiết bị thông minh)',
      'Bài 1: Thông tin và xử lí thông tin (Khái niệm thông tin, dữ liệu, quá trình xử lí thông tin và đơn vị lưu trữ dữ liệu)',
      'Biết: Nêu được quá trình xử lí thông tin trong máy tính; Phân biệt được thông tin và dữ liệu.',
      'Hiểu: Chuyển đổi giữa các đơn vị lưu trữ dữ liệu (B, KB, MB, GB, TB, PB).',
      'Vận dụng: Giải quyết các bài toán thực tế về tính toán dung lượng lưu trữ của các thiết bị (ổ cứng, thẻ nhớ, USB) hoặc ước lượng dung lượng tệp tin.',
      'Bài 2: Vai trò của thiết bị thông minh và tin học đối với xã hội',
      'Biết: Nhận biết được một số thiết bị thông minh thông dụng; Nêu được ví dụ cụ thể.',
      'Hiểu: Nêu được vai trò của thiết bị thông minh trong xã hội và cuộc cách mạng công nghiệp lần thứ tư; Nêu vai trò của tin học đối với xã hội.',
      'Chủ đề 2: Mạng máy tính và Internet',
      'Bài 8: Mạng máy tính trong cuộc sống hiện đại',
      'Biết: Trình bày được sự khác biệt giữa mạng LAN và Internet; Nêu một số công nghệ dựa trên Internet như điện toán đám mây và IoT.',
      'Hiểu: Nêu ví dụ cụ thể về ứng dụng của điện toán đám mây hay kết nối vạn vật (IoT) trong cuộc sống.',
      'Bài 9: An toàn trên không gian mạng',
      'Biết: Nêu những nguy cơ và tác hại khi tham gia Internet thiếu hiểu biết; Nêu cách phòng vệ khi bị bắt nạt trên mạng; Phân biệt phần mềm xấu (mã độc).',
      'Hiểu: Nêu ví dụ cụ thể về các nguy cơ, tác hại và đưa ra giải pháp bảo vệ dữ liệu cá nhân tương ứng.',
      'Vận dụng: Vận dụng kỹ năng phòng tránh rủi ro, bảo vệ tài khoản, xử lý email giả mạo, phòng tránh mã độc trên không gian mạng.',
      'Bài 10: Thực hành khai thác tài nguyên trên Internet',
      'Hiểu: Trình bày cách thức tìm kiếm, lựa chọn và đánh giá mức độ tin cậy của tài nguyên/kho học liệu mở phục vụ học tập.',
      'Vận dụng: Sử dụng thành thạo phần mềm dịch tự động (Google Translate...), khai thác kho học liệu mở phục vụ bài tập dự án.',
      'Chủ đề 3: Đạo đức, pháp luật và văn hoá trong môi trường số',
      'Bài 11: Ứng xử trên môi trường số. Nghĩa vụ tôn trọng bản quyền',
      'Biết: Biết những vấn đề nảy sinh về đạo đức, pháp luật khi giao tiếp trên mạng; Nêu quy định bản quyền thông tin, sản phẩm số.',
      'Hiểu: Giải thích được những hành vi vi phạm đạo đức, vi phạm pháp luật, vi phạm bản quyền trong các tình huống cụ thể.',
      'Vận dụng: Nhận diện và ứng xử đúng chuẩn mực trong các tình huống thực tế đời sống.'
    ],
    matrixConfig: {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [
        {
          id: 'row_1',
          topic: 'Chủ đề 1. Máy tính và xã hội tri thức',
          unit: 'Bài 1. Thông tin và xử lí thông tin',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 2, 'Vận dụng': 0 },
            TF: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          cellRefs: { MCQ: ['1 MC(1)', '1 MC(2)', '1 MC(3)', '1 MC(4)'], TF: ['1VD'] },
          points: 1.25
        },
        {
          id: 'row_2',
          topic: 'Chủ đề 1. Máy tính và xã hội tri thức',
          unit: 'Bài 2. Vai trò của thiết bị thông minh và tin học đối với xã hội.',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 0, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 0 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          cellRefs: { MCQ: ['1 MC(5)', '1 MC(6)'], TF: ['2B', '1H'] },
          points: 1.25
        },
        {
          id: 'row_3',
          topic: 'Chủ đề 2. Mạng máy tính và Internet',
          unit: 'Bài 8. Mạng máy tính trong cuộc sống hiện đại',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          cellRefs: { MCQ: ['1 MC(7)', '1 MC(8)', '1 MC(9)'] },
          points: 0.75
        },
        {
          id: 'row_4',
          topic: 'Chủ đề 2. Mạng máy tính và Internet',
          unit: 'Bài 9. An toàn trên không gian mạng',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            TF: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 0 }
          },
          cellRefs: { MCQ: ['1 MC(10)', '1 MC(11)', '1 MC(12)', '1 MC(13)'], ESSAY: ['1H'] },
          points: 2.0
        },
        {
          id: 'row_5',
          topic: 'Chủ đề 2. Mạng máy tính và Internet',
          unit: 'Bài 10. Thực hành khai thác tài nguyên trên Internet',
          counts: {
            MCQ: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 2 },
            TF: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 1 }
          },
          cellRefs: { MCQ: ['1 MC(14)', '1 MC(15)', '1 MC(16)'], ESSAY: ['1VD'] },
          points: 1.75
        },
        {
          id: 'row_6',
          topic: 'Chủ đề 3. Đạo đức, pháp luật và văn hoá trong môi trường số',
          unit: 'Bài 11. Ứng xử trên môi trường số. Nghĩa vụ tôn trọng bản quyền.',
          counts: {
            MCQ: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 3 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 1, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          cellRefs: { MCQ: ['1 MC(17)', '1 MC(18)', '1 MC(19)', '1 MC(20)'], TF: ['2B', '1H', '1VD'], ESSAY: ['1B'] },
          points: 3.0
        }
      ]
    }
  },
`;

if (!content.includes('thpt_it_10')) {
  // Chèn vào trước thpt_it_12
  content = content.replace('thpt_it_12: {', thptIt10Obj + '  thpt_it_12: {');
  fs.writeFileSync(sampleMatPath, content, 'utf8');
  console.log('✓ Added thpt_it_10 scenario successfully!');
} else {
  console.log('thpt_it_10 already present');
}

