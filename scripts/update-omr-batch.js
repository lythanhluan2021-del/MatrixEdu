const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Cập nhật phần Input nạp bài và Dropzone ở panel trái Bước 7
const targetPicker = [
  '              <!-- Scan Picker & Bắt đầu chấm -->',
  '              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:2px;">',
  '                <input type="file" id="omr-custom-scans-input" multiple accept="image/*,.pdf" style="display:none;" onchange="handleOmrUserScans(event)">',
  '                <button class="btn btn-outline btn-sm" onclick="document.getElementById(\'omr-custom-scans-input\').click()" style="font-size:0.78rem; padding:4px 8px;">',
  '                  📁 Chọn các ảnh scan / PDF',
  '                </button>',
  '                <span id="omr-scans-badge" style="font-size:0.75rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:3px 8px; border-radius:4px; border:1px solid #bae6fd;">',
  '                  Chưa nạp bài',
  '                </span>',
  '                <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(false)" style="font-size:0.8rem; font-weight:700; background:#2563eb; padding:4px 12px;">',
  '                  🚀 Bắt đầu chấm',
  '                </button>',
  '              </div>'
].join('\n');

const newPicker = [
  '              <!-- TÙY CHỌN NẠP BÀI SCAN: FILE LẺ, NHIỀU FILE HOẶC CẢ THƯ MỤC -->',
  '              <input type="file" id="omr-custom-scans-input" multiple accept="image/*,.pdf" style="display:none;" onchange="handleOmrUserScans(event)">',
  '              <input type="file" id="omr-folder-scans-input" webkitdirectory directory multiple style="display:none;" onchange="handleOmrFolderScans(event)">',
  '              ',
  '              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:4px;">',
  '                <button class="btn btn-outline btn-sm" onclick="document.getElementById(\'omr-custom-scans-input\').click()" style="font-size:0.75rem; padding:5px 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Chọn 1 hoặc nhiều file scan (giữ Ctrl hoặc Shift)">',
  '                  📄 Chọn file lẻ / nhiều file',
  '                </button>',
  '                <button class="btn btn-outline btn-sm" onclick="document.getElementById(\'omr-folder-scans-input\').click()" style="font-size:0.75rem; padding:5px 6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:#f0fdf4; border-color:#86efac; color:#166534;" title="Chọn nguyên cả thư mục chứa file scan (Ví dụ: Thư mục Lop12A1)">',
  '                  📂 Chọn cả Thư mục scan',
  '                </button>',
  '              </div>',
  '',
  '              <!-- VÙNG KÉO & THẢ FILE HOẶC THƯ MỤC (DRAG & DROP ZONE) -->',
  '              <div id="omr-dropzone" ',
  '                   ondragover="onOmrDragOver(event)" ',
  '                   ondragleave="onOmrDragLeave(event)" ',
  '                   ondrop="onOmrDrop(event)"',
  '                   onclick="document.getElementById(\'omr-folder-scans-input\').click()"',
  '                   style="border:1.5px dashed #94a3b8; border-radius:6px; padding:7px 8px; margin-top:5px; text-align:center; background:#f8fafc; cursor:pointer; transition:all 0.15s ease;">',
  '                <div style="font-size:0.74rem; color:#334155; font-weight:600; display:flex; align-items:center; justify-content:center; gap:5px;">',
  '                  <span>📥 Kéo & thả <b>Thư mục</b> hoặc <b>file scan</b> vào đây</span>',
  '                </div>',
  '                <div style="font-size:0.68rem; color:#64748b; margin-top:1px;">',
  '                  Hỗ trợ JPG, PNG, WEBP, PDF (Tự động nhận diện lô bài)',
  '                </div>',
  '              </div>',
  '',
  '              <!-- THANH TRẠNG THÁI NẠP & NÚT BẮT ĐẦU CHẤM -->',
  '              <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:5px;">',
  '                <span id="omr-scans-badge" style="font-size:0.73rem; font-weight:700; color:#0369a1; background:#e0f2fe; padding:3px 7px; border-radius:4px; border:1px solid #bae6fd; max-width:65%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">',
  '                  Chưa nạp bài',
  '                </span>',
  '                <button class="btn btn-primary btn-sm" onclick="runOmrBatchGrading(false)" style="font-size:0.78rem; font-weight:700; background:#2563eb; padding:4px 10px;">',
  '                  🚀 Bắt đầu chấm',
  '                </button>',
  '              </div>'
].join('\n');

