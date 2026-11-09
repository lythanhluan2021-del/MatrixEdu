const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Update Step 1 inputs: add custom codes and quick buttons
const oldVariantInput = `          <div class="form-group">
            <label>Số lượng mã đề cần tạo:</label>
            <input type="number" id="meta-variants" value="4" min="1" max="8" oninput="syncMetadataFromInputs()" />
          </div>`;

const newVariantInput = `          <div class="form-group">
            <label>Số lượng mã đề cần tạo:</label>
            <input type="number" id="meta-variants" value="4" min="1" max="12" oninput="onVariantsCountInput(this.value)" />
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
              <span>Tùy chỉnh danh sách Mã đề thi (phân cách bằng dấu phẩy):</span>
              <span style="font-weight:400; font-size:0.78rem; color:#64748b;">Mẫu nhanh:</span>
            </label>
            <div style="display:flex; gap:6px; margin-bottom:5px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-sm" onclick="setQuickExamCodes('101, 102, 103, 104')" style="padding:2px 8px; font-size:0.75rem; background:#fff;">
                🔢 101, 102, 103, 104
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="setQuickExamCodes('0101, 0102, 0103, 0104')" style="padding:2px 8px; font-size:0.75rem; background:#fff; color:#0369a1; border-color:#7dd3fc;">
                📄 0101, 0102 (Phiếu 2025)
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="setQuickExamCodes('132, 209, 357, 485')" style="padding:2px 8px; font-size:0.75rem; background:#fff; color:#7c3aed; border-color:#c084fc;">
                🎲 132, 209, 357, 485 (BGD)
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="setQuickExamCodes('01, 02, 03, 04')" style="padding:2px 8px; font-size:0.75rem; background:#fff; color:#059669; border-color:#86efac;">
                🏷️ 01, 02, 03, 04
              </button>
            </div>
            <input type="text" id="meta-custom-codes" value="101, 102, 103, 104" placeholder="Ví dụ: 101, 102, 103, 104 hoặc 132, 209, 357, 485..." oninput="syncMetadataFromInputs()" style="font-weight:800; color:#1d4ed8; font-size:0.92rem;" />
          </div>`;

if (content.includes(oldVariantInput)) {
  content = content.replace(oldVariantInput, newVariantInput);
  console.log('✓ Added custom exam codes input & presets in Step 1');
} else {
  console.log('⚠ Could not find oldVariantInput in Step 1');
}

// 2. Update Step 4 button to open custom shuffle modal
const oldShuffleBtn = `<button class="btn btn-secondary" onclick="shuffleExamVariantsNow()">🔀 Trộn & Nhân bản Mã đề</button>`;
const newShuffleBtn = `<button class="btn btn-secondary" onclick="openShuffleVariantsModal()" style="font-weight:700;">🔀 Tùy chỉnh & Trộn Mã đề</button>`;

if (content.includes(oldShuffleBtn)) {
  content = content.replace(oldShuffleBtn, newShuffleBtn);
  console.log('✓ Updated Step 4 shuffle button to open modal');
} else {
  console.log('⚠ Could not find oldShuffleBtn in Step 4');
}

// 3. Update syncMetadataFromInputs and populateMetadataInputs
const oldSyncMeta = `      m.duration = Math.max(15, Math.min(180, Number(getVal('meta-duration', 45)) || 45));
      m.numVariants = Math.max(1, Math.min(8, Number(getVal('meta-variants', 4)) || 4));`;

const newSyncMeta = `      m.duration = Math.max(15, Math.min(180, Number(getVal('meta-duration', 45)) || 45));
      m.numVariants = Math.max(1, Math.min(12, Number(getVal('meta-variants', 4)) || 4));
      const rawCustomCodes = getVal('meta-custom-codes', '101, 102, 103, 104');
      m.customCodes = rawCustomCodes.split(/[,;\\s]+/).map(c => c.trim()).filter(Boolean);`;

if (content.includes(oldSyncMeta)) {
  content = content.replace(oldSyncMeta, newSyncMeta);
  console.log('✓ Updated syncMetadataFromInputs for customCodes');
} else {
  console.log('⚠ Could not find oldSyncMeta');
}

const oldPopulateMeta = `      setVal('meta-duration', m.duration || 45);
      setVal('meta-variants', m.numVariants || 4);`;

const newPopulateMeta = `      setVal('meta-duration', m.duration || 45);
      setVal('meta-variants', m.numVariants || 4);
      if (Array.isArray(m.customCodes) && m.customCodes.length > 0) {
        setVal('meta-custom-codes', m.customCodes.join(', '));
      }`;

