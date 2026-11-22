const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Cập nhật cuối hàm syncOmrAnswerKeys() để cập nhật summary pill
const targetSyncEnd = `      appState.omr.answerKeysByCode = keys;
    }`;

const newSyncEnd = `      appState.omr.answerKeysByCode = keys;

      const summaryCodesEl = document.getElementById('omr-summary-codes');
      if (summaryCodesEl) {
        const codes = Object.keys(keys);
        summaryCodesEl.textContent = \`\${codes.length} Mã đề: \${codes.join(', ')}\`;
      }

      const summaryPtsEl = document.getElementById('omr-summary-pts');
      if (summaryPtsEl) {
        const p1Rule = appState.omr.pointRules?.mcq || 0.25;
        const firstCode = Object.keys(keys)[0];
        const p1Len = firstCode ? (keys[firstCode]?.part1 || []).length : 24;
        const p1Total = Math.round(p1Len * p1Rule * 100) / 100;
        const p2Total = 4.0;
        const grandTotal = Math.round((p1Total + p2Total) * 100) / 100;
        summaryPtsEl.textContent = \`\${grandTotal.toFixed(1)}đ (\${p1Len}c TN + 4c Đ/S)\`;
      }
    }`;

if (html.includes(targetSyncEnd)) {
  html = html.replace(targetSyncEnd, newSyncEnd);
  console.log('1. Updated syncOmrAnswerKeys with summary pill OK');
} else {
  console.error('1. Could not find targetSyncEnd');
}

// 2. Thêm các hàm filter, drawer, và cập nhật renderOmrPapersTable()
const targetTableFunc = `    /**
     * Hiển thị bảng danh sách bài làm học sinh (cột trái)
     */
    function renderOmrPapersTable() {
      const tbody = document.getElementById('omr-papers-list-tbody');
      if (!tbody) return;

      const papers = appState.omr.gradedPapers || [];
      if (papers.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="4" style="text-align:center; padding:32px 14px; color:#475569;">
              <div style="font-size:2rem; margin-bottom:8px;">📁</div>
              <strong style="color:#0f172a; font-size:0.92rem; display:block; margin-bottom:4px;">Chưa có bài thi nào được nạp</strong>
              <div style="font-size:0.78rem; color:#64748b; margin-bottom:12px;">
                Tải lên ảnh scan của học sinh hoặc nạp bài làm mẫu theo Đề thi Bước 4 để bắt đầu chấm.
              </div>
              <div style="display:flex; justify-content:center; gap:8px;">
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('omr-custom-scans-input').click()" style="font-size:0.75rem;">
                  📄 Chọn nhiều file
                </button>
                <button class="btn btn-outline btn-sm" onclick="document.getElementById('omr-folder-scans-input').click()" style="font-size:0.75rem; background:#f0fdf4; border-color:#86efac; color:#166534;">
                  📂 Chọn Thư mục scan
                </button>
                <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(true)" style="font-size:0.75rem; background:#2563eb;">
                  🎯 Chấm bài thi mẫu chuẩn
                </button>
              </div>
            </td>
          </tr>
        \`;
        return;
      }

      tbody.innerHTML = papers.map(p => {
        const isActive = p.id === appState.omr.activePaperId;
        const score = typeof p.result?.totalScore === 'number' ? p.result.totalScore.toFixed(2) : '0.00';
        
        let statusHtml = '<span style="color:#334155;">Đã chấm</span>';
        if (p.isCorrected) {
          statusHtml = '<span class="badge" style="background:#e0e7ff; color:#3730a3; font-weight:600; padding:2px 6px; border-radius:4px; font-size:0.75rem;">Đã sửa thủ công</span>';
        } else if (p.warnings && p.warnings.length > 0) {
          statusHtml = '<span class="badge" style="background:#fef08a; color:#854d0e; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.75rem;">Cần kiểm tra</span>';
        }

        const rowStyle = isActive
          ? 'background:#0284c7; color:#ffffff; font-weight:700; cursor:pointer;'
          : 'cursor:pointer; border-bottom:1px solid #f1f5f9;';

        const textStyle = isActive ? 'color:#ffffff;' : 'color:#0f172a;';
        const sbdStyle = isActive ? 'color:#e0f2fe;' : 'color:#64748b;';

        return \`
          <tr style="\${rowStyle}" onclick="selectOmrPaper('\${p.id}')">
            <td style="padding:6px 4px; \${textStyle}">\${p.scannedExamCode || '---'}</td>
            <td style="padding:6px 4px; text-align:right; \${textStyle}">\${score}</td>
            <td style="padding:6px 4px; text-align:center;">\${statusHtml}</td>
            <td style="padding:6px 4px; font-size:0.75rem; \${sbdStyle}">\${p.sbd || 'chưa tô'}</td>
          </tr>
        \`;
      }).join('');
    }`;

