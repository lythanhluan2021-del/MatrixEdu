const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. CẬP NHẬT PANEL TRÁI BƯỚC 7: NGUỒN ĐÁP ÁN ĐA NGUỒN
const oldAnswerKeyBlock = [
  '              <!-- Đáp án Excel & Kết nối Bước 4 -->',
  '              <div>',
  '                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">',
  '                  <label style="font-weight:700; color:#334155; font-size:0.78rem; margin:0;">Đáp án chuẩn:</label>',
  '                  <span id="omr-keys-badge" style="font-size:0.72rem; color:#15803d; font-weight:700;">Đã liên kết Đề Bước 4</span>',
  '                </div>',
  '                <div style="display:flex; gap:6px;">',
  '                  <input type="text" id="omr-excel-keys-input" class="form-control" value="Tự động lấy từ Đề thi & Đáp án Bước 4 & 5" style="font-size:0.78rem; font-family:monospace; padding:4px 8px; height:30px; background:#fff;" readonly>',
  '                  <button class="btn btn-outline btn-sm" onclick="syncOmrAnswerKeys()" style="padding:2px 8px; font-size:0.75rem;" title="Đồng bộ từ Bước 4 & 5">Đồng bộ</button>',
  '                </div>',
  '              </div>'
].join('\n');

const newAnswerKeyBlock = [
  '              <!-- NGUỒN ĐÁP ÁN: ĐỒNG BỘ NỘI BỘ HOẶC NẠP FILE NGOÀI TỪ GIÁO VIÊN KHÁC -->',
  '              <div>',
  '                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">',
  '                  <label style="font-weight:700; color:#334155; font-size:0.78rem; margin:0;">Biểu đáp án chuẩn:</label>',
  '                  <span id="omr-keys-badge" style="font-size:0.72rem; color:#15803d; font-weight:700; background:#f0fdf4; padding:2px 6px; border-radius:4px; border:1px solid #bbf7d0;">',
  '                    Đã liên kết Đề Bước 4',
  '                  </span>',
  '                </div>',
  '                <div style="display:flex; gap:5px; margin-bottom:5px;">',
  '                  <input type="text" id="omr-excel-keys-input" class="form-control" value="Đang dùng Đáp án Đề Bước 4 & 5 (Mã đề: 101, 102, 103, 104)" style="font-size:0.75rem; font-family:monospace; padding:4px 8px; height:30px; background:#fff;" readonly>',
  '                </div>',
  '',
  '                <!-- Các Nút chức năng nguồn đáp án -->',
  '                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">',
  '                  <button class="btn btn-outline btn-sm" onclick="openManageAnswerKeysModal(\'import\')" style="font-size:0.75rem; padding:4px 6px; background:#f0f9ff; border-color:#7dd3fc; color:#0369a1; font-weight:700;" title="Nạp file Excel, CSV, TXT, Word hoặc dán đáp án từ Zalo/Email">',
  '                    📥 Nạp file ngoài / Dán Đ/A',
  '                  </button>',
  '                  <button class="btn btn-outline btn-sm" onclick="openManageAnswerKeysModal(\'matrix\')" style="font-size:0.75rem; padding:4px 6px; background:#fdf4ff; border-color:#f0abfc; color:#a21caf; font-weight:700;" title="Xem và chỉnh sửa ma trận đáp án các mã đề">',
  '                    👁️ Xem & Sửa biểu Đ/A',
  '                  </button>',
  '                </div>',
  '                <input type="file" id="omr-external-keys-file" accept=".xlsx,.xls,.csv,.txt,.docx,.json" style="display:none;" onchange="handleExternalAnswerKeyFile(event)">',
  '              </div>'
].join('\n');

if (html.includes(oldAnswerKeyBlock)) {
  html = html.replace(oldAnswerKeyBlock, newAnswerKeyBlock);
  console.log('1. Replaced Step 7 Left Panel answer key block OK');
} else {
  console.error('1. Could not find oldAnswerKeyBlock in index.html');
}

// 2. CHÈN MODAL QUẢN LÝ BIỂU ĐÁP ÁN (modalManageAnswerKeys)
const modalInsertPoint = '  <!-- MODAL 1: KHO TÀI LIỆU & KỊCH BẢN KIỂM THỬ THỰC TẾ (3 CẤP HỌC) -->';