if (content.includes(oldPopulateMeta)) {
  content = content.replace(oldPopulateMeta, newPopulateMeta);
  console.log('✓ Updated populateMetadataInputs for customCodes');
} else {
  console.log('⚠ Could not find oldPopulateMeta');
}

// 4. Update renderStudentA4Preview in index.html to align options beautifully into 4 columns, 2 columns, or 1 column
const oldRenderStudentPreviewOpts = `        mcqs.forEach((q, i) => {
          const opts = q.options || [];
          html += \`<div style="margin-bottom:10px;">
            <div><strong>Câu \${i + 1}:</strong> \${escapeHtml(q.stem)}</div>
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:4px; margin-top:4px; padding-left:12px;">
              <div><strong>A.</strong> \${escapeHtml(opts[0] || '')}</div>
              <div><strong>B.</strong> \${escapeHtml(opts[1] || '')}</div>
              <div><strong>C.</strong> \${escapeHtml(opts[2] || '')}</div>
              <div><strong>D.</strong> \${escapeHtml(opts[3] || '')}</div>
            </div>
          </div>\`;
        });`;

const newRenderStudentPreviewOpts = `        mcqs.forEach((q, i) => {
          const opts = (q.options || []).map(o => String(o || '').replace(/^[A-D][\\.\\)]\\s*/, '').trim());
          const maxLen = Math.max(...opts.map(o => o.length), 0);
          const totalLen = opts.reduce((s, o) => s + o.length, 0);

          let gridCols = 2;
          if (opts.length === 4 && maxLen <= 18 && totalLen <= 68) {
            gridCols = 4; // 1 dòng 4 cột thẳng hàng
          } else if (maxLen > 45 || opts.length !== 4) {
            gridCols = 1; // 4 dòng
          }

          html += \`<div style="margin-bottom:10px;">
            <div><strong>Câu \${i + 1}:</strong> \${escapeHtml(q.stem)}</div>
            <div style="display:grid; grid-template-columns: repeat(\${gridCols}, 1fr); gap:6px 12px; margin-top:4px; padding-left:12px;">
              <div><strong>A.</strong> \${escapeHtml(opts[0] || '')}</div>
              <div><strong>B.</strong> \${escapeHtml(opts[1] || '')}</div>
              <div><strong>C.</strong> \${escapeHtml(opts[2] || '')}</div>
              <div><strong>D.</strong> \${escapeHtml(opts[3] || '')}</div>
            </div>
          </div>\`;
        });`;

if (content.includes(oldRenderStudentPreviewOpts)) {
  content = content.replace(oldRenderStudentPreviewOpts, newRenderStudentPreviewOpts);
  console.log('✓ Updated renderStudentA4Preview with smart column layout');
} else {
  console.log('⚠ Could not find oldRenderStudentPreviewOpts');
}

