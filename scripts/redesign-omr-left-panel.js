const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Vùng cần thay thế trong index.html: từ <!-- TAB 1 CONTENT: GRADING WORKBENCH --> đến <!-- GRADED PAPERS TABLE -->
const targetOldSection = `          <!-- TAB 1 CONTENT: GRADING WORKBENCH -->
          <div id="omr-grade-tab-content" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
            
            <!-- CONFIGURATION PANEL -->
            <div style="padding:10px 12px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:0.82rem; display:flex; flex-direction:column; gap:8px;">
              
              <!-- Thư mục kết quả -->
              <div>
                <label style="font-weight:700; color:#334155; display:block; margin-bottom:3px; font-size:0.78rem;">Thư mục kết quả:</label>
                <div style="display:flex; gap:6px;">
                  <input type="text" id="omr-result-dir-input" class="form-control" value="D:\\WEB-APP\\MT-DE-DA\\data\\omr_database" style="font-size:0.78rem; font-family:monospace; padding:4px 8px; height:30px; background:#fff;" readonly>
                  <button class="btn btn-outline btn-sm" onclick="browseOmrDatabaseDir()" style="padding:2px 8px; font-size:0.75rem;" title="Mở thư mục CSDL">Duyệt</button>
                </div>
              </div>

              <!-- NGUỒN ĐÁP ÁN: ĐỒNG BỘ NỘI BỘ HOẶC NẠP FILE NGOÀI TỪ GIÁO VIÊN KHÁC -->
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
                  <label style="font-weight:700; color:#334155; font-size:0.78rem; margin:0;">Biểu đáp án chuẩn:</label>
                  <span id="omr-keys-badge" style="font-size:0.72rem; color:#15803d; font-weight:700; background:#f0fdf4; padding:2px 6px; border-radius:4px; border:1px solid #bbf7d0;">
                    Đã liên kết Đề Bước 4
                  </span>
                </div>
                <div style="display:flex; gap:5px; margin-bottom:5px;">
                  <input type="text" id="omr-excel-keys-input" class="form-control" value="Đang dùng Đáp án Đề Bước 4 & 5 (Mã đề: 101, 102, 103, 104)" style="font-size:0.75rem; font-family:monospace; padding:4px 8px; height:30px; background:#fff;" readonly>
                </div>

                <!-- Các Nút chức năng nguồn đáp án -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="openManageAnswerKeysModal('import')" style="font-size:0.75rem; padding:4px 6px; background:#f0f9ff; border-color:#7dd3fc; color:#0369a1; font-weight:700;" title="Nạp file Excel, CSV, TXT, Word hoặc dán đáp án từ Zalo/Email">
                    📥 Nạp file ngoài / Dán Đ/A
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="openManageAnswerKeysModal('matrix')" style="font-size:0.75rem; padding:4px 6px; background:#fdf4ff; border-color:#f0abfc; color:#a21caf; font-weight:700;" title="Xem và chỉnh sửa ma trận đáp án các mã đề">
                    👁️ Xem & Sửa biểu Đ/A
                  </button>
                </div>
                <input type="file" id="omr-external-keys-file" accept=".xlsx,.xls,.csv,.txt,.docx,.json" style="display:none;" onchange="handleExternalAnswerKeyFile(event)">
              </div>

              <!-- Chia điểm (Thang điểm Ma trận theo Bước 2) -->
              <div>
                <label style="font-weight:700; color:#334155; display:block; margin-bottom:3px; font-size:0.78rem;">Chia điểm (Theo Ma trận Bước 2):</label>
                <input type="text" id="omr-point-rule-text" class="form-control" value="P.I (TN): 6.0đ (24c) • P.II (Đ/S): 4.0đ (4c) • P.III: 0.0đ • Tổng: 10.0đ" style="font-size:0.78rem; font-weight:700; color:#1e40af; padding:4px 8px; height:30px; background:#f0fdf4; border-color:#86efac;" readonly onclick="openPointRuleSettings()">
              </div>

              <!-- Ngưỡng tô & Mẫu phiếu (2 columns) -->
              <div style="display:grid; grid-template-columns:1fr 1.6fr; gap:8px;">
                <div>
                  <label style="font-weight:700; color:#334155; display:block; margin-bottom:3px; font-size:0.78rem;">Ngưỡng tô (0-1):</label>
                  <input type="number" id="omr-threshold-val" class="form-control" value="0.35" min="0.10" max="0.90" step="0.05" style="font-size:0.78rem; height:30px; padding:4px 8px; font-weight:700; text-align:center;" onchange="onThresholdChange(this.value)">
                </div>
                <div>
                  <label style="font-weight:700; color:#334155; display:block; margin-bottom:3px; font-size:0.78rem;">Mẫu phiếu...</label>
                  <select id="omr-sheet-model-select" class="form-control" style="font-size:0.78rem; height:30px; padding:2px 6px;">
                    <option value="bgd2025" selected>Phiếu 2025 BGD (Gốc)</option>
                    <option value="part3">Phiếu 2025 có TLN</option>
                    <option value="120">Phiếu 120 câu chuẩn</option>
                  </select>
                </div>
              </div>

              <!-- TÙY CHỌN NẠP BÀI SCAN: FILE LẺ, NHIỀU FILE HOẶC CẢ THƯ MỤC -->
              <input type="file" id="omr-custom-scans-input" multiple accept="image/*,.pdf" style="display:none;" onchange="handleOmrUserScans(event)">
              <input type="file" id="omr-folder-scans-input" webkitdirectory directory multiple style="display:none;" onchange="handleOmrFolderScans(event)">
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:4px;">
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('omr-custom-scans-input').click()" style="font-size:0.75rem; padding:5px 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Chọn 1 hoặc nhiều file scan (giữ Ctrl hoặc Shift)">
                  📄 Chọn file lẻ / nhiều file
                </button>
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('omr-folder-scans-input').click()" style="font-size:0.75rem; padding:5px 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:#f0fdf4; border-color:#86efac; color:#166534;" title="Chọn nguyên cả thư mục chứa file scan (Ví dụ: Thư mục Lop12A1)">
                  📂 Chọn cả Thư mục scan
                </button>
              </div>

              <!-- VÙNG KÉO & THẢ FILE HOẶC THƯ MỤC (DRAG & DROP ZONE) -->
              <div id="omr-dropzone" 
                   ondragover="onOmrDragOver(event)" 
                   ondragleave="onOmrDragLeave(event)" 
                   ondrop="onOmrDrop(event)"
                   onclick="document.getElementById('omr-folder-scans-input').click()"
                   style="border:1.5px dashed #94a3b8; border-radius:6px; padding:7px 8px; margin-top:5px; text-align:center; background:#f8fafc; cursor:pointer; transition:all 0.15s ease;">
                <div style="font-size:0.74rem; color:#334155; font-weight:600; display:flex; align-items:center; justify-content:center; gap:5px;">
                  <span>📥 Kéo & thả <b>Thư mục</b> hoặc <b>file scan</b> vào đây</span>
                </div>
                <div style="font-size:0.68rem; color:#64748b; margin-top:1px;">
                  Hỗ trợ JPG, PNG, WEBP, PDF (Tự động nhận diện lô bài)
                </div>
              </div>

              <!-- THANH TRẠNG THÁI NẠP & NÚT BẮT ĐẦU CHẤM -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:5px;">
                <span id="omr-scans-badge" style="font-size:0.73rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:3px 7px; border-radius:4px; border:1px solid #bae6fd; max-width:65%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  Chưa nạp bài
                </span>
                <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(false)" style="font-size:0.78rem; font-weight:700; background:#2563eb; padding:4px 10px;">
                  🚀 Bắt đầu chấm
                </button>
              </div>

            </div>

            <!-- STATUS ALERT BANNER -->
            <div id="omr-status-banner-box" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:6px 12px; margin:8px 10px 4px 10px; font-size:0.82rem; font-weight:700; color:#1d4ed8; display:flex; align-items:center; gap:6px;">
              <span>ℹ️</span>
              <span id="omr-status-banner-text">Sẵn sàng chấm bài theo mã đề và thang điểm chuẩn Bộ GD&ĐT 2025</span>
            </div>

            <!-- GRADED PAPERS TABLE -->
            <div style="flex:1; overflow-y:auto; padding:4px 10px;">`;

