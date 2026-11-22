// Script to inject the complete, authentic Step 7 OMR workbench into index.html
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Locate Step 7 section
const step7StartTag = '<section class="step-card glass-zone-step-7 hover-zone-rose" id="step-7" style="display:none">';
const startIdx = html.indexOf(step7StartTag);
if (startIdx === -1) {
  // Try alternative tag
  console.error('Could not find step-7 start tag!');
  process.exit(1);
}

const sectionEndTag = '</section>';
const endIdx = html.indexOf(sectionEndTag, startIdx);
if (endIdx === -1) {
  console.error('Could not find step-7 end tag!');
  process.exit(1);
}

const newStep7Html = `<section class="step-card glass-zone-step-7 hover-zone-rose" id="step-7" style="display:none; padding:18px;">
      <!-- TOP APPLICATION HEADER BAR -->
      <div class="card-header" style="background:#1e3a8a; color:#fff; border-radius:10px; padding:14px 20px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; box-shadow:0 4px 10px rgba(30,58,138,0.2);">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:1.6rem;">🎯</span>
          <div>
            <div style="color:#fff; font-size:1.18rem; font-weight:800; display:flex; align-items:center; gap:8px;">
              Chấm trắc nghiệm - x31 / BỘ GD / A4 tự luận
              <span class="badge" style="background:#38bdf8; color:#082f49; font-size:0.75rem; font-weight:700; padding:3px 8px;">Mẫu Phiếu 2025 BGD</span>
            </div>
            <div style="font-size:0.8rem; color:#bfdbfe;">
              Chấm OMR theo mã đề 4 số, thang điểm BGD 2025, sửa trực tiếp trên phiếu, lưu vết minh bạch & đồng bộ Google Drive
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

      <!-- MAIN TWO-COLUMN WORKSPACE CONTAINER -->
      <div id="omr-workspace-split" style="display:flex; gap:16px; align-items:stretch; min-height:860px;">
        
        <!-- LEFT PANEL (CONFIGURATION & GRADED PAPERS LIST) -->
        <div style="width:410px; min-width:370px; max-width:440px; background:#ffffff; border-radius:10px; border:1px solid #cbd5e1; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.06);">
          
          <!-- TOP TABS: [Chấm bài mới] & [Mở kết quả đã chấm] -->
          <div style="display:flex; background:#f1f5f9; border-bottom:1px solid #cbd5e1; padding:4px 6px 0 6px; gap:4px;">
            <button id="omr-tab-grade" class="btn btn-sm" onclick="switchOmrTab('grade')" style="flex:1; border-radius:6px 6px 0 0; font-weight:700; font-size:0.83rem; padding:8px 6px; background:#ffffff; color:#1e40af; border:1px solid #cbd5e1; border-bottom-color:#ffffff; margin-bottom:-1px;">
              📝 Chấm bài mới
            </button>
            <button id="omr-tab-reports" class="btn btn-sm" onclick="switchOmrTab('reports')" style="flex:1; border-radius:6px 6px 0 0; font-weight:600; font-size:0.83rem; padding:8px 6px; background:transparent; color:#64748b; border:1px solid transparent;">
              📊 Mở kết quả đã chấm
            </button>
          </div>

          <!-- TAB 1 CONTENT: GRADING WORKBENCH -->
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

              <!-- Đáp án Excel -->
              <div>
                <label style="font-weight:700; color:#334155; display:block; margin-bottom:3px; font-size:0.78rem;">Đáp án Excel:</label>
                <div style="display:flex; gap:6px;">
                  <input type="text" id="omr-excel-keys-input" class="form-control" value="D:\\WEB-APP\\MT-DE-DA\\data\\DapAn_Tin_hoc_Lop12.xlsx" style="font-size:0.78rem; font-family:monospace; padding:4px 8px; height:30px; background:#fff;" readonly>
                  <button class="btn btn-outline btn-sm" onclick="syncOmrAnswerKeys()" style="padding:2px 8px; font-size:0.75rem;" title="Đồng bộ từ Bước 4 & 5">Đồng bộ</button>
                </div>
              </div>

              <!-- Chia điểm... -->
              <div>
                <label style="font-weight:700; color:#334155; display:block; margin-bottom:3px; font-size:0.78rem;">Chia điểm...</label>
                <input type="text" id="omr-point-rule-text" class="form-control" value="ABCD: 9.33 • Đ/S: 0 • Ngắn: 0.67 • Tổng: 10" style="font-size:0.78rem; font-weight:700; color:#1e40af; padding:4px 8px; height:30px; background:#f0fdf4; border-color:#86efac;" readonly onclick="openPointRuleSettings()">
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
                    <option value="auto" selected>Tự động nhận diện</option>
                    <option value="bgd2025">Phiếu 2025 BGD</option>
                    <option value="part3">Phiếu có Phần 3 (TLN)</option>
                    <option value="120">Phiếu 120 câu chuẩn</option>
                  </select>
                </div>
              </div>

              <!-- Scan Picker & Bắt đầu chấm -->
              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:2px;">
                <input type="file" id="omr-custom-scans-input" multiple accept="image/*,.pdf" style="display:none;" onchange="handleOmrUserScans(event)">
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('omr-custom-scans-input').click()" style="font-size:0.78rem; padding:4px 8px;">
                  Chọn các ảnh scan
                </button>
                <span id="omr-scans-badge" style="font-size:0.75rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:3px 8px; border-radius:4px; border:1px solid #bae6fd;">
                  Đã chọn 14 ảnh
                </span>
                <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(false)" style="font-size:0.8rem; font-weight:700; background:#2563eb; padding:4px 12px;">
                  Bắt đầu chấm
                </button>
              </div>

            </div>

            <!-- STATUS ALERT BANNER (Đã lưu sửa phiếu: mã ..., điểm ...) -->
            <div id="omr-status-banner-box" style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:6px 12px; margin:8px 10px 4px 10px; font-size:0.82rem; font-weight:700; color:#1d4ed8; display:flex; align-items:center; gap:6px;">
              <span>ℹ️</span>
              <span id="omr-status-banner-text">Đã lưu sửa phiếu: mã 5109, điểm 3.33</span>
            </div>

            <!-- GRADED PAPERS TABLE -->
            <div style="flex:1; overflow-y:auto; padding:4px 10px;">
              <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                <thead>
                  <tr style="border-bottom:2px solid #cbd5e1; color:#475569; font-size:0.78rem;">
                    <th style="padding:6px 4px; text-align:left; width:18%;">Mã đề</th>
                    <th style="padding:6px 4px; text-align:right; width:18%;">Điểm</th>
                    <th style="padding:6px 4px; text-align:center; width:34%;">Trạng thái</th>
                    <th style="padding:6px 4px; text-align:left; width:30%;">SBD (click để xem / sửa)</th>
                  </tr>
                </thead>
                <tbody id="omr-papers-list-tbody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>

            <!-- BOTTOM DETAILS & DIAGNOSTICS BOX -->
            <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:8px 12px; font-size:0.78rem; display:flex; flex-direction:column; gap:4px;">
              <div id="omr-bottom-filename" style="font-family:monospace; color:#334155; font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600;" title="Tên tệp scan">
                1793154426410_1484405979570116403_8022982232077443837_acbb505aae98ebe24bc157b253fcdf68.jpg
              </div>
              <div id="omr-bottom-diagnostic" style="color:#b45309; font-weight:700; font-size:0.78rem; margin:2px 0;">
                Trả lời ngắn 2 cột: tô nhiều hoặc gần ngưỡng nhận diện
              </div>
              <div style="color:#64748b; font-size:0.74rem; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:8px; height:8px; border-radius:50%; background:#16a34a; display:inline-block;"></span> Xanh: đúng</span>
                <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:8px; height:8px; border-radius:50%; background:#dc2626; display:inline-block;"></span> Đỏ: ô tô sai</span>
                <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:8px; height:8px; border-radius:50%; border:2px solid #eab308; background:#fef08a; display:inline-block;"></span> Vàng: đáp án cần đối chiếu</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                <button class="btn btn-primary btn-sm" onclick="openActivePaperModal()" style="font-size:0.78rem; font-weight:700; padding:3px 10px; background:#2563eb;">
                  ✏️ Sửa phiếu
                </button>
                <button class="btn btn-outline btn-sm" onclick="markPaperConfirmed()" style="font-size:0.74rem; padding:3px 8px;">
                  ✓ Đã xác nhận
                </button>
              </div>
            </div>

          </div>

          <!-- TAB 2 CONTENT: REPORTS & AUDIT TRAIL (Shown when user clicks [Mở kết quả đã chấm]) -->
          <div id="omr-reports-tab-content" style="display:none; flex-direction:column; flex:1; overflow-y:auto; padding:12px; gap:12px;">
            <div style="background:#f1f5f9; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
              <h5 style="margin:0 0 6px 0; color:#1e40af; font-size:0.9rem;">📊 Báo cáo Thống kê & Phổ điểm</h5>
              <div id="omr-reports-stats-summary" style="font-size:0.8rem; line-height:1.5;"></div>
            </div>
            <div>
              <h5 style="margin:0 0 6px 0; color:#334155; font-size:0.85rem;">📝 Danh sách bài thi & Bảng điểm</h5>
              <div id="omr-reports-roster-table" style="max-height:240px; overflow-y:auto;"></div>
            </div>
            <div>
              <h5 style="margin:0 0 6px 0; color:#334155; font-size:0.85rem;">🛡️ Lịch sử Lưu vết Can thiệp (Audit Trail)</h5>
              <div id="omr-reports-audit-table" style="max-height:220px; overflow-y:auto;"></div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-outline btn-sm" onclick="exportOmrRosterCsv()" style="flex:1;">📥 Xuất Bảng điểm</button>
              <button class="btn btn-success btn-sm" onclick="syncOmrToGoogleDrive()" style="flex:1;">☁️ Lưu CSDL Drive</button>
            </div>
          </div>

        </div>

        <!-- RIGHT PANEL (INTERACTIVE VISUAL OMR CANVAS & INSPECTOR) -->
        <div style="flex:1; min-width:520px; background:#1e293b; border-radius:10px; border:1px solid #334155; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.15);">
          
          <!-- TOP ZOOM & PAN TOOLBAR -->
          <div style="background:#0f172a; padding:8px 14px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center; color:#94a3b8; font-size:0.78rem; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span>🖱️ Ctrl + lăn chuột: zoom • Giữ chuột trái kéo: di chuyển • Click vào ô tròn để sửa trực tiếp</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <button class="btn btn-sm btn-outline" onclick="omrZoomOut()" style="color:#f8fafc; border-color:#475569; padding:2px 8px; font-weight:700;">[-]</button>
              <button class="btn btn-sm btn-outline" onclick="omrZoomIn()" style="color:#f8fafc; border-color:#475569; padding:2px 8px; font-weight:700;">[+]</button>
              <button class="btn btn-sm btn-outline" onclick="omrZoomReset()" style="color:#f8fafc; border-color:#475569; padding:2px 8px; font-size:0.75rem;">[100%]</button>
              <button class="btn btn-sm btn-outline" onclick="omrZoomFit()" style="color:#f8fafc; border-color:#475569; padding:2px 8px; font-size:0.75rem;">[Vừa cửa sổ]</button>
              <span id="omr-zoom-badge" style="background:#334155; color:#38bdf8; padding:2px 8px; border-radius:4px; font-weight:700; font-family:monospace; margin-left:4px;">86%</span>
              <button class="btn btn-sm btn-outline" onclick="printOrExportActiveOmrSheet()" style="color:#38bdf8; border-color:#0284c7; padding:2px 8px; margin-left:6px; font-size:0.75rem;">
                🖨️ In / Xuất
              </button>
            </div>
          </div>

          <!-- CANVAS VIEWPORT CONTAINER -->
          <div id="omr-canvas-viewport" style="flex:1; position:relative; overflow:hidden; background:#334155; display:flex; justify-content:center; align-items:center; cursor:grab; user-select:none;">
            <canvas id="omr-interactive-canvas" width="780" height="1100" style="background:#55b4e9; box-shadow:0 8px 30px rgba(0,0,0,0.5); transform-origin:center center;"></canvas>
            <div id="omr-canvas-tooltip" style="position:absolute; display:none; pointer-events:none; background:rgba(15,23,42,0.92); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; z-index:20; border:1px solid #38bdf8;"></div>
          </div>

        </div>

      </div>

      <!-- FOOTER STEP 7 -->
      <div class="step-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:16px;">
        <button class="btn btn-outline" onclick="goToStep(6)">← Quay lại Bước 6 (Xuất file Word)</button>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" onclick="exportOmrRosterCsv()">📥 Tải Bảng điểm Excel</button>
          <button class="btn btn-success" onclick="syncOmrToGoogleDrive()" style="font-weight:700; background:#16a34a; border-color:#16a34a;">
            ☁️ Hoàn tất & Lưu CSDL lên Google Drive
          </button>
        </div>
      </div>
    </section>`;

html = html.substring(0, startIdx) + newStep7Html + html.substring(endIdx + sectionEndTag.length);
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully replaced step-7 markup in index.html!');