// 5. Add Modal Shuffle Variants HTML
const modalShuffleHtml = `
  <!-- MODAL: TÙY CHỈNH & TRỘN MÃ ĐỀ -->
  <div class="modal-backdrop" id="modalShuffleVariants">
    <div class="modal-box" style="max-width:620px;">
      <div class="card-header" style="background:#1e3a8a; color:#fff; margin:-22px -22px 14px -22px; padding:14px 20px; border-radius:8px 8px 0 0;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.4rem;">🔀</span>
          <div>
            <div class="card-title" style="color:#fff; font-size:1.05rem;">TÙY CHỈNH DANH SÁCH & TRỘN MÃ ĐỀ THI</div>
            <div style="font-size:0.78rem; opacity:0.9;">Đảo câu hỏi và hoán vị 4 phương án A, B, C, D độc lập cho từng mã đề</div>
          </div>
        </div>
        <button class="btn btn-ghost-light btn-sm" onclick="closeModal('modalShuffleVariants')">✕ Đóng</button>
      </div>

      <div style="margin-bottom:14px;">
        <label style="font-weight:700; font-size:0.86rem; color:#1e3a8a; display:block; margin-bottom:6px;">
          1. Số lượng mã đề cần tạo:
        </label>
        <div style="display:flex; gap:8px; flex-wrap:wrap;" id="modal-shuffle-count-btns">
          <button type="button" class="btn btn-outline btn-sm btn-count-choice" onclick="setModalVariantCount(1)">1 đề</button>
          <button type="button" class="btn btn-outline btn-sm btn-count-choice" onclick="setModalVariantCount(2)">2 đề</button>
          <button type="button" class="btn btn-outline btn-sm btn-count-choice active" onclick="setModalVariantCount(4)" style="background:#1e3a8a; color:#fff;">4 đề (Chuẩn)</button>
          <button type="button" class="btn btn-outline btn-sm btn-count-choice" onclick="setModalVariantCount(6)">6 đề</button>
          <button type="button" class="btn btn-outline btn-sm btn-count-choice" onclick="setModalVariantCount(8)">8 đề</button>
        </div>
      </div>

      <div style="margin-bottom:14px;">
        <label style="font-weight:700; font-size:0.86rem; color:#1e3a8a; display:block; margin-bottom:6px;">
          2. Chọn mẫu mã đề chuẩn thông dụng:
        </label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <button type="button" class="btn btn-outline btn-sm" onclick="setModalCustomCodes('101, 102, 103, 104')" style="text-align:left; padding:8px 12px;">
            <div style="font-weight:700; color:#1e3a8a;">🔢 101, 102, 103, 104</div>
            <div style="font-size:0.75rem; color:#64748b;">Mã 3 số liên tiếp (Phổ biến THPT)</div>
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="setModalCustomCodes('0101, 0102, 0103, 0104')" style="text-align:left; padding:8px 12px; color:#0369a1; border-color:#7dd3fc;">
            <div style="font-weight:700;">📄 0101, 0102, 0103, 0104</div>
            <div style="font-size:0.75rem; color:#64748b;">Mã 4 số chuẩn Phiếu TLTN 2025</div>
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="setModalCustomCodes('132, 209, 357, 485')" style="text-align:left; padding:8px 12px; color:#7c3aed; border-color:#c084fc;">
            <div style="font-weight:700;">🎲 132, 209, 357, 485</div>
            <div style="font-size:0.75rem; color:#64748b;">Mã đề xáo trộn chuẩn Bộ GD&ĐT</div>
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="setModalCustomCodes('01, 02, 03, 04')" style="text-align:left; padding:8px 12px; color:#059669; border-color:#86efac;">
            <div style="font-weight:700;">🏷️ 01, 02, 03, 04</div>
            <div style="font-size:0.75rem; color:#64748b;">Mã 2 số kiểm tra thường xuyên</div>
          </button>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-weight:700; font-size:0.86rem; color:#1e3a8a; display:block; margin-bottom:6px;">
          3. Hoặc tự nhập danh sách Mã đề tùy ý (phân cách bằng dấu phẩy):
        </label>
        <input type="text" id="modal-shuffle-codes-input" class="form-control" value="101, 102, 103, 104" style="font-weight:800; font-size:1.02rem; color:#1d4ed8; padding:8px 12px;" />
        <div style="font-size:0.78rem; color:#64748b; margin-top:4px;">
          💡 Thầy/Cô có thể gõ bất kỳ chuỗi mã đề nào (ví dụ: <code>101, 102, 103, 104</code> hoặc <code>A1, A2, B1, B2</code>).
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #e2e8f0; padding-top:12px;">
        <button class="btn btn-outline" onclick="closeModal('modalShuffleVariants')">Hủy bỏ</button>
        <button class="btn btn-primary" onclick="applyCustomCodesAndShuffle()" style="font-weight:700; background:#1e3a8a; border-color:#1e3a8a;">
          🔀 Áp dụng & Trộn đề ngay
        </button>
      </div>
    </div>
  </div>
`;

if (!content.includes('id="modalShuffleVariants"')) {
  content = content.replace('</body>', modalShuffleHtml + '\n</body>');
  console.log('✓ Injected modalShuffleVariants markup');
} else {
  console.log('modalShuffleVariants already present');
}

