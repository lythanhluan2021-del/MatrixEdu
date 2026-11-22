const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Update Stepper Bar in index.html to add Step 7
const oldStep6Nav = `      <button class="step-btn" id="nav-step-6" onclick="goToStep(6)">
        <span class="step-num">6</span>
        <div><div>XUẤT FILE WORD</div><small id="sub-step-6">Khổ A4 Times New Roman</small></div>
      </button>
    </div>
  </nav>`;

const newStep7Nav = `      <button class="step-btn" id="nav-step-6" onclick="goToStep(6)">
        <span class="step-num">6</span>
        <div><div>XUẤT FILE WORD</div><small id="sub-step-6">Khổ A4 Times New Roman</small></div>
      </button>
      <button class="step-btn" id="nav-step-7" onclick="goToStep(7)">
        <span class="step-num">7</span>
        <div><div>CHẤM BÀI & BÁO CÁO</div><small id="sub-step-7">Phiếu TLTN 2025 & Lưu vết</small></div>
      </button>
    </div>
  </nav>`;

if (content.includes(oldStep6Nav)) {
  content = content.replace(oldStep6Nav, newStep7Nav);
  console.log('✓ Added nav-step-7 to Stepper bar');
} else {
  console.log('⚠ Could not find oldStep6Nav');
}

// 2. Update Step 6 footer to include button to Step 7
const oldStep6Footer = `        <div class="step-footer">
          <button class="btn btn-outline" onclick="goToStep(5)">← Quay lại Bước 5 (Đáp án & Kiểm định)</button>
          <button class="btn btn-primary" onclick="openProfilesModal()">🗂️ Mở Danh sách Hồ sơ đã lưu</button>
        </div>`;

const newStep6Footer = `        <div class="step-footer" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div>
            <button class="btn btn-outline" onclick="goToStep(5)">← Quay lại Bước 5 (Đáp án & Kiểm định)</button>
            <button class="btn btn-primary" onclick="openProfilesModal()">🗂️ Mở Danh sách Hồ sơ đã lưu</button>
          </div>
          <button class="btn btn-success" onclick="goToStep(7)" style="font-weight:700; background:#16a34a; border-color:#16a34a;">
            Sang Bước 7: Chấm bài & Thống kê báo cáo →
          </button>
        </div>`;

if (content.includes(oldStep6Footer)) {
  content = content.replace(oldStep6Footer, newStep6Footer);
  console.log('✓ Added navigation button to Step 7 in Step 6 footer');
} else {
  console.log('⚠ Could not find oldStep6Footer');
}

// 3. Update goToStep function to support 7 steps
const oldGoToStep = `    function goToStep(stepNum) {
      appState.currentStep = stepNum;
      for (let i = 1; i <= 6; i++) {
        const sec = document.getElementById(\`step-\${i}\`);
        const btn = document.getElementById(\`nav-step-\${i}\`);
        if (sec) sec.style.display = (i === stepNum) ? 'block' : 'none';
        if (btn) {
          btn.classList.toggle('active', i === stepNum);
          if (i < stepNum) btn.classList.add('completed');
        }
      }
      if (stepNum === 2) renderMatrixTable();
      if (stepNum === 3) renderSpecTable();
      if (stepNum === 4) renderExamStep();
      if (stepNum === 5) renderAnswerAndQaStep();
      if (stepNum === 6) renderExportStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }`;

const newGoToStep = `    function goToStep(stepNum) {
      appState.currentStep = stepNum;
      for (let i = 1; i <= 7; i++) {
        const sec = document.getElementById(\`step-\${i}\`);
        const btn = document.getElementById(\`nav-step-\${i}\`);
        if (sec) sec.style.display = (i === stepNum) ? 'block' : 'none';
        if (btn) {
          btn.classList.toggle('active', i === stepNum);
          if (i < stepNum) btn.classList.add('completed');
        }
      }
      if (stepNum === 2) renderMatrixTable();
      if (stepNum === 3) renderSpecTable();
      if (stepNum === 4) renderExamStep();
      if (stepNum === 5) renderAnswerAndQaStep();
      if (stepNum === 6) renderExportStep();
      if (stepNum === 7) renderOmrStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }`;

if (content.includes(oldGoToStep)) {
  content = content.replace(oldGoToStep, newGoToStep);
  console.log('✓ Updated goToStep function for 7 steps');
} else {
  console.log('⚠ Could not find oldGoToStep');
}

