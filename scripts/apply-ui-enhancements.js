const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. ADD CSS FOR FULLSCREEN MODAL
const cssTarget = `.modal-box {
      background: #fff;
      border-radius: 12px;
      max-width: 680px;
      width: 100%;
      max-height: 88vh;
      overflow-y: auto;
      padding: 22px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
    }`;

const cssReplacement = `.modal-box {
      background: #fff;
      border-radius: 12px;
      max-width: 680px;
      width: 100%;
      max-height: 88vh;
      overflow-y: auto;
      padding: 22px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
    }
    .modal-box.modal-fullscreen {
      width: 96vw;
      max-width: 1440px;
      height: 94vh;
      max-height: 94vh;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
    }
    .modal-fullscreen-table-wrap {
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      margin: 10px 0;
    }
    .modal-matrix-input {
      width: 100%;
      padding: 6px 8px;
      font-size: 0.86rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #fff;
    }
    .modal-matrix-input:focus {
      border-color: #2563eb;
      outline: none;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }
    .modal-matrix-num-input {
      width: 44px;
      text-align: center;
      padding: 5px 2px;
      font-size: 0.86rem;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #fff;
    }
    .modal-matrix-num-input:focus {
      border-color: #2563eb;
      background: #eff6ff;
      outline: none;
    }`;

if (!content.includes('.modal-box.modal-fullscreen')) {
  if (!content.includes(cssTarget)) {
    console.error('Could not find cssTarget in index.html');
    process.exit(1);
  }
  content = content.replace(cssTarget, cssReplacement);
  console.log('Added CSS for fullscreen modal.');
}

// 2. SET DEFAULT NUMVARIANTS = 4 IN INPUT
content = content.replace(
  '<input type="number" id="meta-variants" value="2" min="1" max="8" oninput="syncMetadataFromInputs()" />',
  '<input type="number" id="meta-variants" value="4" min="1" max="8" oninput="syncMetadataFromInputs()" />'
);

// 3. SET DEFAULT NUMVARIANTS = 4 IN JS
content = content.replace('numVariants: 2,', 'numVariants: 4,');
content = content.replace(
  "m.numVariants = Math.max(1, Math.min(8, Number(getVal('meta-variants', 2)) || 2));",
  "m.numVariants = Math.max(1, Math.min(8, Number(getVal('meta-variants', 4)) || 4));"
);
content = content.replace("setVal('meta-variants', m.numVariants || 2);", "setVal('meta-variants', m.numVariants || 4);");

// 4. REPLACE SEPARATE DRIVE BANK CARD & SECTION 1.2
const s12Start = '<!-- KHU VỰC KẾT NỐI CSDL NGÂN HÀNG CÂU HỎI GOOGLE DRIVE (100% KHÔNG BỊA ĐẶT) -->';
const s12End = '<!-- BẢNG XEM TRƯỚC MA TRẬN NHẬN DẠNG TRỰC TIẾP TỪ FILE WORD CỦA GIÁO VIÊN -->\n        <div id="detected-matrix-preview-box" style="display:none; margin-top: 16px;"></div>\n      </div>';

