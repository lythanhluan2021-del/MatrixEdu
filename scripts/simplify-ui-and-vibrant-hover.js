const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add Distinct Pastel Hover CSS rules
const hoverColorsCss = `
    /* ====================================================================== */
    /* 10 PHÂN VÙNG MÀU NỀN HOVER KHÁC BIỆT RÕ RỆT (VIBRANT DISTINCT PASTELS) */
    /* ====================================================================== */
    .hover-zone-blue { border-top: 4px solid #2563eb !important; }
    .hover-zone-blue:hover {
      background-color: #dbeafe !important;
      border-color: #2563eb !important;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.22) !important;
      transform: translateY(-3px);
    }

    .hover-zone-teal { border-top: 4px solid #0d9488 !important; }
    .hover-zone-teal:hover {
      background-color: #ccfbf1 !important;
      border-color: #0d9488 !important;
      box-shadow: 0 10px 25px rgba(13, 148, 136, 0.22) !important;
      transform: translateY(-3px);
    }

    .hover-zone-indigo { border-top: 4px solid #4f46e5 !important; }
    .hover-zone-indigo:hover {
      background-color: #e0e7ff !important;
      border-color: #4f46e5 !important;
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.22) !important;
      transform: translateY(-3px);
    }

    .hover-zone-purple { border-top: 4px solid #9333ea !important; }
    .hover-zone-purple:hover {
      background-color: #f3e8ff !important;
      border-color: #9333ea !important;
      box-shadow: 0 10px 25px rgba(147, 51, 234, 0.22) !important;
      transform: translateY(-3px);
    }

    .hover-zone-amber { border-top: 4px solid #d97706 !important; }
    .hover-zone-amber:hover {
      background-color: #fef3c7 !important;
      border-color: #d97706 !important;
      box-shadow: 0 10px 25px rgba(217, 119, 6, 0.22) !important;
      transform: translateY(-3px);
    }

    .hover-zone-emerald { border-top: 4px solid #059669 !important; }
    .hover-zone-emerald:hover {
      background-color: #d1fae5 !important;
      border-color: #059669 !important;
      box-shadow: 0 10px 25px rgba(5, 150, 105, 0.22) !important;
      transform: translateY(-3px);
    }

    .hover-zone-rose { border-top: 4px solid #e11d48 !important; }
    .hover-zone-rose:hover {
      background-color: #ffe4e6 !important;
      border-color: #e11d48 !important;
      box-shadow: 0 10px 25px rgba(225, 29, 72, 0.22) !important;
      transform: translateY(-3px);
    }

    .hover-zone-cyan { border-top: 4px solid #0284c7 !important; }
    .hover-zone-cyan:hover {
      background-color: #e0f2fe !important;
      border-color: #0284c7 !important;
      box-shadow: 0 10px 25px rgba(2, 132, 199, 0.22) !important;
      transform: translateY(-3px);
    }

    .question-card:hover {
      background-color: #f0f9ff !important;
      border-color: #38bdf8 !important;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.12) !important;
    }
`;

// Insert the distinct hover colors into CSS
if (!html.includes('.hover-zone-blue')) {
  html = html.replace('/* 7 DISTINCT HOVER COLOR ZONES */', hoverColorsCss + '\n    /* 7 DISTINCT HOVER COLOR ZONES */');
  console.log('Step 1: Injected 10 distinct pastel hover zone styles.');
}

// 2. Streamline Header Subtitle
html = html.replace(
  '<p>Phân tích Tài liệu → Lập Ma trận → Bản Đặc tả → Soạn Đề → Đáp án → Xuất Word A4 (GDPT 2018 - CV 7991)</p>',
  '<p>Hệ thống Ra đề & Chấm thi theo Ma trận chuẩn Bộ GD&ĐT (CV 7991)</p>'
);
console.log('Step 2: Streamlined Header Subtitle.');