const newCreativeSection = `          <!-- TAB 1 CONTENT: GRADING WORKBENCH (REDESIGNED PRO STUDIO) -->
          <div id="omr-grade-tab-content" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
            
            <!-- 1. SMART EXAM CONFIG DECK (Header Pill tinh gọn, sang trọng) -->
            <div style="padding:8px 12px; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; min-width:0;">
                <span id="omr-keys-badge" style="font-size:0.74rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:3px 8px; border-radius:6px; border:1px solid #bae6fd; display:inline-flex; align-items:center; gap:4px; white-space:nowrap;">
                  <span>🎯</span> <span id="omr-summary-codes">4 Mã đề: 101, 102, 103, 104</span>
                </span>
                <span id="omr-summary-pts" style="font-size:0.72rem; font-weight:600; color:#475569; background:#fff; padding:3px 7px; border-radius:6px; border:1px solid #e2e8f0; white-space:nowrap;">
                  10.0đ (24c TN + 4c Đ/S)
                </span>
              </div>

              <!-- Nút Nạp Đ/Á ngoài & Bánh răng Tùy chỉnh Drawer -->
              <div style="display:flex; align-items:center; gap:5px; flex-shrink:0;">
                <button class="btn btn-sm" onclick="openManageAnswerKeysModal('import')" style="font-size:0.72rem; font-weight:700; padding:3px 8px; background:#fff; border:1px solid #7dd3fc; color:#0369a1; border-radius:6px;" title="Nạp file đáp án Excel, CSV hoặc dán tin nhắn Zalo">
                  📥 Đ/Á ngoài
                </button>
                <button class="btn btn-sm" onclick="toggleOmrSettingsDrawer()" id="omr-btn-toggle-settings" style="font-size:0.74rem; padding:3px 7px; background:#fff; border:1px solid #cbd5e1; color:#475569; border-radius:6px;" title="Cài đặt kỹ thuật: Ngưỡng tô, Mẫu phiếu, Thư mục lưu">
                  ⚙️
                </button>
              </div>
            </div>

            <!-- DRAWER CÀI ĐẶT KỸ THUẬT RÚT GỌN (Chỉ mở khi bấm ⚙️) -->
            <div id="omr-settings-drawer" style="display:none; padding:10px 14px; background:#f8fafc; border-bottom:1px solid #cbd5e1; font-size:0.76rem; animation:fadeIn 0.15s ease;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <div>
                  <label style="font-weight:700; color:#475569; display:block; margin-bottom:2px;">Ngưỡng tô than chì:</label>
                  <input type="number" id="omr-threshold-val" class="form-control" value="0.35" min="0.10" max="0.90" step="0.05" style="height:26px; padding:2px 6px; font-weight:700; text-align:center;" onchange="onThresholdChange(this.value)">
                </div>
                <div>
                  <label style="font-weight:700; color:#475569; display:block; margin-bottom:2px;">Mẫu phiếu OMR:</label>
                  <select id="omr-sheet-model-select" class="form-control" style="height:26px; padding:1px 4px; font-size:0.74rem;">
                    <option value="bgd2025" selected>Phiếu 2025 BGD (Gốc)</option>
                    <option value="part3">Phiếu 2025 có TLN</option>
                    <option value="120">Phiếu 120 câu chuẩn</option>
                  </select>
                </div>
              </div>
              <div style="margin-bottom:6px;">
                <label style="font-weight:700; color:#475569; display:block; margin-bottom:2px;">Thư mục CSDL lưu kết quả:</label>
                <div style="display:flex; gap:4px;">
                  <input type="text" id="omr-result-dir-input" class="form-control" value="D:\\WEB-APP\\MT-DE-DA\\data\\omr_database" style="font-size:0.72rem; font-family:monospace; height:26px; padding:2px 6px; background:#fff;" readonly>
                  <button class="btn btn-outline btn-sm" onclick="browseOmrDatabaseDir()" style="padding:2px 6px; font-size:0.72rem;">Duyệt</button>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding-top:6px; border-top:1px dashed #e2e8f0;">
                <button class="btn btn-outline btn-sm" onclick="openManageAnswerKeysModal('matrix')" style="font-size:0.72rem; padding:2px 8px;">
                  👁️ Xem ma trận đáp án
                </button>
                <button class="btn btn-outline btn-sm" onclick="toggleOmrSettingsDrawer()" style="font-size:0.72rem; padding:2px 8px;">
                  ✕ Đóng cài đặt
                </button>
              </div>
              <!-- Hidden elements for complete JS compatibility -->
              <input type="hidden" id="omr-excel-keys-input" value="Đang dùng Đáp án Đề Bước 4 & 5">
              <input type="hidden" id="omr-point-rule-text" value="P.I: 6.0đ • P.II: 4.0đ • Tổng: 10.0đ">
              <input type="file" id="omr-external-keys-file" accept=".xlsx,.xls,.csv,.txt,.docx,.json" style="display:none;" onchange="handleExternalAnswerKeyFile(event)">
            </div>

            <!-- 2. MODERN UPLOAD & GRADING HUB (All-In-One Action Card) -->
            <div style="padding:8px 12px; background:#ffffff; border-bottom:1px solid #e2e8f0;">
              <input type="file" id="omr-custom-scans-input" multiple accept="image/*,.pdf" style="display:none;" onchange="handleOmrUserScans(event)">
              <input type="file" id="omr-folder-scans-input" webkitdirectory directory multiple style="display:none;" onchange="handleOmrFolderScans(event)">

              <!-- Drag & Drop Zone nhỏ gọn, hiện đại -->
              <div id="omr-dropzone" 
                   ondragover="onOmrDragOver(event)" 
                   ondragleave="onOmrDragLeave(event)" 
                   ondrop="onOmrDrop(event)"
                   style="border:1.5px dashed #93c5fd; border-radius:8px; padding:8px 10px; background:linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%); text-align:center; transition:all 0.2s ease;">
                
                <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
                  <span style="font-size:1.3rem;">📥</span>
                  <div style="text-align:left;">
                    <div style="font-weight:700; color:#1e3a8a; font-size:0.78rem;">
                      Kéo & thả <b>Thư mục</b> hoặc <b>file scan</b> vào đây
                    </div>
                    <div style="font-size:0.68rem; color:#64748b;">
                      Nhận diện ảnh JPG, PNG, WEBP, PDF (Không giới hạn số bài)
                    </div>
                  </div>
                </div>

                <!-- 2 Nút chọn file/thư mục dạng Pill sang trọng -->
                <div style="display:flex; justify-content:center; gap:8px; margin-top:6px;">
                  <button class="btn btn-sm" onclick="document.getElementById('omr-custom-scans-input').click()" style="font-size:0.72rem; padding:3px 10px; background:#fff; border:1px solid #bfdbfe; color:#1d4ed8; font-weight:600; border-radius:16px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                    📄 Chọn file scan
                  </button>
                  <button class="btn btn-sm" onclick="document.getElementById('omr-folder-scans-input').click()" style="font-size:0.72rem; padding:3px 10px; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; font-weight:600; border-radius:16px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                    📂 Chọn cả Thư mục scan
                  </button>
                </div>
              </div>

              <!-- Thanh Trạng thái & Nút Bắt đầu chấm -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:7px;">
                <div style="display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden;">
                  <span id="omr-scans-badge" style="font-size:0.72rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:3px 8px; border-radius:5px; border:1px solid #bae6fd; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                    Chưa nạp bài
                  </span>
                  <span id="omr-status-banner-text" style="font-size:0.71rem; color:#64748b; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                    Sẵn sàng chấm
                  </span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(false)" id="omr-btn-start-grade" style="font-size:0.78rem; font-weight:700; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding:5px 12px; border-radius:6px; box-shadow:0 2px 5px rgba(37,99,235,0.25); flex-shrink:0; display:flex; align-items:center; gap:4px;">
                  <span>🚀</span> <span>Bắt đầu chấm</span>
                </button>
              </div>
            </div>

            <!-- 3. QUICK STATS & SMART FILTER BAR -->
            <div style="display:flex; align-items:center; justify-content:space-between; padding:5px 10px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:0.73rem;">
              <div style="display:flex; gap:3px;" id="omr-filter-pills">
                <button onclick="setOmrPaperFilter('all')" id="omr-filter-btn-all" style="border:none; background:#e2e8f0; color:#1e293b; font-weight:700; padding:2px 7px; border-radius:4px; cursor:pointer;">
                  Tất cả (<span id="omr-cnt-all">0</span>)
                </button>
                <button onclick="setOmrPaperFilter('valid')" id="omr-filter-btn-valid" style="border:none; background:transparent; color:#15803d; font-weight:600; padding:2px 7px; border-radius:4px; cursor:pointer;">
                  ✓ Hợp lệ (<span id="omr-cnt-valid">0</span>)
                </button>
                <button onclick="setOmrPaperFilter('warning')" id="omr-filter-btn-warning" style="border:none; background:transparent; color:#b45309; font-weight:600; padding:2px 7px; border-radius:4px; cursor:pointer;">
                  ⚠️ Cần kiểm tra (<span id="omr-cnt-warning">0</span>)
                </button>
              </div>
              <input type="text" id="omr-search-paper-input" placeholder="🔍 Tìm SBD/Tên..." oninput="onOmrSearchPaper(this.value)" style="width:110px; font-size:0.71rem; padding:2px 6px; height:22px; border-radius:4px; border:1px solid #cbd5e1; background:#fff;">
            </div>

            <!-- 4. GRADED PAPERS HERO TABLE (Nhiều không gian dọc hơn gấp 2 lần) -->
            <div style="flex:1; overflow-y:auto; padding:0 8px;">`;

if (html.includes(targetOldSection)) {
  html = html.replace(targetOldSection, newCreativeSection);
  console.log('1. Redesigned Step 7 Left Panel HTML successfully');
} else {
  console.error('1. Could not find targetOldSection in index.html');
}

fs.writeFileSync('index.html', html, 'utf8');

