const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Locate openMatrixFullscreenModal
const targetFnStart = '    let currentModalMatrixData = null;';
const targetFnEnd = '    // ========================================================================\n    // KẾT NỐI & PHÂN TÍCH NGÂN HÀNG CÂU HỎI GOOGLE DRIVE (100% NGUỒN DRIVE)';

const startIdx = content.indexOf(targetFnStart);
const endIdx = content.indexOf(targetFnEnd);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate modal JS functions block in index.html');
  process.exit(1);
}

const newModalJsBlock = `    // ========================================================================
    // MODAL FULL-SCREEN: RÀ SOÁT & CHỈNH SỬA MA TRẬN & BẢN ĐẶC TẢ NHẬN DIỆN
    // PHÂN TRANG: TRANG 1 (MA TRẬN) - TRANG 2 (BẢN ĐẶC TẢ CHI TIẾT)
    // ========================================================================
    let currentModalMatrixData = null;
    let currentModalSpecData = null;
    let currentModalActiveTab = 'matrix';

    function switchModalMatrixTab(tab) {
      currentModalActiveTab = tab;
      const pageMatrix = document.getElementById('modal-page-matrix');
      const pageSpec = document.getElementById('modal-page-spec');
      const btnMatrix = document.getElementById('modal-tab-matrix-btn');
      const btnSpec = document.getElementById('modal-tab-spec-btn');
      const btnPrev = document.getElementById('modal-prev-page-btn');
      const btnNext = document.getElementById('modal-next-page-btn');

      if (tab === 'spec') {
        if (pageMatrix) pageMatrix.style.display = 'none';
        if (pageSpec) pageSpec.style.display = 'flex';

        if (btnSpec) {
          btnSpec.style.background = '#0284c7';
          btnSpec.style.color = '#fff';
          btnSpec.style.borderColor = '#0284c7';
        }
        if (btnMatrix) {
          btnMatrix.style.background = '#fff';
          btnMatrix.style.color = '#1e3a8a';
          btnMatrix.style.borderColor = '#93c5fd';
        }

        if (btnPrev) btnPrev.style.display = 'inline-flex';
        if (btnNext) btnNext.style.display = 'none';
      } else {
        if (pageSpec) pageSpec.style.display = 'none';
        if (pageMatrix) pageMatrix.style.display = 'block';

        if (btnMatrix) {
          btnMatrix.style.background = '#1e3a8a';
          btnMatrix.style.color = '#fff';
          btnMatrix.style.borderColor = '#1e3a8a';
        }
        if (btnSpec) {
          btnSpec.style.background = '#fff';
          btnSpec.style.color = '#0369a1';
          btnSpec.style.borderColor = '#7dd3fc';
        }

        if (btnPrev) btnPrev.style.display = 'none';
        if (btnNext) btnNext.style.display = 'inline-flex';
      }
    }

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

      // Khởi tạo dữ liệu Trang 2: Bản đặc tả
      if (Array.isArray(appState.specification) && appState.specification.length > 0) {
        currentModalSpecData = JSON.parse(JSON.stringify(appState.specification));
      } else if (Array.isArray(appState.detectedSpec) && appState.detectedSpec.length > 0) {
        currentModalSpecData = JSON.parse(JSON.stringify(appState.detectedSpec));
      } else {
        // Tự động tạo bản đặc tả tương ứng 1-1 với ma trận nếu tài liệu chưa có
        currentModalSpecData = (currentModalMatrixData.rows || []).map((r, i) => ({
          rowId: 'row_' + (i + 1),
          topic: r.topic || '',
          unit: r.unit || '',
          outcomes: {
            'Biết': 'Nhận biết các khái niệm, thành phần, cấu trúc và đặc trưng cơ bản.',
            'Hiểu': 'Hiểu nguyên lí, cơ chế vận hành, ưu nhược điểm và phương thức ứng dụng.',
            'Vận dụng': 'Vận dụng giải quyết bài toán, cấu hình thiết bị, xử lí tình huống thực tiễn.'
          },
          questionRefs: r.cellRefs || {}
        }));
      }

      const fn = fileName || appState.uploadedDocs?.[0]?.fileName || 'TIN 12 - MA TRAN KTGK 1.docx';
      const sub = document.getElementById('modal-matrix-file-subtitle');
      if (sub) {
        sub.textContent = \`File gốc: \${fn} — \${appState.metadata.schoolName || 'TRƯỜNG THPT NGUYỄN SINH SẮC'} — Môn \${appState.metadata.subject || 'Tin học'} Lớp \${appState.metadata.grade || '12'} (\${appState.metadata.examPeriod || 'Giữa học kỳ I'})\`;
      }

      // Cập nhật badge số bài trong bản đặc tả
      const specBadge = document.getElementById('modal-spec-count-badge');
      if (specBadge) {
        specBadge.textContent = \`\${currentModalSpecData.length} bài\`;
      }

      renderModalMatrixTable();
      renderModalSpecTable();
      switchModalMatrixTab('matrix');
      modal.classList.add('open');
    }

    function onModalCellInput(el) {
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

    // ========================================================================
    // RENDER & XỬ LÍ TRANG 2: BẢN ĐẶC TẢ TRONG MODAL FULL-SCREEN
    // ========================================================================
    function renderModalSpecTable() {
      const tbody = document.getElementById('modal-spec-tbody');
      if (!tbody || !currentModalSpecData) return;

      const levels = ['Biết', 'Hiểu', 'Vận dụng'];

      tbody.innerHTML = currentModalSpecData.map((sp, idx) => {
        const outcomesInputs = levels.map(lv => {
          const color = lv === 'Biết' ? '#2563eb' : lv === 'Hiểu' ? '#7c3aed' : '#d97706';
          const title = lv === 'Biết' ? '🔵 Biết (Nhận biết):' : lv === 'Hiểu' ? '🟣 Hiểu (Thông hiểu):' : '🟠 Vận dụng (Vận dụng / VDC):';
          const text = (sp.outcomes && sp.outcomes[lv]) || '';

          return \`
            <div style="margin-bottom:6px;">
              <div style="font-weight:700; font-size:0.78rem; color:\${color}; margin-bottom:2px;">\${title}</div>
              <textarea rows="2" class="modal-matrix-input spec-outcome-box" 
                        data-spec-idx="\${idx}" data-spec-lv="\${lv}" 
                        style="width:100%; font-size:0.83rem; padding:4px 8px; border:1px solid #cbd5e1; border-radius:4px; font-family:inherit; resize:vertical;" 
                        oninput="onModalSpecOutcomeChange(\${idx}, '\${lv}', this.value)" 
                        placeholder="Nhập yêu cầu cần đạt cho mức độ \${lv}...">\${escapeHtml(text)}</textarea>
            </div>
          \`;
        }).join('');

        // Badges số lượng câu hỏi tương ứng trong Ma trận
        const refsBadges = [];
        const matRow = currentModalMatrixData?.rows?.[idx];
        if (matRow && matRow.counts) {
          const mcqCount = (Number(matRow.counts.MCQ?.['Biết']) || 0) + (Number(matRow.counts.MCQ?.['Hiểu']) || 0) + (Number(matRow.counts.MCQ?.['Vận dụng']) || 0);
          const tfCount = (Number(matRow.counts.TF?.['Biết']) || 0) + (Number(matRow.counts.TF?.['Hiểu']) || 0) + (Number(matRow.counts.TF?.['Vận dụng']) || 0);
          const saCount = (Number(matRow.counts.SA?.['Biết']) || 0) + (Number(matRow.counts.SA?.['Hiểu']) || 0) + (Number(matRow.counts.SA?.['Vận dụng']) || 0);
          const essayCount = (Number(matRow.counts.ESSAY?.['Biết']) || 0) + (Number(matRow.counts.ESSAY?.['Hiểu']) || 0) + (Number(matRow.counts.ESSAY?.['Vận dụng']) || 0);

          if (mcqCount > 0) refsBadges.push(\`<div style="margin-bottom:3px;"><span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #93c5fd; font-size:0.75rem;">Phần I: \${mcqCount} câu TN</span></div>\`);
          if (tfCount > 0) refsBadges.push(\`<div style="margin-bottom:3px;"><span class="badge" style="background:#faf5ff; color:#6d28d9; border:1px solid #c084fc; font-size:0.75rem;">Phần II: \${tfCount} lệnh Đ/S</span></div>\`);
          if (saCount > 0) refsBadges.push(\`<div style="margin-bottom:3px;"><span class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fcd34d; font-size:0.75rem;">Phần III: \${saCount} câu TLN</span></div>\`);
          if (essayCount > 0) refsBadges.push(\`<div style="margin-bottom:3px;"><span class="badge" style="background:#f0fdf4; color:#047857; border:1px solid #86efac; font-size:0.75rem;">Tự luận: \${essayCount} câu</span></div>\`);
        }

        // Mã câu gốc từ tài liệu nếu có
        const origRefs = [];
        if (sp.questionRefs) {
          for (const [qt, list] of Object.entries(sp.questionRefs)) {
            if (Array.isArray(list) && list.length > 0) {
              origRefs.push(\`<div style="font-size:0.72rem; color:#64748b; margin-top:2px;">Mã gốc: \${escapeHtml(list.join(', '))}</div>\`);
            }
          }
        }

        return \`
          <tr data-spec-row-index="\${idx}">
            <td style="text-align:center; font-weight:700; color:#475569; vertical-align:top; padding-top:10px;">\${idx + 1}</td>
            <td style="vertical-align:top; padding-top:8px;">
              <input type="text" class="modal-matrix-input spec-field-topic" 
                     value="\${escapeHtml(sp.topic || '')}" 
                     placeholder="Chương / Chủ đề..." 
                     oninput="onModalSpecTopicChange(\${idx}, this.value)" />
            </td>
            <td style="vertical-align:top; padding-top:8px;">
              <input type="text" class="modal-matrix-input spec-field-unit" 
                     value="\${escapeHtml(sp.unit || '')}" 
                     placeholder="Nội dung / Đơn vị kiến thức..." 
                     oninput="onModalSpecUnitChange(\${idx}, this.value)" />
            </td>
            <td style="vertical-align:top;">
              \${outcomesInputs}
            </td>
            <td style="text-align:center; vertical-align:top; padding-top:10px;">
              \${refsBadges.join('') || '<span style="color:#94a3b8; font-size:0.78rem;">Chưa có câu</span>'}
              \${origRefs.join('')}
            </td>
            <td style="text-align:center; vertical-align:top; padding-top:10px;">
              <button class="btn btn-outline btn-sm" onclick="deleteModalSpecRow(\${idx})" style="padding:2px 6px; color:#ef4444; border-color:#fca5a5;" title="Xóa dòng này">
                🗑️
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    function onModalSpecTopicChange(idx, val) {
      if (currentModalSpecData && currentModalSpecData[idx]) {
        currentModalSpecData[idx].topic = val;
      }
    }

    function onModalSpecUnitChange(idx, val) {
      if (currentModalSpecData && currentModalSpecData[idx]) {
        currentModalSpecData[idx].unit = val;
      }
    }

    function onModalSpecOutcomeChange(idx, lv, val) {
      if (currentModalSpecData && currentModalSpecData[idx]) {
        if (!currentModalSpecData[idx].outcomes) currentModalSpecData[idx].outcomes = {};
        currentModalSpecData[idx].outcomes[lv] = val;
      }
    }

    function syncModalSpecFromMatrix() {
      if (!currentModalMatrixData || !Array.isArray(currentModalMatrixData.rows)) return;
      const prevOutcomesMap = new Map();
      (currentModalSpecData || []).forEach(sp => {
        if (sp.unit) prevOutcomesMap.set(sp.unit.trim().toLowerCase(), sp.outcomes || {});
      });

      currentModalSpecData = currentModalMatrixData.rows.map((r, i) => {
        const uKey = (r.unit || '').trim().toLowerCase();
        const existingOutcomes = prevOutcomesMap.get(uKey);

        return {
          rowId: 'row_' + (i + 1),
          topic: r.topic || '',
          unit: r.unit || '',
          outcomes: existingOutcomes || {
            'Biết': 'Nhận biết các khái niệm, thành phần, cấu trúc và đặc trưng cơ bản.',
            'Hiểu': 'Hiểu nguyên lí, cơ chế vận hành, ưu nhược điểm và phương thức ứng dụng.',
            'Vận dụng': 'Vận dụng giải quyết bài toán, cấu hình thiết bị, xử lí tình huống thực tiễn.'
          },
          questionRefs: r.cellRefs || {}
        };
      });

      const specBadge = document.getElementById('modal-spec-count-badge');
      if (specBadge) specBadge.textContent = \`\${currentModalSpecData.length} bài\`;

      renderModalSpecTable();
      showToast('Đã đồng bộ Bản đặc tả khớp 100% với các dòng trong Bảng Ma trận!', 'success');
    }

    function addModalSpecRow() {
      if (!currentModalSpecData) currentModalSpecData = [];
      const newIdx = currentModalSpecData.length + 1;
      currentModalSpecData.push({
        rowId: 'row_' + newIdx,
        topic: 'Chủ đề mới',
        unit: 'Bài mới',
        outcomes: {
          'Biết': 'Nhận biết kiến thức cốt lõi...',
          'Hiểu': 'Hiểu nguyên lí và mối liên hệ...',
          'Vận dụng': 'Vận dụng giải quyết bài toán thực tế...'
        },
        questionRefs: {}
      });

      const specBadge = document.getElementById('modal-spec-count-badge');
      if (specBadge) specBadge.textContent = \`\${currentModalSpecData.length} bài\`;

      renderModalSpecTable();
      showToast('Đã thêm 1 bài mới vào Bản đặc tả!', 'info');
    }

    function deleteModalSpecRow(idx) {
      if (!currentModalSpecData || currentModalSpecData.length <= 1) {
        showToast('Bản đặc tả phải có ít nhất 1 bài học!', 'warning');
        return;
      }
      currentModalSpecData.splice(idx, 1);
      const specBadge = document.getElementById('modal-spec-count-badge');
      if (specBadge) specBadge.textContent = \`\${currentModalSpecData.length} bài\`;
      renderModalSpecTable();
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
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#eff6ff;"><input type="number" min="0" max="30" class="modal-matrix-num-input has-val-mcq" data-qt="MCQ" data-lv="Biết" value="1" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#eff6ff;"><input type="number" min="0" max="30" class="modal-matrix-num-input has-val-mcq" data-qt="MCQ" data-lv="Hiểu" value="1" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#eff6ff;"><input type="number" min="0" max="30" class="modal-matrix-num-input is-zero" data-qt="MCQ" data-lv="Vận dụng" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#faf5ff;"><input type="number" min="0" max="16" class="modal-matrix-num-input is-zero" data-qt="TF" data-lv="Biết" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#faf5ff;"><input type="number" min="0" max="16" class="modal-matrix-num-input is-zero" data-qt="TF" data-lv="Hiểu" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#faf5ff;"><input type="number" min="0" max="16" class="modal-matrix-num-input is-zero" data-qt="TF" data-lv="Vận dụng" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#fffbeb;"><input type="number" min="0" max="10" class="modal-matrix-num-input is-zero" data-qt="SA" data-lv="Biết" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#fffbeb;"><input type="number" min="0" max="10" class="modal-matrix-num-input is-zero" data-qt="SA" data-lv="Hiểu" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#fffbeb;"><input type="number" min="0" max="10" class="modal-matrix-num-input is-zero" data-qt="SA" data-lv="Vận dụng" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#f0fdf4;"><input type="number" min="0" max="5" class="modal-matrix-num-input is-zero" data-qt="ESSAY" data-lv="Biết" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#f0fdf4;"><input type="number" min="0" max="5" class="modal-matrix-num-input is-zero" data-qt="ESSAY" data-lv="Hiểu" value="0" oninput="onModalCellInput(this)" /></td>
        <td style="text-align:center; padding:3px 1px; vertical-align:middle; background:#f0fdf4;"><input type="number" min="0" max="5" class="modal-matrix-num-input is-zero" data-qt="ESSAY" data-lv="Vận dụng" value="0" oninput="onModalCellInput(this)" /></td>
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

      // Lưu lại Trang 2: Bản đặc tả
      if (Array.isArray(currentModalSpecData) && currentModalSpecData.length > 0) {
        appState.specification = JSON.parse(JSON.stringify(currentModalSpecData));
        appState.detectedSpec = JSON.parse(JSON.stringify(currentModalSpecData));
      }

      // Đồng bộ đơn vị kiến thức (Units)
      appState.units = newRows.map((r, i) => {
        const specItem = (currentModalSpecData || [])[i];
        return {
          id: 'u_' + (i + 1),
          topic: r.topic,
          name: r.unit,
          reqs: specItem?.outcomes || {
            'Biết': 'Nhận biết các khái niệm, thành phần và quy chuẩn cơ bản.',
            'Hiểu': 'Hiểu nguyên lí, cơ chế vận hành và phương thức tương tác.',
            'Vận dụng': 'Vận dụng kiến thức giải quyết vấn đề thực tế, cấu hình và xử lí tình huống.'
          }
        };
      });

      renderUnitsTable();
      renderDetectedMatrixPreview(appState.uploadedDocs?.[0]?.fileName || 'TIN 12 - MA TRAN KTGK 1.docx', appState.matrix);
      renderMatrixTable();
      renderSpecTable();

      closeModal('modalMatrixFullscreen');
      showToast('Đang cập nhật đề kiểm tra từ Ngân hàng Google Drive theo Ma trận & Bản đặc tả mới...', 'info');

      await runStep4GenerateExam();
      showToast('✅ Đã lưu thành công Bảng Ma trận và Bản đặc tả đề kiểm tra!', 'success');
    }\n\n`;

content = content.substring(0, startIdx) + newModalJsBlock + content.substring(endIdx);

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('Successfully updated index.html with Modal Specification pagination functions.');