// 3. Shorten Card Titles
html = html.replace(
  '📋 1.1. Thiết lập thông tin Đề kiểm tra (Cấp THPT)',
  '📋 1.1. Thông tin Đề kiểm tra'
);
html = html.replace(
  '📂 1.2. Tải lên Ma trận Gốc & Kết nối Ngân hàng Câu hỏi Google Drive',
  '📂 1.2. Ma trận Gốc & Ngân hàng Drive'
);
html = html.replace(
  '🔍 1.3. Kết quả Phân tích Phạm vi Kiến thức & Yêu cầu cần đạt (Xem trước & Chỉnh sửa)',
  '🔍 1.3. Đơn vị Kiến thức & Yêu cầu Cần đạt'
);
html = html.replace(
  '📑 3.1. Bản Đặc tả Đề kiểm tra (Liên kết 1-1 với Ma trận)',
  '📑 3. Bản Đặc tả Đề kiểm tra'
);
html = html.replace(
  '📝 4.1. Soạn Đề Kiểm Tra, Chỉnh sửa câu hỏi & Nhân bản Mã đề',
  '📝 4. Soạn Đề & Hoán vị Mã đề'
);
html = html.replace(
  '🛡️ 5.1. Kiểm định Chất lượng Chuyên môn Tự động (Đối soát 4 chiều & Kiểm tra Phép tính độc lập)',
  '🛡️ 5.1. Kiểm định Chất lượng & Đối soát'
);
html = html.replace(
  '🔑 5.2. Bảng Đáp án Các Mã đề & Hướng dẫn chấm chi tiết',
  '🔑 5.2. Bảng Đáp án & Thang điểm'
);
html = html.replace(
  '📥 6.1. Xuất Hồ sơ File Word (.docx) Hoàn chỉnh — Khổ A4, Times New Roman cỡ 13–14pt',
  '📥 6.1. Xuất File Word A4 Chuẩn BGD'
);
html = html.replace(
  '💾 6.2. Lưu trữ, Nhân bản & Sao lưu Hồ sơ Đề kiểm tra',
  '💾 6.2. Lưu trữ & Sao lưu Hồ sơ'
);
html = html.replace(
  'BƯỚC 7: CHẤM BÀI TRẮC NGHIỆM (PHIẾU TLTN 2025 BGD) & THỐNG KÊ - BÁO CÁO',
  '🎯 BƯỚC 7: CHẤM BÀI TRẮC NGHIỆM PHIẾU 2025 & BÁO CÁO'
);
console.log('Step 3: Card titles shortened and simplified.');

// 4. Assign specific hover-zone classes to each card
// Step 1:
html = html.replace(
  `<section id="step-1" class="step-section glass-zone-step-1">\n      <div class="card">`,
  `<section id="step-1" class="step-section glass-zone-step-1">\n      <div class="card hover-zone-blue">`
);
html = html.replace(
  `<!-- BƯỚC 1.2: TẢI LÊN TÀI LIỆU HOẶC NHẬP PHẠM VI KIẾN THỨC -->\n      <div class="card">`,
  `<!-- BƯỚC 1.2: TẢI LÊN TÀI LIỆU HOẶC NHẬP PHẠM VI KIẾN THỨC -->\n      <div class="card hover-zone-teal">`
);
html = html.replace(
  `<!-- KẾT QUẢ PHÂN TÍCH ĐƠN VỊ KIẾN THỨC (CHỈNH SỬA TRỰC TIẾP) -->\n      <div class="card">`,
  `<!-- KẾT QUẢ PHÂN TÍCH ĐƠN VỊ KIẾN THỨC (CHỈNH SỬA TRỰC TIẾP) -->\n      <div class="card hover-zone-indigo">`
);

// Step 2:
html = html.replace(
  `<div class="card" id="cardStep2">`,
  `<div class="card hover-zone-purple" id="cardStep2">`
);

// Step 3:
html = html.replace(
  `<section id="step-3" class="step-section glass-zone-step-3" style="display:none;">\n      <div class="card">`,
  `<section id="step-3" class="step-section glass-zone-step-3" style="display:none;">\n      <div class="card hover-zone-indigo">`
);

// Step 4:
html = html.replace(
  `<section id="step-4" class="step-section glass-zone-step-4" style="display:none;">\n      <div class="card">`,
  `<section id="step-4" class="step-section glass-zone-step-4" style="display:none;">\n      <div class="card hover-zone-cyan">`
);

// Step 5:
html = html.replace(
  `<section id="step-5" class="step-section glass-zone-step-5" style="display:none;">\n      <div class="card">`,
  `<section id="step-5" class="step-section glass-zone-step-5" style="display:none;">\n      <div class="card hover-zone-amber">`
);
html = html.replace(
  `<div class="card">\n        <div class="card-header">\n          <div class="card-title">🔑 5.2.`,
  `<div class="card hover-zone-blue">\n        <div class="card-header">\n          <div class="card-title">🔑 5.2.`
);

// Step 6:
html = html.replace(
  `<section id="step-6" class="step-section glass-zone-step-6" style="display:none;">\n      <div class="card">`,
  `<section id="step-6" class="step-section glass-zone-step-6" style="display:none;">\n      <div class="card hover-zone-emerald">`
);
html = html.replace(
  `<div class="card" style="margin-top: 20px;">\n          <div class="card-header">\n            <div class="card-title">💾 6.2.`,
  `<div class="card hover-zone-indigo" style="margin-top: 20px;">\n          <div class="card-header">\n            <div class="card-title">💾 6.2.`
);

