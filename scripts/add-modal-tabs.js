const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Check if modalMatrixFullscreen exists
if (!content.includes('id="modalMatrixFullscreen"')) {
  console.error('modalMatrixFullscreen not found in index.html');
  process.exit(1);
}

// 2. The target modal body structure
const targetModalBodyStart = '      <!-- Thanh chỉ số tóm tắt trực quan thời gian thực -->';
const targetModalBodyEnd = '      <!-- Footer điều khiển & Ghi chú -->';

const startIndex = content.indexOf(targetModalBodyStart);
const endIndex = content.indexOf(targetModalBodyEnd);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not locate modal body regions in index.html');
  process.exit(1);
}

const currentBody = content.substring(startIndex, endIndex);

const newModalBody = `      <!-- Thanh phân trang: Trang 1 (Bảng Ma trận) & Trang 2 (Bản đặc tả) -->
      <div id="modal-matrix-pages-bar" style="display:flex; align-items:center; justify-content:space-between; background:#e0f2fe; padding:6px 14px; border-radius:8px; border:1px solid #bae6fd; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <span style="font-weight:700; color:#0369a1; font-size:0.86rem; margin-right:4px;">📄 Phân trang rà soát:</span>
          <button id="modal-tab-matrix-btn" class="btn btn-sm" onclick="switchModalMatrixTab('matrix')" style="background:#1e3a8a; color:#fff; font-weight:700; padding:6px 14px; border-radius:6px;">
            📄 Trang 1: Bảng Ma trận Đề kiểm tra
          </button>
          <button id="modal-tab-spec-btn" class="btn btn-sm btn-outline" onclick="switchModalMatrixTab('spec')" style="background:#fff; color:#0369a1; border-color:#7dd3fc; font-weight:700; padding:6px 14px; border-radius:6px;">
            📑 Trang 2: Bản đặc tả Đề kiểm tra <span id="modal-spec-count-badge" class="badge" style="background:#0284c7; color:#fff; font-size:0.72rem; margin-left:4px;">7 bài</span>
          </button>
        </div>
        <div style="font-size:0.82rem; color:#0369a1; display:flex; align-items:center; gap:6px;">
          <span>💡 Thầy/Cô có thể chuyển giữa 2 trang để rà soát song song Bảng Ma trận và Bản đặc tả chi tiết.</span>
        </div>
      </div>

      <!-- ============================================================== -->
      <!-- TRANG 1: BẢNG MA TRẬN ĐỀ KIỂM TRA (INTERACTIVE TABLE)          -->
      <!-- ============================================================== -->
      <div id="modal-page-matrix">
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
                <th style="width:44px; min-width:44px; background:#1d4ed8; text-align:center;">Biết</th>
                <th style="width:44px; min-width:44px; background:#1d4ed8; text-align:center;">Hiểu</th>
                <th style="width:44px; min-width:44px; background:#1d4ed8; text-align:center;">VD</th>
                <th style="width:44px; min-width:44px; background:#6d28d9; text-align:center;">Biết</th>
                <th style="width:44px; min-width:44px; background:#6d28d9; text-align:center;">Hiểu</th>
                <th style="width:44px; min-width:44px; background:#6d28d9; text-align:center;">VD</th>
                <th style="width:44px; min-width:44px; background:#b45309; text-align:center;">Biết</th>
                <th style="width:44px; min-width:44px; background:#b45309; text-align:center;">Hiểu</th>
                <th style="width:44px; min-width:44px; background:#b45309; text-align:center;">VD</th>
                <th style="width:44px; min-width:44px; background:#047857; text-align:center;">Biết</th>
                <th style="width:44px; min-width:44px; background:#047857; text-align:center;">Hiểu</th>
                <th style="width:44px; min-width:44px; background:#047857; text-align:center;">VD</th>
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
      </div>

      <!-- ============================================================== -->
      <!-- TRANG 2: BẢN ĐẶC TẢ ĐỀ KIỂM TRA (SPECIFICATION TABLE)           -->
      <!-- ============================================================== -->
      <div id="modal-page-spec" style="display:none; flex:1; flex-direction:column; overflow:hidden;">
        <!-- Thanh công cụ Bản đặc tả -->
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; background:#f8fafc; padding:8px 14px; border-radius:8px; border:1px solid #cbd5e1; font-size:0.86rem; margin-bottom:8px;">
          <div style="display:flex; gap:10px; align-items:center;">
            <span style="font-size:1.15rem;">📑</span>
            <div>
              <strong style="color:#0f172a; font-size:0.92rem;">BẢN ĐẶC TẢ MA TRẬN ĐỀ KIỂM TRA ĐƯỢC NHẬN DIỆN TỪ FILE GỐC</strong>
              <div style="font-size:0.78rem; color:#64748b;">(Quy định chi tiết Yêu cầu cần đạt ở từng mức độ nhận thức và số lượng câu hỏi theo chuẩn CV 7991)</div>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="syncModalSpecFromMatrix()" style="color:#0369a1; border-color:#7dd3fc; background:#fff; font-weight:600;">
              🔄 Đồng bộ lại từ Ma trận
            </button>
            <button class="btn btn-outline btn-sm" onclick="addModalSpecRow()" style="color:#16a34a; border-color:#86efac; background:#fff; font-weight:600;">
              ➕ Thêm bài vào Bản đặc tả
            </button>
          </div>
        </div>

        <!-- Bảng Bản đặc tả có thể cuộn và chỉnh sửa trực tiếp -->
        <div class="modal-fullscreen-table-wrap">
          <table class="data-table" id="modal-spec-table" style="width:100%; font-size:0.85rem; border-collapse:collapse;">
            <thead style="position:sticky; top:0; z-index:10; background:#1e3a8a; color:#fff;">
              <tr>
                <th style="width:40px; text-align:center; background:#1e3a8a;">STT</th>
                <th style="width:16%; background:#1e3a8a;">Chương / Chủ đề</th>
                <th style="width:18%; background:#1e3a8a;">Nội dung / Đơn vị kiến thức</th>
                <th style="background:#1e3a8a;">Mức độ đánh giá & Yêu cầu cần đạt chi tiết</th>
                <th style="width:170px; text-align:center; background:#1e3a8a;">Số câu hỏi trong đề</th>
                <th style="width:45px; text-align:center; background:#1e3a8a;">Xóa</th>
              </tr>
            </thead>
            <tbody id="modal-spec-tbody">
              <!-- Rendered dynamically -->
            </tbody>
          </table>
        </div>
      </div>\n\n`;

