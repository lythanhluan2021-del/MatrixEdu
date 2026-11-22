const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. UPDATE CSS FOR MODAL MATRIX NUM INPUTS
const oldCss = `    .modal-matrix-num-input {
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

const newCss = `    /* Input số lượng trong Modal Fullscreen - Hiển thị to, rõ ràng, không bị che bởi spinner trình duyệt */
    input[type="number"].modal-matrix-num-input {
      width: 42px !important;
      height: 32px !important;
      text-align: center !important;
      padding: 0 !important;
      margin: 0 auto !important;
      display: block !important;
      font-size: 14px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      border: 1.5px solid #cbd5e1 !important;
      border-radius: 6px !important;
      background: #ffffff !important;
      -webkit-appearance: none !important;
      -moz-appearance: textfield !important;
      appearance: none !important;
      box-sizing: border-box !important;
      line-height: 32px !important;
    }
    input[type="number"].modal-matrix-num-input::-webkit-outer-spin-button,
    input[type="number"].modal-matrix-num-input::-webkit-inner-spin-button {
      -webkit-appearance: none !important;
      display: none !important;
      margin: 0 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-mcq {
      background: #eff6ff !important;
      border-color: #2563eb !important;
      color: #1d4ed8 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-tf {
      background: #faf5ff !important;
      border-color: #7c3aed !important;
      color: #6d28d9 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-sa {
      background: #fffbeb !important;
      border-color: #d97706 !important;
      color: #b45309 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-essay {
      background: #f0fdf4 !important;
      border-color: #059669 !important;
      color: #047857 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.is-zero {
      color: #94a3b8 !important;
      background: #f8fafc !important;
      border-color: #e2e8f0 !important;
      font-weight: 500 !important;
    }
    input[type="number"].modal-matrix-num-input:focus {
      border-color: #2563eb !important;
      background: #ffffff !important;
      color: #1d4ed8 !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25) !important;
      outline: none !important;
    }`;

content = content.replace(oldCss, newCss);

// 2. UPDATE renderModalMatrixTable & ADD onModalCellInput
const oldRenderFn = `    function renderModalMatrixTable() {
      const tbody = document.getElementById('modal-matrix-tbody');
      if (!tbody || !currentModalMatrixData) return;

      const rows = currentModalMatrixData.rows || [];
      const levels = currentModalMatrixData.levels || ['Biết', 'Hiểu', 'Vận dụng'];

      tbody.innerHTML = rows.map((r, idx) => {
        const mB = Number(r.counts?.MCQ?.[levels[0]]) || 0;
        const mH = Number(r.counts?.MCQ?.[levels[1]]) || 0;
        const mV = Number(r.counts?.MCQ?.[levels[2]]) || 0;

        const tB = Number(r.counts?.TF?.[levels[0]]) || 0;
        const tH = Number(r.counts?.TF?.[levels[1]]) || 0;
        const tV = Number(r.counts?.TF?.[levels[2]]) || 0;

        const sB = Number(r.counts?.SA?.[levels[0]]) || 0;
        const sH = Number(r.counts?.SA?.[levels[1]]) || 0;
        const sV = Number(r.counts?.SA?.[levels[2]]) || 0;

        const eB = Number(r.counts?.ESSAY?.[levels[0]]) || 0;
        const eH = Number(r.counts?.ESSAY?.[levels[1]]) || 0;
        const eV = Number(r.counts?.ESSAY?.[levels[2]]) || 0;

        return \`
          <tr data-row-index="\${idx}">
            <td style="text-align:center; font-weight:700; color:#475569;">\${idx + 1}</td>
            <td>
              <input type="text" class="modal-matrix-input field-topic" value="\${escapeHtml(r.topic || '')}" placeholder="Chủ đề / Chương..." oninput="recalcModalMatrixTotals()" />
            </td>
            <td>
              <input type="text" class="modal-matrix-input field-unit" value="\${escapeHtml(r.unit || '')}" placeholder="Đơn vị kiến thức / Bài học..." oninput="recalcModalMatrixTotals()" />
            </td>

            <!-- Phần I: MCQ -->
            <td style="text-align:center; background:#eff6ff;">
              <input type="number" min="0" max="30" class="modal-matrix-num-input" data-qt="MCQ" data-lv="\${levels[0]}" value="\${mB}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#eff6ff;">
              <input type="number" min="0" max="30" class="modal-matrix-num-input" data-qt="MCQ" data-lv="\${levels[1]}" value="\${mH}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#eff6ff;">
              <input type="number" min="0" max="30" class="modal-matrix-num-input" data-qt="MCQ" data-lv="\${levels[2]}" value="\${mV}" oninput="recalcModalMatrixTotals()" />
            </td>

            <!-- Phần II: TF (Đúng / Sai) -->
            <td style="text-align:center; background:#faf5ff;">
              <input type="number" min="0" max="16" class="modal-matrix-num-input" data-qt="TF" data-lv="\${levels[0]}" value="\${tB}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#faf5ff;">
              <input type="number" min="0" max="16" class="modal-matrix-num-input" data-qt="TF" data-lv="\${levels[1]}" value="\${tH}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#faf5ff;">
              <input type="number" min="0" max="16" class="modal-matrix-num-input" data-qt="TF" data-lv="\${levels[2]}" value="\${tV}" oninput="recalcModalMatrixTotals()" />
            </td>

            <!-- Phần III: SA (TL Ngắn) -->
            <td style="text-align:center; background:#fffbeb;">
              <input type="number" min="0" max="10" class="modal-matrix-num-input" data-qt="SA" data-lv="\${levels[0]}" value="\${sB}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#fffbeb;">
              <input type="number" min="0" max="10" class="modal-matrix-num-input" data-qt="SA" data-lv="\${levels[1]}" value="\${sH}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#fffbeb;">
              <input type="number" min="0" max="10" class="modal-matrix-num-input" data-qt="SA" data-lv="\${levels[2]}" value="\${sV}" oninput="recalcModalMatrixTotals()" />
            </td>

            <!-- Tự luận -->
            <td style="text-align:center; background:#f0fdf4;">
              <input type="number" min="0" max="5" class="modal-matrix-num-input" data-qt="ESSAY" data-lv="\${levels[0]}" value="\${eB}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#f0fdf4;">
              <input type="number" min="0" max="5" class="modal-matrix-num-input" data-qt="ESSAY" data-lv="\${levels[1]}" value="\${eH}" oninput="recalcModalMatrixTotals()" />
            </td>
            <td style="text-align:center; background:#f0fdf4;">
              <input type="number" min="0" max="5" class="modal-matrix-num-input" data-qt="ESSAY" data-lv="\${levels[2]}" value="\${eV}" oninput="recalcModalMatrixTotals()" />
            </td>

            <td style="text-align:center; font-weight:700; color:#047857;" class="modal-row-pts">
              0.0đ
            </td>
            <td style="text-align:center;">
              <button class="btn btn-outline btn-sm" onclick="deleteModalMatrixRow(this)" style="padding:2px 6px; color:#ef4444; border-color:#fca5a5;" title="Xóa dòng này">
                🗑️
              </button>
            </td>
          </tr>
        \`;
      }).join('');

      recalcModalMatrixTotals();
    }`;

const newRenderFn = `    function onModalCellInput(el) {
      const v = Math.max(0, parseInt(el.value || '0', 10));
      const qt = el.getAttribute('data-qt');
      el.classList.remove('has-val-mcq', 'has-val-tf', 'has-val-sa', 'has-val-essay', 'is-zero');
      if (v > 0) {
        if (qt === 'MCQ') el.classList.add('has-val-mcq');
        else if (qt === 'TF') el.classList.add('has-val-tf');
        else if (qt === 'SA') el.classList.add('has-val-sa');
        else if (qt === 'ESSAY') el.classList.add('has-val-essay');
      } else {
        el.classList.add('is-zero');
      }
      recalcModalMatrixTotals();
    }

    function renderModalMatrixTable() {
      const tbody = document.getElementById('modal-matrix-tbody');
      if (!tbody || !currentModalMatrixData) return;

      const rows = currentModalMatrixData.rows || [];
      const levels = currentModalMatrixData.levels || ['Biết', 'Hiểu', 'Vận dụng'];

      tbody.innerHTML = rows.map((r, idx) => {
        const getCnt = (qt, lv) => {
          if (!r.counts || !r.counts[qt]) return 0;
          if (r.counts[qt][lv] !== undefined) return Number(r.counts[qt][lv]) || 0;
          const altMap = { 'Biết': 'Mức 1', 'Hiểu': 'Mức 2', 'Vận dụng': 'Mức 3', 'Mức 1': 'Biết', 'Mức 2': 'Hiểu', 'Mức 3': 'Vận dụng' };
          if (altMap[lv] && r.counts[qt][altMap[lv]] !== undefined) return Number(r.counts[qt][altMap[lv]]) || 0;
          return 0;
        };

        const mB = getCnt('MCQ', levels[0]);
        const mH = getCnt('MCQ', levels[1]);
        const mV = getCnt('MCQ', levels[2]);

        const tB = getCnt('TF', levels[0]);
        const tH = getCnt('TF', levels[1]);
        const tV = getCnt('TF', levels[2]);

        const sB = getCnt('SA', levels[0]);
        const sH = getCnt('SA', levels[1]);
        const sV = getCnt('SA', levels[2]);

        const eB = getCnt('ESSAY', levels[0]);
        const eH = getCnt('ESSAY', levels[1]);
        const eV = getCnt('ESSAY', levels[2]);

        const renderCellHtml = (qt, lv, val, bg) => {
          const num = Number(val) || 0;
          let valClass = 'is-zero';
          if (num > 0) {
            if (qt === 'MCQ') valClass = 'has-val-mcq';
            else if (qt === 'TF') valClass = 'has-val-tf';
            else if (qt === 'SA') valClass = 'has-val-sa';
            else if (qt === 'ESSAY') valClass = 'has-val-essay';
          }
          return \`
            <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:\${bg};">
              <input type="number" min="0" max="40" 
                     class="modal-matrix-num-input \${valClass}" 
                     data-qt="\${qt}" data-lv="\${lv}" 
                     value="\${num}" 
                     oninput="onModalCellInput(this)" 
                     title="\${qt} - \${lv}: \${num} câu/lệnh" />
            </td>
          \`;
        };

        return \`
          <tr data-row-index="\${idx}">
            <td style="text-align:center; font-weight:700; color:#475569;">\${idx + 1}</td>
            <td>
              <input type="text" class="modal-matrix-input field-topic" value="\${escapeHtml(r.topic || '')}" placeholder="Chủ đề / Chương..." oninput="recalcModalMatrixTotals()" />
            </td>
            <td>
              <input type="text" class="modal-matrix-input field-unit" value="\${escapeHtml(r.unit || '')}" placeholder="Đơn vị kiến thức / Bài học..." oninput="recalcModalMatrixTotals()" />
            </td>

            <!-- Phần I: MCQ -->
            \${renderCellHtml('MCQ', levels[0], mB, '#eff6ff')}
            \${renderCellHtml('MCQ', levels[1], mH, '#eff6ff')}
            \${renderCellHtml('MCQ', levels[2], mV, '#eff6ff')}

            <!-- Phần II: TF (Đúng / Sai) -->
            \${renderCellHtml('TF', levels[0], tB, '#faf5ff')}
            \${renderCellHtml('TF', levels[1], tH, '#faf5ff')}
            \${renderCellHtml('TF', levels[2], tV, '#faf5ff')}

            <!-- Phần III: SA (TL Ngắn) -->
            \${renderCellHtml('SA', levels[0], sB, '#fffbeb')}
            \${renderCellHtml('SA', levels[1], sH, '#fffbeb')}
            \${renderCellHtml('SA', levels[2], sV, '#fffbeb')}

            <!-- Tự luận -->
            \${renderCellHtml('ESSAY', levels[0], eB, '#f0fdf4')}
            \${renderCellHtml('ESSAY', levels[1], eH, '#f0fdf4')}
            \${renderCellHtml('ESSAY', levels[2], eV, '#f0fdf4')}

            <td style="text-align:center; font-weight:700; color:#047857;" class="modal-row-pts">
              0.0đ
            </td>
            <td style="text-align:center;">
              <button class="btn btn-outline btn-sm" onclick="deleteModalMatrixRow(this)" style="padding:2px 6px; color:#ef4444; border-color:#fca5a5;" title="Xóa dòng này">
                🗑️
              </button>
            </td>
          </tr>
        \`;
      }).join('');

      recalcModalMatrixTotals();
    }`;

content = content.replace(oldRenderFn, newRenderFn);

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('Successfully updated modal-matrix-num-input CSS and renderModalMatrixTable.');