// Step 7:
html = html.replace(
  `<section class="step-card glass-zone-step-7" id="step-7"`,
  `<section class="step-card glass-zone-step-7 hover-zone-rose" id="step-7"`
);
console.log('Step 4: Distinct hover-zone classes assigned to all cards.');

// 5. Shorten verbose instructions & notes in Step 1.2
const oldDropzoneText = `Kéo & thả file Ma trận gốc (<code>.docx</code>, <code>.pdf</code>, <code>.txt</code>) vào đây hoặc bấm để chọn tệp...
                <br>
                <span style="color:#0369a1; font-weight:600;">Hệ thống tự động nhận dạng bảng Ma trận & Đặc tả theo chuẩn CV 7991, tự động tách Yêu cầu cần đạt, kiểm tra tổng 10.0đ và mở cửa sổ toàn màn hình để rà soát, chỉnh sửa trực tiếp trước khi lưu.</span>`;
const newDropzoneText = `Kéo thả hoặc bấm để tải file Ma trận gốc (<code>.docx</code>, <code>.pdf</code>)
                <br>
                <span style="color:#0369a1; font-weight:600;">Tự động nhận diện cấu trúc ma trận & mở màn hình rà soát trực quan.</span>`;
html = html.replace(oldDropzoneText, newDropzoneText);

// 6. Simplify Step 6.1 Alert
const oldAlert61 = `<div class="alert alert-success">
          <strong>Chuẩn thể thức văn bản Giáo dục:</strong> Tất cả tệp Word xuất ra đều có định dạng <code>.docx</code> chuẩn OpenXML, khổ giấy <strong>A4 (210mm × 297mm)</strong>, phông chữ <strong>Times New Roman cỡ 13–14pt</strong>, bảng biểu tự động căn khít khung trang (không tràn trang), công thức & ký hiệu rõ ràng. <strong>Bản Đề học sinh tuyệt đối không chứa đáp án.</strong>
        </div>`;
const newAlert61 = `<div class="alert alert-success" style="padding:10px 14px; font-size:0.86rem; margin-bottom:12px;">
          ✓ <strong>Chuẩn thể thức Bộ GD&ĐT:</strong> Xuất file <code>.docx</code> khổ A4, Times New Roman 13pt, tự động căn lề và định dạng bảng phương án rõ đẹp. Đề thi học sinh không chứa đáp án.
        </div>`;
html = html.replace(oldAlert61, newAlert61);

// 7. Remove duplicate buttons
// In Step 2 toolbar: Remove "💡 Hướng dẫn" button
html = html.replace(
  `<button type="button" class="btn btn-outline btn-sm" onclick="openModal('modalHuongDan')" style="color:#b45309; background:#fffbeb; border-color:#fcd34d;">
              💡 Hướng dẫn
            </button>`,
  ''
);

// In Step 6 bottom: Remove duplicate "Mở Danh sách Hồ sơ đã lưu" button
html = html.replace(
  `<button class="btn btn-primary" onclick="openProfilesModal()" style="font-weight:700;">📂 Mở Danh sách Hồ sơ đã lưu</button>`,
  ''
);

// 8. Streamline next step button texts
html = html.replace(
  '✅ Xác nhận Phạm vi Kiến thức & Chuyển sang Bước 2: Lập Ma trận →',
  'Tiếp tục: Bước 2 (Lập Ma trận) →'
);
html = html.replace(
  'Soạn Đề Kiểm Tra & Trộn Mã Đề (Bước 4) →',
  'Tiếp tục: Bước 3 (Bản đặc tả) →'
);
html = html.replace(
  'Chuyển sang Bước 5: Tạo Đáp án & Kiểm định Chất lượng →',
  'Tiếp tục: Bước 5 (Đáp án & QA) →'
);
html = html.replace(
  'Chuyển sang Bước 6: Xuất File Word & Lưu trữ Hồ sơ →',
  'Tiếp tục: Bước 6 (Xuất Word) →'
);
html = html.replace(
  'Chuyển sang Bước 7: Chấm Bài OMR Phiếu 2025 & Báo cáo Điểm →',
  'Tiếp tục: Bước 7 (Chấm OMR) →'
);
console.log('Step 5: Simplified instruction texts and next-step buttons.');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html! New size:', html.length);

