const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetPoint = '    /**\n     * Đồng bộ đáp án từ các mã đề thực tế ở Bước 4 & 5\n     */';

const newFunctions = `    /**
     * Quản lý Biểu đáp án (Nạp từ file ngoài, Zalo, hoặc xem/sửa ma trận)
     */
    function openManageAnswerKeysModal(tab = 'import') {
      if (!appState.omr.answerKeysByCode || Object.keys(appState.omr.answerKeysByCode).length === 0) {
        syncOmrAnswerKeys();
      }
      appState.omr.tempAnswerKeys = JSON.parse(JSON.stringify(appState.omr.answerKeysByCode || {}));
      
      const modal = document.getElementById('modalManageAnswerKeys');
      if (modal) {
        modal.classList.add('active');
        switchAnswerKeyTab(tab);
      }
    }

    function switchAnswerKeyTab(tabName) {
      const tabs = ['import', 'matrix', 'config'];
      tabs.forEach(t => {
        const btn = document.getElementById(\`ak-tab-btn-\${t}\`);
        const pane = document.getElementById(\`ak-tab-pane-\${t}\`);
        if (btn) {
          if (t === tabName) {
            btn.classList.add('active');
            btn.style.fontWeight = '700';
            btn.style.color = '#2563eb';
            btn.style.borderBottom = '3px solid #2563eb';
          } else {
            btn.classList.remove('active');
            btn.style.fontWeight = '600';
            btn.style.color = '#64748b';
            btn.style.borderBottom = '3px solid transparent';
          }
        }
        if (pane) {
          pane.style.display = (t === tabName) ? 'block' : 'none';
        }
      });

      if (tabName === 'matrix') {
        renderAnswerKeyMatrixTable();
      } else if (tabName === 'config') {
        updateCustomPointSummary();
      }
    }

    async function handleExternalAnswerKeyFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      showToast(\`Đang đọc file đáp án: \${file.name}...\`, 'info');
      try {
        const reader = new FileReader();
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'xlsx' || ext === 'xls' || ext === 'docx') {
          // Gửi base64 lên server để giải mã bằng zip-docx
          reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];
            const res = await fetch('/api/omr/parse-answer-key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: file.name, fileBase64: base64 })
            });
            const data = await res.json();
            if (data.ok) {
              appState.omr.tempAnswerKeys = data.answerKeysByCode;
              appState.omr.lastImportSource = \`File: \${file.name}\`;
              updateAkImportStatus(\`✅ Đã nạp thành công \${data.totalCodes} mã đề từ file \${file.name}\`);
              switchAnswerKeyTab('matrix');
              showToast(data.summary, 'success');
            } else {
              showToast(data.message || 'Lỗi nhận diện file đáp án', 'error');
            }
          };
          reader.readAsDataURL(file);
        } else {
          // File văn bản (.csv, .txt, .json)
          reader.onload = async (e) => {
            const text = e.target.result;
            const res = await fetch('/api/omr/parse-answer-key', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileName: file.name, rawText: text })
            });
            const data = await res.json();
            if (data.ok) {
              appState.omr.tempAnswerKeys = data.answerKeysByCode;
              appState.omr.lastImportSource = \`File: \${file.name}\`;
              updateAkImportStatus(\`✅ Đã nạp thành công \${data.totalCodes} mã đề từ file \${file.name}\`);
              switchAnswerKeyTab('matrix');
              showToast(data.summary, 'success');
            } else {
              showToast(data.message || 'Lỗi nhận diện file đáp án', 'error');
            }
          };
          reader.readAsText(file);
        }
      } catch (err) {
        showToast('Lỗi đọc file: ' + err.message, 'error');
      }
      event.target.value = '';
    }

    async function processPastedAnswerKeyText() {
      const textarea = document.getElementById('ak-raw-textarea');
      const text = textarea?.value?.trim();
      if (!text) {
        showToast('Vui lòng dán chuỗi đáp án từ Zalo hoặc Email trước!', 'warning');
        return;
      }

      showToast('Đang trích xuất đáp án từ văn bản...', 'info');
      try {
        const res = await fetch('/api/omr/parse-answer-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: text })
        });
        const data = await res.json();
        if (data.ok) {
          appState.omr.tempAnswerKeys = data.answerKeysByCode;
          appState.omr.lastImportSource = 'Dán văn bản (Zalo/Email)';
          updateAkImportStatus(\`✅ Đã nhận diện thành công \${data.totalCodes} mã đề từ văn bản dán\`);
          switchAnswerKeyTab('matrix');
          showToast(data.summary, 'success');
        } else {
          showToast(data.message || 'Không thể nhận diện mã đề', 'error');
        }
      } catch (err) {
        showToast('Lỗi phân tích: ' + err.message, 'error');
      }
    }

    async function loadSampleExternalAnswerKey(type) {
      try {
        let sampleText = '';
        if (type === 'csv') {
          sampleText = \`Câu,101,102,103,104
1,A,B,C,D
2,B,C,D,A
3,C,D,A,B
4,D,A,B,C
5,A,C,B,D
6,B,D,C,A
7,C,A,D,B
8,D,B,A,C
9,A,B,C,D
10,B,C,D,A
11,C,D,A,B
12,D,A,B,C
13,A,C,B,D
14,B,D,C,A
15,C,A,D,B
16,D,B,A,C
17,A,B,C,D
18,B,C,D,A
19,C,D,A,B
20,D,A,B,C
21,A,C,B,D
22,B,D,C,A
23,C,A,D,B
24,D,B,A,C\`;
        } else {
          sampleText = \`BẢNG ĐÁP ÁN MÔN TIN HỌC 12 - TỔ CHUYÊN MÔN
Mã đề 101:
1.A 2.B 3.C 4.D 5.A 6.B 7.C 8.D 9.A 10.B 11.C 12.D 13.A 14.B 15.C 16.D 17.A 18.B 19.C 20.D 21.A 22.B 23.C 24.D
Phần II:
Câu 1: a-Đ, b-S, c-Đ, d-S
Câu 2: a-S, b-Đ, c-S, d-Đ
Câu 3: a-Đ, b-Đ, c-S, d-S
Câu 4: a-S, b-S, c-Đ, d-Đ

Mã đề 102:
1.B 2.C 3.D 4.A 5.B 6.C 7.D 8.A 9.B 10.C 11.D 12.A 13.B 14.C 15.D 16.A 17.B 18.C 19.D 20.A 21.B 22.C 23.D 24.A
Phần II:
Câu 1: a-S, b-Đ, c-S, d-Đ
Câu 2: a-Đ, b-S, c-Đ, d-S
Câu 3: a-S, b-S, c-Đ, d-Đ
Câu 4: a-Đ, b-Đ, c-S, d-S\`;
        }

        const ta = document.getElementById('ak-raw-textarea');
        if (ta) ta.value = sampleText;

        const res = await fetch('/api/omr/parse-answer-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: sampleText })
        });
        const data = await res.json();
        if (data.ok) {
          appState.omr.tempAnswerKeys = data.answerKeysByCode;
          appState.omr.lastImportSource = type === 'csv' ? 'File mẫu CSV (Toán 12)' : 'Tin nhắn mẫu Zalo (Tin 12)';
          updateAkImportStatus(\`✅ Đã nạp thành công mẫu \${type.toUpperCase()} (\${data.totalCodes} mã đề)\`);
          switchAnswerKeyTab('matrix');
          showToast(\`Đã nạp thành công mẫu \${type.toUpperCase()}\`, 'success');
        }
      } catch (err) {
        showToast('Lỗi nạp mẫu: ' + err.message, 'error');
      }
    }

    function updateAkImportStatus(text) {
      const el = document.getElementById('ak-import-status-text');
      if (el) el.textContent = text;
    }

    function renderAnswerKeyMatrixTable() {
      const keys = appState.omr.tempAnswerKeys || {};
      const codes = Object.keys(keys);
      const badgesContainer = document.getElementById('ak-matrix-codes-badges');
      const theadTr = document.getElementById('ak-matrix-thead-tr');
      const tbody = document.getElementById('ak-matrix-tbody');

      if (!theadTr || !tbody) return;

      if (codes.length === 0) {
        theadTr.innerHTML = '<th>Không có dữ liệu mã đề</th>';
        tbody.innerHTML = '<tr><td style="text-align:center; padding:24px;">Chưa nạp biểu đáp án nào. Hãy quay lại Tab 1 để tải file hoặc dán text!</td></tr>';
        return;
      }

      // Badges
      if (badgesContainer) {
        badgesContainer.innerHTML = codes.map(c => \`
          <span style="font-size:0.75rem; font-weight:700; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; border:1px solid #bae6fd; display:inline-flex; align-items:center; gap:4px;">
            Mã \${c}
            <span onclick="removeAnswerKeyCode('\${c}')" style="cursor:pointer; color:#ef4444; font-size:0.8rem; margin-left:2px;" title="Xóa mã đề này">✕</span>
          </span>
        \`).join('');
      }

      // Thead
      theadTr.innerHTML = \`
        <th style="padding:6px 10px; width:70px; background:#e2e8f0; color:#334155;">Câu</th>
        \${codes.map(c => \`<th style="padding:6px 8px; background:#eff6ff; color:#1d4ed8; font-weight:700;">Mã \${c}</th>\`).join('')}
      \`;

      // Xác định số câu Phần I (MCQ) lớn nhất
      let maxP1 = 0;
      codes.forEach(c => {
        const len = (keys[c]?.part1 || []).length;
        if (len > maxP1) maxP1 = len;
      });
      if (maxP1 === 0) maxP1 = 24;

      let html = '';

      // Header Nhóm Phần I
      html += \`
        <tr style="background:#f1f5f9; font-weight:700; color:#1e293b; border-bottom:1px solid #cbd5e1;">
          <td colspan="\${codes.length + 1}" style="padding:6px 10px; font-size:0.8rem; background:#f8fafc;">
            🔹 PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN (\${maxP1} CÂU)
          </td>
        </tr>
      \`;

      for (let q = 1; q <= maxP1; q++) {
        html += \`<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:5px 8px; text-align:center; font-weight:700; color:#475569; background:#f8fafc;">Câu \${q}</td>
          \${codes.map(c => {
            const currentOpt = keys[c]?.part1?.[q - 1] || 'A';
            return \`
              <td style="padding:3px 6px; text-align:center;">
                <div style="display:inline-flex; gap:3px;">
                  \${['A', 'B', 'C', 'D'].map(opt => \`
                    <button type="button" 
                            onclick="setAnswerMatrixP1('\${c}', \${q - 1}, '\${opt}')"
                            style="width:24px; height:24px; border-radius:4px; font-size:0.75rem; font-weight:700; border:1px solid \${currentOpt === opt ? '#2563eb' : '#cbd5e1'}; background:\${currentOpt === opt ? '#2563eb' : '#fff'}; color:\${currentOpt === opt ? '#fff' : '#475569'}; cursor:pointer; padding:0;">
                      \${opt}
                    </button>
                  \`).join('')}
                </div>
              </td>
            \`;
          }).join('')}
        </tr>\`;
      }

      // Header Nhóm Phần II (Đúng/Sai)
      const p2Count = 4; // Mặc định 4 câu đúng sai theo chuẩn Bộ GD 2025

      html += \`
        <tr style="background:#f1f5f9; font-weight:700; color:#1e293b; border-bottom:1px solid #cbd5e1; border-top:2px solid #cbd5e1;">
          <td colspan="\${codes.length + 1}" style="padding:6px 10px; font-size:0.8rem; background:#f8fafc;">
            🔹 PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (\${p2Count} CÂU × 4 Ý)
          </td>
        </tr>
      \`;

      for (let q = 1; q <= p2Count; q++) {
        ['a', 'b', 'c', 'd'].forEach(sub => {
          html += \`<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:4px 8px; text-align:center; font-weight:600; color:#64748b; background:#f8fafc; font-size:0.78rem;">
              C\${q} (\${sub})
            </td>
            \${codes.map(c => {
              if (!keys[c].part2) keys[c].part2 = {};
              if (!keys[c].part2[q]) keys[c].part2[q] = { a: 'Đ', b: 'S', c: 'Đ', d: 'S' };
              const currentVal = keys[c].part2[q][sub] || 'Đ';
              return \`
                <td style="padding:3px 6px; text-align:center;">
                  <div style="display:inline-flex; gap:4px;">
                    <button type="button" 
                            onclick="setAnswerMatrixP2('\${c}', \${q}, '\${sub}', 'Đ')"
                            style="width:24px; height:22px; border-radius:3px; font-size:0.72rem; font-weight:700; border:1px solid \${currentVal === 'Đ' ? '#16a34a' : '#cbd5e1'}; background:\${currentVal === 'Đ' ? '#16a34a' : '#fff'}; color:\${currentVal === 'Đ' ? '#fff' : '#475569'}; cursor:pointer; padding:0;">
                      Đ
                    </button>
                    <button type="button" 
                            onclick="setAnswerMatrixP2('\${c}', \${q}, '\${sub}', 'S')"
                            style="width:24px; height:22px; border-radius:3px; font-size:0.72rem; font-weight:700; border:1px solid \${currentVal === 'S' ? '#dc2626' : '#cbd5e1'}; background:\${currentVal === 'S' ? '#dc2626' : '#fff'}; color:\${currentVal === 'S' ? '#fff' : '#475569'}; cursor:pointer; padding:0;">
                      S
                    </button>
                  </div>
                </td>
              \`;
            }).join('')}
          </tr>\`;
        });
      }

      tbody.innerHTML = html;
    }

    function setAnswerMatrixP1(code, qIdx, opt) {
      if (!appState.omr.tempAnswerKeys[code]) return;
      if (!appState.omr.tempAnswerKeys[code].part1) appState.omr.tempAnswerKeys[code].part1 = [];
      appState.omr.tempAnswerKeys[code].part1[qIdx] = opt;
      renderAnswerKeyMatrixTable();
    }

    function setAnswerMatrixP2(code, qNum, sub, val) {
      if (!appState.omr.tempAnswerKeys[code]) return;
      if (!appState.omr.tempAnswerKeys[code].part2) appState.omr.tempAnswerKeys[code].part2 = {};
      if (!appState.omr.tempAnswerKeys[code].part2[qNum]) appState.omr.tempAnswerKeys[code].part2[qNum] = {};
      appState.omr.tempAnswerKeys[code].part2[qNum][sub] = val;
      renderAnswerKeyMatrixTable();
    }

    function addNewAnswerKeyCodePrompt() {
      const code = prompt('Nhập mã đề thi mới (VD: 105, 106, 501):', '');
      if (!code) return;
      const cleanCode = code.trim().replace(/[^0-9]/g, '');
      if (!cleanCode) {
        showToast('Mã đề phải là các chữ số!', 'warning');
        return;
      }
      if (appState.omr.tempAnswerKeys[cleanCode]) {
        showToast(\`Mã đề \${cleanCode} đã tồn tại trong danh sách!\`, 'warning');
        return;
      }

      const firstCode = Object.keys(appState.omr.tempAnswerKeys)[0];
      const baseKey = firstCode ? appState.omr.tempAnswerKeys[firstCode] : null;

      if (baseKey) {
        appState.omr.tempAnswerKeys[cleanCode] = JSON.parse(JSON.stringify(baseKey));
      } else {
        appState.omr.tempAnswerKeys[cleanCode] = {
          part1: Array(24).fill('A'),
          part2: {
            '1': { a: 'Đ', b: 'S', c: 'Đ', d: 'S' },
            '2': { a: 'S', b: 'Đ', c: 'S', d: 'Đ' },
            '3': { a: 'Đ', b: 'Đ', c: 'S', d: 'S' },
            '4': { a: 'S', b: 'S', c: 'Đ', d: 'Đ' }
          },
          part3: {}
        };
      }

      renderAnswerKeyMatrixTable();
      showToast(\`Đã thêm mã đề \${cleanCode}\`, 'success');
    }

    function removeAnswerKeyCode(code) {
      if (Object.keys(appState.omr.tempAnswerKeys).length <= 1) {
        showToast('Phải giữ lại ít nhất 1 mã đề thi!', 'warning');
        return;
      }
      if (!confirm(\`Bạn có chắc chắn muốn xóa biểu đáp án của Mã đề \${code}?\`)) return;
      delete appState.omr.tempAnswerKeys[code];
      renderAnswerKeyMatrixTable();
      showToast(\`Đã xóa mã đề \${code}\`, 'info');
    }

    function updateCustomPointSummary() {
      const mcqPt = parseFloat(document.getElementById('ak-cfg-mcq-point')?.value || '0.25');
      const keys = appState.omr.tempAnswerKeys || appState.omr.answerKeysByCode || {};
      const firstCode = Object.keys(keys)[0];
      const p1Len = firstCode ? (keys[firstCode]?.part1 || []).length : 24;
      const p1Total = Math.round(p1Len * mcqPt * 100) / 100;
      const p2Total = 4.0; // 4 câu đúng sai = 4.0đ
      const total = Math.round((p1Total + p2Total) * 100) / 100;

      const el = document.getElementById('ak-point-summary-text');
      if (el) {
        el.textContent = \`Thang điểm: Phần I: \${p1Total}đ (\${p1Len} câu × \${mcqPt}đ) + Phần II: \${p2Total}đ (4 câu) = Tổng \${total} điểm\`;
      }
    }

    function applyExternalAnswerKeysToApp() {
      const keys = appState.omr.tempAnswerKeys;
      const codes = Object.keys(keys || {});
      if (codes.length === 0) {
        showToast('Không có mã đề nào để áp dụng!', 'warning');
        return;
      }

      appState.omr.answerKeysByCode = JSON.parse(JSON.stringify(keys));

      // Cập nhật cấu hình điểm
      const mcqPt = parseFloat(document.getElementById('ak-cfg-mcq-point')?.value || '0.25');
      if (!appState.omr.pointRules) appState.omr.pointRules = {};
      appState.omr.pointRules.mcq = mcqPt;

      // Cập nhật nhãn Bước 7 Left Panel
      const sourceName = appState.omr.lastImportSource || \`File ngoài (\${codes.length} mã đề)\`;
      const badge = document.getElementById('omr-keys-badge');
      if (badge) {
        badge.textContent = \`Đã nạp file ngoài (\${codes.length} mã đề)\`;
        badge.style.color = '#0284c7';
        badge.style.background = '#e0f2fe';
        badge.style.borderColor = '#bae6fd';
      }

      const input = document.getElementById('omr-excel-keys-input');
      if (input) {
        input.value = \`\${sourceName}: Mã \${codes.join(', ')}\`;
      }

      closeModal('modalManageAnswerKeys');
      showToast(\`✅ Đã áp dụng biểu đáp án \${codes.length} mã đề (\${codes.join(', ')}). Sẵn sàng chấm bài!\`, 'success');

      // Nếu đã có bài scan nạp trước đó, tự động chấm lại với đáp án mới
      if (appState.omr.papers && appState.omr.papers.length > 0) {
        runOmrBatchGrading(false);
      }
    }

    function resetToStep4AnswerKeys() {
      syncOmrAnswerKeys();
      appState.omr.tempAnswerKeys = JSON.parse(JSON.stringify(appState.omr.answerKeysByCode || {}));
      appState.omr.lastImportSource = '';

      const badge = document.getElementById('omr-keys-badge');
      if (badge) {
        badge.textContent = 'Đã liên kết Đề Bước 4';
        badge.style.color = '#15803d';
        badge.style.background = '#f0fdf4';
        badge.style.borderColor = '#bbf7d0';
      }

      const input = document.getElementById('omr-excel-keys-input');
      if (input) {
        input.value = \`Đã lấy từ Đề Bước 4 & 5 (\${Object.keys(appState.omr.answerKeysByCode).join(', ')})\`;
      }

      renderAnswerKeyMatrixTable();
      showToast('Đã khôi phục biểu đáp án gốc từ Đề thi Bước 4 & 5!', 'info');
    }

${targetPoint}`;

if (html.includes(targetPoint)) {
  html = html.replace(targetPoint, newFunctions);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Successfully inserted answer key management functions into index.html');
} else {
  console.error('Target point not found in index.html');
}

