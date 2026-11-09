/**
 * src/question-banks.js
 * Ngân hàng tri thức & Bộ sinh câu hỏi bám sát tài liệu, Ma trận và Bản đặc tả
 * Có tích hợp biểu thức kiểm định độc lập (mathVerify) cho mọi câu hỏi tính toán.
 */

const SUBJECT_POOLS = {
  // ==========================================================================
  // 1. TOÁN LỚP 12 (THPT - CÔNG VĂN 7991: 12 MCQ + 4 TF + 6 SA = 10,0 ĐIỂM)
  // ==========================================================================
  thpt_math_12: {
    MCQ: [
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Cho hàm số y = f(x) = x^3 - 3x^2 + 2. Đạo hàm f\'(x) của hàm số đã cho là:',
        options: ['3x^2 - 6x', '3x^2 - 3x', 'x^2 - 6x', '3x^2 + 6x'],
        answer: 'A',
        explanation: 'Ta có f\'(x) = (x^3 - 3x^2 + 2)\' = 3x^2 - 6x.'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Hàm số y = -x^3 + 3x + 1 đồng biến trên khoảng nào dưới đây?',
        options: ['(-1; 1)', '(-∞; -1)', '(1; +∞)', '(-1; +∞)'],
        answer: 'A',
        explanation: 'y\' = -3x^2 + 3 > 0 ⇔ -1 < x < 1. Vậy hàm số đồng biến trên khoảng (-1; 1).'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Đồ thị của hàm số y = (2x - 1)/(x + 3) có đường tiệm cận ngang là:',
        options: ['y = 2', 'y = -1/3', 'x = -3', 'x = 2'],
        answer: 'A',
        explanation: 'lim(x→±∞) (2x - 1)/(x + 3) = 2 nên đường tiệm cận ngang là y = 2.',
        mathVerify: { expression: '2 / 1', expected: 2 }
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Đồ thị của hàm số y = (x + 2)/(x - 4) có đường tiệm cận đứng là:',
        options: ['x = 4', 'x = -2', 'y = 1', 'y = 4'],
        answer: 'A',
        explanation: 'Mẫu số x - 4 = 0 ⇔ x = 4 và tử số khác 0 tại x = 4 nên tiệm cận đứng là x = 4.'
      },
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Giá trị lớn nhất của hàm số f(x) = x^3 - 3x + 5 trên đoạn [0; 2] bằng:',
        options: ['7', '3', '5', '9'],
        answer: 'A',
        explanation: 'f\'(x) = 3x^2 - 3 = 0 ⇔ x = 1 ∈ [0; 2]. Ta có f(0) = 5, f(1) = 3, f(2) = 8 - 6 + 5 = 7. Vậy max f(x) trên [0; 2] bằng 7.',
        mathVerify: { expression: '2^3 - 3*2 + 5', expected: 7 }
      },
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Cho hàm số y = x^3 - 3x^2 + 4. Tổng giá trị cực đại và giá trị cực tiểu của hàm số bằng:',
        options: ['4', '2', '0', '6'],
        answer: 'A',
        explanation: 'y\' = 3x^2 - 6x = 0 ⇔ x = 0 (y_CĐ = 4) hoặc x = 2 (y_CT = 0). Tổng y_CĐ + y_CT = 4 + 0 = 4.',
        mathVerify: { expression: '4 + (2^3 - 3*(2^2) + 4)', expected: 4 }
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Trong không gian Oxyz, cho hai điểm A(1; 2; -3) và B(3; -2; 1). Tọa độ của vectơ AB là:',
        options: ['(2; -4; 4)', '(-2; 4; -4)', '(4; 0; -2)', '(2; 0; -2)'],
        answer: 'A',
        explanation: 'vectơ(AB) = (3 - 1; -2 - 2; 1 - (-3)) = (2; -4; 4).'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Trong không gian Oxyz, hình chiếu vuông góc của điểm M(4; -5; 7) trên mặt phẳng (Oxy) có tọa độ là:',
        options: ['(4; -5; 0)', '(0; -5; 7)', '(4; 0; 7)', '(0; 0; 7)'],
        answer: 'A',
        explanation: 'Hình chiếu của M(x; y; z) lên mặt phẳng (Oxy) có cao độ z = 0, tức là (4; -5; 0).'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Trong không gian Oxyz, cho vectơ u = 2i - 3j + 5k. Tọa độ của vectơ u là:',
        options: ['(2; -3; 5)', '(2; 3; 5)', '(-2; 3; -5)', '(5; -3; 2)'],
        answer: 'A',
        explanation: 'Theo định nghĩa tọa độ vectơ theo các vectơ đơn vị i, j, k: u = (2; -3; 5).'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Trong không gian Oxyz, cho hai vectơ a = (2; 1; -2) và b = (1; 2; 2). Tích vô hướng a · b bằng:',
        options: ['0', '4', '8', '-4'],
        answer: 'A',
        explanation: 'a · b = 2×1 + 1×2 + (-2)×2 = 2 + 2 - 4 = 0.',
        mathVerify: { expression: '2*1 + 1*2 + (-2)*2', expected: 0 }
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: 'Một mẫu số liệu ghép nhóm có bảng tần số với các nhóm [10; 20), [20; 30), [30; 40), [40; 50). Khoảng biến thiên R của mẫu số liệu ghép nhóm trên là:',
        options: ['40', '30', '50', '10'],
        answer: 'A',
        explanation: 'Khoảng biến thiên R = đầu mút phải nhóm cuối - đầu mút trái nhóm đầu = 50 - 10 = 40.',
        mathVerify: { expression: '50 - 10', expected: 40 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Nếu phương sai của một mẫu số liệu ghép nhóm bằng s^2 = 16 thì độ lệch chuẩn s của mẫu số liệu đó bằng:',
        options: ['4', '8', '256', '2'],
        answer: 'A',
        explanation: 'Độ lệch chuẩn s = √(s^2) = √16 = 4.',
        mathVerify: { expression: 'sqrt(16)', expected: 4 }
      }
    ],
    TF: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Cho hàm số f(x) = x^3 - 3x^2 + 2 có đồ thị (C). Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Đạo hàm của hàm số là f\'(x) = 3x^2 - 6x.', isTrue: true, level: 'Biết' },
          { text: 'Hàm số đạt cực đại tại điểm x = 2.', isTrue: false, level: 'Biết' },
          { text: 'Giá trị nhỏ nhất của hàm số trên đoạn [0; 3] bằng -2.', isTrue: true, level: 'Hiểu' },
          { text: 'Đường thẳng y = 2 cắt đồ thị (C) tại đúng 2 điểm phân biệt.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Sai vì tại x=0 hàm đạt cực đại và tại x=2 hàm đạt cực tiểu; c) Đúng vì f(2) = 8 - 12 + 2 = -2; d) Đúng vì x^3 - 3x^2 + 2 = 2 ⇔ x^2(x - 3) = 0 có 2 nghiệm x = 0 và x = 3.',
        mathVerify: { expression: '2^3 - 3*(2^2) + 2', expected: -2 }
      },
      {
        rowId: 'row_1', level: 'Vận dụng',
        stem: 'Cho hàm số phân thức y = (2x + 1)/(x - 1) có đồ thị (H). Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Tập xác định của hàm số là D = ℝ \\ {1}.', isTrue: true, level: 'Biết' },
          { text: 'Đạo hàm của hàm số là y\' = -3/(x - 1)^2 < 0 với mọi x ≠ 1.', isTrue: true, level: 'Hiểu' },
          { text: 'Giao điểm của hai đường tiệm cận của đồ thị (H) là điểm I(1; 2).', isTrue: true, level: 'Hiểu' },
          { text: 'Tiếp tuyến của đồ thị (H) tại điểm có hoành độ x = 2 có hệ số góc bằng 3.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng vì y\' = (2(-1) - 1(1))/(x-1)^2 = -3/(x-1)^2; c) Đúng vì TCĐ x = 1, TCN y = 2; d) Sai vì hệ số góc k = y\'(2) = -3/(2-1)^2 = -3 ≠ 3.',
        mathVerify: { expression: '-3 / ((2 - 1)^2)', expected: -3 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Trong không gian Oxyz, cho ba điểm A(1; 0; 0), B(0; 2; 0), C(0; 0; 3). Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Tọa độ của vectơ AB là (-1; 2; 0).', isTrue: true, level: 'Biết' },
          { text: 'Độ dài đoạn thẳng AB bằng √5.', isTrue: true, level: 'Biết' },
          { text: 'Trọng tâm G của tam giác ABC có tọa độ là (1/3; 2/3; 1).', isTrue: true, level: 'Hiểu' },
          { text: 'Tam giác ABC là tam giác vuông tại A.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng vì AB = √((-1)^2 + 2^2 + 0^2) = √5; c) Đúng vì G((1+0+0)/3; (0+2+0)/3; (0+0+3)/3) = (1/3; 2/3; 1); d) Sai vì AB · AC = (-1)(-1) + 2·0 + 0·3 = 1 ≠ 0.',
        mathVerify: { expression: '(-1)*(-1) + 2*0 + 0*3', expected: 1 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Khảo sát thời gian tự học mỗi ngày (đơn vị: phút) của 20 học sinh lớp 12A thu được mẫu số liệu ghép nhóm: nhóm [30; 50) có 5 học sinh; nhóm [50; 70) có 10 học sinh; nhóm [70; 90) có 5 học sinh. Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Cỡ mẫu của mẫu số liệu ghép nhóm là n = 20.', isTrue: true, level: 'Biết' },
          { text: 'Giá trị đại diện của nhóm [50; 70) là 60.', isTrue: true, level: 'Biết' },
          { text: 'Thời gian tự học trung bình của mẫu số liệu ghép nhóm là 60 phút.', isTrue: true, level: 'Hiểu' },
          { text: 'Phương sai của mẫu số liệu ghép nhóm trên bằng 250.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng (5+10+5=20); b) Đúng ((50+70)/2=60); c) Đúng vì x_tb = (5×40 + 10×60 + 5×80)/20 = 60; d) Sai vì phương sai s^2 = [5×(40-60)^2 + 10×(60-60)^2 + 5×(80-60)^2]/20 = 4000/20 = 200 ≠ 250.',
        mathVerify: { expression: '(5*40 + 10*60 + 5*80) / 20', expected: 60 }
      }
    ],
    SA: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Tìm giá trị cực đại của hàm số y = -x^3 + 3x^2 + 5.',
        answer: '9',
        explanation: 'y\' = -3x^2 + 6x = 0 ⇔ x = 0 hoặc x = 2. Hàm số đạt cực đại tại x = 2 với y_CĐ = -8 + 12 + 5 = 9.',
        mathVerify: { expression: '-(2^3) + 3*(2^2) + 5', expected: 9 }
      },
      {
        rowId: 'row_1', level: 'Vận dụng',
        stem: 'Một xưởng sản xuất mỗi ngày làm ra x sản phẩm (1 ≤ x ≤ 20). Tổng lợi nhuận thu được (đơn vị: triệu đồng) được tính theo hàm số P(x) = -x^3 + 12x^2 + 60. Hỏi xưởng cần sản xuất bao nhiêu sản phẩm mỗi ngày để lợi nhuận đạt giá trị lớn nhất?',
        answer: '8',
        explanation: 'P\'(x) = -3x^2 + 24x = 0 ⇔ x = 8 (vì x ≥ 1). Lập bảng biến thiên trên [1; 20], P(x) đạt GTLN tại x = 8 sản phẩm.',
        mathVerify: { expression: '24 / 3', expected: 8 }
      },
      {
        rowId: 'row_1', level: 'Vận dụng',
        stem: 'Chi phí nhiên liệu C(v) cho một tàu thủy chạy trên sông với vận tốc v (km/h, v > 0) được mô hình hóa bởi hàm số C(v) = v + 144/v (đơn vị: trăm nghìn đồng/giờ). Tìm vận tốc v (km/h) để chi phí C(v) đạt giá trị nhỏ nhất.',
        answer: '12',
        explanation: 'C\'(v) = 1 - 144/v^2 = 0 ⇔ v^2 = 144 ⇔ v = 12 (km/h) (do v > 0).',
        mathVerify: { expression: 'sqrt(144)', expected: 12 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Trong không gian Oxyz, tính khoảng cách giữa hai điểm A(1; 2; 2) và B(4; 6; 2).',
        answer: '5',
        explanation: 'AB = √((4 - 1)^2 + (6 - 2)^2 + (2 - 2)^2) = √(9 + 16 + 0) = 5.',
        mathVerify: { expression: 'sqrt((4-1)^2 + (6-2)^2 + (2-2)^2)', expected: 5 }
      },
      {
        rowId: 'row_2', level: 'Vận dụng',
        stem: 'Trong không gian Oxyz (đơn vị trên mỗi trục là mét), một thiết bị bay không người lái (flycam) di chuyển thẳng từ vị trí M(2; 3; 10) đến vị trí N(8; 11; 10). Quãng đường flycam đã bay bằng bao nhiêu mét?',
        answer: '10',
        explanation: 'Quãng đường MN = √((8 - 2)^2 + (11 - 3)^2 + (10 - 10)^2) = √(36 + 64) = 10 (m).',
        mathVerify: { expression: 'sqrt((8-2)^2 + (11-3)^2)', expected: 10 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Một mẫu số liệu ghép nhóm có phương sai s^2 = 25. Độ lệch chuẩn s của mẫu số liệu ghép nhóm đó bằng bao nhiêu?',
        answer: '5',
        explanation: 'Độ lệch chuẩn s = √(s^2) = √25 = 5.',
        mathVerify: { expression: 'sqrt(25)', expected: 5 }
      }
    ],
    ESSAY: []
  },

  // ==========================================================================
  // 4. TIẾNG ANH LỚP 12 (THPT - CÓ LISTENING TAPESCRIPT + READING + WRITING)
  // ==========================================================================
  thpt_eng_12: {
    MCQ: [
      {
        rowId: 'row_1', level: 'Biết',
        stem: '[LISTENING] According to the podcast, what is the main topic of the interview with Dr. Sarah Jenkins?',
        options: ['Green Living and Sustainable Cities', 'Space Exploration Technologies', 'Ancient Architecture in Europe', 'Marine Wildlife Conservation'],
        answer: 'A',
        explanation: 'In the tapescript, the host introduces: "Today we are talking with Dr. Sarah Jenkins... about Green Living and Sustainable Cities."'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: '[LISTENING] According to Dr. Sarah Jenkins, what are megacities replacing single-use plastics with?',
        options: ['Biodegradable materials', 'Heavy metal containers', 'Synthetic nylon bags', 'Coal-based products'],
        answer: 'A',
        explanation: 'Dr. Jenkins states: "many megacities have started replacing single-use plastics with biodegradable materials".'
      },
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: '[LISTENING] By how much can simple daily habits reduce a household\'s carbon footprint each year?',
        options: ['Up to 25 percent', 'Up to 5 percent', 'Up to 75 percent', 'Up to 90 percent'],
        answer: 'A',
        explanation: 'Dr. Jenkins mentions: "can reduce a household\'s carbon footprint by up to 25 percent every year."'
      },
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: '[LISTENING] How many tons of recyclable paper and plastic were collected in the "Zero-Waste Campus" campaign?',
        options: ['12 tons', '45 tons', '3 tons', '25 tons'],
        answer: 'A',
        explanation: 'Tapescript: "collecting 12 tons of recyclable paper and plastic within just three months."'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Choose the word whose underlined part differs from the other three in pronunciation: A. c<u>u</u>lture  B. <u>u</u>rban  C. p<u>u</u>blic  D. c<u>u</u>stom',
        options: ['urban', 'culture', 'public', 'custom'],
        answer: 'A',
        explanation: '"urban" is pronounced with /ɜː/, whereas culture, public, and custom are pronounced with /ʌ/.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Choose the word that differs from the other three in the position of primary stress:',
        options: ['admire', 'festival', 'plastic', 'lifestyle'],
        answer: 'A',
        explanation: '"admire" /ədˈmaɪər/ has stress on the 2nd syllable; the others have stress on the 1st syllable.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'While my brother ________ a documentary about Steve Jobs, the electricity suddenly went out.',
        options: ['was watching', 'watched', 'is watching', 'has watched'],
        answer: 'A',
        explanation: 'Past Continuous (was watching) describes an action in progress interrupted by a shorter action in the past (went out).'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Playing ______ guitar is one of my favourite hobbies after school.',
        options: ['the', 'a', 'an', 'Ø (no article)'],
        answer: 'A',
        explanation: 'Use the definite article "the" before names of musical instruments (play the guitar).'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Young graduates often apply ______ jobs in large metropolitan areas.',
        options: ['for', 'on', 'with', 'about'],
        answer: 'A',
        explanation: 'Collocation: "apply for a job" (nộp đơn xin việc).'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Many students now bring reusable water bottles to school, ______ helps reduce plastic waste significantly.',
        options: ['which', 'who', 'whom', 'whose'],
        answer: 'A',
        explanation: 'Relative pronoun "which" refers to the whole preceding clause.'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'The ______ public transport becomes, the ______ people use their private cars.',
        options: ['more convenient / fewer', 'convenient / less', 'most convenient / fewest', 'more convenient / least'],
        answer: 'A',
        explanation: 'Double comparative structure: The + comparative + S + V, the + comparative + S + V.'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'This is the first time our school ______ an international cultural exchange fair.',
        options: ['has organised', 'organised', 'organises', 'was organising'],
        answer: 'A',
        explanation: 'After "This is the first time...", we use the Present Perfect tense (has organised).'
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: '[READING] According to the reading passage, what has brought people from diverse cultural backgrounds together into metropolitan areas?',
        options: ['Rapid urbanisation', 'Rural agriculture', 'Space tourism', 'Marine fishing'],
        answer: 'A',
        explanation: 'First sentence of the passage: "rapid urbanisation has brought people from diverse cultural backgrounds together..."'
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: '[READING] Which of the following is mentioned as a benefit of moving to big cities?',
        options: ['Better job opportunities and modern healthcare', 'Lower housing costs', 'Less traffic congestion', 'Fewer people in public spaces'],
        answer: 'A',
        explanation: 'The passage states: "moving to big cities offers young workers better job opportunities, modern healthcare, and higher education".'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: '[READING] The word "vibrant" in the reading passage is closest in meaning to:',
        options: ['lively and dynamic', 'quiet and empty', 'ancient and forgotten', 'tiny and isolated'],
        answer: 'A',
        explanation: '"vibrant" means full of energy, lively, and dynamic.'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: '[READING] What helps citizens maintain their cultural identity in a globalised world?',
        options: [
          'Preserving traditional festivals, local cuisine, and community values',
          'Replacing all traditional customs with foreign habits',
          'Avoiding all communication with neighbours',
          'Closing down local cultural centres'
        ],
        answer: 'A',
        explanation: 'Last sentence: "preserving traditional festivals, local cuisine, and community values helps citizens maintain their cultural identity".'
      }
    ],
    TF: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: '[LISTENING TRUE/FALSE] Listen to the interview with Dr. Sarah Jenkins and decide whether the following statements are True (Đ) or False (S):',
        statements: [
          { text: 'Dr. Sarah Jenkins is an urban environmentalist.', isTrue: true, level: 'Biết' },
          { text: 'Dr. Jenkins believes that adopting a green lifestyle is always too expensive for students.', isTrue: false, level: 'Biết' },
          { text: 'Unplugging electronic devices when not in use is one of the habits recommended in the podcast.', isTrue: true, level: 'Hiểu' },
          { text: 'More than 4,500 high school students participated in the "Zero-Waste Campus" campaign in Singapore.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) True; b) False (she says simple daily habits are inexpensive and effective); c) True; d) True (Over 4,500 high school students joined).'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: '[READING TRUE/FALSE] Read the passage on Cultural Diversity and Urbanisation and decide whether the statements are True (Đ) or False (S):',
        statements: [
          { text: 'Urbanisation only happens in small rural villages.', isTrue: false, level: 'Biết' },
          { text: 'Big cities offer young people access to higher education and modern healthcare.', isTrue: true, level: 'Hiểu' },
          { text: 'Rapid urbanisation puts pressure on housing and public infrastructure.', isTrue: true, level: 'Hiểu' },
          { text: 'Maintaining traditional festivals and local cuisine supports cultural identity in a globalised society.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) False; b) True; c) True; d) True.'
      }
    ],
    SA: [
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Fill in the blank with ONE suitable preposition: We should care ________ protecting the environment for future generations.',
        answer: 'about',
        explanation: 'Verb + preposition collocation: care about something.'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Give the correct form of the verb in brackets: Many green parks (build) ________ in our city since 2022.',
        answer: 'have been built',
        explanation: 'Present Perfect Passive with "since 2022": have been built.'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: '[READING] Find ONE word in the reading passage that means "the basic physical systems and services of a city (such as transport, housing, and power supplies)".',
        answer: 'infrastructure',
        explanation: 'In the passage: "pressure on housing and public infrastructure".'
      },
      {
        rowId: 'row_3', level: 'Vận dụng',
        stem: '[LISTENING] According to the podcast tapescript, how many months did it take students in Singapore to collect 12 tons of recyclable materials? (Write a number)',
        answer: '3',
        explanation: 'Tapescript: "collecting 12 tons of recyclable paper and plastic within just three months" -> 3.'
      }
    ],
    ESSAY: [
      {
        rowId: 'row_4', level: 'Hiểu', points: 1.0,
        stem: 'Rewrite the following sentence using the Double Comparative structure ("The more..., the more..."):\n"If a city plants more trees, its air becomes cleaner."',
        answer: 'The more trees a city plants, the cleaner its air becomes.',
        explanation: 'Scoring rubric (1.0 point): Correct double comparative structure "The more trees a city plants, the cleaner its air becomes" (1.0 pt).'
      },
      {
        rowId: 'row_4', level: 'Vận dụng', points: 1.0,
        stem: 'Write a short paragraph (100 – 120 words) about three practical ways high school students can practice Green Living at school and at home.',
        answer: 'Paragraph (100-120 words) discussing 3 green habits: reducing single-use plastic, saving energy, and sorting waste.',
        explanation: 'Scoring rubric (1.0 point):\n- Task achievement & 3 clear practical ways (0.4 pt)\n- Coherence, cohesion & connectors (First, Second, Finally...) (0.3 pt)\n- Vocabulary & grammar accuracy on Green Living (0.3 pt).'
      }
    ]
  },

  // ==========================================================================
  // 5. TIN HỌC LỚP 12 (THPT - CÔNG VĂN 7991: 12 MCQ + 4 TF + 6 SA = 10,0 ĐIỂM)
  // ==========================================================================
  thpt_it_12: {
    MCQ: [
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Hệ thống Trí tuệ nhân tạo (AI) được thiết kế để chỉ thực hiện một nhiệm vụ cụ thể (như nhận dạng khuôn mặt hoặc chơi cờ vua) thuộc loại nào?',
        options: ['AI hẹp (ANI - Artificial Narrow Intelligence)', 'AI tổng quát (AGI)', 'Siêu trí tuệ nhân tạo (ASI)', 'Hệ điều hành mạng'],
        answer: 'A',
        explanation: 'AI hẹp (ANI / Weak AI) được huấn luyện để giải quyết một bài toán chuyên biệt.'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Ứng dụng nào sau đây là ví dụ điển hình của công nghệ Nhận dạng ký tự quang học (OCR) trong Trí tuệ nhân tạo?',
        options: [
          'Chuyển đổi hình ảnh chụp trang sách in thành văn bản có thể chỉnh sửa trên máy tính',
          'Tăng tốc độ quạt tản nhiệt của CPU',
          'Định dạng ổ cứng sang hệ thống tệp NTFS',
          'Nén tệp tin thành định dạng .zip'
        ],
        answer: 'A',
        explanation: 'OCR (Optical Character Recognition) nhận dạng chữ viết/chữ in từ hình ảnh sang văn bản số.'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Trợ lý ảo giọng nói như Siri, Google Assistant sử dụng lĩnh vực cốt lõi nào của AI để hiểu câu lệnh của người dùng?',
        options: ['Xử lý ngôn ngữ tự nhiên (NLP)', 'Đồ họa vector 2D', 'Giao thức định tuyến tĩnh', 'Bảng tính điện tử'],
        answer: 'A',
        explanation: 'NLP (Natural Language Processing) giúp máy tính hiểu, phân tích và phản hồi ngôn ngữ con người.'
      },
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Khi triển khai hệ thống AI tuyển dụng nhân sự, nguy cơ đạo đức nào cần được kiểm soát chặt chẽ nhất?',
        options: [
          'Thiên kiến thuật toán (Algorithmic Bias) do dữ liệu huấn luyện thiếu công bằng và xâm phạm quyền riêng tư',
          'Tăng dung lượng bộ nhớ RAM của máy trạm',
          'Thay đổi độ phân giải màn hình máy tính',
          'Giảm kích thước phông chữ trên trình duyệt'
        ],
        answer: 'A',
        explanation: 'Dữ liệu huấn luyện lệch lạc có thể dẫn đến phân biệt đối xử và vi phạm quyền riêng tư dữ liệu cá nhân.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Thiết bị mạng nào có chức năng chính là chuyển tiếp dữ liệu giữa các mạng khác nhau (ví dụ kết nối mạng LAN của trường học ra mạng Internet)?',
        options: ['Router (Bộ định tuyến)', 'Hub', 'Repeater', 'Chuột quang'],
        answer: 'A',
        explanation: 'Router hoạt động ở tầng Mạng (Network Layer), định tuyến các gói tin giữa các mạng khác nhau.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Giao thức nào trong bộ giao thức mạng có nhiệm vụ phân giải tên miền (như `moet.gov.vn`) thành địa chỉ IP tương ứng?',
        options: ['DNS', 'FTP', 'SMTP', 'DHCP'],
        answer: 'A',
        explanation: 'DNS (Domain Name System) ánh xạ tên miền sang địa chỉ IP.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Địa chỉ IPv4 được biểu diễn bởi bao nhiêu bit nhị phân?',
        options: ['32 bit', '128 bit', '64 bit', '16 bit'],
        answer: 'A',
        explanation: 'Địa chỉ IPv4 gồm 4 octet × 8 bit = 32 bit.',
        mathVerify: { expression: '4 * 8', expected: 32 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Để mở rộng vùng phủ sóng mạng không dây (Wi-Fi) cho các phòng học trong trường từ mạng dây LAN có sẵn, thiết bị nào phù hợp nhất?',
        options: ['Access Point (Điểm truy cập không dây)', 'Card âm thanh', 'Máy quét mã vạch', 'Bộ lưu điện UPS'],
        answer: 'A',
        explanation: 'Access Point (AP) kết nối với Switch qua cáp mạng để phát sóng Wi-Fi cho các thiết bị không dây.'
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: 'Trong ngôn ngữ đánh dấu siêu văn bản HTML5, thẻ nào dùng để tạo một siêu liên kết (hyperlink)?',
        options: ['<a>', '<p>', '<img>', '<h1>'],
        answer: 'A',
        explanation: 'Thẻ `<a href="...">` dùng để tạo siêu liên kết trong HTML.'
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: 'Trong HTML, cặp thẻ nào được sử dụng để định nghĩa một hàng (dòng) trong bảng (`<table>`)?',
        options: ['<tr>...</tr>', '<td>...</td>', '<ul>...</ul>', '<form>...</form>'],
        answer: 'A',
        explanation: '`<tr>` (table row) tạo hàng trong bảng; `<td>` tạo ô dữ liệu.'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Trong CSS, bộ chọn (selector) nào dùng để áp dụng kiểu định dạng cho phần tử có thuộc tính `id="header"`?',
        options: ['#header', '.header', 'header', '*header'],
        answer: 'A',
        explanation: 'Trong CSS, dấu `#` chọn theo `id`, dấu `.` chọn theo `class`.'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Thuộc tính CSS nào được dùng để thay đổi màu nền của một phần tử HTML?',
        options: ['background-color', 'color', 'font-weight', 'text-align'],
        answer: 'A',
        explanation: '`background-color` đổi màu nền; `color` đổi màu chữ.'
      }
    ],
    TF: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Một bệnh viện triển khai hệ thống AI hỗ trợ bác sĩ đọc ảnh chụp X-quang phổi và quản lý hồ sơ bệnh án. Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Hệ thống AI phân tích ảnh X-quang thuộc lĩnh vực Thị giác máy tính (Computer Vision).', isTrue: true, level: 'Biết' },
          { text: 'Hệ thống này thuộc loại AI hẹp (ANI) vì chuyên giải quyết bài toán chẩn đoán hình ảnh y khoa.', isTrue: true, level: 'Biết' },
          { text: 'Dữ liệu bệnh án của bệnh nhân có thể công khai tự do lên mạng xã hội để huấn luyện AI mà không cần xin phép hay ẩn danh.', isTrue: false, level: 'Hiểu' },
          { text: 'Kết quả gợi ý của AI đóng vai trò hỗ trợ chuyên môn, quyết định điều trị cuối cùng vẫn cần bác sĩ thẩm định và chịu trách nhiệm.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Sai vì vi phạm nghiêm trọng quyền riêng tư và bảo mật dữ liệu y tế; d) Đúng.'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Một phòng máy tính của trường THPT gồm 40 máy tính để bàn được kết nối mạng LAN và truy cập Internet. Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Thiết bị Switch dùng để kết nối các máy tính trong cùng mạng nội bộ LAN của phòng máy.', isTrue: true, level: 'Biết' },
          { text: 'Giao thức TCP đảm bảo truyền dữ liệu tin cậy, có kiểm soát lỗi và thứ tự gói tin.', isTrue: true, level: 'Biết' },
          { text: 'Địa chỉ IPv4 `192.168.1.300` là một địa chỉ IPv4 hợp lệ.', isTrue: false, level: 'Hiểu' },
          { text: 'Khi hai máy tính trong phòng máy có cùng địa chỉ IP tĩnh giống hệt nhau, mạng sẽ xảy ra xung đột địa chỉ IP (IP Conflict).', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Sai vì mỗi octet của IPv4 chỉ có giá trị từ 0 đến 255 (300 > 255); d) Đúng.'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Cho đoạn mã HTML tạo biểu mẫu đăng ký câu lạc bộ Tin học: `<form action="/submit" method="post"><input type="text" name="fullname"><input type="password" name="pwd"><input type="submit" value="Gửi"></form>`. Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Thẻ `<form>` dùng để tạo biểu mẫu thu thập dữ liệu từ người dùng trên trang web.', isTrue: true, level: 'Biết' },
          { text: 'Phần tử `<input type="password">` sẽ hiển thị các ký tự nhập vào dưới dạng dấu chấm/ẩn để bảo mật mật khẩu.', isTrue: true, level: 'Biết' },
          { text: 'Thuộc tính `method="post"` đính kèm toàn bộ mật khẩu hiển thị công khai trên thanh địa chỉ URL của trình duyệt.', isTrue: false, level: 'Hiểu' },
          { text: 'Nếu muốn người dùng chỉ được chọn duy nhất 1 khối lớp (10, 11 hoặc 12), ta sử dụng các thẻ `<input type="radio">` có cùng thuộc tính `name="grade"`.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Sai (đó là đặc điểm của GET, còn POST gửi dữ liệu trong phần thân HTTP request); d) Đúng.'
      },
      {
        rowId: 'row_3', level: 'Vận dụng',
        stem: 'Cho quy tắc CSS định dạng thẻ hộp nội dung như sau: `.card { width: 300px; padding: 20px; border: 5px solid blue; margin: 15px; }` (với chế độ mặc định `box-sizing: content-box`). Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Bộ chọn `.card` áp dụng cho tất cả các phần tử HTML có thuộc tính `class="card"`.', isTrue: true, level: 'Biết' },
          { text: 'Độ dày đường viền (border) ở mỗi cạnh của hộp `.card` là 5px.', isTrue: true, level: 'Hiểu' },
          { text: 'Khoảng đệm bên trong (padding) tính cả bên trái và bên phải có tổng cộng là 40px.', isTrue: true, level: 'Hiểu' },
          { text: 'Tổng chiều rộng hiển thị của hộp `.card` (tính từ viền trái sang viền phải, gồm content + padding + border) bằng 350px.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Đúng (20px × 2 = 40px); d) Đúng vì Total Width = 300 + 2×20 + 2×5 = 350px.',
        mathVerify: { expression: '300 + 2*20 + 2*5', expected: 350 }
      }
    ],
    SA: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Trong hệ thống phân loại AI theo năng lực, AI được chia thành 3 cấp độ chính: AI hẹp (ANI), AI tổng quát (AGI) và Siêu trí tuệ nhân tạo (ASI). Vậy có bao nhiêu cấp độ phân loại chính?',
        answer: '3',
        explanation: 'Có 3 cấp độ phân loại AI theo năng lực: ANI, AGI và ASI.'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Địa chỉ IPv6 có độ dài gấp bao nhiêu lần độ dài bit của địa chỉ IPv4 (biết IPv6 dài 128 bit và IPv4 dài 32 bit)?',
        answer: '4',
        explanation: 'Tỷ số độ dài bit = 128 / 32 = 4 lần.',
        mathVerify: { expression: '128 / 32', expected: 4 }
      },
      {
        rowId: 'row_2', level: 'Vận dụng',
        stem: 'Một mạng LAN lớp C sử dụng mặt nạ mạng `/24` (có 8 bit dành cho phần Host). Theo công thức 2^8 - 2, mạng này có tối đa bao nhiêu địa chỉ IP khả dụng để gán cho các máy trạm?',
        answer: '254',
        explanation: 'Số địa chỉ IP khả dụng cho Host là 2^8 - 2 = 256 - 2 = 254 (trừ địa chỉ mạng và địa chỉ quảng bá Broadcast).',
        mathVerify: { expression: '(2^8) - 2', expected: 254 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Trong HTML, có bao nhiêu cấp thẻ tiêu đề mục từ `<h1>` đến `<h6>`?',
        answer: '6',
        explanation: 'HTML cung cấp 6 cấp tiêu đề từ `<h1>` (lớn nhất) đến `<h6>` (nhỏ nhất).'
      },
      {
        rowId: 'row_3', level: 'Vận dụng',
        stem: 'Một bảng HTML (`<table>`) có 5 hàng (`<tr>`), mỗi hàng chứa 4 ô dữ liệu (`<td>`) và không dùng thuộc tính gộp ô. Hỏi trong bảng đó có tất cả bao nhiêu thẻ `<td>`?',
        answer: '20',
        explanation: 'Tổng số ô `<td>` = 5 × 4 = 20.',
        mathVerify: { expression: '5 * 4', expected: 20 }
      },
      {
        rowId: 'row_3', level: 'Vận dụng',
        stem: 'Một phần tử HTML có định dạng CSS (`box-sizing: content-box`): `width: 240px; padding-left: 15px; padding-right: 15px; border: 2px solid black;`. Tính tổng chiều rộng của phần tử (tính bằng px, bao gồm content, padding và border hai bên).',
        answer: '274',
        explanation: 'Tổng chiều rộng = 240 + 15 + 15 + 2 + 2 = 274 (px).',
        mathVerify: { expression: '240 + 15 + 15 + 2 + 2', expected: 274 }
      }
    ],
    ESSAY: []
  },

  // ==========================================================================
  // 6. VẬT LÍ LỚP 12 (THPT - CÔNG VĂN 7991: 12 MCQ + 4 TF + 6 SA = 10,0 ĐIỂM)
  // ==========================================================================
  thpt_phys_12: {
    MCQ: [
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Công thức chuyển đổi nhiệt độ từ thang Celsius (°C) sang thang nhiệt độ tuyệt đối Kelvin (K) là:',
        options: ['T(K) = t(°C) + 273', 'T(K) = t(°C) - 273', 'T(K) = 273 × t(°C)', 'T(K) = t(°C) / 273'],
        answer: 'A',
        explanation: 'Thang nhiệt độ Kelvin liên hệ với Celsius theo hệ thức chuẩn T(K) = t(°C) + 273.'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Biểu thức của Định luật I Nhiệt động lực học là:',
        options: ['ΔU = A + Q', 'ΔU = A × Q', 'ΔU = A / Q', 'U = A - Q'],
        answer: 'A',
        explanation: 'Độ biến thiên nội năng của vật bằng tổng công A và nhiệt lượng Q mà vật nhận được: ΔU = A + Q.'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Đơn vị của nhiệt dung riêng c trong hệ SI là:',
        options: ['J/(kg·K)', 'J/kg', 'J·K', 'W/m^2'],
        answer: 'A',
        explanation: 'Từ Q = m·c·ΔT ⇒ c = Q/(m·ΔT) có đơn vị là J/(kg·K).'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Nhiệt lượng Q cần cung cấp để làm nóng chảy hoàn toàn một khối chất rắn kết tinh có khối lượng m ở nhiệt độ nóng chảy được tính bằng công thức:',
        options: ['Q = λ·m', 'Q = m/λ', 'Q = c·m', 'Q = λ/m'],
        answer: 'A',
        explanation: 'Q = λ·m, trong đó λ là nhiệt nóng chảy riêng (J/kg).'
      },
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Một lượng khí nhận nhiệt lượng Q = 500 J và thực hiện một công có độ lớn 200 J (tức A = -200 J). Độ biến thiên nội năng ΔU của lượng khí bằng:',
        options: ['300 J', '700 J', '-300 J', '100 J'],
        answer: 'A',
        explanation: 'Theo Định luật I NĐLH: ΔU = A + Q = -200 + 500 = 300 J.',
        mathVerify: { expression: '-200 + 500', expected: 300 }
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Trong quá trình đẳng nhiệt của một lượng khí lí tưởng xác định, hệ thức của định luật Boyle là:',
        options: ['p1·V1 = p2·V2', 'p1/V1 = p2/V2', 'V1/T1 = V2/T2', 'p1·T1 = p2·T2'],
        answer: 'A',
        explanation: 'Ở nhiệt độ không đổi (đẳng nhiệt), áp suất tỉ lệ nghịch với thể tích: p1·V1 = p2·V2.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Trong quá trình đẳng áp của một lượng khí lí tưởng xác định, thể tích V tỉ lệ thuận với:',
        options: ['Nhiệt độ tuyệt đối T (K)', 'Áp suất p', 'Khối lượng mol M', 'Bình phương áp suất p^2'],
        answer: 'A',
        explanation: 'Theo định luật Charles: V/T = hằng số, nên V tỉ lệ thuận với nhiệt độ tuyệt đối T.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Phương trình trạng thái của một lượng khí lí tưởng xác định là:',
        options: ['p·V / T = hằng số', 'p·T / V = hằng số', 'V·T / p = hằng số', 'p + V + T = hằng số'],
        answer: 'A',
        explanation: 'Phương trình trạng thái khí lí tưởng: p1·V1 / T1 = p2·V2 / T2 = hằng số.'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Một khối khí lí tưởng có thể tích 6 lít ở áp suất 2 atm. Nếu nén đẳng nhiệt khối khí đến khi áp suất bằng 4 atm thì thể tích của nó bằng:',
        options: ['3 lít', '12 lít', '4 lít', '8 lít'],
        answer: 'A',
        explanation: 'Áp dụng định luật Boyle: p1·V1 = p2·V2 ⇒ V2 = (2 × 6) / 4 = 3 (lít).',
        mathVerify: { expression: '(2 * 6) / 4', expected: 3 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Ở nhiệt độ 27°C, một lượng khí ở áp suất không đổi có thể tích 3 lít. Khi đun nóng đẳng áp lượng khí đó đến nhiệt độ 327°C thì thể tích khí là:',
        options: ['6 lít', '1,5 lít', '9 lít', '4,5 lít'],
        answer: 'A',
        explanation: 'T1 = 27 + 273 = 300 K; T2 = 327 + 273 = 600 K. Đẳng áp: V2 = V1 × (T2/T1) = 3 × (600/300) = 6 (lít).',
        mathVerify: { expression: '3 * ((327 + 273) / (27 + 273))', expected: 6 }
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: 'Độ lớn lực từ F tác dụng lên đoạn dây dẫn thẳng chiều dài L mang dòng điện cường độ I đặt trong từ trường đều có cảm ứng từ B (hợp với dây dẫn góc α) được tính bởi:',
        options: ['F = B·I·L·sin(α)', 'F = B·I·L·cos(α)', 'F = B·I / L', 'F = B·L / I'],
        answer: 'A',
        explanation: 'Công thức lực từ Ampere: F = B·I·L·sin(α).'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Một đoạn dây dẫn thẳng dài L = 0,5 m mang dòng điện I = 4 A đặt vuông góc với các đường sức từ (α = 90°) của một từ trường đều có cảm ứng từ B = 0,2 T. Độ lớn lực từ tác dụng lên đoạn dây bằng:',
        options: ['0,4 N', '0,2 N', '0,8 N', '2,0 N'],
        answer: 'A',
        explanation: 'F = B·I·L·sin(90°) = 0,2 × 4 × 0,5 × 1 = 0,4 N.',
        mathVerify: { expression: '0.2 * 4 * 0.5 * 1', expected: 0.4 }
      }
    ],
    TF: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Đun nóng m = 2 kg nước từ nhiệt độ ban đầu t1 = 20°C đến khi sôi ở t2 = 100°C. Biết nhiệt dung riêng của nước là c = 4 200 J/(kg·K). Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Nhiệt độ ban đầu của nước trong thang Kelvin là T1 = 293 K.', isTrue: true, level: 'Biết' },
          { text: 'Độ tăng nhiệt độ của nước là Δt = 80°C (tương ứng ΔT = 80 K).', isTrue: true, level: 'Biết' },
          { text: 'Trong quá trình đun nóng, nội năng của khối nước tăng lên do nhận nhiệt lượng.', isTrue: true, level: 'Hiểu' },
          { text: 'Nhiệt lượng nước đã thu vào để tăng nhiệt độ từ 20°C lên 100°C là 672 kJ.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng (20 + 273 = 293 K); b) Đúng (100 - 20 = 80); c) Đúng; d) Đúng vì Q = m·c·Δt = 2 × 4200 × 80 = 672 000 J = 672 kJ.',
        mathVerify: { expression: '(2 * 4200 * 80) / 1000', expected: 672 }
      },
      {
        rowId: 'row_1', level: 'Vận dụng',
        stem: 'Một khối nước đá có khối lượng m = 0,5 kg ở nhiệt độ 0°C được cung cấp nhiệt lượng để nóng chảy hoàn toàn ở 0°C. Biết nhiệt nóng chảy riêng của nước đá là λ = 334 kJ/kg. Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Trong suốt quá trình nước đá đang nóng chảy, nhiệt độ của hỗn hợp giữ không đổi ở 0°C.', isTrue: true, level: 'Biết' },
          { text: 'Đơn vị của nhiệt nóng chảy riêng λ là kJ/kg hoặc J/kg.', isTrue: true, level: 'Biết' },
          { text: 'Nhiệt lượng cần cung cấp để làm nóng chảy hoàn toàn 0,5 kg nước đá trên bằng 334 kJ.', isTrue: false, level: 'Hiểu' },
          { text: 'Nếu cung cấp nhiệt lượng 167 kJ thì toàn bộ 0,5 kg nước đá vừa kịp nóng chảy hoàn toàn thành nước ở 0°C.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Sai vì Q = λ·m = 334 × 0,5 = 167 kJ ≠ 334 kJ; d) Đúng.',
        mathVerify: { expression: '334 * 0.5', expected: 167 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Một bình kín có dung tích không đổi V = 10 lít chứa khí lí tưởng ở nhiệt độ t1 = 27°C và áp suất p1 = 2 atm. Sau đó bình được đun nóng đến nhiệt độ t2 = 177°C. Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Quá trình biến đổi trạng thái của khí trong bình kín dung tích không đổi là quá trình đẳng tích.', isTrue: true, level: 'Biết' },
          { text: 'Nhiệt độ tuyệt đối ở trạng thái đầu và trạng thái sau lần lượt là T1 = 300 K và T2 = 450 K.', isTrue: true, level: 'Biết' },
          { text: 'Khi nhiệt độ tăng, động năng tịnh tiến trung bình của các phân tử khí giảm xuống.', isTrue: false, level: 'Hiểu' },
          { text: 'Áp suất của khí trong bình ở nhiệt độ 177°C bằng 3 atm.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng (27+273=300K, 177+273=450K); c) Sai (nhiệt độ tăng thì động năng trung bình E_đ = 3/2 kT tăng); d) Đúng vì đẳng tích p2 = p1 × (T2/T1) = 2 × (450/300) = 3 atm.',
        mathVerify: { expression: '2 * (450 / 300)', expected: 3 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Một khung dây dẫn phẳng gồm N = 100 vòng dây, diện tích mỗi vòng S = 0,02 m^2 đặt trong từ trường đều có vectơ cảm ứng từ B vuông góc với mặt phẳng khung dây (α = 0°). Trong khoảng thời gian Δt = 0,2 s, độ lớn cảm ứng từ giảm đều từ B1 = 0,5 T về B2 = 0,1 T. Xét tính Đúng (Đ) hoặc Sai (S) của các mệnh đề sau:',
        statements: [
          { text: 'Từ thông qua một vòng dây được tính bằng công thức Φ = B·S·cos(α).', isTrue: true, level: 'Biết' },
          { text: 'Từ thông ban đầu qua toàn bộ khung dây (N vòng) là Φ1 = N·B1·S = 1,0 Wb.', isTrue: true, level: 'Hiểu' },
          { text: 'Từ thông lúc sau qua toàn bộ khung dây là Φ2 = N·B2·S = 0,5 Wb.', isTrue: false, level: 'Hiểu' },
          { text: 'Độ lớn suất điện động cảm ứng xuất hiện trong khung dây trong thời gian Δt = 0,2 s bằng 4 V.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng (100 × 0,5 × 0,02 = 1,0 Wb); c) Sai (100 × 0,1 × 0,02 = 0,2 Wb ≠ 0,5 Wb); d) Đúng vì |e_c| = |ΔΦ/Δt| = (1,0 - 0,2) / 0,2 = 4 V.',
        mathVerify: { expression: '(1.0 - 0.2) / 0.2', expected: 4 }
      }
    ],
    SA: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Nhiệt độ của một vật là 37°C thì tương ứng bằng bao nhiêu Kelvin (K) (lấy T(K) = t(°C) + 273)?',
        answer: '310',
        explanation: 'T = 37 + 273 = 310 (K).',
        mathVerify: { expression: '37 + 273', expected: 310 }
      },
      {
        rowId: 'row_1', level: 'Vận dụng',
        stem: 'Một ấm điện có công suất P = 1 000 W đun nước với hiệu suất H = 84%. Biết nhiệt lượng cần thiết để đun sôi lượng nước trong ấm là Q_ích = 336 000 J. Thời gian đun sôi nước bằng bao nhiêu giây (s)?',
        answer: '400',
        explanation: 'Điện năng toàn phần A_tp = Q_ích / H = 336 000 / 0,84 = 400 000 (J). Thời gian t = A_tp / P = 400 000 / 1 000 = 400 (s).',
        mathVerify: { expression: '(336000 / 0.84) / 1000', expected: 400 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Một xilanh chứa 12 lít khí ở áp suất 1,5 atm. Nếu nén đẳng nhiệt để thể tích khí giảm còn 4 lít thì áp suất khí trong xilanh bằng bao nhiêu atm?',
        answer: '4.5',
        explanation: 'Theo định luật Boyle: p2 = (p1 × V1) / V2 = (1,5 × 12) / 4 = 4,5 (atm).',
        mathVerify: { expression: '(1.5 * 12) / 4', expected: 4.5 }
      },
      {
        rowId: 'row_2', level: 'Vận dụng',
        stem: 'Một bình chứa n = 2 mol khí lí tưởng ở nhiệt độ tuyệt đối T = 300 K. Lấy hằng số khí R = 8,31 J/(mol·K). Nếu thể tích bình là V = 0,05 m^3 thì áp suất p của khí trong bình bằng bao nhiêu kPa (làm tròn đến hàng phần mười)?',
        answer: '99.7',
        explanation: 'p = n·R·T / V = (2 × 8,31 × 300) / 0,05 = 99 720 Pa ≈ 99,7 kPa.',
        mathVerify: { expression: 'round(((2 * 8.31 * 300) / 0.05) / 100) / 10', expected: 99.7 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Một đoạn dây dẫn dài L = 0,8 m có dòng điện I = 5 A chạy qua, đặt vuông góc với đường sức từ của một từ trường đều có B = 0,5 T. Lực từ tác dụng lên đoạn dây có độ lớn bằng bao nhiêu Newton (N)?',
        answer: '2',
        explanation: 'F = B·I·L = 0,5 × 5 × 0,8 = 2 (N).',
        mathVerify: { expression: '0.5 * 5 * 0.8', expected: 2 }
      },
      {
        rowId: 'row_3', level: 'Vận dụng',
        stem: 'Từ thông qua một mạch kín biến thiên đều một lượng ΔΦ = 0,6 Wb trong khoảng thời gian Δt = 0,15 s. Độ lớn suất điện động cảm ứng trong mạch bằng bao nhiêu Vôn (V)?',
        answer: '4',
        explanation: '|e_c| = ΔΦ / Δt = 0,6 / 0,15 = 4 (V).',
        mathVerify: { expression: '0.6 / 0.15', expected: 4 }
      }
    ],
    ESSAY: []
  },

  // ==========================================================================
  // 7. HÓA HỌC LỚP 12 (THPT - CÔNG VĂN 7991: 12 MCQ + 4 TF + 6 SA = 10,0 ĐIỂM)
  // ==========================================================================
  thpt_chem_12: {
    MCQ: [
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Hợp chất CH3COOC2H5 có tên gọi theo danh pháp IUPAC là:',
        options: ['ethyl acetate', 'methyl acetate', 'ethyl formate', 'methyl propionate'],
        answer: 'A',
        explanation: 'CH3COOC2H5 là ester của acetic acid và ethyl alcohol nên có tên là ethyl acetate.'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Công thức phân tử của chất béo tristearin (glycerol tristearate) là:',
        options: ['(C17H35COO)3C3H5', '(C17H33COO)3C3H5', '(C15H31COO)3C3H5', 'CH3COOC2H5'],
        answer: 'A',
        explanation: 'Stearic acid là C17H35COOH nên tristearin có công thức là (C17H35COO)3C3H5.'
      },
      {
        rowId: 'row_1', level: 'Biết',
        stem: 'Phản ứng thủy phân ester trong môi trường kiềm (NaOH hoặc KOH) đun nóng được gọi là phản ứng:',
        options: ['Xà phòng hóa', 'Ester hóa', 'Trùng hợp', 'Tráng bạc'],
        answer: 'A',
        explanation: 'Thủy phân ester hoặc chất béo trong dung dịch kiềm đun nóng là phản ứng xà phòng hóa.'
      },
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Đun nóng ester HCOOCH3 với dung dịch NaOH vừa đủ thu được sản phẩm gồm:',
        options: ['HCOONa và CH3OH', 'CH3COONa và CH3OH', 'HCOONa và C2H5OH', 'CH3COOH và CH3OH'],
        answer: 'A',
        explanation: 'HCOOCH3 + NaOH →(t°) HCOONa (sodium formate) + CH3OH (methanol).'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Carbohydrate nào sau đây thuộc loại monosaccharide?',
        options: ['Glucose', 'Saccharose', 'Tinh bột (Starch)', 'Cellulose'],
        answer: 'A',
        explanation: 'Glucose và fructose là monosaccharide (C6H12O6); saccharose là disaccharide; tinh bột và cellulose là polysaccharide.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Nhỏ vài giọt dung dịch iodine (I2) vào ống nghiệm đựng hồ tinh bột để nguội thì xuất hiện màu gì?',
        options: ['Màu xanh tím', 'Màu đỏ gạch', 'Màu vàng nhạt', 'Không màu'],
        answer: 'A',
        explanation: 'Phản ứng đặc trưng nhận biết hồ tinh bột bằng dung dịch I2 tạo hợp chất bọc có màu xanh tím.'
      },
      {
        rowId: 'row_2', level: 'Biết',
        stem: 'Công thức phân tử của saccharose là:',
        options: ['C12H22O11', 'C6H12O6', '(C6H10O5)n', 'C2H4O2'],
        answer: 'A',
        explanation: 'Saccharose (đường mía) có công thức phân tử là C12H22O11.'
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Khi đun nóng dung dịch chứa 1 mol glucose với lượng dư thuốc thử Tollens (AgNO3/NH3), số mol bạc (Ag) tối đa thu được là:',
        options: ['2 mol', '1 mol', '4 mol', '3 mol'],
        answer: 'A',
        explanation: '1 mol glucose (C6H12O6) tráng bạc hoàn toàn tạo ra 2 mol kết tủa Ag.',
        mathVerify: { expression: '1 * 2', expected: 2 }
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: 'Amino acid đơn giản nhất là glycine (H2N-CH2-COOH) có phân tử khối bằng:',
        options: ['75', '89', '117', '146'],
        answer: 'A',
        explanation: 'M(Glycine, C2H5NO2) = 12×2 + 5 + 14 + 16×2 = 75.',
        mathVerify: { expression: '12*2 + 5 + 14 + 16*2', expected: 75 }
      },
      {
        rowId: 'row_3', level: 'Biết',
        stem: 'Dung dịch chất nào sau đây làm quỳ tím chuyển sang màu xanh?',
        options: ['Methylamine (CH3NH2)', 'Glycine', 'Alanine', 'Aniline (C6H5NH2)'],
        answer: 'A',
        explanation: 'Methylamine là amine mạch hở có tính base mạnh hơn NH3 nên làm quỳ tím hóa xanh; glycine/alanine không đổi màu quỳ; aniline có tính base rất yếu không làm đổi màu quỳ.'
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Tripeptide mạch hở Gly-Ala-Val có chứa bao nhiêu liên kết peptide (-CO-NH-) trong phân tử?',
        options: ['2', '3', '1', '4'],
        answer: 'A',
        explanation: 'Peptide mạch hở gồm n gốc α-amino acid có (n - 1) liên kết peptide: 3 - 1 = 2 liên kết peptide.',
        mathVerify: { expression: '3 - 1', expected: 2 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Thuốc thử dùng để phân biệt dipeptide (Gly-Ala) với tripeptide (Gly-Ala-Val) là:',
        options: ['Cu(OH)2 trong môi trường kiềm (phản ứng màu biuret)', 'Dung dịch NaCl', 'Khí H2', 'Kim loại Cu'],
        answer: 'A',
        explanation: 'Tripeptide trở lên có từ 2 liên kết peptide nên phản ứng với Cu(OH)2/OH- tạo phức màu tím đặc trưng (phản ứng biuret), còn dipeptide thì không.'
      }
    ],
    TF: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Tiến hành thí nghiệm điều chế ethyl acetate bằng cách đun nóng hỗn hợp gồm acetic acid (CH3COOH), ethanol (C2H5OH) và vài giọt dung dịch H2SO4 đặc. Xét tính Đúng (Đ) hoặc Sai (S) của các phát biểu sau:',
        statements: [
          { text: 'Phản ứng điều chế ethyl acetate từ acetic acid và ethanol là phản ứng ester hóa thuận nghịch.', isTrue: true, level: 'Biết' },
          { text: 'Dung dịch H2SO4 đặc vừa đóng vai trò chất xúc tác, vừa có tác dụng hút nước làm cân bằng chuyển dịch theo chiều tạo ester.', isTrue: true, level: 'Biết' },
          { text: 'Ethyl acetate tạo thành tan vô hạn trong nước tạo thành dung dịch đồng nhất.', isTrue: false, level: 'Hiểu' },
          { text: 'Nếu đun 6,0 gam CH3COOH (M=60) với lượng dư C2H5OH và hiệu suất phản ứng đạt 80% thì thu được 7,04 gam ethyl acetate (M=88).', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Sai vì ethyl acetate rất ít tan trong nước và nhẹ hơn nước nên tách lớp nổi lên trên; d) Đúng vì n(CH3COOH) = 0,1 mol ⇒ m(ester) = 0,1 × 0,8 × 88 = 7,04 gam.',
        mathVerify: { expression: '(6 / 60) * 0.8 * 88', expected: 7.04 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Cho các chất thuộc nhóm Carbohydrate: Glucose, Fructose, Saccharose và Cellulose. Xét tính Đúng (Đ) hoặc Sai (S) của các phát biểu sau:',
        statements: [
          { text: 'Glucose và fructose là hai đồng phân cấu tạo của nhau, cùng có công thức phân tử C6H12O6.', isTrue: true, level: 'Biết' },
          { text: 'Saccharose không có nhóm -CHO tự do nên không tham gia phản ứng tráng bạc với thuốc thử Tollens.', isTrue: true, level: 'Biết' },
          { text: 'Thủy phân hoàn toàn saccharose trong môi trường acid chỉ thu được duy nhất glucose.', isTrue: false, level: 'Hiểu' },
          { text: 'Trong y học, dung dịch glucose 5% được dùng làm dịch truyền tĩnh mạch để bổ sung năng lượng cho bệnh nhân.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Sai vì thủy phân saccharose thu được cả glucose và fructose theo tỉ lệ mol 1:1; d) Đúng.'
      },
      {
        rowId: 'row_2', level: 'Vận dụng',
        stem: 'Thực hiện phản ứng tráng bạc hoàn toàn m gam glucose (C6H12O6, M=180) bằng lượng dư dung dịch AgNO3 trong NH3 đun nóng, thu được 21,6 gam kết tủa bạc (Ag, M=108). Xét tính Đúng (Đ) hoặc Sai (S) của các phát biểu sau:',
        statements: [
          { text: 'Trong phản ứng tráng bạc, glucose đóng vai trò là chất khử (bị oxi hóa thành muối ammonium gluconate).', isTrue: true, level: 'Biết' },
          { text: 'Số mol kết tủa Ag thu được là 0,2 mol.', isTrue: true, level: 'Hiểu' },
          { text: 'Tỉ lệ số mol n(glucose) : n(Ag) trong phương trình phản ứng là 1 : 2.', isTrue: true, level: 'Hiểu' },
          { text: 'Giá trị của m (khối lượng glucose đã phản ứng) bằng 18,0 gam.', isTrue: true, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng (21,6 / 108 = 0,2 mol); c) Đúng; d) Đúng vì n(glucose) = 0,2 / 2 = 0,1 mol ⇒ m = 0,1 × 180 = 18,0 gam.',
        mathVerify: { expression: '((21.6 / 108) / 2) * 180', expected: 18 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Cho hai amino acid thông dụng là Glycine (H2N-CH2-COOH, M=75) và Glutamic acid (HOOC-CH2-CH2-CH(NH2)-COOH, M=147). Xét tính Đúng (Đ) hoặc Sai (S) của các phát biểu sau:',
        statements: [
          { text: 'Cả glycine và glutamic acid đều là chất rắn kết tinh ở điều kiện thường và dễ tan trong nước.', isTrue: true, level: 'Biết' },
          { text: 'Dung dịch glutamic acid làm quỳ tím chuyển sang màu hồng do có 2 nhóm -COOH và 1 nhóm -NH2.', isTrue: true, level: 'Biết' },
          { text: 'Amino acid là hợp chất hữu cơ tạp chức có tính chất lưỡng tính (vừa tác dụng với acid mạnh, vừa tác dụng với base mạnh).', isTrue: true, level: 'Hiểu' },
          { text: 'Muối monosodium glutamate (mì chính / bột ngọt) được điều chế từ phản ứng giữa glutamic acid với NaOH theo tỉ lệ mol 1 : 2.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng; b) Đúng; c) Đúng; d) Sai vì monosodium glutamate chỉ thế 1 nguyên tử Na nên phản ứng theo tỉ lệ mol 1 : 1.'
      }
    ],
    SA: [
      {
        rowId: 'row_1', level: 'Hiểu',
        stem: 'Thủy phân hoàn toàn 0,2 mol ethyl acetate (CH3COOC2H5) trong dung dịch NaOH dư đun nóng, thu được bao nhiêu gam muối sodium acetate (CH3COONa, M=82)?',
        answer: '16.4',
        explanation: 'n(CH3COONa) = n(ester) = 0,2 mol ⇒ m(muối) = 0,2 × 82 = 16,4 (gam).',
        mathVerify: { expression: '0.2 * 82', expected: 16.4 }
      },
      {
        rowId: 'row_1', level: 'Vận dụng',
        stem: 'Xà phòng hóa hoàn toàn 89 gam chất béo tristearin ((C17H35COO)3C3H5, M=890) bằng dung dịch NaOH vừa đủ, thu được bao nhiêu gam glycerol (C3H5(OH)3, M=92)?',
        answer: '9.2',
        explanation: 'n(tristearin) = 89 / 890 = 0,1 mol ⇒ n(glycerol) = 0,1 mol ⇒ m(glycerol) = 0,1 × 92 = 9,2 (gam).',
        mathVerify: { expression: '(89 / 890) * 92', expected: 9.2 }
      },
      {
        rowId: 'row_2', level: 'Hiểu',
        stem: 'Phân tử khối của glucose (C6H12O6) bằng bao nhiêu (cho C=12, H=1, O=16)?',
        answer: '180',
        explanation: 'M(C6H12O6) = 12×6 + 1×12 + 16×6 = 180.',
        mathVerify: { expression: '12*6 + 1*12 + 16*6', expected: 180 }
      },
      {
        rowId: 'row_2', level: 'Vận dụng',
        stem: 'Lên men m gam glucose (M=180) thành ethanol (C2H5OH, M=46) theo sơ đồ C6H12O6 → 2C2H5OH + 2CO2 với hiệu suất H = 80%, thu được 36,8 gam ethanol. Tính giá trị của m (gam).',
        answer: '90',
        explanation: 'n(C2H5OH) = 36,8 / 46 = 0,8 mol ⇒ n(glucose phản ứng) = 0,8 / 2 = 0,4 mol ⇒ n(glucose ban đầu) = 0,4 / 0,8 = 0,5 mol ⇒ m = 0,5 × 180 = 90 (gam).',
        mathVerify: { expression: '(((36.8 / 46) / 2) / 0.8) * 180', expected: 90 }
      },
      {
        rowId: 'row_3', level: 'Hiểu',
        stem: 'Trong phân tử tetrapeptide mạch hở Gly-Ala-Val-Gly có tất cả bao nhiêu nguyên tử nitrogen (N)?',
        answer: '4',
        explanation: 'Mỗi gốc α-amino acid Gly, Ala, Val chỉ có 1 nguyên tử N, nên tetrapeptide có 4 nguyên tử N.'
      },
      {
        rowId: 'row_3', level: 'Vận dụng',
        stem: 'Cho 15 gam glycine (H2N-CH2-COOH, M=75) tác dụng hết với dung dịch NaOH dư, sau phản ứng thu được bao nhiêu gam muối khan H2N-CH2-COONa (M=97)?',
        answer: '19.4',
        explanation: 'n(Gly) = 15 / 75 = 0,2 mol ⇒ n(muối) = 0,2 mol ⇒ m(muối) = 0,2 × 97 = 19,4 (gam).',
        mathVerify: { expression: '(15 / 75) * 97', expected: 19.4 }
      }
    ],
    ESSAY: []
  },
  // ==========================================================================
  // 8. TIN HỌC 12 GIỮA KỲ I (KHỚP 100% MA TRẬN "TIN 12 - MA TRAN KTGK 1.docx": 24 MCQ + 4 TF)
  // ==========================================================================
  tin12_ktgk1: {
    MCQ: [
      // Dòng 1: Bài 1. Làm quen với trí tuệ nhân tạo (1 Biết: MC(1), 1 Hiểu: MC(2))
      {
        rowId: 'row_1', level: 'Biết', qCode: 'MC(1)',
        stem: 'Khái niệm Trí tuệ nhân tạo (AI – Artificial Intelligence) được hiểu đúng nhất là:',
        options: [
          'Khả năng của máy tính hoặc hệ thống máy móc thực hiện các công việc mang tính trí tuệ của con người như học tập, suy luận, nhận thức và hiểu ngôn ngữ',
          'Khả năng của máy tính lưu trữ các tệp văn bản có dung lượng lớn trên ổ cứng vật lý',
          'Quá trình lắp ráp các linh kiện điện tử cơ bản thành bảng mạch máy tính cá nhân',
          'Việc truyền tín hiệu điện xoay chiều qua đường dây cáp đồng trục'
        ],
        answer: 'A',
        explanation: 'Theo SGK Tin học 12 (Bài 1): AI là khả năng của máy tính thực hiện các công việc mang tính trí tuệ của con người (học, suy luận, đọc hiểu, nhận thức).'
      },
      {
        rowId: 'row_1', level: 'Hiểu', qCode: 'MC(2)',
        stem: 'Hệ thống trợ lý ảo (như Siri, Google Assistant) có thể lắng nghe câu hỏi bằng tiếng nói của người dùng và phản hồi lại phù hợp là nhờ kết hợp các đặc trưng cơ bản nào của AI?',
        options: [
          'Khả năng nhận thức môi trường (nhận dạng tiếng nói), khả năng hiểu ngôn ngữ tự nhiên và khả năng suy luận/học',
          'Chỉ sử dụng tính năng sao chép tệp tin định kỳ của hệ điều hành',
          'Chỉ dựa vào tốc độ quay của quạt tản nhiệt CPU',
          'Khả năng định dạng lại phân vùng đĩa cứng tự động'
        ],
        answer: 'A',
        explanation: 'Trợ lý ảo thể hiện rõ đặc trưng nhận thức (nhận dạng giọng nói), hiểu ngôn ngữ tự nhiên (NLP) và suy luận để trả lời câu hỏi.'
      },
      // Dòng 2: Bài 2. Trí tuệ nhân tạo trong khoa học và đời sống (1 Biết: MC(3), 1 Hiểu: MC(4))
      {
        rowId: 'row_2', level: 'Biết', qCode: 'MC(3)',
        stem: 'Trong lĩnh vực y tế và chăm sóc sức khỏe, hệ thống AI IBM Watson for Oncology là ví dụ điển hình hỗ trợ công việc nào sau đây?',
        options: [
          'Hỗ trợ bác sĩ phân tích hồ sơ bệnh án, hình ảnh y khoa và gợi ý phác đồ điều trị ung thư',
          'Thiết kế giao diện trang web thương mại điện tử bằng ngôn ngữ CSS',
          'Cấu hình địa chỉ IP tĩnh cho các máy trạm trong phòng máy',
          'Quản lý điểm thi học kỳ bằng bảng tính thông thường'
        ],
        answer: 'A',
        explanation: 'Theo Bài 2 SGK Tin học 12: Hệ thống AI y tế hỗ trợ chẩn đoán hình ảnh và gợi ý phác đồ điều trị.'
      },
      {
        rowId: 'row_2', level: 'Hiểu', qCode: 'MC(4)',
        stem: 'Vì sao sự phát triển mạnh mẽ của Trí tuệ nhân tạo tạo sinh (Generative AI) lại đặt ra cảnh báo về nguy cơ an ninh mạng và lừa đảo trực tuyến?',
        options: [
          'Công nghệ Deepfake có thể bị kẻ xấu lợi dụng để giả mạo hình ảnh, giọng nói và video của người khác nhằm lừa đảo hoặc phát tán tin giả',
          'Vì AI làm cho cáp quang biển bị đứt vật lý mỗi khi người dùng truy cập web',
          'Vì AI bắt buộc mọi máy tính phải tháo bỏ bộ nhớ RAM',
          'Vì AI làm giảm kích thước màn hình hiển thị của điện thoại thông minh'
        ],
        answer: 'A',
        explanation: 'Bên cạnh lợi ích, AI tạo sinh tiềm ẩn nguy cơ giả mạo danh tính (Deepfake), vi phạm quyền riêng tư và tạo tin giả.'
      },
      // Dòng 3: Chủ đề 5. Thực hành kết nối các thiết bị số (1 Biết: MC(5), 1 Hiểu: MC(6), 1 VD: MC(7))
      {
        rowId: 'row_3', level: 'Biết', qCode: 'MC(5)',
        stem: 'Cổng kết nối có dây nào sau đây thường được sử dụng để truyền đồng thời cả tín hiệu hình ảnh độ phân giải cao và âm thanh từ máy tính xách tay sang màn hình Tivi hoặc máy chiếu?',
        options: ['Cáp HDMI', 'Cáp nguồn AC 220V', 'Cổng PS/2', 'Cáp mạng RJ45 không bấm đầu'],
        answer: 'A',
        explanation: 'HDMI (High-Definition Multimedia Interface) truyền đồng thời cả hình ảnh chất lượng cao và âm thanh kỹ thuật số.'
      },
      {
        rowId: 'row_3', level: 'Hiểu', qCode: 'MC(6)',
        stem: 'Khi muốn kết nối không dây tai nghe hoặc chuột không dây với máy tính xách tay trong phạm vi gần (dưới 10 mét) với mức tiêu thụ năng lượng thấp, phương thức kết nối nào phù hợp nhất?',
        options: ['Bluetooth', 'Cáp VGA', 'Truyền hình vệ tinh', 'Cáp đồng trục'],
        answer: 'A',
        explanation: 'Bluetooth là chuẩn kết nối không dây tầm ngắn tiết kiệm năng lượng, chuyên dùng cho chuột, bàn phím, tai nghe, loa di động.'
      },
      {
        rowId: 'row_3', level: 'Vận dụng', qCode: 'MC(7)',
        stem: 'Trong buổi thuyết trình nhóm, bạn An đã cắm cáp HDMI nối từ laptop sang máy chiếu nhưng màn hình máy chiếu vẫn báo "No Signal". Thao tác xử lý nào trên laptop Windows là đúng đắn nhất để xuất hình ảnh ra máy chiếu?',
        options: [
          'Nhấn tổ hợp phím Windows + P và chọn chế độ Duplicate (Nhân bản màn hình) hoặc Extend (Mở rộng màn hình)',
          'Nhấn tổ hợp phím Ctrl + Alt + Delete để tắt máy tính ngay lập tức',
          'Gỡ bỏ trình duyệt web khỏi máy tính',
          'Đổi tên thư mục chứa bài thuyết trình PowerPoint'
        ],
        answer: 'A',
        explanation: 'Trên Windows, tổ hợp phím Windows + P mở bảng Project cho phép chọn chế độ xuất hình ảnh ra màn hình phụ/máy chiếu (Duplicate / Extend).'
      },
      // Dòng 4: Bài 3. Một số thiết bị mạng thông dụng (1 Biết: MC(8), 1 Hiểu: MC(9), 1 VD: MC(10))
      {
        rowId: 'row_4', level: 'Biết', qCode: 'MC(8)',
        stem: 'Thiết bị mạng nào sau đây có chức năng chính là cung cấp kết nối không dây (Wi-Fi) cho các thiết bị di động, laptop truy cập vào mạng cục bộ (LAN)?',
        options: ['Access Point (Điểm truy cập không dây - AP)', 'Hub (Bộ tập trung cáp đồng)', 'Ổ cứng gắn ngoài HDD', 'Máy in laser đơn năng'],
        answer: 'A',
        explanation: 'Access Point (AP) thu nhận dữ liệu từ mạng LAN có dây và phát sóng Wi-Fi cho các thiết bị đầu cuối không dây.'
      },
      {
        rowId: 'row_4', level: 'Hiểu', qCode: 'MC(9)',
        stem: 'Điểm khác biệt cốt lõi giữa bộ chuyển mạch Switch và bộ tập trung Hub khi chuyển tiếp gói tin trong mạng LAN là gì?',
        options: [
          'Switch xác định cổng đích dựa trên địa chỉ MAC và chỉ gửi dữ liệu tới đúng cổng nhận, giúp giảm xung đột tín hiệu; còn Hub phát quảng bá tới tất cả các cổng',
          'Switch chỉ kết nối được tối đa 2 máy tính còn Hub kết nối được hàng triệu máy tính',
          'Hub có khả năng chuyển đổi tín hiệu quang từ nhà mạng thành tín hiệu số còn Switch thì không',
          'Switch chỉ hoạt động khi không cắm nguồn điện'
        ],
        answer: 'A',
        explanation: 'Switch sử dụng bảng địa chỉ MAC (tầng Liên kết dữ liệu) để chuyển mạch gói tin đúng cổng đích, tránh xung đột dữ liệu như Hub.'
      },
      {
        rowId: 'row_4', level: 'Vận dụng', qCode: 'MC(10)',
        stem: 'Gia đình bạn Minh mới lắp đường truyền cáp quang Internet từ nhà cung cấp dịch vụ (ISP). Để chuyển đổi tín hiệu quang trên cáp của ISP sang tín hiệu số cho mạng gia đình sử dụng, thiết bị đầu tiên cần lắp đặt tại đầu đường dây vào nhà là:',
        options: ['Modem quang (ONT / GPON Modem)', 'Hub 8 cổng', 'Cáp HDMI', 'USB Bluetooth Adapter'],
        answer: 'A',
        explanation: 'Modem (Modulator/Demodulator) điều chế và giải điều chế tín hiệu giữa đường truyền của ISP (cáp quang) và mạng nội bộ gia đình.'
      },
      // Dòng 5: Bài 4. Giao thức mạng (2 Biết: MC(11,12), 2 Hiểu: MC(13,23), 3 VD: MC(14,15,24))
      {
        rowId: 'row_5', level: 'Biết', qCode: 'MC(11)',
        stem: 'Giao thức mạng (Network Protocol) là gì?',
        options: [
          'Tập hợp các quy tắc, chuẩn mực quy định khuôn dạng dữ liệu và trình tự trao đổi thông tin giữa các thiết bị trên mạng',
          'Tên gọi của các loại dây cáp mạng xoắn đôi UTP trong phòng máy',
          'Phần mềm soạn thảo văn bản cài đặt sẵn trên máy tính cá nhân',
          'Tốc độ quay của ổ đĩa cứng tính bằng vòng/phút'
        ],
        answer: 'A',
        explanation: 'Giao thức mạng là tập hợp các quy định/quy tắc truyền thông mà các thiết bị trong mạng phải tuân thủ để hiểu và trao đổi dữ liệu với nhau.'
      },
      {
        rowId: 'row_5', level: 'Biết', qCode: 'MC(12)',
        stem: 'Trong bộ giao thức TCP/IP, giao thức nào hoạt động ở tầng Giao vận (Transport) chịu trách nhiệm tách dữ liệu thành các gói, đánh số thứ tự và kiểm soát truyền tin cậy?',
        options: ['TCP (Transmission Control Protocol)', 'ICMP', 'ARP', 'HTML'],
        answer: 'A',
        explanation: 'Giao thức TCP thiết lập kết nối, chia nhỏ dữ liệu, đánh số gói tin và xác nhận (ACK) để đảm bảo truyền dữ liệu tin cậy.'
      },
      {
        rowId: 'row_5', level: 'Hiểu', qCode: 'MC(13)',
        stem: 'Trong bộ giao thức TCP/IP, vai trò chính của giao thức IP (Internet Protocol) là gì?',
        options: [
          'Định địa chỉ logic (địa chỉ IP) cho các thiết bị và định tuyến (tìm đường đi) cho các gói tin từ nguồn đến đích qua các mạng',
          'Hiển thị nội dung trang web có hình ảnh và âm thanh trên trình duyệt',
          'Mã hóa mật khẩu tài khoản mạng xã hội của người dùng',
          'Quét và diệt virus trong các tệp đính kèm thư điện tử'
        ],
        answer: 'A',
        explanation: 'Giao thức IP ở tầng Mạng đảm nhiệm việc cấp phát/xác định địa chỉ IP nguồn - đích và định tuyến gói tin liên mạng.'
      },
      {
        rowId: 'row_5', level: 'Hiểu', qCode: 'MC(23)',
        stem: 'Khi người dùng gõ tên miền `thptnguyensinhsac.edu.vn` vào thanh địa chỉ trình duyệt, giao thức nào ở tầng Ứng dụng được gọi để dịch tên miền đó thành địa chỉ IP của máy chủ web?',
        options: ['DNS (Domain Name System)', 'SMTP (Simple Mail Transfer Protocol)', 'POP3', 'DHCP'],
        answer: 'A',
        explanation: 'Hệ thống và giao thức DNS có nhiệm vụ phân giải tên miền dễ nhớ của con người sang địa chỉ IP số học của máy chủ.'
      },
      {
        rowId: 'row_5', level: 'Vận dụng', qCode: 'MC(14)',
        stem: 'Trong các chuỗi số sau đây, chuỗi nào biểu diễn một địa chỉ IPv4 hợp lệ?',
        options: ['192.168.1.25', '192.168.300.10', '172.16.1', '256.0.0.1'],
        answer: 'A',
        explanation: 'Địa chỉ IPv4 gồm 4 số nguyên (4 octet) phân cách bởi dấu chấm, mỗi số có giá trị từ 0 đến 255. Только 192.168.1.25 thỏa mãn.',
        mathVerify: { expression: '4 * 8', expected: 32 }
      },
      {
        rowId: 'row_5', level: 'Vận dụng', qCode: 'MC(15)',
        stem: 'Một máy tính trong phòng thực hành cần kiểm tra xem kết nối mạng TCP/IP tới máy chủ có địa chỉ IP `192.168.1.1` có thông suốt hay không. Lệnh nào trong cửa sổ Command Prompt (CMD) được sử dụng cho mục đích này?',
        options: ['ping 192.168.1.1', 'mkdir 192.168.1.1', 'del 192.168.1.1', 'format 192.168.1.1'],
        answer: 'A',
        explanation: 'Lệnh `ping <địa chỉ IP hoặc tên miền>` gửi các gói tin kiểm tra kết nối mạng và đo thời gian phản hồi.'
      },
      {
        rowId: 'row_5', level: 'Vận dụng', qCode: 'MC(24)',
        stem: 'Bạn Lan muốn xem địa chỉ IPv4, Subnet Mask và Default Gateway hiện tại của máy tính Windows đang ngồi thực hành. Lệnh nào sau đây cần gõ vào cửa sổ Command Prompt?',
        options: ['ipconfig', 'notepad', 'calc', 'mspaint'],
        answer: 'A',
        explanation: 'Lệnh `ipconfig` (hoặc `ipconfig /all`) hiển thị cấu hình địa chỉ IP, mặt nạ mạng và cổng mặc định của các card mạng trên Windows.'
      },
      // Dòng 6: Bài 5. Thực hành chia sẻ tài nguyên trên mạng máy tính (1 Biết: MC(16), 1 Hiểu: MC(17), 2 VD: MC(18,19))
      {
        rowId: 'row_6', level: 'Biết', qCode: 'MC(16)',
        stem: 'Tài nguyên nào sau đây có thể được chia sẻ (Share) qua mạng cục bộ (LAN) để nhiều máy tính trong cùng phòng làm việc cùng sử dụng?',
        options: [
          'Thư mục dữ liệu (Folder), tệp tin (File) và máy in (Printer)',
          'Bàn di chuột bằng vải của từng máy tính',
          'Ghế ngồi trong phòng thực hành',
          'Vỏ thùng máy (Case) bằng kim loại'
        ],
        answer: 'A',
        explanation: 'Trong mạng LAN, các tài nguyên phần mềm (thư mục, tệp tin) và thiết bị ngoại vi như máy in có thể được chia sẻ dùng chung.'
      },
      {
        rowId: 'row_6', level: 'Hiểu', qCode: 'MC(17)',
        stem: 'Khi thiết lập chia sẻ một thư mục trên hệ điều hành Windows trong mạng LAN, quyền truy cập "Read" (Chỉ đọc) có ý nghĩa gì đối với người dùng trên máy tính khác?',
        options: [
          'Người dùng khác chỉ được phép mở xem và sao chép các tệp trong thư mục đó, không được phép sửa đổi hay xóa tệp gốc',
          'Người dùng khác có toàn quyền xóa bỏ hoặc sửa nội dung mọi tệp tin trong thư mục',
          'Người dùng khác không được phép nhìn thấy tên các tệp trong thư mục',
          'Thư mục sẽ tự động bị xóa ngay sau khi máy khách mở tệp đầu tiên'
        ],
        answer: 'A',
        explanation: 'Quyền Read cho phép xem danh sách, mở đọc và sao chép tệp về máy, nhưng ngăn chặn việc ghi đè, chỉnh sửa hoặc xóa tệp trên máy chủ chia sẻ.'
      },
      {
        rowId: 'row_6', level: 'Vận dụng', qCode: 'MC(18)',
        stem: 'Để các máy tính trong cùng mạng nội bộ phòng thực hành có thể nhìn thấy nhau và chia sẻ thư mục dễ dàng trên Windows, chế độ hồ sơ mạng (Network Profile) cần được thiết lập là gì và tính năng nào cần bật?',
        options: [
          'Chọn mạng Private (Mạng riêng) và bật Network Discovery cùng File and Printer Sharing',
          'Chọn chế độ Airplane Mode (Chế độ máy bay) trên tất cả các máy tính',
          'Rút toàn bộ dây cáp mạng LAN ra khỏi Switch',
          'Tắt dịch vụ Print Spooler và gỡ bỏ driver card mạng'
        ],
        answer: 'A',
        explanation: 'Thiết lập mạng ở chế độ Private và bật Network Discovery + File and Printer Sharing trong Advanced sharing settings giúp các máy trong LAN nhận diện và chia sẻ tài nguyên.'
      },
      {
        rowId: 'row_6', level: 'Vận dụng', qCode: 'MC(19)',
        stem: 'Giáo viên chia sẻ thư mục `BaiTapTin12` trên máy chủ có tên là `MAY-GV` để học sinh nộp bài tập. Để học sinh có thể tạo thư mục con của mình và lưu tệp bài làm trực tiếp vào `\\MAY-GV\BaiTapTin12`, giáo viên cần cấp quyền gì cho nhóm người dùng?',
        options: [
          'Quyền Read/Write (Đọc và Ghi)',
          'Chỉ cấp quyền Read (Chỉ đọc)',
          'Chặn hoàn toàn quyền truy cập (Deny)',
          'Gỡ bỏ chia sẻ (Stop sharing)'
        ],
        answer: 'A',
        explanation: 'Để học sinh tạo tệp/thư mục mới và lưu bài vào thư mục dùng chung, cần cấp quyền Read/Write.'
      },
      // Dòng 7: Bài 6. Giao tiếp và ứng xử trong không gian mạng (1 Biết: MC(20), 1 Hiểu: MC(21), 1 VD: MC(22))
      {
        rowId: 'row_7', level: 'Biết', qCode: 'MC(20)',
        stem: 'Hành vi nào sau đây thể hiện sự ứng xử văn minh, lịch sự và nhân văn khi tham gia giao tiếp trên không gian mạng?',
        options: [
          'Sử dụng ngôn từ tôn trọng người đối thoại, kiểm chứng độ tin cậy của thông tin trước khi chia sẻ và bảo vệ thông tin cá nhân của người khác',
          'Tung tin đồn chưa được kiểm chứng để thu hút lượt tương tác trên mạng xã hội',
          'Sử dụng ngôn từ kích động, xúc phạm danh dự bạn học trong nhóm trò chuyện chung',
          'Tự ý đăng tải số điện thoại và địa chỉ nhà riêng của người khác lên diễn đàn công cộng'
        ],
        answer: 'A',
        explanation: 'Theo Bài 6 SGK Tin học 12: Ứng xử văn minh trên mạng đòi hỏi ngôn từ lịch sự, tôn trọng người khác, kiểm chứng thông tin và tuân thủ pháp luật.'
      },
      {
        rowId: 'row_7', level: 'Hiểu', qCode: 'MC(21)',
        stem: 'Vì sao việc chia sẻ công khai hình ảnh thẻ căn cước, mật khẩu hoặc mã OTP ngân hàng lên mạng xã hội lại tiềm ẩn rủi ro mất an toàn nghiêm trọng?',
        options: [
          'Vì thông tin trên không gian mạng lan truyền rất nhanh, khó thu hồi triệt để và kẻ xấu có thể lợi dụng để đánh cắp tài khoản, chiếm đoạt tài sản hoặc mạo danh',
          'Vì hình ảnh chụp thẻ căn cước làm tốn dung lượng pin của màn hình máy tính',
          'Vì mạng xã hội sẽ tự động đổi màu phông chữ của bài đăng',
          'Vì việc đó làm giảm tốc độ quạt gió của bộ nguồn máy tính'
        ],
        answer: 'A',
        explanation: 'Môi trường số có phạm vi lan truyền rộng và lưu vết lâu dài; lộ dữ liệu định danh và mã OTP dẫn đến nguy cơ bị chiếm đoạt tài khoản, lừa đảo tài chính.'
      },
      {
        rowId: 'row_7', level: 'Vận dụng', qCode: 'MC(22)',
        stem: 'Khi nhận được một tin nhắn trên mạng xã hội từ tài khoản của người quen hỏi vay tiền gấp nhưng yêu cầu chuyển khoản vào một số tài khoản ngân hàng có tên người lạ, cách ứng xử an toàn và đúng đắn nhất là:',
        options: [
          'Bình tĩnh gọi điện thoại trực tiếp qua số di động hoặc gặp mặt người quen để xác minh chính xác trước khi thực hiện bất kỳ giao dịch nào',
          'Chuyển tiền ngay lập tức theo yêu cầu trong tin nhắn mà không cần kiểm tra',
          'Gửi mật khẩu ngân hàng và mã OTP của mình cho tài khoản đó tự rút tiền',
          'Chia sẻ tin nhắn đó kèm mật khẩu email cá nhân lên các diễn đàn công cộng'
        ],
        answer: 'A',
        explanation: 'Kẻ gian thường chiếm quyền tài khoản mạng xã hội hoặc dùng Deepfake để mạo danh vay tiền; cần xác minh độc lập qua cuộc gọi điện thoại thông thường hoặc gặp trực tiếp.'
      }
    ],
    TF: [
      // Câu ĐS 1: Chủ đề 1 (Bài 1: 2 ý Biết + Bài 2: 1 ý Hiểu, 1 ý VDC)
      {
        rowId: 'row_1', level: 'Hiểu', qCode: 'ĐS1(Bài 1 & Bài 2)',
        stem: 'Một trường THPT triển khai phần mềm điểm danh học sinh bằng camera nhận diện khuôn mặt tại cổng trường và ứng dụng trợ lý ảo AI hỗ trợ tra cứu lịch học. Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Chức năng nhận diện khuôn mặt học sinh qua camera là một ứng dụng điển hình của Trí tuệ nhân tạo (AI).', isTrue: true, level: 'Biết' },
          { text: 'Hệ thống điểm danh khuôn mặt và trợ lý ảo tra cứu lịch học thuộc loại Trí tuệ nhân tạo tổng quát (AGI - Artificial General Intelligence) đã vượt qua trí tuệ con người ở mọi lĩnh vực.', isTrue: false, level: 'Biết' },
          { text: 'Việc ứng dụng AI trong quản lý nhà trường giúp tự động hóa quy trình điểm danh, tổng hợp dữ liệu nhanh chóng và giảm tải công việc thủ công cho giáo viên.', isTrue: true, level: 'Hiểu' },
          { text: 'Nhà trường có thể tự do chia sẻ kho dữ liệu hình ảnh khuôn mặt của học sinh cho các doanh nghiệp thương mại bên ngoài để kiếm thêm kinh phí mà không cần sự đồng ý của phụ huynh và học sinh.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng (Bài 1 - Biết: nhận dạng khuôn mặt là ứng dụng AI); b) Sai vì AI hiện nay là AI hẹp (ANI), chưa đạt mức AGI (Bài 1 - Biết); c) Đúng (Bài 2 - Hiểu: AI tự động hóa và nâng cao năng suất); d) Sai vì vi phạm nghiêm trọng đạo đức AI và quyền riêng tư dữ liệu sinh trắc học của học sinh (Bài 2 - VDC).'
      },
      // Câu ĐS 2: Chủ đề 2 - Bài 3: Một số thiết bị mạng thông dụng (2 ý Biết + 1 ý Hiểu + 1 ý VDC)
      {
        rowId: 'row_4', level: 'Hiểu', qCode: 'ĐS2(Bài 3)',
        stem: 'Phòng thực hành Tin học của trường THPT Nguyễn Sinh Sắc gồm 40 máy tính để bàn được kết nối cáp mạng UTP thông qua thiết bị Switch 48 cổng, đồng thời lắp đặt thêm 1 thiết bị Access Point (AP) và nối với Router/Modem cáp quang của nhà mạng. Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Thiết bị Switch 48 cổng có chức năng kết nối các máy tính để bàn trong cùng mạng cục bộ (LAN) của phòng thực hành.', isTrue: true, level: 'Biết' },
          { text: 'Thiết bị Access Point (AP) chỉ cho phép kết nối các thiết bị bằng dây cáp đồng trục mà không thể phát sóng Wi-Fi.', isTrue: false, level: 'Biết' },
          { text: 'Router đóng vai trò định tuyến, dẫn đường cho các gói dữ liệu đi từ mạng nội bộ (LAN) của phòng máy ra mạng Internet và ngược lại.', isTrue: true, level: 'Hiểu' },
          { text: 'Khi kết nối máy tính bảng vào Access Point qua sóng Wi-Fi, máy tính bảng sẽ tự động vô hiệu hóa toàn bộ cơ chế bảo mật của mạng phòng thực hành.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng (Biết: Switch kết nối các thiết bị trong cùng mạng LAN); b) Sai vì Access Point phát sóng Wi-Fi cho các thiết bị không dây (Biết); c) Đúng (Hiểu: Router định tuyến giữa các mạng khác nhau); d) Sai vì Access Point áp dụng các chuẩn mã hóa bảo mật như WPA2/WPA3 để bảo vệ đường truyền (VDC).'
      },
      // Câu ĐS 3: Chủ đề 2 - Bài 4 (Giao thức mạng: 2 ý Biết) & Bài 5 (Chia sẻ tài nguyên: 1 ý Hiểu + 1 ý VDC)
      {
        rowId: 'row_5', level: 'Hiểu', qCode: 'ĐS3(Bài 4 & Bài 5)',
        stem: 'Trong giờ thực hành mạng máy tính, giáo viên thiết lập máy chủ `MAY-CHU` có địa chỉ IP tĩnh `192.168.1.10` và chia sẻ thư mục `TaiLieuOnTap` cùng chiếc máy in Canon cho các máy trạm trong phòng máy qua giao thức mạng TCP/IP. Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Bộ giao thức TCP/IP là bộ quy tắc truyền thông chuẩn được sử dụng rộng rãi trên mạng Internet và các mạng LAN hiện nay.', isTrue: true, level: 'Biết' },
          { text: 'Mỗi máy tính tham gia trong cùng một mạng LAN có thể được gán cùng một địa chỉ IPv4 giống hệt nhau (cùng là `192.168.1.10`) mà không gây ra hiện tượng xung đột IP.', isTrue: false, level: 'Biết' },
          { text: 'Khi giáo viên thiết lập quyền truy cập thư mục `TaiLieuOnTap` là "Read" (Chỉ đọc) cho nhóm `Everyone`, học sinh trên các máy trạm có thể mở xem và sao chép tài liệu về máy nhưng không xóa được tệp trên `MAY-CHU`.', isTrue: true, level: 'Hiểu' },
          { text: 'Khi máy chủ `MAY-CHU` đã tắt nguồn hoàn toàn, các máy trạm của học sinh vẫn có thể truy cập và chỉnh sửa bình thường các tệp nằm trong thư mục `TaiLieuOnTap` lưu trên ổ cứng của `MAY-CHU`.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng (Bài 4 - Biết: TCP/IP là chuẩn truyền thông mạng); b) Sai vì mỗi thiết bị trong mạng bắt buộc phải có địa chỉ IP duy nhất (Bài 4 - Biết); c) Đúng (Bài 5 - Hiểu: Quyền Read chỉ cho đọc/sao chép, không cho sửa/xóa); d) Sai vì thư mục lưu trên máy chủ thì máy chủ phải bật và nối mạng thì máy trạm mới truy cập được (Bài 5 - VDC).'
      },
      // Câu ĐS 4: Chủ đề 3 - Bài 6: Giao tiếp và ứng xử trong không gian mạng (2 ý Biết + 1 ý Hiểu + 1 ý VDC)
      {
        rowId: 'row_7', level: 'Hiểu', qCode: 'ĐS4(Bài 6)',
        stem: 'Sau buổi ngoại khóa của trường, câu lạc bộ Truyền thông của học sinh khối 12 lập fanpage để đăng tải hình ảnh hoạt động, bài viết tuyên truyền và trao đổi ý kiến với học sinh toàn trường. Xét tính Đúng (Đ) hoặc Sai (S) của các nhận định sau:',
        statements: [
          { text: 'Khi bình luận và trao đổi trên fanpage, học sinh cần sử dụng ngôn ngữ lịch sự, tôn trọng sự khác biệt và tuân thủ quy định pháp luật về an ninh mạng.', isTrue: true, level: 'Biết' },
          { text: 'Vì không gian mạng là môi trường ảo nên mọi người có thể tự do lấy tác phẩm, bài viết có bản quyền của người khác đăng lên fanpage và nhận là của mình mà không vi phạm quyền sở hữu trí tuệ.', isTrue: false, level: 'Biết' },
          { text: 'Việc tôn trọng bản quyền tác giả (ghi rõ nguồn trích dẫn, xin phép khi sử dụng tư liệu) và bảo vệ dữ liệu cá nhân góp phần xây dựng môi trường số lành mạnh, văn minh.', isTrue: true, level: 'Hiểu' },
          { text: 'Khi thấy bài viết của bạn cùng lớp bị tài khoản lạ công kích, học sinh nên kêu gọi các bạn khác vào dùng lời lẽ lăng mạ, đe dọa trả đũa đối phương trên không gian mạng.', isTrue: false, level: 'Vận dụng' }
        ],
        explanation: 'a) Đúng (Biết: Giao tiếp văn minh trên mạng); b) Sai vì hành vi này vi phạm Luật Sở hữu trí tuệ và đạo đức số (Biết); c) Đúng (Hiểu: Tôn trọng bản quyền và dữ liệu cá nhân); d) Sai vì hành vi lăng mạ, đe dọa là vi phạm quy tắc ứng xử và có thể cấu thành hành vi bạo lực mạng (VDC).'
      }
    ],
    SA: [],
    ESSAY: []
  }
};

module.exports = {
  SUBJECT_POOLS
};
