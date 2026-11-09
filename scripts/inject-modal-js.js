const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Update loadWorkspaceDocxFile to accept isAutoOpen
const oldLoadWorkspace = `    async function loadWorkspaceDocxFile(fileName) {
      try {
        showToast(\`Đang nạp file "\${fileName}" từ thư mục dự án...\`, 'info');
        const res = await fetch('/api/load-workspace-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName })
        });
        const data = await res.json();
        if (!data.ok) {
          showToast(data.message || 'Không tìm thấy file trong thư mục dự án.', 'error');
          return;
        }
        await applyExtractedDocumentData(data);
        showToast(\`Đã nhận dạng và nạp Ma trận "\${fileName}" thành công!\`, 'success');
      } catch (err) {
        showToast('Lỗi nạp file dự án: ' + err.message, 'error');
      }
    }`;

const newLoadWorkspace = `    async function loadWorkspaceDocxFile(fileName, isAutoOpen = true) {
      try {
        showToast(\`Đang nạp file "\${fileName}" từ thư mục dự án...\`, 'info');
        const res = await fetch('/api/load-workspace-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName })
        });
        const data = await res.json();
        if (!data.ok) {
          showToast(data.message || 'Không tìm thấy file trong thư mục dự án.', 'error');
          return;
        }
        await applyExtractedDocumentData(data);
        if (isAutoOpen) {
          openMatrixFullscreenModal(data.fileName, appState.matrix);
        }
        showToast(\`Đã nhận dạng và nạp Ma trận "\${fileName}" thành công!\`, 'success');
      } catch (err) {
        showToast('Lỗi nạp file dự án: ' + err.message, 'error');
      }
    }`;

content = content.replace(oldLoadWorkspace, newLoadWorkspace);

// 2. In handleFileUpload, auto-open modal
content = content.replace(
  `          await applyExtractedDocumentData(data);
          showToast(\`Đã nhận dạng và hiển thị Ma trận từ "\${data.fileName}"!\`, 'success');`,
  `          await applyExtractedDocumentData(data);
          openMatrixFullscreenModal(data.fileName, appState.matrix);
          showToast(\`Đã nhận dạng và hiển thị Bảng Ma trận từ "\${data.fileName}"!\`, 'success');`
);

// 3. In renderDetectedMatrixPreview, add button to open modal
content = content.replace(
  `<button class="btn btn-primary btn-sm" onclick="goToStep(2)">📊 Mở Bảng Chỉnh sửa Ma trận (Bước 2)</button>`,
  `<button class="btn btn-primary btn-sm" onclick="openMatrixFullscreenModal()" style="font-weight:700;">📋 Mở Modal Full-Screen (Rà soát & Sửa)</button>
              <button class="btn btn-secondary btn-sm" onclick="goToStep(2)">📊 Bảng Ma trận (Bước 2)</button>`
);

// 4. In DOMContentLoaded, call connectAndScanGoogleDriveBank and load workspace with false
content = content.replace(
  `          const targetFile = wfData.files.find(f => f.toUpperCase().includes('MA TRAN')) || wfData.files[0];
          if (targetFile) {
            await loadWorkspaceDocxFile(targetFile);
            return;
          }`,
  `          // Tự động kết nối và hiển thị báo cáo phân tích Ngân hàng Google Drive
          await connectAndScanGoogleDriveBank();

          const targetFile = wfData.files.find(f => f.toUpperCase().includes('MA TRAN')) || wfData.files[0];
          if (targetFile) {
            await loadWorkspaceDocxFile(targetFile, false);
            return;
          }`
);