// 4. Step 7 HTML Section Markup
const step7Markup = `
    <!-- ================================================================== -->
    <!-- BƯỚC 7: CHẤM BÀI TRẮC NGHIỆM (PHIẾU TLTN 2025) & BÁO CÁO - THỐNG KÊ -->
    <!-- ================================================================== -->
    <section class="step-card" id="step-7" style="display:none">
      <div class="card-header" style="background:#1e3a8a; color:#fff; border-radius:10px 10px 0 0; margin:-24px -24px 20px -24px; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.6rem;">📝</span>
          <div>
            <div class="card-title" style="color:#fff; font-size:1.15rem; font-weight:800;">
              BƯỚC 7: CHẤM BÀI TRẮC NGHIỆM (PHIẾU TLTN 2025 BGD) & THỐNG KÊ - BÁO CÁO
            </div>
            <div style="font-size:0.8rem; color:#bfdbfe;">
              Chấm OMR theo mã đề 4 số, thang điểm chuẩn BGD 2025, phát hiện & sửa lỗi bài thi, lưu vết minh bạch & đồng bộ Google Drive
            </div>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <a href="/api/omr/template-pdf" target="_blank" class="btn btn-outline btn-sm" style="color:#fff; border-color:#93c5fd; background:rgba(255,255,255,0.15); font-weight:600;">
            📄 Mẫu Phiếu TLTN 2025 (PDF)
          </a>
          <button class="btn btn-outline btn-sm" onclick="exportOmrRosterCsv()" style="color:#fff; border-color:#93c5fd; background:rgba(255,255,255,0.15); font-weight:600;">
            📥 Xuất Bảng điểm (Excel/CSV)
          </button>
          <button class="btn btn-success btn-sm" onclick="syncOmrToGoogleDrive()" style="font-weight:700; background:#16a34a; border-color:#16a34a;">
            ☁️ Lưu CSDL & Lưu vết vào Google Drive
          </button>
        </div>
      </div>

      <!-- KHU VỰC 7.1: NGUỒN ĐÁP ÁN & CẤU HÌNH THANG ĐIỂM -->
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">🔑</span>
            <strong style="color:#0f172a; font-size:0.95rem;">1. Nguồn Đáp án chuẩn & Thang điểm Ma trận theo Mã đề thi</strong>
          </div>
          <div id="omr-keys-status-badge" class="badge badge-success">
            ✓ Đã đồng bộ đáp án 4 mã đề (101, 102, 103, 104) từ Bước 4
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:12px;">
            <label style="font-weight:700; font-size:0.86rem; color:#1e3a8a; display:block; margin-bottom:6px;">
              Chọn nguồn đáp án để chấm:
            </label>
            <select id="omr-source-select" class="form-control" onchange="onOmrSourceChanged(this.value)">
              <option value="auto_exam">1. Tự động lấy từ Đề thi & Đáp án đã sinh (Bước 4 & 5)</option>
              <option value="manual_keys">2. Nhập hoặc nạp file bảng đáp án thủ công</option>
            </select>
            <div style="font-size:0.78rem; color:#64748b; margin-top:6px;">
              Hệ thống sẽ đối chiếu mã đề học sinh tô trên phiếu với bộ đáp án tương ứng.
            </div>
          </div>

          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:12px;">
            <label style="font-weight:700; font-size:0.86rem; color:#1e3a8a; display:block; margin-bottom:6px;">
              Quy tắc tính điểm chuẩn Bộ GD&ĐT 2025:
            </label>
            <div style="font-size:0.82rem; line-height:1.45; color:#334155;">
              • <strong>Phần I (MCQ):</strong> 0,25đ / câu đúng.<br>
              • <strong>Phần II (Đúng/Sai):</strong> Quy tắc lũy tiến BGD: đúng 1 ý = 0,1đ; 2 ý = 0,25đ; 3 ý = 0,5đ; 4 ý = 1,0đ/câu lớn.<br>
              • <strong>Phần III (TLN):</strong> 0,5đ / câu đúng (nếu có).
            </div>
          </div>
        </div>

        <!-- Khung xem trước các mã đề có sẵn -->
        <div id="omr-available-keys-box" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <span style="font-size:0.83rem; font-weight:700; color:#475569;">Các mã đề sẵn sàng chấm:</span>
          <span id="omr-keys-chips"></span>
        </div>
      </div>

      <!-- KHU VỰC 7.2: NẠP PHIẾU BÀI LÀM HỌC SINH & DANH SÁCH LỚP -->
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">📥</span>
            <strong style="color:#1e3a8a; font-size:0.95rem;">2. Nạp Phiếu làm bài học sinh & Danh sách lớp ghép điểm</strong>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(true)" style="font-weight:700; background:#2563eb; border-color:#2563eb;">
              ⚡ Nạp & Chấm ngay Lô mẫu 35 học sinh (Có bài lỗi để thử nghiệm)
            </button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <!-- Nạp bài làm học sinh -->
          <div style="background:#fff; border:1px dashed #93c5fd; border-radius:8px; padding:14px; text-align:center;">
            <div style="font-size:1.8rem; margin-bottom:4px;">🖨️</div>
            <div style="font-weight:700; font-size:0.88rem; color:#1e3a8a; margin-bottom:4px;">
              Tải lên File Scan / Ảnh / PDF Phiếu làm bài của học sinh
            </div>
            <div style="font-size:0.78rem; color:#64748b; margin-bottom:10px;">
              Hỗ trợ file .pdf (scan nhiều trang), .jpg, .png, .zip bài thi
            </div>
            <input type="file" id="omr-papers-input" multiple accept=".pdf,.png,.jpg,.jpeg,.zip" style="display:none;" onchange="handleStudentPapersUpload(event)" />
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('omr-papers-input').click()" style="color:#2563eb; border-color:#93c5fd;">
              📁 Chọn file scan bài làm...
            </button>
            <div id="omr-papers-upload-status" style="font-size:0.8rem; color:#16a34a; margin-top:6px; font-weight:600;"></div>
          </div>

          <!-- Nạp danh sách lớp -->
          <div style="background:#fff; border:1px dashed #cbd5e1; border-radius:8px; padding:14px; text-align:center;">
            <div style="font-size:1.8rem; margin-bottom:4px;">👥</div>
            <div style="font-weight:700; font-size:0.88rem; color:#334155; margin-bottom:4px;">
              Nạp Danh sách học sinh của lớp (Excel / CSV)
            </div>
            <div style="font-size:0.78rem; color:#64748b; margin-bottom:10px;">
              Hệ thống tự động ghép Số báo danh (SBD) với Họ tên, Ngày sinh, Lớp
            </div>
            <input type="file" id="omr-roster-input" accept=".csv,.xlsx,.xls,.txt" style="display:none;" onchange="handleRosterFileUpload(event)" />
            <div style="display:flex; justify-content:center; gap:8px;">
              <button class="btn btn-outline btn-sm" onclick="document.getElementById('omr-roster-input').click()">
                📂 Tải danh sách lớp...
              </button>
              <button class="btn btn-outline btn-sm" onclick="useDefaultClassRoster()" style="color:#0369a1; border-color:#7dd3fc;">
                📋 Dùng mẫu lớp 12A1 (35 HS)
              </button>
            </div>
            <div id="omr-roster-status" style="font-size:0.8rem; color:#0369a1; margin-top:6px; font-weight:600;">
              Đã nạp sẵn danh sách lớp 12A1 (35 học sinh)
            </div>
          </div>
        </div>
      </div>

      <!-- KHU VỰC 7.3: BẢNG KẾT QUẢ CHẤM THI TRỰC TIẾP & BÀI CẦN CAN THIỆP -->
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">📊</span>
            <strong style="color:#0f172a; font-size:0.95rem;">3. Bảng Kết quả Chấm bài & Danh sách Học sinh</strong>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <div style="font-size:0.84rem; font-weight:700; color:#475569;">Lọc:</div>
            <button class="btn btn-sm btn-outline active-filter" id="filter-btn-all" onclick="filterOmrPapers('all')">
              Tất cả (<span id="count-all-papers">0</span>)
            </button>
            <button class="btn btn-sm btn-outline" id="filter-btn-warning" onclick="filterOmrPapers('warning')" style="color:#b45309; border-color:#fcd34d;">
              ⚠️ Cần rà soát / Lỗi (<span id="count-warning-papers">0</span>)
            </button>
            <button class="btn btn-sm btn-outline" id="filter-btn-corrected" onclick="filterOmrPapers('corrected')" style="color:#16a34a; border-color:#86efac;">
              ✍️ Đã sửa & Lưu vết (<span id="count-corrected-papers">0</span>)
            </button>
          </div>
        </div>

        <!-- Bảng danh sách bài làm học sinh -->
        <div class="table-wrap" style="max-height:480px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px;">
          <table class="data-table" id="omr-results-table" style="width:100%; font-size:0.85rem; border-collapse:collapse;">
            <thead style="position:sticky; top:0; background:#1e3a8a; color:#fff; z-index:5;">
              <tr>
                <th style="width:38px; text-align:center;">STT</th>
                <th style="width:80px; text-align:center;">SBD</th>
                <th>Họ và tên học sinh</th>
                <th style="width:65px; text-align:center;">Lớp</th>
                <th style="width:90px; text-align:center;">Mã đề tô</th>
                <th style="width:100px; text-align:center;">Điểm P.I (TN)</th>
                <th style="width:105px; text-align:center;">Điểm P.II (Đ/S)</th>
                <th style="width:95px; text-align:center;">Tổng điểm</th>
                <th style="width:90px; text-align:center;">Xếp loại</th>
                <th>Trạng thái & Cảnh báo</th>
                <th style="width:120px; text-align:center;">Hành động</th>
              </tr>
            </thead>
            <tbody id="omr-results-tbody">
              <tr>
                <td colspan="11" style="text-align:center; padding:30px; color:#64748b;">
                  Chưa có bài thi nào được chấm. Hãy bấm <strong>"⚡ Nạp & Chấm ngay Lô mẫu 35 học sinh"</strong> hoặc tải lên file scan bài làm!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- KHU VỰC 7.4: THỐNG KÊ & PHỔ ĐIỂM BÁO CÁO TOÀN DIỆN -->
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">📈</span>
            <strong style="color:#0f172a; font-size:0.95rem;">4. Thống kê & Phổ điểm Đề kiểm tra</strong>
          </div>
          <div style="font-size:0.8rem; color:#64748b;">
            Phân tích số liệu tự động phục vụ báo cáo Tổ chuyên môn và Ban Giám hiệu
          </div>
        </div>

        <!-- 4 Thẻ chỉ số tổng quan -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; text-align:center;">
            <div style="font-size:0.78rem; font-weight:700; color:#1d4ed8;">ĐIỂM TRUNG BÌNH (ĐTB)</div>
            <div id="stat-avg-score" style="font-size:1.8rem; font-weight:900; color:#1e3a8a; margin:4px 0;">0.0</div>
            <div style="font-size:0.75rem; color:#64748b;">Tổng số bài đã chấm: <span id="stat-total-graded">0</span></div>
          </div>
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; text-align:center;">
            <div style="font-size:0.78rem; font-weight:700; color:#15803d;">ĐIỂM CAO NHẤT / THẤP NHẤT</div>
            <div style="font-size:1.8rem; font-weight:900; color:#16a34a; margin:4px 0;">
              <span id="stat-max-score">0.0</span> <span style="font-size:1rem; color:#64748b; font-weight:400;">/</span> <span id="stat-min-score" style="color:#dc2626;">0.0</span>
            </div>
            <div style="font-size:0.75rem; color:#64748b;">Trung vị (Median): <strong id="stat-median-score">0.0</strong></div>
          </div>
          <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:8px; padding:12px; text-align:center;">
            <div style="font-size:0.78rem; font-weight:700; color:#7e22ce;">HỌC LỰC GIỎI & KHÁ</div>
            <div style="font-size:1.8rem; font-weight:900; color:#6d28d9; margin:4px 0;">
              <span id="stat-gio-pct">0%</span> <span style="font-size:0.9rem; color:#64748b; font-weight:400;">(Giỏi)</span>
            </div>
            <div style="font-size:0.75rem; color:#64748b;">Khá: <strong id="stat-kha-pct">0%</strong></div>
          </div>
          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px; text-align:center;">
            <div style="font-size:0.78rem; font-weight:700; color:#b45309;">TRUNG BÌNH & YẾU</div>
            <div style="font-size:1.8rem; font-weight:900; color:#d97706; margin:4px 0;">
              <span id="stat-tb-pct">0%</span> <span style="font-size:0.9rem; color:#64748b; font-weight:400;">(TB)</span>
            </div>
            <div style="font-size:0.75rem; color:#64748b;">Yếu: <strong id="stat-yeu-pct">0%</strong></div>
          </div>
        </div>

        <!-- Biểu đồ phổ điểm HTML/CSS thanh bar -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
          <div style="font-weight:700; font-size:0.86rem; color:#1e3a8a; margin-bottom:8px;">
            📊 Phổ điểm phân bố từ 0.0 đến 10.0 điểm:
          </div>
          <div id="omr-chart-bars" style="display:flex; align-items:flex-end; gap:6px; height:130px; padding:10px 0; border-bottom:2px solid #cbd5e1; overflow-x:auto;">
            <!-- Rendered dynamically -->
          </div>
          <div style="font-size:0.75rem; color:#64748b; text-align:center; margin-top:6px;">
            Trục ngang: Điểm số (0 đến 10 điểm) • Trục đứng: Số lượng học sinh đạt mức điểm tương ứng
          </div>
        </div>
      </div>

      <!-- KHU VỰC 7.5: NHẬT KÝ LƯU VẾT CAN THIỆP & ĐỒNG BỘ GOOGLE DRIVE -->
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">✍️</span>
            <div>
              <strong style="color:#0f172a; font-size:0.95rem;">5. Nhật ký Can thiệp & Lưu vết Sửa bài thi (Audit Trail)</strong>
              <div style="font-size:0.78rem; color:#64748b;">Đảm bảo tính minh bạch, khách quan tuyệt đối của Hội đồng chấm thi</div>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <a href="/api/omr/export-audit-csv" target="_blank" class="btn btn-outline btn-sm">
              📥 Xuất Biên bản Lưu vết (CSV)
            </a>
            <button class="btn btn-success btn-sm" onclick="syncOmrToGoogleDrive()" style="font-weight:700;">
              ☁️ Đồng bộ CSDL vào Google Drive
            </button>
          </div>
        </div>

        <!-- Báo cáo kết nối Google Drive -->
        <div id="omr-gdrive-sync-status-box" style="margin-bottom:10px;"></div>

        <!-- Bảng lưu vết -->
        <div class="table-wrap" style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px;">
          <table class="data-table" style="width:100%; font-size:0.83rem; border-collapse:collapse;">
            <thead style="position:sticky; top:0; background:#334155; color:#fff; z-index:5;">
              <tr>
                <th style="width:130px;">Thời gian</th>
                <th style="width:75px; text-align:center;">SBD</th>
                <th>Họ tên học sinh</th>
                <th style="width:140px;">Mục can thiệp</th>
                <th style="width:90px; text-align:center;">Trước sửa</th>
                <th style="width:90px; text-align:center;">Sau sửa</th>
                <th>Lý do can thiệp / Biên bản</th>
                <th style="width:110px;">Giám khảo</th>
              </tr>
            </thead>
            <tbody id="omr-audit-tbody">
              <tr>
                <td colspan="8" style="text-align:center; padding:16px; color:#64748b;">
                  Chưa có thao tác can thiệp nào. Khi giáo viên hiệu chỉnh bài thi học sinh (sửa mã đề, sửa câu mờ), lịch sử sẽ được ghi nhận tại đây.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- FOOTER STEP 7 -->
      <div class="step-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:20px;">
        <button class="btn btn-outline" onclick="goToStep(6)">← Quay lại Bước 6 (Xuất file Word)</button>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" onclick="exportOmrRosterCsv()">📥 Tải Bảng điểm Excel</button>
          <button class="btn btn-success" onclick="syncOmrToGoogleDrive()" style="font-weight:700; background:#16a34a; border-color:#16a34a;">
            ☁️ Hoàn tất & Lưu CSDL lên Google Drive
          </button>
        </div>
      </div>
    </section>

    <!-- MODAL HIỆU CHỈNH PHIẾU BÀI LÀM & GHI NHẬN LƯU VẾT -->
    <div class="modal-backdrop" id="modalEditPaper">
      <div class="modal-box" style="max-width:820px; max-height:92vh; display:flex; flex-direction:column;">
        <div class="card-header" style="background:#1e3a8a; color:#fff; margin:-22px -22px 14px -22px; padding:14px 20px; border-radius:8px 8px 0 0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.3rem;">🔍</span>
            <div>
              <div class="card-title" style="color:#fff; font-size:1.05rem;" id="modal-edit-paper-title">
                RÀ SOÁT VÀ HIỆU CHỈNH PHIẾU BÀI LÀM HỌC SINH
              </div>
              <div style="font-size:0.78rem; opacity:0.9;" id="modal-edit-paper-sub">
                Mọi thao tác chỉnh sửa sẽ được hệ thống chấm lại tự động và ghi nhận Lưu vết (Audit Trail)
              </div>
            </div>
          </div>
          <button class="btn btn-ghost-light btn-sm" onclick="closeModal('modalEditPaper')">✕ Đóng</button>
        </div>

        <!-- Cảnh báo lỗi hiện tại của bài -->
        <div id="modal-edit-warning-box" style="margin-bottom:12px;"></div>

        <div style="overflow-y:auto; padding-right:6px; flex:1;">
          <!-- Thông tin học sinh & Mã đề thi -->
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:12px; margin-bottom:14px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#475569;">Số báo danh (SBD):</label>
              <input type="text" id="edit-paper-sbd" class="form-control" readonly style="background:#e2e8f0; font-weight:700;" />
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#475569;">Họ và tên học sinh:</label>
              <input type="text" id="edit-paper-name" class="form-control" readonly style="background:#e2e8f0; font-weight:700;" />
            </div>
            <div>
              <label style="font-size:0.8rem; font-weight:700; color:#1e3a8a;">Mã đề thi (Sửa nếu học sinh tô sai):</label>
              <select id="edit-paper-code-select" class="form-control" style="font-weight:800; border-color:#2563eb; color:#1d4ed8;">
                <!-- Filled dynamically with valid codes -->
              </select>
            </div>
          </div>

          <!-- Hiệu chỉnh Phần I: Trắc nghiệm nhiều lựa chọn -->
          <div style="border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:14px;">
            <div style="font-weight:700; font-size:0.86rem; color:#1d4ed8; margin-bottom:8px; display:flex; justify-content:space-between;">
              <span>Phần I: Câu trắc nghiệm nhiều lựa chọn (Ô đỏ = Tô mờ / Tranh chấp cần xác nhận)</span>
              <span style="font-size:0.78rem; color:#64748b;">Click vào ô để đổi đáp án</span>
            </div>
            <div id="edit-paper-part1-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:6px;">
              <!-- Filled dynamically -->
            </div>
          </div>

          <!-- Hiệu chỉnh Phần II: Trắc nghiệm Đúng / Sai -->
          <div style="border:1px solid #e2e8f0; border-radius:6px; padding:12px; margin-bottom:14px;">
            <div style="font-weight:700; font-size:0.86rem; color:#7c3aed; margin-bottom:8px; display:flex; justify-content:space-between;">
              <span>Phần II: Câu trắc nghiệm Đúng / Sai (4 câu × 4 ý a, b, c, d)</span>
              <span style="font-size:0.78rem; color:#64748b;">Click chọn Đ hoặc S</span>
            </div>
            <div id="edit-paper-part2-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <!-- Filled dynamically -->
            </div>
          </div>

          <!-- Lý do can thiệp & Người thực hiện (Bắt buộc để lưu vết) -->
          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:12px; margin-bottom:10px;">
            <div style="font-weight:700; font-size:0.86rem; color:#b45309; margin-bottom:6px;">
              ✍️ Ghi nhận Biên bản Lưu vết (Bắt buộc):
            </div>
            <div style="display:grid; grid-template-columns:2fr 1fr; gap:10px;">
              <div>
                <label style="font-size:0.78rem; font-weight:600; color:#475569;">Lý do can thiệp / Nội dung điều chỉnh:</label>
                <input type="text" id="edit-paper-reason" class="form-control" placeholder="Ví dụ: Học sinh tô mờ đáp án B câu 6, xác nhận chọn B theo bài làm gốc..." />
              </div>
              <div>
                <label style="font-size:0.78rem; font-weight:600; color:#475569;">Người thực hiện (Giám khảo):</label>
                <input type="text" id="edit-paper-user" class="form-control" value="Giáo viên bộ môn" />
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; padding-top:12px; border-top:1px solid #e2e8f0;">
          <button class="btn btn-outline" onclick="closeModal('modalEditPaper')">Hủy bỏ</button>
          <button class="btn btn-success" onclick="savePaperEditAndRecalculate()" style="font-weight:700; background:#16a34a; border-color:#16a34a;">
            💾 Lưu can thiệp, Chấm lại & Ghi nhận Lưu vết
          </button>
        </div>
      </div>
    </div>
`;

// Insert Step 7 before </main>
if (!content.includes('id="step-7"')) {
  content = content.replace('</main>', step7Markup + '\n  </main>');
  console.log('✓ Injected Step 7 HTML markup into index.html');
} else {
  console.log('Step 7 markup already present');
}

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('All Step 7 markup written successfully!');