content = content.replace(currentBody, newModalBody);

// 3. Update the footer buttons inside modal
const oldFooter = `        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline" onclick="closeModal('modalMatrixFullscreen')">✕ Đóng / Hủy bỏ</button>
          <button class="btn btn-success btn-lg" onclick="saveMatrixFromModal()" style="font-weight:700; padding:9px 22px; background:#16a34a; border-color:#16a34a;">
            ✅ Xác nhận & Lưu Ma trận này
          </button>
        </div>`;

const newFooter = `        <div style="display:flex; gap:8px; align-items:center;">
          <button id="modal-prev-page-btn" class="btn btn-outline btn-sm" onclick="switchModalMatrixTab('matrix')" style="display:none; font-weight:600;">
            ← Quay lại Trang 1: Bảng Ma trận
          </button>
          <button id="modal-next-page-btn" class="btn btn-outline btn-sm" onclick="switchModalMatrixTab('spec')" style="font-weight:600; color:#0369a1; border-color:#7dd3fc;">
            Chuyển sang Trang 2: Bản đặc tả →
          </button>
          <button class="btn btn-outline btn-sm" onclick="closeModal('modalMatrixFullscreen')">✕ Đóng</button>
          <button class="btn btn-success" onclick="saveMatrixFromModal()" style="font-weight:700; padding:7px 18px; background:#16a34a; border-color:#16a34a;">
            💾 Xác nhận & Lưu Ma trận & Bản đặc tả
          </button>
        </div>`;

content = content.replace(oldFooter, newFooter);

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('Successfully updated modal markup with pagination tabs.');