const newModalMarkup = `  <!-- MODAL QUẢN LÝ & NẠP BIỂU ĐÁP ÁN TỪ BÊN NGOÀI (EXCEL, CSV, ZALO, WORD) -->
  <div class="modal-backdrop" id="modalManageAnswerKeys">
    <div class="modal-box" style="max-width:920px; width:95%; max-height:92vh; display:flex; flex-direction:column; padding:0; overflow:hidden; border-radius:12px;">
      
      <!-- MODAL HEADER -->
      <div style="padding:14px 18px; background:linear-gradient(135deg, #091325 0%, #1e3a8a 100%); color:#fff; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:1.05rem; font-weight:700; display:flex; align-items:center; gap:8px;">
            <span>📋</span> Quản lý Biểu Đáp Án Chấm Thi
          </div>
          <div style="font-size:0.78rem; color:#bfdbfe; margin-top:2px;">
            Nạp file Excel/CSV/Word từ giáo viên khác, dán tin nhắn Zalo hoặc chỉnh sửa trực tiếp từng mã đề
          </div>
        </div>
        <button class="btn btn-ghost-light btn-sm" onclick="closeModal('modalManageAnswerKeys')" style="font-size:0.85rem; padding:4px 10px;">✕ Đóng</button>
      </div>

      <!-- TABS NAVIGATION -->
      <div style="display:flex; border-bottom:1px solid #e2e8f0; background:#f8fafc; padding:0 16px;">
        <button id="ak-tab-btn-import" class="ak-tab-btn active" onclick="switchAnswerKeyTab('import')" style="padding:10px 16px; font-weight:700; font-size:0.84rem; border:none; background:none; border-bottom:3px solid #2563eb; color:#2563eb; cursor:pointer;">
          📥 1. Nạp File ngoài & Dán Text Zalo
        </button>
        <button id="ak-tab-btn-matrix" class="ak-tab-btn" onclick="switchAnswerKeyTab('matrix')" style="padding:10px 16px; font-weight:600; font-size:0.84rem; border:none; background:none; border-bottom:3px solid transparent; color:#64748b; cursor:pointer;">
          👁️ 2. Xem & Sửa Ma trận Đáp án
        </button>
        <button id="ak-tab-btn-config" class="ak-tab-btn" onclick="switchAnswerKeyTab('config')" style="padding:10px 16px; font-weight:600; font-size:0.84rem; border:none; background:none; border-bottom:3px solid transparent; color:#64748b; cursor:pointer;">
          ⚙️ 3. Thang điểm & Cấu hình
        </button>
      </div>

      <!-- MODAL BODY -->
      <div style="flex:1; overflow-y:auto; padding:18px 20px;">
        
        <!-- TAB 1: NẠP FILE & DÁN TEXT -->
        <div id="ak-tab-pane-import">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            
            <!-- Cột trái: Tải file ngoài -->
            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#fff; display:flex; flex-direction:column; gap:10px;">
              <strong style="color:#0f172a; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
                📁 Cách 1: Nạp file Đáp án có sẵn
              </strong>
              <p style="font-size:0.78rem; color:#64748b; margin:0;">
                Hỗ trợ file Excel (<code>.xlsx, .xls</code>), file bảng tính <code>.csv</code>, file Word <code>.docx</code> hoặc file <code>.json</code> từ giáo viên khác / phần mềm trộn đề (McMIX, SmartTest).
              </p>
              
              <div style="border:2px dashed #94a3b8; border-radius:6px; padding:14px; text-align:center; background:#f8fafc; cursor:pointer;" onclick="document.getElementById('omr-external-keys-file').click()">
                <div style="font-size:1.8rem; margin-bottom:4px;">📊</div>
                <div style="font-weight:700; color:#1e40af; font-size:0.84rem;">Click để chọn file Đáp án (.xlsx, .csv, .txt)</div>
                <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">Tự động nhận diện tất cả các mã đề trong file</div>
              </div>

              <div style="display:flex; gap:6px; margin-top:4px;">
                <button class="btn btn-outline btn-sm" onclick="loadSampleExternalAnswerKey('csv')" style="font-size:0.75rem; flex:1;">
                  📄 Thử file CSV mẫu (Toán 12)
                </button>
                <button class="btn btn-outline btn-sm" onclick="loadSampleExternalAnswerKey('zalo')" style="font-size:0.75rem; flex:1;">
                  📱 Thử mẫu Zalo (Tin 12)
                </button>
              </div>
            </div>

            <!-- Cột phải: Dán trực tiếp từ Zalo/Email -->
            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#fff; display:flex; flex-direction:column; gap:10px;">
              <strong style="color:#0f172a; font-size:0.88rem; display:flex; align-items:center; gap:6px;">
                💬 Cách 2: Dán chuỗi đáp án (Zalo / Email)
              </strong>
              <p style="font-size:0.78rem; color:#64748b; margin:0;">
                Giáo viên khác gửi đáp án qua tin nhắn? Chỉ cần copy và dán trực tiếp vào khung dưới:
              </p>

              <textarea id="ak-raw-textarea" class="form-control" rows="6" style="font-size:0.78rem; font-family:monospace; resize:none;" placeholder="Ví dụ:
Mã đề 101: 1A 2B 3C 4D 5A 6B 7C 8D...
Câu 1: a-Đ, b-S, c-Đ, d-S
Mã đề 102: 1B 2C 3D 4A 5B 6C 7D 8A..."></textarea>

              <button class="btn btn-primary btn-sm" onclick="processPastedAnswerKeyText()" style="font-size:0.82rem; font-weight:700; background:#2563eb;">
                🚀 Nhận diện & Trích xuất đáp án
              </button>
            </div>
          </div>

          <!-- Thông báo nhận diện -->
          <div id="ak-import-status-box" style="margin-top:14px; padding:10px 14px; border-radius:6px; background:#f0fdf4; border:1px solid #bbf7d0; display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:0.82rem; color:#166534; font-weight:600;" id="ak-import-status-text">
              Sẵn sàng nạp biểu đáp án từ file hoặc văn bản
            </div>
            <button class="btn btn-outline btn-sm" onclick="switchAnswerKeyTab('matrix')" style="font-size:0.75rem; background:#fff;">
              Xem ma trận chi tiết →
            </button>
          </div>
        </div>

        <!-- TAB 2: XEM & SỬA MA TRẬN ĐÁP ÁN -->
        <div id="ak-tab-pane-matrix" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:0.82rem; font-weight:700; color:#334155;">Các mã đề hiện có:</span>
              <div id="ak-matrix-codes-badges" style="display:flex; gap:6px;"></div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-outline btn-sm" onclick="addNewAnswerKeyCodePrompt()" style="font-size:0.75rem;">
                + Thêm mã đề mới
              </button>
            </div>
          </div>

          <!-- Bảng Ma trận đáp án -->
          <div style="max-height:420px; overflow-y:auto; border:1px solid #cbd5e1; border-radius:6px;">
            <table id="ak-matrix-table" style="width:100%; border-collapse:collapse; font-size:0.82rem;">
              <thead style="position:sticky; top:0; background:#f1f5f9; z-index:2;">
                <tr id="ak-matrix-thead-tr" style="border-bottom:2px solid #cbd5e1; text-align:center;"></tr>
              </thead>
              <tbody id="ak-matrix-tbody"></tbody>
            </table>
          </div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:6px; font-style:italic;">
            💡 Mẹo: Nhấp vào từng ký tự đáp án (A, B, C, D hoặc Đ, S) trên bảng để sửa nhanh nếu có đính chính từ tổ chuyên môn.
          </div>
        </div>

        <!-- TAB 3: CẤU HÌNH THANG ĐIỂM -->
        <div id="ak-tab-pane-config" style="display:none;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#fff;">
              <strong style="color:#0f172a; font-size:0.88rem; display:block; margin-bottom:8px;">
                Phần I: Trắc nghiệm nhiều lựa chọn (MCQ)
              </strong>
              <div class="form-group">
                <label style="font-size:0.78rem;">Điểm cho mỗi câu đúng (điểm):</label>
                <input type="number" id="ak-cfg-mcq-point" class="form-control" value="0.25" step="0.05" min="0.05" max="2.0" style="font-size:0.82rem; font-weight:700;" onchange="updateCustomPointSummary()">
              </div>
              <div style="font-size:0.75rem; color:#64748b;">
                Ví dụ: Đề 24 câu × 0.25đ = 6.0 điểm | Đề 40 câu × 0.25đ = 10.0 điểm
              </div>
            </div>

            <div style="border:1px solid #cbd5e1; border-radius:8px; padding:14px; background:#fff;">
              <strong style="color:#0f172a; font-size:0.88rem; display:block; margin-bottom:8px;">
                Phần II: Đúng / Sai (Quy chế Bộ GD&ĐT 2025)
              </strong>
              <div style="font-size:0.8rem; line-height:1.6; color:#334155;">
                • Đúng 1 ý: <b>0.10 điểm</b><br>
                • Đúng 2 ý: <b>0.25 điểm</b><br>
                • Đúng 3 ý: <b>0.50 điểm</b><br>
                • Đúng cả 4 ý: <b>1.00 điểm</b> / câu<br>
                <span style="color:#047857; font-weight:700;">(Đề 4 câu Đúng/Sai tối đa = 4.0 điểm)</span>
              </div>
            </div>
          </div>

          <div style="margin-top:14px; padding:10px 14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; font-size:0.82rem; color:#1d4ed8; font-weight:700;" id="ak-point-summary-text">
            Thang điểm hiện tại: Phần I: 6.0đ (24 câu) + Phần II: 4.0đ (4 câu) = Tổng 10.0 điểm
          </div>
        </div>

      </div>

      <!-- MODAL FOOTER -->
      <div style="padding:12px 18px; background:#f8fafc; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
        <button class="btn btn-outline btn-sm" onclick="resetToStep4AnswerKeys()" style="font-size:0.8rem; color:#b91c1c; border-color:#fca5a5;">
          🔄 Khôi phục Đáp án Đề Bước 4
        </button>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline btn-sm" onclick="closeModal('modalManageAnswerKeys')">Hủy</button>
          <button class="btn btn-success btn-sm" onclick="applyExternalAnswerKeysToApp()" style="font-size:0.84rem; font-weight:700; background:#16a34a; border-color:#16a34a; padding:6px 16px;">
            💾 Lưu & Áp dụng để Chấm ngay
          </button>
        </div>
      </div>

    </div>
  </div>

  ${modalInsertPoint}`;

if (html.includes(modalInsertPoint)) {
  html = html.replace(modalInsertPoint, newModalMarkup);
  console.log('2. Inserted modalManageAnswerKeys OK');
} else {
  console.error('2. Could not find modalInsertPoint in index.html');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Finished updating markup in index.html');

