const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetOldToolbar = `          <!-- TOP ZOOM & PAN TOOLBAR -->
          <div style="background:#0f172a; padding:8px 14px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center; color:#94a3b8; font-size:0.78rem; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span>🖱️ Ctrl + lăn chuột: zoom • Giữ chuột trái kéo: di chuyển • Click vào ô tròn để sửa trực tiếp</span>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <button class="btn btn-sm btn-outline" id="omr-mode-toggle-btn" onclick="toggleOmrTemplateMode()" style="color:#38bdf8; border-color:#0284c7; padding:2px 8px; font-weight:700;">
                📄 Phiếu Gốc Bộ GD&ĐT
              </button>
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
            <canvas id="omr-interactive-canvas" width="780" height="1133" style="background:#ffffff; box-shadow:0 8px 30px rgba(0,0,0,0.5); transform-origin:center center;"></canvas>
            <div id="omr-canvas-tooltip" style="position:absolute; display:none; pointer-events:none; background:rgba(15,23,42,0.92); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; z-index:20; border:1px solid #38bdf8;"></div>
          </div>`;

const newCleanCanvasHeader = `          <!-- TOP CANVAS HEADER (THANH THOÁT, SẮC NÉT, TƯƠNG PHẢN CAO) -->
          <div style="background:#091325; padding:8px 16px; border-bottom:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1rem;">👁️</span>
              <strong style="color:#f8fafc; font-size:0.86rem; letter-spacing:0.2px;">Khung Soi & Chấm Phiếu Trắc Nghiệm</strong>
              <span style="font-size:0.72rem; color:#94a3b8; font-style:italic;">(Lăn chuột để phóng to • Kéo chuột để di chuyển • Click ô tròn để sửa)</span>
            </div>
            
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="btn btn-sm" id="omr-mode-toggle-btn" onclick="toggleOmrTemplateMode()" style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid #0284c7; padding:4px 10px; font-weight:700; font-size:0.76rem; border-radius:6px; cursor:pointer;" title="Chuyển đổi giữa Phôi chuẩn Bộ GD&ĐT và Bản vẽ số hóa">
                📄 Phiếu Gốc Bộ GD&ĐT
              </button>
              <button class="btn btn-sm" onclick="printOrExportActiveOmrSheet()" style="background:#2563eb; color:#ffffff; border:1px solid #3b82f6; padding:4px 12px; font-weight:700; font-size:0.76rem; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:5px;" title="In phiếu bài thi hoặc xuất file ảnh">
                <span>🖨️</span> <span>In / Xuất phiếu</span>
              </button>
            </div>
          </div>

          <!-- CANVAS VIEWPORT CONTAINER VỚI CỤM PHÍM ZOOM NỔI (FLOATING HUD) -->
          <div id="omr-canvas-viewport" style="flex:1; position:relative; overflow:hidden; background:#1e293b; display:flex; justify-content:center; align-items:center; cursor:grab; user-select:none;">
            <canvas id="omr-interactive-canvas" width="780" height="1133" style="background:#ffffff; box-shadow:0 8px 30px rgba(0,0,0,0.5); transform-origin:center center;"></canvas>
            
            <div id="omr-canvas-tooltip" style="position:absolute; display:none; pointer-events:none; background:rgba(15,23,42,0.92); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; z-index:20; border:1px solid #38bdf8;"></div>

            <!-- CỤM ĐIỀU KHIỂN ZOOM NỔI GÓC DƯỚI PHẢI (FLOATING ZOOM CONTROLS - SẮC NÉT, KHÔNG CHE KHUẤT) -->
            <div style="position:absolute; bottom:14px; right:16px; background:rgba(9,19,37,0.88); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.18); border-radius:24px; padding:3px 6px; display:flex; align-items:center; gap:4px; box-shadow:0 4px 14px rgba(0,0,0,0.35); z-index:15;">
              <button onclick="omrZoomOut()" style="width:26px; height:26px; border-radius:50%; border:none; background:transparent; color:#ffffff; font-size:0.95rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Thu nhỏ (-)">
                −
              </button>
              <span id="omr-zoom-badge" style="color:#38bdf8; font-size:0.74rem; font-weight:700; font-family:monospace; min-width:38px; text-align:center;">
                100%
              </span>
              <button onclick="omrZoomIn()" style="width:26px; height:26px; border-radius:50%; border:none; background:transparent; color:#ffffff; font-size:0.95rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Phóng to (+)">
                +
              </button>
              <div style="width:1px; height:14px; background:rgba(255,255,255,0.2); margin:0 2px;"></div>
              <button onclick="omrZoomFit()" style="padding:2px 8px; border-radius:12px; border:none; background:rgba(255,255,255,0.12); color:#f8fafc; font-size:0.72rem; font-weight:600; cursor:pointer;" title="Khớp vừa vặn chiều cao cửa sổ">
                ⛶ Vừa cửa sổ
              </button>
              <button onclick="omrZoomReset()" style="padding:2px 6px; border-radius:12px; border:none; background:rgba(255,255,255,0.12); color:#cbd5e1; font-size:0.70rem; cursor:pointer;" title="Về tỷ lệ gốc 100%">
                100%
              </button>
            </div>
          </div>`;

if (html.includes(targetOldToolbar)) {
  html = html.replace(targetOldToolbar, newCleanCanvasHeader);
  console.log('Successfully replaced canvas toolbar with clean header and floating zoom HUD');
  fs.writeFileSync('index.html', html, 'utf8');
} else {
  console.error('Could not find targetOldToolbar in index.html');
}

