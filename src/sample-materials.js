/**
 * src/sample-materials.js
 * Kho tài liệu Kế hoạch giáo dục (KHGD), Phạm vi kiến thức thực tế và Ngân hàng tri thức môn học
 * phục vụ phân tích tài liệu, sinh đề bám sát phạm vi kiến thức và kiểm thử cấp THPT (Lớp 10, 11, 12).
 */

const SAMPLE_DOCUMENTS = {
  // ==========================================================================
  // KỊCH BẢN 1: THPT - TOÁN LỚP 12 (CẤU TRÚC MỚI: MCQ + ĐÚNG/SAI + TRẢ LỜI NGẮN)
  // ==========================================================================
  thpt_math_12: {
    id: 'thpt_math_12',
    name: 'KHGD_Toan_Lop12_THPT_CV7991.docx',
    title: 'KẾ HOẠCH GIÁO DỤC & MA TRẬN KIỂM TRA ĐỊNH KỲ MÔN TOÁN LỚP 12 (THEO CÔNG VĂN 7991/BGDĐT-GDTrH)',
    metadata: {
      schoolName: 'TRƯỜNG THPT CHUYÊN CHU VĂN AN',
      departmentName: 'TỔ TOÁN - TIN HỌC',
      schoolYear: '2026 - 2027',
      level: 'THPT',
      grade: '12',
      subject: 'Toán',
      textbook: 'Kết nối tri thức với cuộc sống',
      examPeriod: 'Cuối học kỳ I',
      duration: 90,
      numVariants: 2,
      regulation: 'CV7991_TT22',
      localGuidelines: 'Cấu trúc đề Toán 12 theo Công văn 7991/BGDĐT-GDTrH và định hướng THPT 2025: Phần I gồm 12 câu Trắc nghiệm nhiều lựa chọn (3,0 điểm - 0,25đ/câu); Phần II gồm 4 câu Trắc nghiệm Đúng/Sai (4,0 điểm - mỗi câu 4 ý a,b,c,d); Phần III gồm 6 câu Trắc nghiệm Trả lời ngắn (3,0 điểm - 0,5đ/câu). Tổng điểm = 10,0 điểm.'
    },
    paragraphs: [
      'CĂN CỨ CHUYÊN MÔN: Thông tư 22/2021/TT-BGDĐT và Công văn 7991/BGDĐT-GDTrH ngày 17/12/2024 của Bộ GD&ĐT.',
      'Chương I: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
      'Bài 1: Tính đơn điệu, cực trị, giá trị lớn nhất - nhỏ nhất và đường tiệm cận của đồ thị hàm số',
      'Biết: Nhận biết khoảng đồng biến, nghịch biến, điểm cực đại, cực tiểu, tiệm cận đứng và tiệm cận ngang từ bảng biến thiên hoặc công thức hàm số.',
      'Hiểu: Tìm giá trị lớn nhất, giá trị nhỏ nhất của hàm số trên một đoạn; khảo sát sự biến thiên của hàm đa thức bậc ba và hàm phân thức.',
      'Vận dụng: Giải quyết bài toán tối ưu chi phí/lợi nhuận trong thực tiễn sản xuất kinh doanh bằng đạo hàm.',
      'Chương II: Vectơ và hệ trục tọa độ trong không gian Oxyz',
      'Bài 2: Vectơ trong không gian, tọa độ của điểm và vectơ, tích vô hướng trong hệ trục Oxyz',
      'Biết: Xác định tọa độ điểm, tọa độ vectơ, hình chiếu của điểm lên các trục và mặt phẳng tọa độ trong không gian Oxyz.',
      'Hiểu: Tính độ dài đoạn thẳng, tọa độ trọng tâm tam giác, tích vô hướng và góc giữa hai vectơ trong không gian Oxyz.',
      'Vận dụng: Ứng dụng tọa độ vectơ trong không gian Oxyz để tính khoảng cách thực tế (định vị flycam/máy bay, cân bằng lực).',
      'Chương III: Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm',
      'Bài 3: Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm',
      'Biết: Xác định khoảng biến thiên R, nhóm chứa tứ phân vị của mẫu số liệu ghép nhóm.',
      'Hiểu: Tính số trung bình cộng, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.',
      'Vận dụng: So sánh mức độ ổn định/phân tán giữa hai mẫu số liệu thực tiễn dựa vào độ lệch chuẩn.'
    ],
    matrixConfig: {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [
        {
          id: 'row_1',
          topic: 'Chương I. Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
          unit: '1. Tính đơn điệu, cực trị, GTLN-GTNN, tiệm cận và bài toán tối ưu thực tiễn',
          counts: {
            MCQ: { 'Biết': 4, 'Hiểu': 2, 'Vận dụng': 0 },
            TF: { 'Biết': 3, 'Hiểu': 3, 'Vận dụng': 2 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 2 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 5.0
        },
        {
          id: 'row_2',
          topic: 'Chương II. Vectơ và hệ trục tọa độ trong không gian Oxyz',
          unit: '2. Biểu thức tọa độ của các phép toán vectơ, tích vô hướng và ứng dụng thực tiễn Oxyz',
          counts: {
            MCQ: { 'Biết': 3, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 3.0
        },
        {
          id: 'row_3',
          topic: 'Chương III. Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm',
          unit: '3. Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn',
          counts: {
            MCQ: { 'Biết': 1, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 2.0
        }
      ]
    }
  },

  // ==========================================================================
  // TÌNH HUỐNG 3B: THPT - TIẾNG ANH LỚP 12 (CÓ NGHE + TRANSCRIPT + ĐỌC HIỂU)
  // ==========================================================================
  thpt_eng_12: {
    id: 'thpt_eng_12',
    name: 'KHGD_TiengAnh_Lop12_THPT_CV7991.docx',
    title: 'KẾ HOẠCH KIỂM TRA ĐỊNH KỲ MÔN TIẾNG ANH LỚP 12 (CÓ KỸ NĂNG NGHE KÈM TAPESCRIPT - GLOBAL SUCCESS)',
    metadata: {
      schoolName: 'TRƯỜNG THPT CHUYÊN NGOẠI NGỮ',
      departmentName: 'TỔ NGOẠI NGỮ',
      schoolYear: '2026 - 2027',
      level: 'THPT',
      grade: '12',
      subject: 'Tiếng Anh',
      textbook: 'Kết nối tri thức với cuộc sống',
      examPeriod: 'Cuối học kỳ I',
      duration: 60,
      numVariants: 2,
      regulation: 'CV7991_TT22',
      localGuidelines: 'Đề kiểm tra Tiếng Anh 12 gồm đầy đủ kỹ năng Listening (kèm Tapescript cho giáo viên), Lexico-Grammar, Reading Comprehension và Sentence Transformation/Writing. Phân bổ: 16 câu MCQ (4,0đ), 2 bài Đúng/Sai Listening & Reading (2 câu × 4 ý = 2,0đ), 4 câu Trả lời ngắn/Điền từ (2,0đ), 2 câu Viết lại câu/Đoạn văn ngắn (2,0đ). Tổng = 10,0 điểm.'
    },
    listeningTranscript: `[TAPESCRIPT FOR LISTENING SECTION - TEACHER'S COPY]
Host: Welcome to "Green Future Podcast". Today we are talking with Dr. Sarah Jenkins, an urban environmentalist, about Green Living and Sustainable Cities.
Dr. Sarah Jenkins: Thank you! Over the past decade, many megacities have started replacing single-use plastics with biodegradable materials and expanding electric public transport networks.
Host: What is the biggest challenge for young people who want to adopt a green lifestyle?
Dr. Sarah Jenkins: Many students think green living is expensive. However, simple daily habits like bringing a reusable water bottle, unplugging electronic devices when not in use, and sorting household waste can reduce a household's carbon footprint by up to 25 percent every year.
Host: Did your recent project in Singapore show positive results?
Dr. Sarah Jenkins: Yes! Over 4,500 high school students joined our "Zero-Waste Campus" campaign in 2025, collecting 12 tons of recyclable paper and plastic within just three months.`,
    readingPassage: `Read the following passage about Cultural Diversity and Urbanisation and answer the questions:
In the 21st century, rapid urbanisation has brought people from diverse cultural backgrounds together into vibrant metropolitan areas. While moving to big cities offers young workers better job opportunities, modern healthcare, and higher education, it also creates pressure on housing and public infrastructure. At the same time, preserving traditional festivals, local cuisine, and community values helps citizens maintain their cultural identity in a globalised world.`,
    paragraphs: [
      'Chủ đề 1: Skill 1 - Listening (Green Living & Zero-Waste Campus)',
      'Bài 1: Listening for specific details & True/False statements (with Audio Tapescript)',
      'Biết: Nhận diện thông tin chính và từ khóa trong bài nghe về lối sống xanh (Green Living).',
      'Hiểu: Xác định tính Đúng/Sai của các nhận định chi tiết trong bài phỏng vấn với chuyên gia môi trường.',
      'Vận dụng: Tổng hợp số liệu và thông điệp thực tiễn từ chiến dịch Zero-Waste Campus.',
      'Chủ đề 2: Skill 2 - Phonetics & Lexico-Grammar (Units 1 - 4)',
      'Bài 2: Past Simple vs Past Continuous, Articles (a/an/the), Verbs with prepositions, Relative clauses (which), Double comparatives',
      'Biết: Nhận diện trọng âm, phát âm, mạo từ a/an/the, giới từ đi kèm động từ và thì quá khứ đơn - quá khứ tiếp diễn.',
      'Hiểu: Vận dụng mệnh đề quan hệ qui chiếu cả câu (which), thì hiện tại hoàn thành và cấu trúc so sánh kép.',
      'Vận dụng: Điền đúng dạng từ/giới từ trong ngữ cảnh giao tiếp và học thuật.',
      'Chủ đề 3: Skill 3 - Reading Comprehension (Multicultural World & Urbanisation)',
      'Bài 3: Reading Cloze Text & Reading Comprehension passage about Cultural Diversity and Urbanisation',
      'Biết: Tìm thông tin trực tiếp và từ vựng cơ bản trong đoạn văn đọc hiểu về đô thị hóa.',
      'Hiểu: Suy luận nghĩa từ vựng trong ngữ cảnh (vibrant, infrastructure) và xác định mệnh đề Đúng/Sai.',
      'Vận dụng: Trích xuất từ khóa học thuật từ bài đọc và bài nghe để điền vào câu trả lời ngắn.',
      'Chủ đề 4: Skill 4 - Writing (Sentence Transformation & Short Paragraph)',
      'Bài 4: Rewriting sentences with Double Comparatives & Writing a paragraph about Green Living',
      'Biết: Nắm vững cấu trúc câu so sánh kép và bố cục đoạn văn tiếng Anh.',
      'Hiểu: Viết lại câu tương đương nghĩa sử dụng cấu trúc The more..., the more...',
      'Vận dụng: Viết đoạn văn ngắn (100-120 từ) đề xuất giải pháp sống xanh tại trường học và gia đình.'
    ],
    matrixConfig: {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [
        {
          id: 'row_1',
          topic: 'Skill 1: Listening (Green Living & Zero-Waste Campus)',
          unit: '1. Listening for specific details & True/False statements (with Audio Tapescript)',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 2, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 2.0
        },
        {
          id: 'row_2',
          topic: 'Skill 2: Phonetics & Lexico-Grammar (Units 1 - 4)',
          unit: '2. Tenses, Articles, Prepositions, Relative clauses (which), Double comparatives',
          counts: {
            MCQ: { 'Biết': 5, 'Hiểu': 3, 'Vận dụng': 0 },
            TF: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            SA: { 'Biết': 1, 'Hiểu': 1, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 3.0
        },
        {
          id: 'row_3',
          topic: 'Skill 3: Reading Comprehension (Multicultural World & Urbanisation)',
          unit: '3. Reading Cloze Text & Reading Comprehension passage',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 2, 'Vận dụng': 0 },
            TF: { 'Biết': 1, 'Hiểu': 2, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 3.0
        },
        {
          id: 'row_4',
          topic: 'Skill 4: Writing (Sentence Transformation & Short Paragraph)',
          unit: '4. Rewriting sentences with Double Comparatives & Writing about Green Living',
          counts: {
            MCQ: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            TF: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            SA: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 }
          },
          essayPoints: { 'Biết': 0, 'Hiểu': 1.0, 'Vận dụng': 1.0 },
          points: 2.0
        }
      ]
    }
  },

  // ==========================================================================
  // TÌNH HUỐNG 3C: THPT - TIN HỌC LỚP 12 (AI, MẠNG MÁY TÍNH, HTML/CSS, CSDL)
  // ==========================================================================
    // ==========================================================================
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
  thpt_it_12: {
    id: 'thpt_it_12',
    name: 'KHGD_TinHoc_Lop12_THPT_CV7991.docx',
    title: 'KẾ HOẠCH KIỂM TRA ĐỊNH KỲ MÔN TIN HỌC LỚP 12 (CHƯƠNG TRÌNH GDPT 2018 - CÔNG VĂN 7991)',
    metadata: {
      schoolName: 'TRƯỜNG THPT LÊ HỒNG PHONG',
      departmentName: 'TỔ TIN HỌC - CÔNG NGHỆ',
      schoolYear: '2026 - 2027',
      level: 'THPT',
      grade: '12',
      subject: 'Tin học',
      textbook: 'Kết nối tri thức với cuộc sống',
      examPeriod: 'Cuối học kỳ I',
      duration: 45,
      numVariants: 2,
      regulation: 'CV7991_TT22',
      localGuidelines: 'Cấu trúc đề Tin học 12 theo định hướng THPT: Phần I gồm 12 câu Trắc nghiệm nhiều lựa chọn (3,0đ); Phần II gồm 4 câu Trắc nghiệm Đúng/Sai × 4 ý a,b,c,d (4,0đ); Phần III gồm 6 câu Trả lời ngắn tính toán địa chỉ IP, CSS specificity, truy vấn dữ liệu và HTML (3,0đ). Tổng = 10,0 điểm.'
    },
    paragraphs: [
      'Chủ đề A: Máy tính và xã hội tri thức - Trí tuệ nhân tạo (AI)',
      'Bài 1: Khái niệm Trí tuệ nhân tạo (AI), AI hẹp (ANI), AI tổng quát (AGI) và ứng dụng cảnh báo đạo đức AI',
      'Biết: Nêu được khái niệm AI, phân biệt AI hẹp và AI rộng, nhận diện các ứng dụng AI như nhận dạng khuôn mặt, trợ lý ảo.',
      'Hiểu: Giải thích được lợi ích và nguy cơ về quyền riêng tư, bản quyền, thiên kiến dữ liệu khi ứng dụng AI.',
      'Vận dụng: Đánh giá giải pháp ứng dụng AI an toàn trong giáo dục và y tế.',
      'Chủ đề B: Mạng máy tính và Internet (Giao thức mạng TCP/IP và thiết bị mạng)',
      'Bài 2: Thiết bị mạng (Switch, Router, Access Point, Modem) và bộ giao thức TCP/IP, địa chỉ IPv4/IPv6',
      'Biết: Nhận biết chức năng của Switch, Router, Access Point, Modem và ý nghĩa giao thức TCP, IP, HTTP, DNS.',
      'Hiểu: Phân biệt mạng LAN và WAN; xác định số bit của địa chỉ IPv4 (32 bit) và IPv6 (128 bit).',
      'Vận dụng: Tính toán số lượng địa chỉ IP khả dụng cho máy trạm (Host) trong mạng con và thiết lập mạng LAN cho phòng máy.',
      'Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính (Tạo trang web bằng HTML5 và CSS3)',
      'Bài 3: Cấu trúc văn bản HTML, danh sách, bảng biểu, biểu mẫu (Form) và định dạng bằng CSS (Box Model, Selector)',
      'Biết: Nhận biết các thẻ HTML cơ bản (h1..h6, p, a, img, table, tr, td, form, input) và cú pháp quy tắc CSS.',
      'Hiểu: Phân biệt bộ chọn CSS theo thẻ, lớp (.class) và định danh (#id); giải thích mô hình hộp (Box Model: content, padding, border, margin).',
      'Vận dụng: Tính tổng chiều rộng hiển thị thực tế của phần tử theo CSS Box Model và viết/sửa đoạn mã HTML-CSS chuẩn.'
    ],
    matrixConfig: {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [
        {
          id: 'row_1',
          topic: 'Chủ đề A. Máy tính và xã hội tri thức (Trí tuệ nhân tạo - AI)',
          unit: '1. Khái niệm AI, phân loại AI hẹp/AI rộng, lĩnh vực ứng dụng và đạo đức AI',
          counts: {
            MCQ: { 'Biết': 3, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 0 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 2.5
        },
        {
          id: 'row_2',
          topic: 'Chủ đề B. Mạng máy tính và Internet',
          unit: '2. Thiết bị mạng (Switch, Router, AP), giao thức TCP/IP và địa chỉ IPv4/IPv6',
          counts: {
            MCQ: { 'Biết': 3, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 3.0
        },
        {
          id: 'row_3',
          topic: 'Chủ đề F. Tạo trang web với HTML5 và CSS3',
          unit: '3. Thẻ định dạng HTML, Bảng, Biểu mẫu (Form), CSS Selector và CSS Box Model',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 2, 'Vận dụng': 0 },
            TF: { 'Biết': 3, 'Hiểu': 3, 'Vận dụng': 2 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 2 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 4.5
        }
      ]
    }
  },

  // ==========================================================================
  // TÌNH HUỐNG 3D: THPT - VẬT LÍ LỚP 12 (VẬT LÍ NHIỆT, KHÍ LÍ TƯỞNG, TỪ TRƯỜNG)
  // ==========================================================================
  thpt_phys_12: {
    id: 'thpt_phys_12',
    name: 'KHGD_VatLi_Lop12_THPT_CV7991.docx',
    title: 'KẾ HOẠCH KIỂM TRA ĐỊNH KỲ MÔN VẬT LÍ LỚP 12 (CHƯƠNG TRÌNH GDPT 2018 - CÔNG VĂN 7991)',
    metadata: {
      schoolName: 'TRƯỜNG THPT CHUYÊN TRẦN ĐẠI NGHĨA',
      departmentName: 'TỔ VẬT LÍ - KỸ THUẬT',
      schoolYear: '2026 - 2027',
      level: 'THPT',
      grade: '12',
      subject: 'Vật lí',
      textbook: 'Chân trời sáng tạo',
      examPeriod: 'Cuối học kỳ I',
      duration: 50,
      numVariants: 2,
      regulation: 'CV7991_TT22',
      localGuidelines: 'Cấu trúc đề Vật lí 12 theo Công văn 7991/BGDĐT-GDTrH: Phần I gồm 12 câu Trắc nghiệm nhiều lựa chọn (3,0đ); Phần II gồm 4 câu Trắc nghiệm Đúng/Sai × 4 ý (4,0đ); Phần III gồm 6 câu Trả lời ngắn tính toán Vật lí (3,0đ). Tổng = 10,0 điểm.'
    },
    paragraphs: [
      'Chương 1: Vật lí nhiệt (Nội năng, Định luật I Nhiệt động lực học, Nhiệt dung riêng, Nhiệt nóng chảy riêng)',
      'Bài 1: Chuyển thể của các chất, thang nhiệt độ Kelvin T(K) = t(°C) + 273, Định luật I NĐLH ΔU = A + Q',
      'Biết: Nêu được mô hình động học phân tử, công thức chuyển đổi nhiệt độ Celsius và Kelvin, công thức Q = m.c.Δt và Q = λ.m.',
      'Hiểu: Xác định dấu của A và Q trong biểu thức ΔU = A + Q; tính nhiệt lượng cần cung cấp để đun nóng hoặc làm nóng chảy vật.',
      'Vận dụng: Giải bài toán cân bằng nhiệt và hiệu suất ấm đun nước điện trong thực tế.',
      'Chương 2: Khí lí tưởng (Định luật Boyle, Định luật Charles, Phương trình trạng thái khí lí tưởng)',
      'Bài 2: Đẳng nhiệt p1.V1 = p2.V2, đẳng áp V1/T1 = V2/T2, phương trình Clapeyron p.V = n.R.T và động năng phân tử',
      'Biết: Phát biểu được định luật Boyle, định luật Charles và viết được phương trình trạng thái khí lí tưởng pV/T = hằng số.',
      'Hiểu: Tính áp suất, thể tích hoặc nhiệt độ tuyệt đối của khối khí khi biến đổi trạng thái.',
      'Vận dụng: Giải bài toán thực tiễn về bình khí nén y tế, lốp xe ô tô khi thay đổi nhiệt độ môi trường.',
      'Chương 3: Từ trường (Lực từ F = B.I.L.sinα, Cảm ứng từ, Từ thông Φ = B.S.cosα và Cảm ứng điện từ)',
      'Bài 3: Tác dụng của từ trường lên đoạn dây dẫn mang dòng điện và định luật Faraday về cảm ứng điện từ',
      'Biết: Nhận biết đường sức từ, quy tắc bàn tay trái và công thức lực từ F = B.I.L.sin(α).',
      'Hiểu: Tính độ lớn lực từ và từ thông gửi qua khung dây dẫn.',
      'Vận dụng: Tính suất điện động cảm ứng trong khung dây máy phát điện xoay chiều.'
    ],
    matrixConfig: {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [
        {
          id: 'row_1',
          topic: 'Chương 1. Vật lí nhiệt',
          unit: '1. Thang nhiệt độ Kelvin, Định luật I NĐLH (ΔU = A + Q), Nhiệt dung riêng & Nhiệt nóng chảy riêng',
          counts: {
            MCQ: { 'Biết': 4, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 3, 'Hiểu': 3, 'Vận dụng': 2 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 4.25
        },
        {
          id: 'row_2',
          topic: 'Chương 2. Khí lí tưởng',
          unit: '2. Định luật Boyle (p1V1=p2V2), Định luật Charles (V/T=const), Phương trình trạng thái khí lí tưởng',
          counts: {
            MCQ: { 'Biết': 3, 'Hiểu': 2, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 3.25
        },
        {
          id: 'row_3',
          topic: 'Chương 3. Từ trường và Cảm ứng điện từ',
          unit: '3. Lực từ F = B.I.L.sinα, Từ thông Φ = B.S.cosα và Định luật Faraday',
          counts: {
            MCQ: { 'Biết': 1, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 2.5
        }
      ]
    }
  },

  // ==========================================================================
  // TÌNH HUỐNG 3E: THPT - HÓA HỌC LỚP 12 (ESTER-LIPID, CARBOHYDRATE, AMINE-PROTEIN)
  // ==========================================================================
  thpt_chem_12: {
    id: 'thpt_chem_12',
    name: 'KHGD_HoaHoc_Lop12_THPT_CV7991.docx',
    title: 'KẾ HOẠCH KIỂM TRA ĐỊNH KỲ MÔN HÓA HỌC LỚP 12 (DANH PHÁP IUPAC - CÔNG VĂN 7991)',
    metadata: {
      schoolName: 'TRƯỜNG THPT NGUYỄN THƯỢNG HIỀN',
      departmentName: 'TỔ HÓA HỌC - SINH HỌC',
      schoolYear: '2026 - 2027',
      level: 'THPT',
      grade: '12',
      subject: 'Hóa học',
      textbook: 'Cánh Diều',
      examPeriod: 'Cuối học kỳ I',
      duration: 50,
      numVariants: 2,
      regulation: 'CV7991_TT22',
      localGuidelines: 'Sử dụng danh pháp hóa học tiếng Anh theo chuẩn IUPAC của Chương trình GDPT 2018 (Ester, Lipid, Carbohydrate, Glucose, Fructose, Saccharose, Starch, Cellulose, Amine, Amino acid, Peptide, Protein, Polymer). Cấu trúc: 12 câu MCQ (3,0đ) + 4 câu Đúng/Sai × 4 ý (4,0đ) + 6 câu Trả lời ngắn tính toán hiệu suất/khối lượng (3,0đ). Tổng = 10,0 điểm.'
    },
    paragraphs: [
      'Chương 1: Ester - Lipid - Xà phòng và chất giặt rửa',
      'Bài 1: Khái niệm, danh pháp IUPAC, phản ứng thủy phân Ester và phản ứng xà phòng hóa chất béo (Triglyceride)',
      'Biết: Gọi tên các ester đơn chức (ethyl acetate CH3COOC2H5, methyl methacrylate...), công thức chất béo (tristearin, triolein, tripalmitin).',
      'Hiểu: Viết phương trình thủy phân ester trong môi trường acid (thuận nghịch) và môi trường kiềm NaOH/KOH (một chiều - xà phòng hóa).',
      'Vận dụng: Tính khối lượng xà phòng thu được từ chất béo có hiệu suất H% và chỉ số xà phòng hóa.',
      'Chương 2: Carbohydrate (Glucose, Fructose, Saccharose, Maltose, Tinh bột và Cellulose)',
      'Bài 2: Cấu tạo phân tử, tính chất hóa học đặc trưng (phản ứng tráng bạc Tollens, Cu(OH)2, thủy phân, lên men)',
      'Biết: Phân loại monosaccharide (glucose, fructose C6H12O6), disaccharide (saccharose, maltose C12H22O11) và polysaccharide ((C6H10O5)n).',
      'Hiểu: Giải thích phản ứng của glucose với thuốc thử Tollens tạo 2Ag, phản ứng màu của hồ tinh bột với iodine I2.',
      'Vận dụng: Tính khối lượng bạc kết tủa hoặc lượng ethanol điều chế từ quá trình lên men tinh bột/glucose thực tế.',
      'Chương 3: Hợp chất chứa Nitrogen (Amine, Amino acid, Peptide và Protein)',
      'Bài 3: Tính base của Amine, tính lưỡng tính của Amino acid và phản ứng màu biuret của Peptide/Protein',
      'Biết: Nhận biết bậc của amine, công thức Glycine (H2N-CH2-COOH, M=75), Alanine (M=89), Valine (M=117), Lysine (M=146), Glutamic acid (M=147).',
      'Hiểu: Xác định môi trường dung dịch amino acid làm đổi màu quỳ tím và số liên kết peptide trong phân tử.',
      'Vận dụng: Tính khối lượng muối thu được khi cho amino acid hoặc peptide tác dụng hoàn toàn với dung dịch HCl / NaOH.'
    ],
    matrixConfig: {
      levels: ['Biết', 'Hiểu', 'Vận dụng'],
      questionTypes: ['MCQ', 'TF', 'SA', 'ESSAY'],
      pointRules: { MCQ: 0.25, TF: 0.25, SA: 0.5, ESSAY: 1.0 },
      rows: [
        {
          id: 'row_1',
          topic: 'Chương 1. Ester - Lipid - Xà phòng và chất giặt rửa',
          unit: '1. Danh pháp Ester, phản ứng thủy phân/xà phòng hóa và bài toán sản xuất xà phòng',
          counts: {
            MCQ: { 'Biết': 3, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 3.0
        },
        {
          id: 'row_2',
          topic: 'Chương 2. Carbohydrate (Glucose, Fructose, Saccharose, Tinh bột, Cellulose)',
          unit: '2. Tính chất hóa học Carbohydrate, phản ứng Tollens tráng bạc và bài toán lên men rượu',
          counts: {
            MCQ: { 'Biết': 3, 'Hiểu': 1, 'Vận dụng': 0 },
            TF: { 'Biết': 3, 'Hiểu': 3, 'Vận dụng': 2 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 4.0
        },
        {
          id: 'row_3',
          topic: 'Chương 3. Hợp chất chứa Nitrogen (Amine, Amino acid, Peptide, Protein)',
          unit: '3. Tính chất Amine, tính lưỡng tính Amino acid (Gly, Ala, Lys, Glu), phản ứng màu Biuret',
          counts: {
            MCQ: { 'Biết': 2, 'Hiểu': 2, 'Vận dụng': 0 },
            TF: { 'Biết': 2, 'Hiểu': 1, 'Vận dụng': 1 },
            SA: { 'Biết': 0, 'Hiểu': 1, 'Vận dụng': 1 },
            ESSAY: { 'Biết': 0, 'Hiểu': 0, 'Vận dụng': 0 }
          },
          points: 3.0
        }
      ]
    }
  }
};

module.exports = {
  SAMPLE_DOCUMENTS
};