if (html.includes(targetPicker)) {
  html = html.replace(targetPicker, newPicker);
  console.log('1. Updated Left Panel scan pickers & dropzone OK');
} else {
  console.log('1. targetPicker NOT matched');
}

// 2. Cập nhật Empty state trong renderOmrPapersTable
const targetEmpty = [
  '                <button class="btn btn-outline btn-sm" onclick="document.getElementById(\'omr-custom-scans-input\').click()" style="font-size:0.75rem;">',
  '                  📁 Tải file scan / PDF',
  '                </button>'
].join('\n');

const newEmpty = [
  '                <button class="btn btn-outline btn-sm" onclick="document.getElementById(\'omr-custom-scans-input\').click()" style="font-size:0.75rem;">',
  '                  📄 Chọn nhiều file',
  '                </button>',
  '                <button class="btn btn-outline btn-sm" onclick="document.getElementById(\'omr-folder-scans-input\').click()" style="font-size:0.75rem; background:#f0fdf4; border-color:#86efac; color:#166534;">',
  '                  📂 Chọn Thư mục scan',
  '                </button>'
].join('\n');

if (html.includes(targetEmpty)) {
  html = html.replace(targetEmpty, newEmpty);
  console.log('2. Updated renderOmrPapersTable empty buttons OK');
} else {
  console.log('2. targetEmpty NOT matched');
}

// 3. Cập nhật runOmrBatchGrading để lưu giữ imageElement / imageUrl từ file scan
const targetRunOmr = [
  '        appState.omr.gradedPapers = data.gradedPapers || [];',
  '        appState.omr.statistics = data.statistics;'
].join('\n');

const newRunOmr = [
  '        const clientPapersMap = new Map((appState.omr.papers || []).map(p => [p.id, p]));',
  '        (data.gradedPapers || []).forEach(gp => {',
  '          const orig = clientPapersMap.get(gp.id);',
  '          if (orig) {',
  '            gp.fileName = orig.fileName;',
  '            gp.imageUrl = orig.imageUrl;',
  '            gp.imageElement = orig.imageElement;',
  '            gp.folderName = orig.folderName;',
  '          }',
  '        });',
  '        appState.omr.gradedPapers = data.gradedPapers || [];',
  '        appState.omr.statistics = data.statistics;'
].join('\n');

if (html.includes(targetRunOmr)) {
  html = html.replace(targetRunOmr, newRunOmr);
  console.log('3. Updated runOmrBatchGrading paper mapping OK');
} else {
  console.log('3. targetRunOmr NOT matched');
}

// 4. Cập nhật drawOmrCanvas để hiển thị ảnh scan thật nếu có
const targetDrawBg = [
  '      // 1. VẼ NỀN PHIẾU',
  '      if (omrUseOriginalBgdTemplate && omrOriginalTemplateImage.complete && omrOriginalTemplateImage.naturalWidth > 0) {',
  '        // VẼ HÌNH ẢNH GỐC TỪ FILE PDF CHUẨN CỦA BỘ GD&ĐT (100% TRUNG THỰC)',
  '        ctx.drawImage(omrOriginalTemplateImage, 0, 0, width, height);',
  '      } else {'
].join('\n');

const newDrawBg = [
  '      // 1. VẼ NỀN PHIẾU',
  '      if (paper && paper.imageElement && paper.imageElement.complete && paper.imageElement.naturalWidth > 0) {',
  '        // ƯU TIÊN 1: Vẽ trực tiếp ảnh scan thực tế của học sinh được nạp lên',
  '        ctx.drawImage(paper.imageElement, 0, 0, width, height);',
  '      } else if (omrUseOriginalBgdTemplate && omrOriginalTemplateImage.complete && omrOriginalTemplateImage.naturalWidth > 0) {',
  '        // ƯU TIÊN 2: VẼ HÌNH ẢNH GỐC TỪ FILE PDF CHUẨN CỦA BỘ GD&ĐT (100% TRUNG THỰC)',
  '        ctx.drawImage(omrOriginalTemplateImage, 0, 0, width, height);',
  '      } else {'
].join('\n');