// 6. Add JavaScript functions for custom exam codes
const customCodesJs = `
    // ========================================================================
    // QUẢN LÝ & TÙY CHỈNH MÃ ĐỀ THI
    // ========================================================================
    function setQuickExamCodes(codesStr) {
      const input = document.getElementById('meta-custom-codes');
      if (input) {
        input.value = codesStr;
        syncMetadataFromInputs();
        showToast('Đã chọn mẫu mã đề: ' + codesStr, 'info');
      }
    }

    function onVariantsCountInput(val) {
      const num = Math.max(1, Math.min(12, parseInt(val || '4', 10)));
      syncMetadataFromInputs();
      // Tự động sinh danh sách mã đề tương ứng nếu chưa chỉnh sửa thủ công
      const currentCodes = (appState.metadata.customCodes || []);
      if (currentCodes.length !== num) {
        const newCodes = [];
        for (let i = 0; i < num; i++) {
          newCodes.push(String(101 + i));
        }
        appState.metadata.customCodes = newCodes;
        const input = document.getElementById('meta-custom-codes');
        if (input) input.value = newCodes.join(', ');
      }
    }

    function openShuffleVariantsModal() {
      const m = appState.metadata;
      const codes = (m.customCodes && m.customCodes.length > 0)
        ? m.customCodes.join(', ')
        : (appState.variants && appState.variants.length > 0
            ? appState.variants.map(v => v.code).join(', ')
            : '101, 102, 103, 104');

      const input = document.getElementById('modal-shuffle-codes-input');
      if (input) input.value = codes;

      setModalVariantCount(m.numVariants || (appState.variants?.length || 4));
      openModal('modalShuffleVariants');
    }

    function setModalVariantCount(count) {
      const btns = document.querySelectorAll('.btn-count-choice');
      btns.forEach(b => {
        const c = parseInt(b.getAttribute('data-count') || b.textContent, 10);
        if (c === count) {
          b.style.background = '#1e3a8a';
          b.style.color = '#fff';
        } else {
          b.style.background = '#fff';
          b.style.color = '#334155';
        }
      });

      // Tự động điều chỉnh số lượng mã trong ô input
      const input = document.getElementById('modal-shuffle-codes-input');
      if (input) {
        const parts = input.value.split(/[,;\\s]+/).filter(Boolean);
        if (parts.length < count) {
          const lastNum = parseInt(parts[parts.length - 1], 10) || (100 + parts.length);
          while (parts.length < count) {
            parts.push(String(lastNum + parts.length));
          }
          input.value = parts.join(', ');
        } else if (parts.length > count) {
          input.value = parts.slice(0, count).join(', ');
        }
      }
    }

    function setModalCustomCodes(codesStr) {
      const input = document.getElementById('modal-shuffle-codes-input');
      if (input) {
        input.value = codesStr;
        const count = codesStr.split(/[,;\\s]+/).filter(Boolean).length;
        setModalVariantCount(count);
      }
    }

    async function applyCustomCodesAndShuffle() {
      const input = document.getElementById('modal-shuffle-codes-input');
      const raw = (input?.value || '').trim();
      const codes = raw.split(/[,;\\s]+/).map(c => c.trim()).filter(Boolean);

      if (codes.length === 0) {
        showToast('Vui lòng nhập ít nhất 1 mã đề thi!', 'warning');
        return;
      }

      appState.metadata.customCodes = codes;
      appState.metadata.numVariants = codes.length;

      // Đồng bộ sang Step 1
      const metaInput = document.getElementById('meta-custom-codes');
      if (metaInput) metaInput.value = codes.join(', ');
      const countInput = document.getElementById('meta-variants');
      if (countInput) countInput.value = codes.length;

      closeModal('modalShuffleVariants');
      showToast(\`Đang trộn và nhân bản \${codes.length} mã đề (\${codes.join(', ')})...\`, 'info');

      try {
        const res = await fetch('/api/shuffle-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questions: appState.questions,
            numVariants: codes.length,
            customCodes: codes
          })
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.variants)) {
          appState.variants = data.variants;
          appState.selectedVariantCode = data.variants[0]?.code || codes[0];

          renderExamStep();
          renderAnswerAndQaStep();
          renderExportStep();

          // Tự động đồng bộ sang Bước 7 (Chấm bài)
          if (typeof syncOmrAnswerKeys === 'function') {
            syncOmrAnswerKeys();
          }

          showToast(\`✅ Đã trộn thành công \${data.variants.length} mã đề tùy chỉnh (\${data.variants.map(v => v.code).join(', ')})!\`, 'success');
        } else {
          showToast(data.message || 'Lỗi khi trộn mã đề!', 'error');
        }
      } catch (err) {
        showToast('Lỗi kết nối máy chủ trộn đề: ' + err.message, 'error');
      }
    }
`;

if (!content.includes('function openShuffleVariantsModal')) {
  content = content.replace('</script>', customCodesJs + '\n</script>');
  console.log('✓ Injected custom exam codes client JavaScript');
} else {
  console.log('Custom exam codes client JavaScript already present');
}

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('All updates written to index.html successfully!');