const newSection12 = `<!-- KHU VỰC TẢI MA TRẬN GỐC & KẾT NỐI NGÂN HÀNG GOOGLE DRIVE (100% NGUỒN DRIVE) -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📂 1.2. Tải lên Ma trận Gốc & Kết nối Ngân hàng Câu hỏi Google Drive</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="loadWorkspaceDocxFile('TIN 12 - MA TRAN KTGK 1.docx')">📌 Nạp file "TIN 12 - MA TRAN KTGK 1.docx"</button>
            <button class="btn btn-primary btn-sm" onclick="openMatrixFullscreenModal()">📋 Mở Bảng Ma trận Nhận diện (Rà soát & Sửa)</button>
            <button class="btn btn-outline btn-sm" onclick="runStep1Analysis()">🤖 Phân tích Đơn vị Kiến thức</button>
          </div>
        </div>

        <div id="workspace-files-bar" style="margin-bottom: 12px;"></div>

        <div class="grid-2">
          <!-- BÊN TRÁI: TẢI LÊN MA TRẬN GỐC CỦA NHÀ TRƯỜNG -->
          <div>
            <div class="upload-zone" onclick="document.getElementById('file-upload-input').click()">
              <input type="file" id="file-upload-input" style="display:none" accept=".docx,.pdf,.txt,.md,.png,.jpg,.jpeg" onchange="handleFileUpload(event)" />
              <div style="font-size: 2rem; margin-bottom: 6px;">📄</div>
              <div style="font-weight: 700; color: var(--primary);">Nhấn để tải lên Bảng Ma trận gốc (.docx, .pdf) của nhà trường</div>
              <div style="font-size: 0.82rem; color: var(--muted); margin-top: 4px;">
                Tự động nhận diện cấu trúc Bảng Ma trận & Bảng Đặc tả chuẩn Công văn 7991 và mở Modal Full-Screen để rà soát
              </div>
            </div>
            <div id="uploaded-files-list" style="margin-top: 10px; font-size: 0.86rem;"></div>
            
            <div style="margin-top: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <div style="font-size:0.82rem; color:#475569;">
                <span>📋</span> <strong>Rà soát trực tiếp:</strong> Thầy/Cô có thể mở Modal Full-Screen bất cứ lúc nào để kiểm tra và chỉnh sửa.
              </div>
              <button class="btn btn-primary btn-sm" onclick="openMatrixFullscreenModal()" style="font-weight:700;">
                🔍 Mở Bảng Ma trận Full-Screen
              </button>
            </div>
          </div>

          <!-- BÊN PHẢI: KẾT NỐI NGÂN HÀNG CÂU HỎI GOOGLE DRIVE (100% NGUỒN DRIVE) -->
          <div style="border: 2px solid #0284c7; background: #f0f9ff; border-radius: 10px; padding: 12px 14px; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.08); display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom: 8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:1.3rem;">☁️</span>
                  <strong style="color:#0369a1; font-size:1.02rem;">Kết nối Ngân hàng Câu hỏi Google Drive</strong>
                </div>
                <div style="display:flex; gap:6px;">
                  <span id="gdrive-status-badge" class="badge" style="background:#10b981; color:#fff; font-size:0.75rem;">● ĐÃ KẾT NỐI TRỰC TIẾP</span>
                  <span class="badge" style="background:#0284c7; color:#fff; font-size:0.75rem;">🛡️ 100% NGUỒN DRIVE</span>
                </div>
              </div>

              <label style="font-size:0.84rem; font-weight:600; color:#1e293b; margin-bottom:6px; display:block;">
                Link Thư mục chia sẻ công khai Ngân hàng câu hỏi từ Google Drive:
              </label>
              <div style="display:flex; gap:8px; margin-bottom:10px;">
                <input type="text" id="gdrive-folder-url" 
                       value="https://drive.google.com/drive/folders/1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop?usp=sharing" 
                       placeholder="https://drive.google.com/drive/folders/..." 
                       style="flex:1; border:1px solid #7dd3fc; border-radius:6px; padding:7px 10px; font-size:0.86rem; background:#fff;" />
                <button class="btn btn-primary btn-sm" onclick="connectAndScanGoogleDriveBank()" style="white-space:nowrap; background:#0284c7; border-color:#0284c7; font-weight:700; padding:7px 14px;">
                  🔄 Quét & Đồng bộ
                </button>
              </div>

              <!-- BÁO CÁO NGẮN GỌN KẾT NỐI & PHÂN TÍCH THƯ MỤC GOOGLE DRIVE -->
              <div id="gdrive-scan-report" style="background:#ffffff; border:1px solid #bae6fd; border-radius:8px; padding:10px 12px;">
                <div style="text-align:center; color:#64748b; padding:8px; font-size:0.86rem;">
                  ⏳ Đang phân tích ngân hàng câu hỏi Google Drive...
                </div>
              </div>

              <!-- Giữ textarea ẩn để tương thích an toàn với các hàm JS cũ -->
              <textarea id="scope-raw-text" style="display:none;"></textarea>
            </div>
          </div>
        </div>

        <!-- BẢNG XEM TRƯỚC MA TRẬN NHẬN DẠNG TRỰC TIẾP TỪ FILE WORD CỦA GIÁO VIÊN -->
        <div id="detected-matrix-preview-box" style="display:none; margin-top: 16px;"></div>
      </div>`;

if (content.includes(s12Start)) {
  const startIndex = content.indexOf(s12Start);
  const endIndex = content.indexOf(s12End);
  if (endIndex === -1) {
    console.error('Could not find s12End in index.html');
    process.exit(1);
  }
  const fullTarget = content.substring(startIndex, endIndex + s12End.length);
  content = content.replace(fullTarget, newSection12);
  console.log('Replaced Section 1.2 with unified Matrix + Drive Bank layout.');
}