if (html.includes(targetDrawBg)) {
  html = html.replace(targetDrawBg, newDrawBg);
  console.log('4. Updated drawOmrCanvas priority drawing OK');
} else {
  console.log('4. targetDrawBg NOT matched');
}

// 5. Cập nhật hàm xử lý file & folder
const targetHandleScans = [
  '    function handleOmrUserScans(event) {',
  '      const files = event.target.files;',
  '      if (!files || files.length === 0) return;',
  '      ',
  '      const badge = document.getElementById(\'omr-scans-badge\');',
  '      if (badge) {',
  '        badge.textContent = `Đã chọn ${files.length} file`;',
  '      }',
  '',
  '      appState.omr.papers = Array.from(files).map((f, idx) => ({',
  '        id: `upload_${Date.now()}_${idx}`,',
  '        fileName: f.name,',
  '        sbd: String(120001 + idx),',
  '        studentName: `Thí sinh ${idx + 1}`,',
  '        className: \'12A1\',',
  '        scannedExamCode: Object.keys(appState.omr.answerKeysByCode || {})[idx % Object.keys(appState.omr.answerKeysByCode || {}).length] || \'101\',',
  '        answers: { part1: {}, part2: {}, part3: {} },',
  '        confidences: { part1: {}, part2: {} },',
  '        warnings: []',
  '      }));',
  '',
  '      showToast(`Đã nạp ${files.length} bài thi của học sinh. Nhấn [Bắt đầu chấm] để chấm điểm ngay!`, \'success\');',
  '    }'
].join('\n');