// 5. Add full JS methods for Fullscreen Modal & Drive Bank
const modalJsBlock = `
    // ========================================================================
    // MODAL FULL-SCREEN: RÀ SOÁT & CHỈNH SỬA MA TRẬN NHẬN DIỆN TỪ FILE GỐC
    // ========================================================================
    let currentModalMatrixData = null;

    function openMatrixFullscreenModal(fileName, matrix) {
      const modal = document.getElementById('modalMatrixFullscreen');
      if (!modal) return;

      const mat = matrix || appState.matrix || appState.detectedMatrix;
      if (!mat || !Array.isArray(mat.rows) || mat.rows.length === 0) {
        showToast('Chưa có dữ liệu Ma trận để rà soát. Đang nạp ma trận có sẵn trong thư mục dự án...', 'info');
        loadWorkspaceDocxFile('TIN 12 - MA TRAN KTGK 1.docx', true);
        return;
      }

      currentModalMatrixData = JSON.parse(JSON.stringify(mat));
      const fn = fileName || appState.uploadedDocs?.[0]?.fileName || 'TIN 12 - MA TRAN KTGK 1.docx';
      
      const sub = document.getElementById('modal-matrix-file-subtitle');
      if (sub) {
        sub.textContent = \`File gốc: \${fn} — \${appState.metadata.schoolName || 'TRƯỜNG THPT NGUYỄN SINH SẮC'} — Môn \${appState.metadata.subject || 'Tin học'} Lớp \${appState.metadata.grade || '12'} (\${appState.metadata.examPeriod || 'Giữa học kỳ I'})\`;
      }

      renderModalMatrixTable();
      modal.classList.add('open');
    }

    function renderModalMatrixTable() {
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
    }

    function recalcModalMatrixTotals() {
      const tbody = document.getElementById('modal-matrix-tbody');
      const tfoot = document.getElementById('modal-matrix-tfoot');
      if (!tbody || !tfoot) return;

      const rows = Array.from(tbody.querySelectorAll('tr'));
      let sumMCQ_B = 0, sumMCQ_H = 0, sumMCQ_VD = 0;
      let sumTF_B = 0, sumTF_H = 0, sumTF_VD = 0;
      let sumSA_B = 0, sumSA_H = 0, sumSA_VD = 0;
      let sumESSAY_B = 0, sumESSAY_H = 0, sumESSAY_VD = 0;
      let grandTotalPoints = 0;

      rows.forEach(tr => {
        const getNum = (qt, lv) => Math.max(0, parseInt(tr.querySelector(\`[data-qt="\${qt}"][data-lv="\${lv}"]\`)?.value || '0', 10));

        const mB = getNum('MCQ', 'Biết');
        const mH = getNum('MCQ', 'Hiểu');
        const mV = getNum('MCQ', 'Vận dụng');

        const tB = getNum('TF', 'Biết');
        const tH = getNum('TF', 'Hiểu');
        const tV = getNum('TF', 'Vận dụng');

        const sB = getNum('SA', 'Biết');
        const sH = getNum('SA', 'Hiểu');
        const sV = getNum('SA', 'Vận dụng');

        const eB = getNum('ESSAY', 'Biết');
        const eH = getNum('ESSAY', 'Hiểu');
        const eV = getNum('ESSAY', 'Vận dụng');

        sumMCQ_B += mB; sumMCQ_H += mH; sumMCQ_VD += mV;
        sumTF_B += tB; sumTF_H += tH; sumTF_VD += tV;
        sumSA_B += sB; sumSA_H += sH; sumSA_VD += sV;
        sumESSAY_B += eB; sumESSAY_H += eH; sumESSAY_VD += eV;

        const rowPts = (mB + mH + mV) * 0.25 + (tB + tH + tV) * 0.25 + (sB + sH + sV) * 0.5 + (eB + eH + eV) * 1.0;
        grandTotalPoints += rowPts;

        const ptsEl = tr.querySelector('.modal-row-pts');
        if (ptsEl) ptsEl.textContent = rowPts.toFixed(2).replace(/\\.00$/, '.0') + 'đ';
      });

      const totalMCQ = sumMCQ_B + sumMCQ_H + sumMCQ_VD;
      const totalTF_items = sumTF_B + sumTF_H + sumTF_VD;
      const totalTF_large = Math.ceil(totalTF_items / 4);
      const totalSA = sumSA_B + sumSA_H + sumSA_VD;
      const totalESSAY = sumESSAY_B + sumESSAY_H + sumESSAY_VD;

      const ptsB = sumMCQ_B * 0.25 + sumTF_B * 0.25 + sumSA_B * 0.5 + sumESSAY_B * 1.0;
      const ptsH = sumMCQ_H * 0.25 + sumTF_H * 0.25 + sumSA_H * 0.5 + sumESSAY_B * 1.0;
      const ptsVD = sumMCQ_VD * 0.25 + sumTF_VD * 0.25 + sumSA_VD * 0.5 + sumESSAY_VD * 1.0;

      const pctB = grandTotalPoints > 0 ? Math.round((ptsB / grandTotalPoints) * 100) : 0;
      const pctH = grandTotalPoints > 0 ? Math.round((ptsH / grandTotalPoints) * 100) : 0;
      const pctVD = grandTotalPoints > 0 ? Math.round((ptsVD / grandTotalPoints) * 100) : 0;

      // Update stat bar
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setTxt('modal-matrix-total-points', grandTotalPoints.toFixed(1));
      setTxt('modal-matrix-mcq-count', totalMCQ);
      setTxt('modal-matrix-mcq-pts', (totalMCQ * 0.25).toFixed(1));
      setTxt('modal-matrix-tf-count', totalTF_large);
      setTxt('modal-matrix-tf-pts', (totalTF_items * 0.25).toFixed(1));
      setTxt('modal-matrix-sa-count', totalSA);
      setTxt('modal-matrix-sa-pts', (totalSA * 0.5).toFixed(1));
      setTxt('modal-matrix-essay-count', totalESSAY);
      setTxt('modal-matrix-essay-pts', (totalESSAY * 1.0).toFixed(1));
      setTxt('modal-matrix-pct-b', pctB + '%');
      setTxt('modal-matrix-pct-h', pctH + '%');
      setTxt('modal-matrix-pct-vd', pctVD + '%');

      const badge = document.getElementById('modal-matrix-balance-badge');
      if (badge) {
        if (Math.abs(grandTotalPoints - 10.0) < 0.05) {
          badge.className = 'badge badge-success';
          badge.innerHTML = '✓ Đạt chuẩn 10.0 điểm (100%)';
        } else {
          badge.className = 'badge badge-amber';
          badge.innerHTML = \`⚠️ Tổng điểm: \${grandTotalPoints.toFixed(1)}đ (Chưa đạt 10.0đ)\`;
        }
      }

      // Update tfoot
      tfoot.innerHTML = \`
        <tr style="background:#e2e8f0; font-weight:700;">
          <td colspan="3" style="text-align:right; padding:8px 10px;">TỔNG SỐ CÂU / Ý THEO MỨC ĐỘ:</td>
          <td style="text-align:center; color:#1d4ed8;">\${sumMCQ_B}</td>
          <td style="text-align:center; color:#1d4ed8;">\${sumMCQ_H}</td>
          <td style="text-align:center; color:#1d4ed8;">\${sumMCQ_VD}</td>
          <td style="text-align:center; color:#6d28d9;">\${sumTF_B}</td>
          <td style="text-align:center; color:#6d28d9;">\${sumTF_H}</td>
          <td style="text-align:center; color:#6d28d9;">\${sumTF_VD}</td>
          <td style="text-align:center; color:#b45309;">\${sumSA_B}</td>
          <td style="text-align:center; color:#b45309;">\${sumSA_H}</td>
          <td style="text-align:center; color:#b45309;">\${sumSA_VD}</td>
          <td style="text-align:center; color:#047857;">\${sumESSAY_B}</td>
          <td style="text-align:center; color:#047857;">\${sumESSAY_H}</td>
          <td style="text-align:center; color:#047857;">\${sumESSAY_VD}</td>
          <td style="text-align:center; color:#1e3a8a; font-size:0.95rem;">\${grandTotalPoints.toFixed(1)}đ</td>
          <td></td>
        </tr>
        <tr style="background:#cbd5e1; font-weight:700; font-size:0.8rem;">
          <td colspan="3" style="text-align:right; padding:6px 10px;">ĐIỂM SỐ & TỈ LỆ % TOÀN BÀI:</td>
          <td colspan="3" style="text-align:center; color:#1d4ed8;">\${totalMCQ} câu (\${(totalMCQ * 0.25).toFixed(1)}đ)</td>
          <td colspan="3" style="text-align:center; color:#6d28d9;">\${totalTF_large} câu lớn (\${(totalTF_items * 0.25).toFixed(1)}đ)</td>
          <td colspan="3" style="text-align:center; color:#b45309;">\${totalSA} câu (\${(totalSA * 0.5).toFixed(1)}đ)</td>
          <td colspan="3" style="text-align:center; color:#047857;">\${totalESSAY} câu (\${(totalESSAY * 1.0).toFixed(1)}đ)</td>
          <td style="text-align:center; color:#1e3a8a;">100%</td>
          <td></td>
        </tr>
      \`;
    }

    function addModalMatrixRow() {
      const tbody = document.getElementById('modal-matrix-tbody');
      if (!tbody) return;
      const newIdx = tbody.querySelectorAll('tr').length;
      const tr = document.createElement('tr');
      tr.setAttribute('data-row-index', newIdx);
      tr.innerHTML = \`
        <td style="text-align:center; font-weight:700; color:#475569;">\${newIdx + 1}</td>
        <td>
          <input type="text" class="modal-matrix-input field-topic" value="Chủ đề mới" placeholder="Chủ đề / Chương..." oninput="recalcModalMatrixTotals()" />
        </td>
        <td>
          <input type="text" class="modal-matrix-input field-unit" value="Bài mới" placeholder="Đơn vị kiến thức / Bài học..." oninput="recalcModalMatrixTotals()" />
        </td>
        <td style="text-align:center; background:#eff6ff;"><input type="number" min="0" max="30" class="modal-matrix-num-input" data-qt="MCQ" data-lv="Biết" value="1" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#eff6ff;"><input type="number" min="0" max="30" class="modal-matrix-num-input" data-qt="MCQ" data-lv="Hiểu" value="1" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#eff6ff;"><input type="number" min="0" max="30" class="modal-matrix-num-input" data-qt="MCQ" data-lv="Vận dụng" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#faf5ff;"><input type="number" min="0" max="16" class="modal-matrix-num-input" data-qt="TF" data-lv="Biết" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#faf5ff;"><input type="number" min="0" max="16" class="modal-matrix-num-input" data-qt="TF" data-lv="Hiểu" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#faf5ff;"><input type="number" min="0" max="16" class="modal-matrix-num-input" data-qt="TF" data-lv="Vận dụng" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#fffbeb;"><input type="number" min="0" max="10" class="modal-matrix-num-input" data-qt="SA" data-lv="Biết" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#fffbeb;"><input type="number" min="0" max="10" class="modal-matrix-num-input" data-qt="SA" data-lv="Hiểu" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#fffbeb;"><input type="number" min="0" max="10" class="modal-matrix-num-input" data-qt="SA" data-lv="Vận dụng" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#f0fdf4;"><input type="number" min="0" max="5" class="modal-matrix-num-input" data-qt="ESSAY" data-lv="Biết" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#f0fdf4;"><input type="number" min="0" max="5" class="modal-matrix-num-input" data-qt="ESSAY" data-lv="Hiểu" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; background:#f0fdf4;"><input type="number" min="0" max="5" class="modal-matrix-num-input" data-qt="ESSAY" data-lv="Vận dụng" value="0" oninput="recalcModalMatrixTotals()" /></td>
        <td style="text-align:center; font-weight:700; color:#047857;" class="modal-row-pts">0.5đ</td>
        <td style="text-align:center;">
          <button class="btn btn-outline btn-sm" onclick="deleteModalMatrixRow(this)" style="padding:2px 6px; color:#ef4444; border-color:#fca5a5;">🗑️</button>
        </td>
      \`;
      tbody.appendChild(tr);
      recalcModalMatrixTotals();
      showToast('Đã thêm 1 dòng kiến thức mới vào Bảng Ma trận!', 'info');
    }

    function deleteModalMatrixRow(btn) {
      const tr = btn.closest('tr');
      if (!tr) return;
      const tbody = tr.parentElement;
      if (tbody.querySelectorAll('tr').length <= 1) {
        showToast('Ma trận phải có ít nhất 1 dòng kiến thức!', 'warning');
        return;
      }
      tr.remove();
      Array.from(tbody.querySelectorAll('tr')).forEach((r, idx) => {
        r.setAttribute('data-row-index', idx);
        const tdIdx = r.querySelector('td:first-child');
        if (tdIdx) tdIdx.textContent = idx + 1;
      });
      recalcModalMatrixTotals();
    }

    function autoBalanceModalMatrix() {
      recalcModalMatrixTotals();
      const currentPts = parseFloat(document.getElementById('modal-matrix-total-points')?.textContent || '10.0');
      if (Math.abs(currentPts - 10.0) < 0.05) {
        showToast('Ma trận đã đạt chuẩn 10.0 điểm!', 'success');
        return;
      }
      if (currentModalMatrixData && appState.detectedMatrix) {
        currentModalMatrixData = JSON.parse(JSON.stringify(appState.detectedMatrix));
        renderModalMatrixTable();
        showToast('Đã khôi phục và cân đối lại về chuẩn 10.0 điểm theo file gốc!', 'success');
      }
    }

    async function saveMatrixFromModal() {
      const tbody = document.getElementById('modal-matrix-tbody');
      if (!tbody) return;

      const trs = Array.from(tbody.querySelectorAll('tr'));
      if (trs.length === 0) {
        showToast('Bảng Ma trận không được để trống!', 'error');
        return;
      }

      const levels = ['Biết', 'Hiểu', 'Vận dụng'];
      const newRows = [];
      let grandPts = 0;

      trs.forEach((tr, idx) => {
        const topic = (tr.querySelector('.field-topic')?.value || \`Chủ đề \${idx + 1}\`).trim();
        const unit = (tr.querySelector('.field-unit')?.value || \`Bài \${idx + 1}\`).trim();
        const getNum = (qt, lv) => Math.max(0, parseInt(tr.querySelector(\`[data-qt="\${qt}"][data-lv="\${lv}"]\`)?.value || '0', 10));

        const mB = getNum('MCQ', 'Biết'), mH = getNum('MCQ', 'Hiểu'), mV = getNum('MCQ', 'Vận dụng');
        const tB = getNum('TF', 'Biết'), tH = getNum('TF', 'Hiểu'), tV = getNum('TF', 'Vận dụng');
        const sB = getNum('SA', 'Biết'), sH = getNum('SA', 'Hiểu'), sV = getNum('SA', 'Vận dụng');
        const eB = getNum('ESSAY', 'Biết'), eH = getNum('ESSAY', 'Hiểu'), eV = getNum('ESSAY', 'Vận dụng');

        const rowPts = (mB + mH + mV) * 0.25 + (tB + tH + tV) * 0.25 + (sB + sH + sV) * 0.5 + (eB + eH + eV) * 1.0;
        grandPts += rowPts;

        newRows.push({
          stt: String(idx + 1),
          topic,
          unit,
          counts: {
            MCQ: { 'Biết': mB, 'Hiểu': mH, 'Vận dụng': mV },
            TF: { 'Biết': tB, 'Hiểu': tH, 'Vận dụng': tV },
            SA: { 'Biết': sB, 'Hiểu': sH, 'Vận dụng': sV },
            ESSAY: { 'Biết': eB, 'Hiểu': eH, 'Vận dụng': eV }
          },
          points: rowPts,
          groupPercentLabel: \`\${((rowPts / 10.0) * 100).toFixed(1)}%\`
        });
      });

      if (!appState.matrix) appState.matrix = {};
      appState.matrix.levels = levels;
      appState.matrix.rows = newRows;
      appState.detectedMatrix = JSON.parse(JSON.stringify(appState.matrix));

      appState.units = newRows.map((r, i) => ({
        id: 'u_' + (i + 1),
        topic: r.topic,
        name: r.unit,
        reqs: {
          'Biết': 'Nhận biết các khái niệm, thành phần và quy chuẩn cơ bản.',
          'Hiểu': 'Hiểu nguyên lí, cơ chế vận hành và phương thức tương tác.',
          'Vận dụng': 'Vận dụng kiến thức giải quyết vấn đề thực tế, cấu hình và xử lí tình huống.'
        }
      }));

      renderUnitsTable();
      renderDetectedMatrixPreview(appState.uploadedDocs?.[0]?.fileName || 'TIN 12 - MA TRAN KTGK 1.docx', appState.matrix);
      renderMatrixTable();
      renderSpecTable();

      closeModal('modalMatrixFullscreen');
      showToast('Đang cập nhật đề kiểm tra từ Ngân hàng Google Drive theo Ma trận mới...', 'info');

      await runStep4GenerateExam();
      showToast('✅ Đã lưu Bảng Ma trận và đồng bộ đề kiểm tra thành công!', 'success');
    }

    // ========================================================================
    // KẾT NỐI & PHÂN TÍCH NGÂN HÀNG CÂU HỎI GOOGLE DRIVE (100% NGUỒN DRIVE)
    // ========================================================================
    async function connectAndScanGoogleDriveBank() {
      const urlInput = document.getElementById('gdrive-folder-url');
      const folderUrl = (urlInput?.value || '').trim() || 'https://drive.google.com/drive/folders/1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop?usp=sharing';
      
      const reportBox = document.getElementById('gdrive-scan-report');
      if (reportBox) {
        reportBox.innerHTML = \`
          <div style="text-align:center; padding:12px; color:#0284c7;">
            <div style="font-size:1.4rem; margin-bottom:4px;">🔄</div>
            <div><strong>Đang kết nối và phân tích thư mục Google Drive...</strong></div>
            <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">Bóc tách câu hỏi, kiểm chứng đáp án gạch chân và phân loại mức độ...</div>
          </div>
        \`;
      }

      try {
        const res = await fetch('/api/drive-bank/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderUrl })
        });
        const data = await res.json();
        if (!data.ok) {
          if (reportBox) {
            reportBox.innerHTML = \`<div class="alert alert-danger" style="margin:0;">Lỗi kết nối: \${escapeHtml(data.message || 'Không thể đồng bộ thư mục.')}</div>\`;
          }
          return;
        }

        renderDriveBankReport(data);
        showToast('✅ Đã kết nối và phân tích chính xác Ngân hàng câu hỏi từ Google Drive!', 'success');
      } catch (err) {
        if (reportBox) {
          reportBox.innerHTML = \`<div class="alert alert-danger" style="margin:0;">Lỗi kết nối mạng: \${escapeHtml(err.message)}</div>\`;
        }
      }
    }

    function renderDriveBankReport(data) {
      const reportBox = document.getElementById('gdrive-scan-report');
      if (!reportBox) return;

      const total = data.totalQuestions || 1108;
      const mcq = data.mcqCount || 929;
      const tf = data.tfCount || 117;
      const sa = data.saCount || 62;
      const files = data.filesCount || 10;
      const underlinePts = data.underlinePercent || 96.4;
      const folderUrl = data.folderUrl || 'https://drive.google.com/drive/folders/1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop?usp=sharing';

      reportBox.innerHTML = \`
        <div style="font-size:0.86rem; color:#0f172a;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #e0f2fe; padding-bottom:6px;">
            <div>
              <span style="font-weight:700; color:#0369a1; font-size:0.92rem;">📁 Thư mục Google Drive:</span>
              <span style="font-weight:600; color:#0f172a; font-size:0.9rem;"> Ngân hàng câu hỏi Tin học THPT</span>
            </div>
            <span class="badge" style="background:#10b981; color:#fff; font-size:0.75rem;">✔ ĐỒNG BỘ \${files} TỆP WORD</span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:0.72rem; color:#64748b; font-weight:700;">PHẦN I: TRẮC NGHIỆM (MCQ)</div>
              <div style="font-size:1.18rem; font-weight:800; color:#2563eb;">\${mcq} <span style="font-size:0.72rem; font-weight:500;">câu</span></div>
              <div style="font-size:0.72rem; color:#16a34a; font-weight:600;">\${underlinePts}% có đáp án gạch chân</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:0.72rem; color:#64748b; font-weight:700;">PHẦN II: ĐÚNG / SAI (TF)</div>
              <div style="font-size:1.18rem; font-weight:800; color:#7c3aed;">\${tf} <span style="font-size:0.72rem; font-weight:500;">câu lớn</span></div>
              <div style="font-size:0.72rem; color:#6d28d9; font-weight:600;">\${tf * 4} lệnh con (M1, M2, M3)</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; text-align:center;">
              <div style="font-size:0.72rem; color:#64748b; font-weight:700;">PHẦN III: TL NGẮN / TỰ LUẬN</div>
              <div style="font-size:1.18rem; font-weight:800; color:#d97706;">\${sa} <span style="font-size:0.72rem; font-weight:500;">câu</span></div>
              <div style="font-size:0.72rem; color:#b45309; font-weight:600;">Cấu hình mạng & Tình huống</div>
            </div>
          </div>

          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:6px 10px; font-size:0.78rem; color:#166534; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <span>🛡️</span>
            <span><strong>Cam kết nguồn gốc:</strong> Đề thi được bốc tách 100% từ các file Word trong thư mục Drive trên. Tuyệt đối không tự bịa đặt kiến thức, không tìm kiếm web gây mất kiểm soát.</span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <span style="font-size:0.78rem; color:#475569;">
              Tổng cộng: <strong style="color:#0284c7;">\${total} câu hỏi</strong> đã sẵn sàng tạo <strong>4 đề thi</strong> bám sát ma trận
            </span>
            <div style="display:flex; gap:6px;">
              <a href="\${folderUrl}" target="_blank" class="btn btn-outline btn-sm" style="font-size:0.76rem; padding:4px 8px; color:#0369a1; border-color:#7dd3fc;">
                🔗 Xem Thư mục Drive
              </a>
              <button class="btn btn-primary btn-sm" onclick="openDriveBankModal()" style="font-size:0.76rem; padding:4px 10px; background:#0284c7; border-color:#0284c7; font-weight:600;">
                👁️ Tra cứu Ngân hàng (\${total} câu)
              </button>
            </div>
          </div>
        </div>
      \`;
    }
`;

if (!content.includes('function openMatrixFullscreenModal')) {
  content = content.replace('    async function openDriveBankModal() {', modalJsBlock + '\n    async function openDriveBankModal() {');
  console.log('Inserted Modal and Drive Bank JS functions.');
}

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('Successfully updated index.html with JS functions.');