// 5. INSERT FULLSCREEN MODAL BEFORE MODAL 5
const modalTarget = '  <!-- MODAL 5: NGÂN HÀNG CÂU HỎI GOOGLE DRIVE (804 CÂU HỎI TIN HỌC THPT) -->';
const modalHtml = `  <!-- MODAL FULL-SCREEN: RÀ SOÁT & CHỈNH SỬA MA TRẬN NHẬN DIỆN TỪ FILE GỐC -->
  <div class="modal-backdrop" id="modalMatrixFullscreen" style="z-index: 250;">
    <div class="modal-box modal-fullscreen">
      <!-- Header -->
      <div class="card-header" style="background:#1e3a8a; color:#fff; border-radius:8px 8px 0 0; margin:-16px -20px 10px -20px; padding:12px 20px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.5rem;">📋</span>
          <div>
            <div class="card-title" style="color:#fff; font-size:1.15rem; font-weight:800;">
              BẢNG MA TRẬN ĐỀ KIỂM TRA NHẬN DIỆN TỪ FILE GỐC
            </div>
            <div id="modal-matrix-file-subtitle" style="font-size:0.8rem; color:#bfdbfe;">
              File: TIN 12 - MA TRAN KTGK 1.docx — Cấp THPT (Tin học 12) — Chuẩn Công văn 7991/BGDĐT-GDTrH
            </div>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="addModalMatrixRow()" style="color:#fff; border-color:#93c5fd; background:rgba(255,255,255,0.15);">
            ➕ Thêm dòng kiến thức
          </button>
          <button class="btn btn-outline btn-sm" onclick="autoBalanceModalMatrix()" style="color:#fef08a; border-color:#fef08a; background:rgba(254,240,138,0.15);">
            ⚖️ Cân đối 10.0đ
          </button>
          <button class="btn btn-success btn-sm" onclick="saveMatrixFromModal()" style="font-weight:700; padding:6px 16px; background:#16a34a; border-color:#16a34a;">
            💾 Xác nhận & Lưu Ma trận
          </button>
          <button class="btn btn-ghost-light btn-sm" onclick="closeModal('modalMatrixFullscreen')" style="margin-left:6px;">
            ✕ Đóng
          </button>
        </div>
      </div>

      <!-- Thanh chỉ số tóm tắt trực quan thời gian thực -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; background:#f1f5f9; padding:8px 14px; border-radius:8px; border:1px solid #cbd5e1; font-size:0.86rem; margin-bottom:8px;">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
          <div>Tổng điểm: <strong id="modal-matrix-total-points" style="color:#1e3a8a; font-size:1.12rem;">10.0</strong><span style="color:#64748b;"> / 10.0đ</span></div>
          <div style="color:#cbd5e1;">|</div>
          <div>Phần I (MCQ): <strong id="modal-matrix-mcq-count" style="color:#2563eb;">20</strong> câu (<span id="modal-matrix-mcq-pts">5.0</span>đ)</div>
          <div style="color:#cbd5e1;">|</div>
          <div>Phần II (Đúng/Sai): <strong id="modal-matrix-tf-count" style="color:#7c3aed;">4</strong> câu lớn / 16 ý (<span id="modal-matrix-tf-pts">4.0</span>đ)</div>
          <div style="color:#cbd5e1;">|</div>
          <div>Phần III (TLN): <strong id="modal-matrix-sa-count" style="color:#d97706;">0</strong> câu (<span id="modal-matrix-sa-pts">0.0</span>đ)</div>
          <div style="color:#cbd5e1;">|</div>
          <div>Tự luận: <strong id="modal-matrix-essay-count" style="color:#059669;">1</strong> câu (<span id="modal-matrix-essay-pts">1.0</span>đ)</div>
          <div style="color:#cbd5e1;">|</div>
          <div>Mức độ: Biết <strong id="modal-matrix-pct-b">40%</strong> - Hiểu <strong id="modal-matrix-pct-h">30%</strong> - Vận dụng <strong id="modal-matrix-pct-vd">30%</strong></div>
        </div>
        <div>
          <span id="modal-matrix-balance-badge" class="badge badge-success">✓ Đạt chuẩn 10.0 điểm (100%)</span>
        </div>
      </div>

      <!-- Bảng Ma trận có thể chỉnh sửa trực tiếp (Scrollable Table) -->
      <div class="modal-fullscreen-table-wrap">
        <table class="data-table" id="modal-matrix-table" style="width:100%; font-size:0.85rem; border-collapse:collapse;">
          <thead style="position:sticky; top:0; z-index:10; background:#1e3a8a; color:#fff;">
            <tr>
              <th rowspan="2" style="width:40px; text-align:center; background:#1e3a8a;">STT</th>
              <th rowspan="2" style="width:20%; background:#1e3a8a;">Chương / Chủ đề</th>
              <th rowspan="2" style="width:22%; background:#1e3a8a;">Nội dung / Đơn vị kiến thức</th>
              <th colspan="3" style="background:#2563eb; text-align:center;">Phần I: TN nhiều lựa chọn (câu)</th>
              <th colspan="3" style="background:#7c3aed; text-align:center;">Phần II: TN Đúng / Sai (ý)</th>
              <th colspan="3" style="background:#d97706; text-align:center;">Phần III: TL Ngắn (câu)</th>
              <th colspan="3" style="background:#059669; text-align:center;">Tự luận (câu)</th>
              <th rowspan="2" style="width:68px; text-align:center; background:#1e3a8a;">Điểm dòng</th>
              <th rowspan="2" style="width:45px; text-align:center; background:#1e3a8a;">Xóa</th>
            </tr>
            <tr style="font-size:0.78rem;">
              <th style="width:40px; background:#1d4ed8; text-align:center;">Biết</th>
              <th style="width:40px; background:#1d4ed8; text-align:center;">Hiểu</th>
              <th style="width:40px; background:#1d4ed8; text-align:center;">VD</th>
              <th style="width:40px; background:#6d28d9; text-align:center;">Biết</th>
              <th style="width:40px; background:#6d28d9; text-align:center;">Hiểu</th>
              <th style="width:40px; background:#6d28d9; text-align:center;">VD</th>
              <th style="width:40px; background:#b45309; text-align:center;">Biết</th>
              <th style="width:40px; background:#b45309; text-align:center;">Hiểu</th>
              <th style="width:40px; background:#b45309; text-align:center;">VD</th>
              <th style="width:40px; background:#047857; text-align:center;">Biết</th>
              <th style="width:40px; background:#047857; text-align:center;">Hiểu</th>
              <th style="width:40px; background:#047857; text-align:center;">VD</th>
            </tr>
          </thead>
          <tbody id="modal-matrix-tbody">
            <!-- Rendered dynamically -->
          </tbody>
          <tfoot id="modal-matrix-tfoot" style="position:sticky; bottom:0; background:#e2e8f0; font-weight:700; border-top:2px solid #94a3b8;">
            <!-- Rendered dynamically with column sums -->
          </tfoot>
        </table>
      </div>

      <!-- Footer điều khiển & Ghi chú -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-top:6px; border-top:1px solid #e2e8f0;">
        <div style="font-size:0.82rem; color:#64748b; max-width:65%;">
          💡 Thầy/Cô có thể sửa trực tiếp tên <strong>Chủ đề</strong>, <strong>Đơn vị kiến thức</strong> và <strong>Số lượng câu hỏi</strong> ở từng ô. Điểm số và tỉ lệ sẽ tự động tính toán. Khi bấm <strong>"Xác nhận & Lưu Ma trận"</strong>, hệ thống sẽ lưu ma trận này và bốc tách câu hỏi từ Ngân hàng Google Drive theo đúng cấu trúc.
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline" onclick="closeModal('modalMatrixFullscreen')">✕ Đóng / Hủy bỏ</button>
          <button class="btn btn-success btn-lg" onclick="saveMatrixFromModal()" style="font-weight:700; padding:9px 22px; background:#16a34a; border-color:#16a34a;">
            ✅ Xác nhận & Lưu Ma trận này
          </button>
        </div>
      </div>
    </div>
  </div>\n\n`;

if (!content.includes('id="modalMatrixFullscreen"')) {
  if (!content.includes(modalTarget)) {
    console.error('Could not find modalTarget in index.html');
    process.exit(1);
  }
  content = content.replace(modalTarget, modalHtml + modalTarget);
  console.log('Inserted modalMatrixFullscreen markup.');
}

// Write intermediate progress
fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('Saved HTML markup changes to index.html.');