const newTableFunc = `    let omrPaperFilter = 'all';
    let omrPaperSearchQuery = '';

    function toggleOmrSettingsDrawer() {
      const drawer = document.getElementById('omr-settings-drawer');
      const btn = document.getElementById('omr-btn-toggle-settings');
      if (!drawer) return;
      const isOpen = drawer.style.display !== 'none';
      drawer.style.display = isOpen ? 'none' : 'block';
      if (btn) {
        btn.style.background = isOpen ? '#fff' : '#e0f2fe';
        btn.style.color = isOpen ? '#475569' : '#0369a1';
        btn.style.borderColor = isOpen ? '#cbd5e1' : '#7dd3fc';
      }
    }

    function setOmrPaperFilter(type) {
      omrPaperFilter = type;
      ['all', 'valid', 'warning'].forEach(t => {
        const btn = document.getElementById(\`omr-filter-btn-\${t}\`);
        if (btn) {
          if (t === type) {
            btn.style.background = '#e2e8f0';
            btn.style.fontWeight = '700';
            btn.style.color = '#1e293b';
          } else {
            btn.style.background = 'transparent';
            btn.style.fontWeight = '600';
            btn.style.color = t === 'valid' ? '#15803d' : (t === 'warning' ? '#b45309' : '#64748b');
          }
        }
      });
      renderOmrPapersTable();
    }

    function onOmrSearchPaper(query) {
      omrPaperSearchQuery = (query || '').trim().toLowerCase();
      renderOmrPapersTable();
    }

    /**
     * Hiển thị bảng danh sách bài làm học sinh (cột trái) - Thiết kế Pro Studio
     */
    function renderOmrPapersTable() {
      const tbody = document.getElementById('omr-papers-list-tbody');
      if (!tbody) return;

      const allPapers = appState.omr.gradedPapers || [];
      
      // Cập nhật bộ đếm trên thanh Filter
      const validCount = allPapers.filter(p => !p.warnings || p.warnings.length === 0).length;
      const warningCount = allPapers.filter(p => p.warnings && p.warnings.length > 0).length;

      const cntAll = document.getElementById('omr-cnt-all');
      const cntValid = document.getElementById('omr-cnt-valid');
      const cntWarning = document.getElementById('omr-cnt-warning');
      if (cntAll) cntAll.textContent = allPapers.length;
      if (cntValid) cntValid.textContent = validCount;
      if (cntWarning) cntWarning.textContent = warningCount;

      if (allPapers.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="4" style="text-align:center; padding:36px 14px; color:#475569;">
              <div style="font-size:2.2rem; margin-bottom:6px;">📁</div>
              <strong style="color:#0f172a; font-size:0.90rem; display:block; margin-bottom:4px;">Chưa có bài thi nào được nạp</strong>
              <div style="font-size:0.75rem; color:#64748b; margin-bottom:12px; max-width:280px; margin-left:auto; margin-right:auto;">
                Kéo thả thư mục scan của cả lớp vào ô phía trên hoặc nhấn nút bên dưới để thử nghiệm nhanh:
              </div>
              <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(true)" style="font-size:0.76rem; font-weight:700; background:#2563eb; padding:5px 14px; border-radius:20px;">
                🎯 Chấm thử 35 bài làm mẫu chuẩn
              </button>
            </td>
          </tr>
        \`;
        return;
      }

      // Lọc danh sách theo Tab Filter và Ô Search
      let filtered = allPapers;
      if (omrPaperFilter === 'valid') {
        filtered = filtered.filter(p => !p.warnings || p.warnings.length === 0);
      } else if (omrPaperFilter === 'warning') {
        filtered = filtered.filter(p => p.warnings && p.warnings.length > 0);
      }

      if (omrPaperSearchQuery) {
        filtered = filtered.filter(p => {
          const sbd = String(p.sbd || '').toLowerCase();
          const name = String(p.studentName || '').toLowerCase();
          const code = String(p.scannedExamCode || '').toLowerCase();
          return sbd.includes(omrPaperSearchQuery) || name.includes(omrPaperSearchQuery) || code.includes(omrPaperSearchQuery);
        });
      }

      if (filtered.length === 0) {
        tbody.innerHTML = \`
          <tr>
            <td colspan="4" style="text-align:center; padding:24px 10px; color:#64748b; font-size:0.78rem;">
              Không tìm thấy bài thi nào phù hợp với bộ lọc.
            </td>
          </tr>
        \`;
        return;
      }

      tbody.innerHTML = filtered.map(p => {
        const isActive = p.id === appState.omr.activePaperId;
        const numScore = typeof p.result?.totalScore === 'number' ? p.result.totalScore : 0;
        const scoreStr = numScore.toFixed(2);

        let statusHtml = '<span class="badge" style="background:#f1f5f9; color:#475569; font-weight:600; padding:2px 6px; border-radius:4px; font-size:0.72rem;">Đã chấm</span>';
        if (p.isCorrected) {
          statusHtml = '<span class="badge" style="background:#e0e7ff; color:#3730a3; font-weight:600; padding:2px 6px; border-radius:4px; font-size:0.72rem;">Đã sửa thủ công</span>';
        } else if (p.warnings && p.warnings.length > 0) {
          statusHtml = '<span class="badge" style="background:#fef08a; color:#854d0e; font-weight:700; padding:2px 6px; border-radius:4px; font-size:0.72rem;">Cần kiểm tra</span>';
        }

        const scoreColor = numScore >= 8.0 ? '#15803d' : (numScore >= 5.0 ? '#0284c7' : '#dc2626');

        const rowStyle = isActive
          ? 'background:#eff6ff; border-left:3px solid #2563eb; cursor:pointer; box-shadow:inset 0 0 0 1px #bfdbfe;'
          : 'cursor:pointer; border-bottom:1px solid #f1f5f9; transition:background 0.12s ease;';

        return \`
          <tr style="\${rowStyle}" onclick="selectOmrPaper('\${p.id}')">
            <td style="padding:6px 6px;">
              <span style="font-family:monospace; font-weight:700; font-size:0.75rem; background:#f1f5f9; color:#1e293b; padding:2px 6px; border-radius:4px; border:1px solid #e2e8f0;">
                \${p.scannedExamCode || '---'}
              </span>
            </td>
            <td style="padding:6px 6px; text-align:right;">
              <span style="font-weight:800; font-size:0.86rem; color:\${scoreColor};">
                \${scoreStr}
              </span>
            </td>
            <td style="padding:6px 4px; text-align:center;">\${statusHtml}</td>
            <td style="padding:6px 6px; font-size:0.75rem;">
              <div style="font-weight:700; color:#0f172a; line-height:1.2;">\${p.sbd || 'Chưa tô'}</div>
              <div style="font-size:0.69rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;">\${p.studentName || ''}</div>
            </td>
          </tr>
        \`;
      }).join('');
    }`;

if (html.includes(targetTableFunc)) {
  html = html.replace(targetTableFunc, newTableFunc);
  console.log('2. Updated renderOmrPapersTable and filters OK');
} else {
  console.error('2. Could not find targetTableFunc');
}

fs.writeFileSync('index.html', html, 'utf8');