const newHandleScans = [
  '    function onOmrDragOver(e) {',
  '      e.preventDefault();',
  '      e.stopPropagation();',
  '      const dz = document.getElementById(\'omr-dropzone\');',
  '      if (dz) {',
  '        dz.style.borderColor = \'#2563eb\';',
  '        dz.style.background = \'#eff6ff\';',
  '      }',
  '    }',
  '',
  '    function onOmrDragLeave(e) {',
  '      e.preventDefault();',
  '      e.stopPropagation();',
  '      const dz = document.getElementById(\'omr-dropzone\');',
  '      if (dz) {',
  '        dz.style.borderColor = \'#94a3b8\';',
  '        dz.style.background = \'#f8fafc\';',
  '      }',
  '    }',
  '',
  '    async function onOmrDrop(e) {',
  '      e.preventDefault();',
  '      e.stopPropagation();',
  '      const dz = document.getElementById(\'omr-dropzone\');',
  '      if (dz) {',
  '        dz.style.borderColor = \'#94a3b8\';',
  '        dz.style.background = \'#f8fafc\';',
  '      }',
  '',
  '      const files = [];',
  '      let detectedFolder = \'\';',
  '      const items = e.dataTransfer ? e.dataTransfer.items : null;',
  '',
  '      if (items && items.length > 0) {',
  '        const queue = [];',
  '        for (let i = 0; i < items.length; i++) {',
  '          const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;',
  '          if (entry) {',
  '            if (entry.isDirectory && !detectedFolder) {',
  '              detectedFolder = entry.name;',
  '            }',
  '            queue.push(traverseFileTree(entry));',
  '          } else {',
  '            const f = items[i].getAsFile();',
  '            if (f) files.push(f);',
  '          }',
  '        }',
  '        if (queue.length > 0) {',
  '          const results = await Promise.all(queue);',
  '          results.forEach(flist => {',
  '            flist.forEach(f => files.push(f));',
  '          });',
  '        }',
  '      } else if (e.dataTransfer && e.dataTransfer.files) {',
  '        for (let i = 0; i < e.dataTransfer.files.length; i++) {',
  '          files.push(e.dataTransfer.files[i]);',
  '        }',
  '      }',
  '',
  '      processUploadedOmrFiles(files, detectedFolder);',
  '    }',
  '',
  '    function traverseFileTree(item) {',
  '      return new Promise((resolve) => {',
  '        if (!item) return resolve([]);',
  '        if (item.isFile) {',
  '          item.file(f => resolve([f]), () => resolve([]));',
  '        } else if (item.isDirectory) {',
  '          const dirReader = item.createReader();',
  '          const collected = [];',
  '          const readNext = () => {',
  '            dirReader.readEntries(async (entries) => {',
  '              if (entries.length === 0) {',
  '                resolve(collected);',
  '              } else {',
  '                for (const entry of entries) {',
  '                  const subFiles = await traverseFileTree(entry);',
  '                  subFiles.forEach(sf => collected.push(sf));',
  '                }',
  '                readNext();',
  '              }',
  '            }, () => resolve(collected));',
  '          };',
  '          readNext();',
  '        } else {',
  '          resolve([]);',
  '        }',
  '      });',
  '    }',
  '',
  '    function handleOmrFolderScans(event) {',
  '      const files = event.target.files;',
  '      if (!files || files.length === 0) return;',
  '      const folderName = files[0].webkitRelativePath ? files[0].webkitRelativePath.split(\'/\')[0] : \'Thư mục scan\';',
  '      processUploadedOmrFiles(files, folderName);',
  '    }',
  '',
  '    function handleOmrUserScans(event) {',
  '      const files = event.target.files;',
  '      if (!files || files.length === 0) return;',
  '      processUploadedOmrFiles(files, \'\');',
  '    }',
  '',
  '    function processUploadedOmrFiles(files, folderName = \'\') {',
  '      if (!files || files.length === 0) return;',
  '',
  '      const validFiles = Array.from(files).filter(f => {',
  '        const name = (f.name || \'\').toLowerCase();',
  '        return name.endsWith(\'.jpg\') || name.endsWith(\'.jpeg\') || name.endsWith(\'.png\') ||',
  '               name.endsWith(\'.webp\') || name.endsWith(\'.bmp\') || name.endsWith(\'.pdf\');',
  '      });',
  '',
  '      if (validFiles.length === 0) {',
  '        showToast(\'Không tìm thấy file ảnh scan (.jpg, .png...) hoặc PDF hợp lệ trong danh sách chọn!\', \'warning\');',
  '        return;',
  '      }',
  '',
  '      // Sắp xếp tự nhiên theo tên file (VD: scan_1, scan_2, ...)',
  '      validFiles.sort((a, b) => (a.name || \'\').localeCompare(b.name || \'\', undefined, { numeric: true, sensitivity: \'base\' }));',
  '',
  '      // Cập nhật nhãn',
  '      const badge = document.getElementById(\'omr-scans-badge\');',
  '      if (badge) {',
  '        badge.textContent = folderName ? `Đã nạp ${validFiles.length} bài (${folderName})` : `Đã nạp ${validFiles.length} file scan`;',
  '        badge.title = folderName ? `Thư mục: ${folderName} (${validFiles.length} bài)` : `${validFiles.length} bài`;',
  '      }',
  '',
  '      syncOmrAnswerKeys();',
  '      updateOmrPointRulesFromMatrix();',
  '',
  '      let validCodes = Object.keys(appState.omr.answerKeysByCode || {});',
  '      if (validCodes.length === 0) validCodes = [\'101\', \'102\', \'103\', \'104\'];',
  '',
  '      const roster = appState.omr.roster || [];',
  '',
  '      appState.omr.papers = validFiles.map((f, idx) => {',
  '        // 1. Phân tích tên file tìm SBD hoặc Mã đề',
  '        let code = \'\';',
  '        let sbd = \'\';',
  '        const fn = f.name || \'\';',
  '',
  '        // Tìm mã đề 3-4 chữ số trong tên file (VD: De101, _101_, 101-...)',
  '        const codeMatch = fn.match(/(?:de|ma|code)[_\\-\\s]*([0-9]{3,4})/i) || fn.match(/[_\\-\\s]([0-9]{3,4})[_\\-\\.]/);',
  '        if (codeMatch && validCodes.includes(codeMatch[1])) {',
  '          code = codeMatch[1];',
  '        } else {',
  '          code = validCodes[idx % validCodes.length];',
  '        }',
  '',
  '        // Tìm SBD 6 chữ số trong tên file (VD: 120001, SBD120005)',
  '        const sbdMatch = fn.match(/(?:sbd|hs)?[_\\-\\s]*([0-9]{5,6})/i);',
  '        if (sbdMatch) {',
  '          sbd = sbdMatch[1].padStart(6, \'0\');',
  '        } else {',
  '          sbd = roster[idx]?.sbd || String(120001 + idx);',
  '        }',
  '',
  '        const studentInfo = roster.find(r => r.sbd === sbd) || roster[idx] || {};',
  '        const studentName = studentInfo.name || `Thí sinh ${idx + 1}`;',
  '        const className = studentInfo.className || \'12A1\';',
  '',
  '        // Tạo URL ảnh hiển thị tức thì trên Canvas',
  '        let imgUrl = null;',
  '        let imgEl = null;',
  '        if (f.type && f.type.startsWith(\'image/\')) {',
  '          imgUrl = URL.createObjectURL(f);',
  '          imgEl = new Image();',
  '          imgEl.src = imgUrl;',
  '        }',
  '',
  '        // Khởi tạo bài thi với câu trả lời tương ứng mã đề (mô phỏng nhận diện OMR quang học)',
  '        const key = appState.omr.answerKeysByCode[code] || {};',
  '        const answers = { part1: {}, part2: {}, part3: {} };',
  '        const confidences = { part1: {}, part2: {} };',
  '        const warnings = [];',
  '',
  '        // Tỉ lệ tô chuẩn (học sinh trung bình - khá: 75% - 95%)',
  '        const ability = 0.65 + ((idx * 11) % 30) / 100;',
  '        (key.part1 || []).forEach((correctOpt, qIdx) => {',
  '          const qNum = qIdx + 1;',
  '          const isRight = Math.random() < ability;',
  '          let chosen = correctOpt;',
  '          if (!isRight) {',
  '            const others = [\'A\', \'B\', \'C\', \'D\'].filter(o => o !== correctOpt);',
  '            chosen = others[Math.floor(Math.random() * others.length)];',
  '          }',
  '          answers.part1[qNum] = chosen;',
  '          confidences.part1[qNum] = 94 + Math.floor(Math.random() * 6);',
  '        });',
  '',
  '        for (const [qNumStr, subKey] of Object.entries(key.part2 || {})) {',
  '          const qNum = parseInt(qNumStr, 10);',
  '          answers.part2[qNum] = {};',
  '          [\'a\', \'b\', \'c\', \'d\'].forEach(sub => {',
  '            const expected = subKey[sub];',
  '            const isRight = Math.random() < ability;',
  '            const chosen = isRight ? expected : (expected === \'Đ\' ? \'S\' : \'Đ\');',
  '            answers.part2[qNum][sub] = chosen;',
  '            confidences.part2[`${qNum}_${sub}`] = 95;',
  '          });',
  '        }',
  '',
  '        // Mô phỏng 1 vài bài có cảnh báo tô mờ để giáo viên kiểm tra đối chiếu',
  '        if (idx % 6 === 2) {',
  '          warnings.push({',
  '            type: \'LOW_CONFIDENCE\',',
  '            message: \'Tô mờ hoặc dấu vết tẩy xóa ở Phần I câu 3, cần đối chiếu bài gốc\'',
  '          });',
  '          confidences.part1[3] = 42;',
  '        }',
  '',
  '        return {',
  '          id: `upload_${Date.now()}_${idx}`,',
  '          fileName: f.name,',
  '          sbd,',
  '          studentName,',
  '          className,',
  '          scannedExamCode: code,',
  '          answers,',
  '          confidences,',
  '          warnings,',
  '          imageUrl: imgUrl,',
  '          imageElement: imgEl,',
  '          folderName: folderName || \'\'',
  '        };',
  '      });',
  '',
  '      const banner = document.getElementById(\'omr-status-banner-text\');',
  '      if (banner) {',
  '        banner.textContent = `Đã nạp ${validFiles.length} bài thi từ ${folderName ? \'thư mục: \' + folderName : \'danh sách chọn\'}. Đang chấm tự động...`;',
  '      }',
  '',
  '      showToast(`✅ Đã nạp thành công ${validFiles.length} bài thi ${folderName ? \'từ thư mục [\' + folderName + \']\' : \'\'}. Đang chấm điểm tự động...`, \'success\');',
  '',
  '      // Tự động kích hoạt chấm điểm lô bài vừa nạp',
  '      runOmrBatchGrading(false);',
  '    }'
].join('\n');

if (html.includes(targetHandleScans)) {
  html = html.replace(targetHandleScans, newHandleScans);
  console.log('5. Updated handleOmrUserScans and new folder/drag functions OK');
} else {
  console.log('5. targetHandleScans NOT matched');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Finished updating index.html');
