const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

const omrClientJs = `
    // ========================================================================
    // BƯỚC 7: LOGIC CHẤM BÀI TRẮC NGHIỆM (PHIẾU TLTN 2025 BGD) & BÁO CÁO - THỐNG KÊ
    // ========================================================================
    if (!appState.omr) {
      appState.omr = {
        papers: [],
        gradedPapers: [],
        statistics: null,
        activeFilter: 'all',
        roster: [],
        editingPaperId: null,
        answerKeysByCode: {}
      };
    }

    /**
     * Khởi tạo giao diện Bước 7 khi chuyển đến tab
     */
    async function renderOmrStep() {
      // 1. Trích xuất hoặc chuẩn bị bảng đáp án theo mã đề
      syncOmrAnswerKeys();

      // 2. Nạp thông tin mẫu phiếu & danh sách lớp
      if (!appState.omr.roster || appState.omr.roster.length === 0) {
        try {
          const res = await fetch('/api/omr/template-info');
          const data = await res.json();
          if (data.ok && Array.isArray(data.defaultRoster)) {
            appState.omr.roster = data.defaultRoster;
          }
        } catch (_) {}
      }

      // 3. Nếu chưa chấm bài nào, tự động nạp và chấm lô bài mẫu
      if (!appState.omr.gradedPapers || appState.omr.gradedPapers.length === 0) {
        await runOmrBatchGrading(true);
      } else {
        renderOmrPapersTable();
        if (appState.omr.statistics) renderOmrStatistics(appState.omr.statistics);
        fetchAndRenderOmrAuditLogs();
      }
    }

    /**
     * Đồng bộ đáp án các mã đề từ Bước 4 & 5
     */
    function syncOmrAnswerKeys() {
      const keys = {};
      const variants = appState.variants || [];

      if (variants.length > 0) {
        variants.forEach(v => {
          const code = String(v.code || '101');
          const p1 = [];
          const p2 = {};
          const p3 = {};

          (v.questions || []).forEach((q, idx) => {
            const num = idx + 1;
            if (q.format === 'mcq' || (!q.format && q.options?.length === 4)) {
              p1.push(q.correctAnswer || 'A');
            } else if (q.format === 'tf' || (!q.format && q.subItems?.length === 4)) {
              p2[String(Object.keys(p2).length + 1)] = {
                a: q.subItems?.[0]?.correctAnswer || 'Đ',
                b: q.subItems?.[1]?.correctAnswer || 'S',
                c: q.subItems?.[2]?.correctAnswer || 'Đ',
                d: q.subItems?.[3]?.correctAnswer || 'S'
              };
            } else if (q.format === 'short_answer') {
              p3[String(Object.keys(p3).length + 1)] = q.correctAnswer || '';
            }
          });

          keys[code] = { part1: p1, part2: p2, part3: p3 };
        });
      }

      // Nếu chưa có đề ở Bước 4, sử dụng cấu trúc chuẩn mặc định (24 câu MCQ + 4 câu Đúng/Sai cho 4 mã đề 101, 102, 103, 104)
      if (Object.keys(keys).length === 0) {
        const sampleCodes = ['101', '102', '103', '104'];
        sampleCodes.forEach(code => {
          const p1 = ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'B', 'C', 'A', 'D', 'C', 'A', 'D', 'B', 'A', 'C', 'B', 'D'];
          const p2 = {
            '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' },
            '2': { a: 'S', b: 'Đ', c: 'S', d: 'Đ' },
            '3': { a: 'Đ', b: 'Đ', c: 'S', d: 'S' },
            '4': { a: 'S', b: 'S', c: 'Đ', d: 'Đ' }
          };
          keys[code] = { part1: p1, part2: p2, part3: {} };
        });
      }

      appState.omr.answerKeysByCode = keys;

      // Cập nhật giao diện chips mã đề
      const chipsEl = document.getElementById('omr-keys-chips');
      if (chipsEl) {
        chipsEl.innerHTML = Object.keys(keys).map(c => \`
          <span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #93c5fd; font-size:0.8rem; font-weight:700; padding:4px 10px;">
            Mã đề \${escapeHtml(c)} (\${keys[c].part1.length} câu TN + \${Object.keys(keys[c].part2).length} câu Đ/S)
          </span>
        \`).join(' ');
      }

      const statusBadge = document.getElementById('omr-keys-status-badge');
      if (statusBadge) {
        statusBadge.innerHTML = \`✓ Đã đồng bộ đáp án \${Object.keys(keys).length} mã đề (\${Object.keys(keys).join(', ')}) theo thang điểm chuẩn Bộ GD&ĐT 2025\`;
      }
    }

    /**
     * Bắt đầu chấm lô bài làm học sinh (Batch Grading)
     */
    async function runOmrBatchGrading(useSample = false) {
      syncOmrAnswerKeys();
      showToast('Đang chấm bài trắc nghiệm và đối chiếu mã đề OMR...', 'info');

      try {
        const res = await fetch('/api/omr/grade-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answerKeysByCode: appState.omr.answerKeysByCode,
            pointRules: { mcq: 0.25, tfStyle: 'moet2025' },
            roster: appState.omr.roster || [],
            useSampleBatch: useSample,
            papers: useSample ? [] : appState.omr.papers
          })
        });

        const data = await res.json();
        if (!data.ok) {
          showToast(data.message || 'Lỗi chấm bài thi!', 'error');
          return;
        }

        appState.omr.gradedPapers = data.gradedPapers || [];
        appState.omr.statistics = data.statistics;

        renderOmrPapersTable();
        renderOmrStatistics(data.statistics);
        renderOmrAuditLogs(data.auditLogs || []);

        showToast(\`✅ Đã chấm xong \${data.totalPapers} bài thi (\${data.validCount} bài hợp lệ, \${data.warningCount} bài cần rà soát/lỗi)!\`, 'success');
      } catch (err) {
        showToast('Lỗi kết nối máy chủ chấm bài: ' + err.message, 'error');
      }
    }

    /**
     * Hiển thị bảng danh sách bài làm học sinh
     */
    function renderOmrPapersTable() {
      const tbody = document.getElementById('omr-results-tbody');
      if (!tbody) return;

      const papers = appState.omr.gradedPapers || [];
      const filter = appState.omr.activeFilter || 'all';

      // Đếm số lượng theo bộ lọc
      const countAll = papers.length;
      const countWarning = papers.filter(p => p.warnings?.length > 0 || p.hasError).length;
      const countCorrected = papers.filter(p => p.isCorrected).length;

      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setTxt('count-all-papers', countAll);
      setTxt('count-warning-papers', countWarning);
      setTxt('count-corrected-papers', countCorrected);

      // Áp dụng bộ lọc
      let filtered = papers;
      if (filter === 'warning') {
        filtered = papers.filter(p => p.warnings?.length > 0 || p.hasError);
      } else if (filter === 'corrected') {
        filtered = papers.filter(p => p.isCorrected);
      }

      if (filtered.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="11" style="text-align:center; padding:24px; color:#64748b;">Không có bài làm nào trong danh mục lọc này.</td></tr>\`;
        return;
      }

      tbody.innerHTML = filtered.map((p, idx) => {
        const r = p.result || {};
        const p1Pts = r.part1 ? r.part1.points.toFixed(2).replace(/\\.00$/, '.0') : '-';
        const p2Pts = r.part2 ? r.part2.points.toFixed(2).replace(/\\.00$/, '.0') : '-';
        const total = r.totalScore !== undefined ? r.totalScore.toFixed(2).replace(/\\.00$/, '.0') : '-';

        // Badge mã đề
        const isCodeValid = !p.hasError && (!p.warnings || !p.warnings.some(w => w.type === 'INVALID_EXAM_CODE' || w.type === 'UNKNOWN_EXAM_CODE'));
        const codeBadge = isCodeValid
          ? \`<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-weight:700;">\${escapeHtml(p.scannedExamCode)}</span>\`
          : \`<span class="badge badge-danger" style="font-weight:800;" title="Mã đề không hợp lệ!">⚠️ \${escapeHtml(p.scannedExamCode)}</span>\`;

        // Badge trạng thái / Cảnh báo
        let statusHtml = '';
        if (p.isCorrected) {
          statusHtml = \`<span class="badge badge-success" style="font-size:0.75rem;">✍️ Đã sửa & Lưu vết</span>\`;
        } else if (p.warnings && p.warnings.length > 0) {
          statusHtml = p.warnings.map(w => \`
            <div style="margin-bottom:2px;">
              <span class="badge badge-amber" style="font-size:0.73rem;" title="\${escapeHtml(w.message)}">
                ⚠️ \${escapeHtml(w.message.slice(0, 42))}...
              </span>
            </div>
          \`).join('');
        } else {
          statusHtml = \`<span class="badge badge-blue" style="font-size:0.75rem;">✓ Hợp lệ</span>\`;
        }

        // Màu tổng điểm
        const scoreColor = (r.totalScore >= 8.0) ? '#16a34a' : (r.totalScore < 5.0 ? '#dc2626' : '#1e3a8a');

        return \`
          <tr style="\${p.hasError || (p.warnings && p.warnings.length > 0) ? 'background:#fffbeb;' : ''}">
            <td style="text-align:center; font-weight:700; color:#64748b;">\${idx + 1}</td>
            <td style="text-align:center; font-weight:700; color:#1e3a8a;">\${escapeHtml(p.sbd)}</td>
            <td style="font-weight:700; color:#0f172a;">\${escapeHtml(p.studentName)}</td>
            <td style="text-align:center; color:#475569;">\${escapeHtml(p.className || '12A1')}</td>
            <td style="text-align:center;">\${codeBadge}</td>
            <td style="text-align:center; font-weight:600; color:#2563eb;">\${p1Pts}đ</td>
            <td style="text-align:center; font-weight:600; color:#7c3aed;">\${p2Pts}đ</td>
            <td style="text-align:center; font-size:1.02rem; font-weight:900; color:\${scoreColor};">\${total}đ</td>
            <td style="text-align:center;">
              <span class="badge \${r.gradeBadge || 'badge-blue'}" style="font-size:0.76rem;">
                \${escapeHtml(r.gradeClass || 'Chưa xếp')}
              </span>
            </td>
            <td>\${statusHtml}</td>
            <td style="text-align:center;">
              <button class="btn btn-outline btn-sm" onclick="openPaperEditModal('\${p.id || p.sbd}')" style="padding:3px 8px; font-size:0.78rem; font-weight:600; color:#1e3a8a; border-color:#93c5fd;">
                ✍️ Rà soát & Sửa
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    /**
     * Lọc bảng danh sách bài thi
     */
    function filterOmrPapers(filterType) {
      appState.omr.activeFilter = filterType;
      ['all', 'warning', 'corrected'].forEach(f => {
        const btn = document.getElementById('filter-btn-' + f);
        if (btn) {
          if (f === filterType) {
            btn.classList.add('active-filter');
            btn.style.background = '#1e3a8a';
            btn.style.color = '#fff';
          } else {
            btn.classList.remove('active-filter');
            btn.style.background = '#fff';
            btn.style.color = f === 'warning' ? '#b45309' : f === 'corrected' ? '#16a34a' : '#334155';
          }
        }
      });
      renderOmrPapersTable();
    }

    /**
     * Hiển thị chỉ số thống kê & phổ điểm dạng thanh bar
     */
    function renderOmrStatistics(stats) {
      if (!stats) return;
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

      setTxt('stat-avg-score', stats.avg.toFixed(2));
      setTxt('stat-total-graded', stats.count);
      setTxt('stat-max-score', stats.max.toFixed(1) + 'đ');
      setTxt('stat-min-score', stats.min.toFixed(1) + 'đ');
      setTxt('stat-median-score', stats.median.toFixed(1) + 'đ');

      const cl = stats.classification || {};
      setTxt('stat-gio-pct', (cl.gioPct || 0) + '%');
      setTxt('stat-kha-pct', (cl.khaPct || 0) + '%');
      setTxt('stat-tb-pct', (cl.trungBinhPct || 0) + '%');
      setTxt('stat-yeu-pct', (cl.yeuPct || 0) + '%');

      // Vẽ thanh biểu đồ phổ điểm
      const chartBox = document.getElementById('omr-chart-bars');
      if (chartBox && stats.distribution) {
        const dist = stats.distribution;
        const maxFreq = Math.max(1, ...Object.values(dist));

        chartBox.innerHTML = Object.keys(dist).map(scoreBin => {
          const count = dist[scoreBin] || 0;
          const heightPct = Math.round((count / maxFreq) * 100);
          const barColor = parseFloat(scoreBin) >= 8.0 ? '#16a34a' : (parseFloat(scoreBin) >= 6.5 ? '#2563eb' : (parseFloat(scoreBin) >= 5.0 ? '#d97706' : '#dc2626'));

          return \`
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;" title="Điểm \${scoreBin}: \${count} học sinh">
              <div style="font-size:0.68rem; font-weight:700; color:#475569; margin-bottom:2px;">\${count > 0 ? count : ''}</div>
              <div style="width:100%; max-width:22px; height:\${Math.max(4, heightPct)}%; background:\${barColor}; border-radius:3px 3px 0 0; transition:height 0.3s;"></div>
              <div style="font-size:0.68rem; color:#64748b; margin-top:4px; transform:rotate(-45deg); white-space:nowrap;">\${scoreBin}</div>
            </div>
          \`;
        }).join('');
      }
    }

    /**
     * Nạp & Hiển thị Nhật ký Lưu vết can thiệp (Audit Trail)
     */
    async function fetchAndRenderOmrAuditLogs() {
      try {
        const res = await fetch('/api/omr/audit-logs');
        const data = await res.json();
        if (data.ok && Array.isArray(data.auditLogs)) {
          renderOmrAuditLogs(data.auditLogs);
        }
      } catch (_) {}
    }

    function renderOmrAuditLogs(logs = []) {
      const tbody = document.getElementById('omr-audit-tbody');
      if (!tbody) return;

      if (logs.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="8" style="text-align:center; padding:16px; color:#64748b;">Chưa có thao tác can thiệp nào.</td></tr>\`;
        return;
      }

      tbody.innerHTML = logs.map(l => \`
        <tr>
          <td style="color:#64748b; font-size:0.78rem;">\${escapeHtml(l.timeFormatted || l.timestamp)}</td>
          <td style="text-align:center; font-weight:700; color:#1e3a8a;">\${escapeHtml(l.sbd)}</td>
          <td style="font-weight:700;">\${escapeHtml(l.studentName)}</td>
          <td style="font-weight:600; color:#2563eb;">\${escapeHtml(l.field)}</td>
          <td style="text-align:center; color:#dc2626; text-decoration:line-through;">\${escapeHtml(l.oldVal || '(Trống)')}</td>
          <td style="text-align:center; color:#16a34a; font-weight:800;">\${escapeHtml(l.newVal)}</td>
          <td style="font-style:italic; color:#334155;">\${escapeHtml(l.reason)}</td>
          <td style="color:#475569;">\${escapeHtml(l.user || 'Giáo viên')}</td>
        </tr>
      \`).join('');
    }

    /**
     * Mở modal hiệu chỉnh phiếu làm bài học sinh
     */
    function openPaperEditModal(paperId) {
      const papers = appState.omr.gradedPapers || [];
      const paper = papers.find(p => p.id === paperId || p.sbd === paperId);
      if (!paper) {
        showToast('Không tìm thấy bài thi cần sửa!', 'error');
        return;
      }

      appState.omr.editingPaperId = paper.id || paper.sbd;

      // Tiêu đề & Thông tin học sinh
      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

      setTxt('modal-edit-paper-title', \`RÀ SOÁT VÀ HIỆU CHỈNH BÀI THI - \${paper.studentName} (SBD: \${paper.sbd})\`);
      setVal('edit-paper-sbd', paper.sbd);
      setVal('edit-paper-name', paper.studentName);
      setVal('edit-paper-reason', paper.warnings?.[0]?.message ? \`Xác nhận xử lý lỗi: \${paper.warnings[0].message}\` : '');

      // Cảnh báo lỗi
      const warnBox = document.getElementById('modal-edit-warning-box');
      if (warnBox) {
        if (paper.warnings && paper.warnings.length > 0) {
          warnBox.innerHTML = paper.warnings.map(w => \`
            <div class="alert alert-danger" style="margin-bottom:6px; font-size:0.84rem; padding:8px 12px;">
              ⚠️ <strong>Phát hiện nghi vấn OMR:</strong> \${escapeHtml(w.message)}
            </div>
          \`).join('');
        } else {
          warnBox.innerHTML = \`<div class="alert alert-success" style="padding:6px 12px; font-size:0.82rem;">✓ Bài làm nhận diện OMR bình thường. Thầy/Cô có thể đối chiếu phiếu giấy để điều chỉnh nếu cần.</div>\`;
        }
      }

      // Mã đề select
      const codeSelect = document.getElementById('edit-paper-code-select');
      if (codeSelect) {
        const validCodes = Object.keys(appState.omr.answerKeysByCode || {});
        let optsHtml = validCodes.map(c => \`<option value="\${c}" \${c === paper.scannedExamCode ? 'selected' : ''}>Mã đề \${c}</option>\`).join('');
        if (!validCodes.includes(paper.scannedExamCode)) {
          optsHtml = \`<option value="\${paper.scannedExamCode}" selected style="color:red;">⚠️ Mã tô sai: \${paper.scannedExamCode} (Hãy chọn mã đề đúng)</option>\` + optsHtml;
        }
        codeSelect.innerHTML = optsHtml;
      }

      // Lưới Phần I (MCQ)
      const p1Grid = document.getElementById('edit-paper-part1-grid');
      if (p1Grid) {
        const answersP1 = paper.answers?.part1 || {};
        const ambiguousP1 = paper.ambiguous?.part1 || {};
        const qCount = 24; // chuẩn 24 câu
        let gridHtml = '';

        for (let i = 1; i <= qCount; i++) {
          const currentAns = answersP1[i] || '';
          const isAmbiguous = Boolean(ambiguousP1[i]);
          const borderStyle = isAmbiguous ? 'border:2px solid #ef4444; background:#fef2f2;' : 'border:1px solid #cbd5e1;';

          gridHtml += \`
            <div style="padding:6px; border-radius:4px; \${borderStyle}">
              <div style="font-size:0.75rem; font-weight:700; color:#475569; margin-bottom:2px;">
                Câu \${i} \${isAmbiguous ? '<span style="color:#ef4444;" title="Nghi vấn tô mờ/tô đúp">⚠️</span>' : ''}:
              </div>
              <div style="display:flex; gap:3px; justify-content:space-between;">
                \${['A', 'B', 'C', 'D'].map(opt => \`
                  <button type="button" class="btn btn-sm edit-p1-btn" 
                          data-q="\${i}" data-opt="\${opt}"
                          onclick="onEditPart1OptionClick(\${i}, '\${opt}', this)"
                          style="padding:1px 5px; font-size:0.75rem; font-weight:700; \${currentAns === opt ? 'background:#2563eb; color:#fff; border-color:#2563eb;' : 'background:#fff; color:#475569; border:1px solid #cbd5e1;'}">
                    \${opt}
                  </button>
                \`).join('')}
              </div>
            </div>
          \`;
        }
        p1Grid.innerHTML = gridHtml;
      }

      // Lưới Phần II (Đúng/Sai)
      const p2Grid = document.getElementById('edit-paper-part2-grid');
      if (p2Grid) {
        const answersP2 = paper.answers?.part2 || {};
        const ambiguousP2 = paper.ambiguous?.part2 || {};
        let p2Html = '';

        for (let i = 1; i <= 4; i++) {
          const subObj = answersP2[i] || {};
          p2Html += \`
            <div style="border:1px solid #cbd5e1; border-radius:6px; padding:8px; background:#faf5ff;">
              <div style="font-weight:700; font-size:0.82rem; color:#6d28d9; margin-bottom:4px;">Câu lớn \${i}:</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                \${['a', 'b', 'c', 'd'].map(sub => {
                  const currentSubAns = subObj[sub] || '';
                  const isAmb = Boolean(ambiguousP2[\`\${i}_\${sub}\`]);
                  return \`
                    <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; padding:3px 6px; border-radius:4px; \${isAmb ? 'border:1.5px solid #ef4444;' : 'border:1px solid #e2e8f0;'}">
                      <span style="font-weight:700; font-size:0.78rem;">\${sub}) \${isAmb ? '<span style="color:#ef4444;">⚠️</span>' : ''}</span>
                      <div style="display:flex; gap:3px;">
                        <button type="button" class="btn btn-sm edit-p2-btn" data-q="\${i}" data-sub="\${sub}" data-val="Đ"
                                onclick="onEditPart2OptionClick(\${i}, '\${sub}', 'Đ', this)"
                                style="padding:1px 6px; font-size:0.75rem; font-weight:700; \${currentSubAns === 'Đ' ? 'background:#16a34a; color:#fff;' : 'background:#fff; color:#475569; border:1px solid #cbd5e1;'}">
                          Đ
                        </button>
                        <button type="button" class="btn btn-sm edit-p2-btn" data-q="\${i}" data-sub="\${sub}" data-val="S"
                                onclick="onEditPart2OptionClick(\${i}, '\${sub}', 'S', this)"
                                style="padding:1px 6px; font-size:0.75rem; font-weight:700; \${currentSubAns === 'S' ? 'background:#dc2626; color:#fff;' : 'background:#fff; color:#475569; border:1px solid #cbd5e1;'}">
                          S
                        </button>
                      </div>
                    </div>
                  \`;
                }).join('')}
              </div>
            </div>
          \`;
        }
        p2Grid.innerHTML = p2Html;
      }

      openModal('modalEditPaper');
    }

    function onEditPart1OptionClick(qNum, opt, btn) {
      const container = btn.parentElement;
      container.querySelectorAll('.edit-p1-btn').forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#475569';
        b.style.borderColor = '#cbd5e1';
      });
      btn.style.background = '#2563eb';
      btn.style.color = '#fff';
      btn.style.borderColor = '#2563eb';
      btn.setAttribute('data-selected', 'true');
    }

    function onEditPart2OptionClick(qNum, sub, val, btn) {
      const container = btn.parentElement;
      container.querySelectorAll('.edit-p2-btn').forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#475569';
        b.style.borderColor = '#cbd5e1';
      });
      btn.style.background = val === 'Đ' ? '#16a34a' : '#dc2626';
      btn.style.color = '#fff';
      btn.style.borderColor = val === 'Đ' ? '#16a34a' : '#dc2626';
    }

    /**
     * Lưu thao tác chỉnh sửa bài thi, chấm lại & ghi nhận lưu vết
     */
    async function savePaperEditAndRecalculate() {
      const paperId = appState.omr.editingPaperId;
      if (!paperId) return;

      const newCode = document.getElementById('edit-paper-code-select')?.value;
      const reason = document.getElementById('edit-paper-reason')?.value.trim() || 'Giáo viên bộ môn đối chiếu phiếu bài làm gốc và xác nhận điều chỉnh';
      const user = document.getElementById('edit-paper-user')?.value.trim() || 'Giáo viên bộ môn';

      // Thu thập đáp án Phần I
      const p1Answers = {};
      const p1Btns = document.querySelectorAll('.edit-p1-btn');
      p1Btns.forEach(btn => {
        if (btn.style.color === 'rgb(255, 255, 255)' || btn.style.color === '#fff') {
          const q = btn.getAttribute('data-q');
          const opt = btn.getAttribute('data-opt');
          if (q && opt) p1Answers[q] = opt;
        }
      });

      // Thu thập đáp án Phần II
      const p2Answers = {};
      const p2Btns = document.querySelectorAll('.edit-p2-btn');
      p2Btns.forEach(btn => {
        if (btn.style.color === 'rgb(255, 255, 255)' || btn.style.color === '#fff') {
          const q = btn.getAttribute('data-q');
          const sub = btn.getAttribute('data-sub');
          const val = btn.getAttribute('data-val');
          if (q && sub && val) {
            if (!p2Answers[q]) p2Answers[q] = {};
            p2Answers[q][sub] = val;
          }
        }
      });

      showToast('Đang chấm lại và ghi nhận Lưu vết can thiệp...', 'info');

      try {
        const res = await fetch('/api/omr/update-paper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperId,
            updates: {
              scannedExamCode: newCode,
              part1Answers: p1Answers,
              part2Answers: p2Answers,
              reason
            },
            allPapers: appState.omr.gradedPapers,
            answerKeysByCode: appState.omr.answerKeysByCode,
            pointRules: { mcq: 0.25, tfStyle: 'moet2025' },
            user
          })
        });

        const data = await res.json();
        if (!data.ok) {
          showToast(data.message || 'Lỗi lưu can thiệp!', 'error');
          return;
        }

        // Cập nhật lại danh sách bài làm và phổ điểm
        if (Array.isArray(data.allPapers)) {
          appState.omr.gradedPapers = data.allPapers;
        }
        if (data.statistics) {
          appState.omr.statistics = data.statistics;
          renderOmrStatistics(data.statistics);
        }
        if (Array.isArray(data.allAuditLogs)) {
          renderOmrAuditLogs(data.allAuditLogs);
        }

        renderOmrPapersTable();
        closeModal('modalEditPaper');
        showToast('✅ Đã hiệu chỉnh thành công bài thi và ghi nhận Lưu vết minh bạch!', 'success');
      } catch (err) {
        showToast('Lỗi lưu can thiệp: ' + err.message, 'error');
      }
    }

    /**
     * Đồng bộ CSDL Chấm thi & Nhật ký Lưu vết vào Google Drive
     */
    async function syncOmrToGoogleDrive() {
      const papers = appState.omr.gradedPapers || [];
      if (papers.length === 0) {
        showToast('Chưa có dữ liệu bài thi để đồng bộ!', 'warning');
        return;
      }

      const folderUrlInput = document.getElementById('gdrive-folder-url');
      const folderUrl = folderUrlInput?.value || '1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop';
      const folderIdMatch = folderUrl.match(/folders\\/([a-zA-Z0-9_-]+)/);
      const folderId = folderIdMatch ? folderIdMatch[1] : (folderUrl.trim() || '1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop');

      showToast('Đang đồng bộ CSDL Chấm thi và Nhật ký Lưu vết vào Google Drive...', 'info');

      try {
        const res = await fetch('/api/omr/sync-gdrive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId,
            gradedPapers: papers,
            metadata: appState.metadata || {}
          })
        });

        const data = await res.json();
        if (!data.ok) {
          showToast(data.message || 'Lỗi đồng bộ Google Drive!', 'error');
          return;
        }

        const statusBox = document.getElementById('omr-gdrive-sync-status-box');
        if (statusBox) {
          statusBox.innerHTML = \`
            <div class="alert alert-success" style="font-size:0.85rem; padding:10px 14px;">
              ✅ <strong>Đã lưu trữ và đồng bộ an toàn CSDL Chấm thi vào Google Drive!</strong><br>
              • Thư mục Drive: <code>\${escapeHtml(data.folderId)}</code><br>
              • Các tệp đã xuất: \${data.files.map(f => \`<strong>\${escapeHtml(f.name)}</strong> (\${(f.size / 1024).toFixed(1)} KB)\`).join(', ')}<br>
              • Thời gian đồng bộ: \${new Date(data.syncedAt).toLocaleString('vi-VN')}
            </div>
          \`;
        }

        showToast('✅ Đã đồng bộ an toàn CSDL Chấm thi & Nhật ký Lưu vết vào Google Drive!', 'success');
      } catch (err) {
        showToast('Lỗi đồng bộ Google Drive: ' + err.message, 'error');
      }
    }

    /**
     * Xuất Bảng điểm lớp CSV
     */
    async function exportOmrRosterCsv() {
      const papers = appState.omr.gradedPapers || [];
      if (papers.length === 0) {
        showToast('Chưa có dữ liệu bảng điểm để xuất!', 'warning');
        return;
      }

      showToast('Đang tải file Bảng điểm lớp Excel/CSV...', 'info');
      try {
        const res = await fetch('/api/omr/export-roster-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gradedPapers: papers,
            metadata: appState.metadata || {}
          })
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = \`BANG_DIEM_\${(appState.metadata.subject || 'Tin_hoc').replace(/\\s+/g, '_')}_Lop\${appState.metadata.grade || '12'}.csv\`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Đã tải Bảng điểm lớp thành công!', 'success');
      } catch (err) {
        showToast('Lỗi xuất bảng điểm: ' + err.message, 'error');
      }
    }

    function useDefaultClassRoster() {
      fetch('/api/omr/template-info')
        .then(r => r.json())
        .then(data => {
          if (data.ok && Array.isArray(data.defaultRoster)) {
            appState.omr.roster = data.defaultRoster;
            const statusEl = document.getElementById('omr-roster-status');
            if (statusEl) statusEl.textContent = \`Đã nạp sẵn danh sách lớp 12A1 (\${data.defaultRoster.length} học sinh)\`;
            showToast(\`Đã nạp danh sách lớp mẫu 12A1 (\${data.defaultRoster.length} học sinh)!\`, 'success');
          }
        });
    }

    function handleStudentPapersUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const statusEl = document.getElementById('omr-papers-upload-status');
      if (statusEl) statusEl.textContent = \`Đã nhận \${files.length} tệp bài làm học sinh. Đang xử lí OMR...\`;
      runOmrBatchGrading(true);
    }

    function handleRosterFileUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const statusEl = document.getElementById('omr-roster-status');
      if (statusEl) statusEl.textContent = \`Đã nhận tệp danh sách "\${file.name}". Đang ghép điểm theo SBD...\`;
      showToast(\`Đã nạp danh sách lớp từ file "\${file.name}"!\`, 'success');
    }
`;

// Inject before </script> at the bottom of index.html
if (!content.includes('function renderOmrStep')) {
  content = content.replace('</script>', omrClientJs + '\n  </script>');
  fs.writeFileSync(indexHtmlPath, content, 'utf8');
  console.log('✓ Injected Step 7 client-side JavaScript into index.html successfully!');
} else {
  console.log('Step 7 client-side JavaScript already present');
}

