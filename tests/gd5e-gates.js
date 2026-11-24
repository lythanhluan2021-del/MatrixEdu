// GĐ5e gates — redesign section 1.2 (UI-22): balanced layout.
// Before: .grid-2 split 1.2 into a tall empty upload box (left, dead space
// from min-height:220px) and a crammed Drive panel (right, 8 stacked layers,
// 2 duplicate "ngân hàng đang trống" messages, folder name wrapping).
// After: two equal source panels side by side (upload strip | Drive URL),
// then the bank report full-width (status strip 1 line, 3 stat boxes,
// exactly ONE status message, actions right-aligned).
// All 1.2 ids/handlers must survive the move. Run: node tests/gd5e-gates.js
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

const style = html.split('<style>')[1].split('</style>')[0];
const gd5dIdx = html.indexOf('GĐ5d (UI-15)');
const gd5eIdx = html.indexOf('GĐ5e (UI-22)');
const gd5eCss = gd5eIdx > 0 ? html.slice(gd5eIdx) : '';

// Section 1.2 span: from its title to the 1.3 title.
const s12 = html.slice(html.indexOf('1.2. Ma trận'), html.indexOf('1.3. Đơn vị kiến thức'));
const step1 = html.slice(html.indexOf('<section id="step-1"'), html.indexOf('<section id="step-2"'));
const renderBank = html.slice(html.indexOf('function renderDriveBankReport'));

// --- 1. GĐ5e layer exists after GĐ5d ---
check('UI-22 GĐ5e override layer exists after GĐ5d layer',
  gd5eIdx > gd5dIdx && gd5dIdx > 0, `gd5d=${gd5dIdx} gd5e=${gd5eIdx}`);

// --- 2. Sources row: two equal panels, upload + Drive side by side ---
check('UI-22 .bank-sources grid exists (2 minmax(0,1fr) columns, stretch)',
  /\.bank-sources\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[^}]*align-items:\s*stretch;/.test(gd5eCss),
  'missing .bank-sources 2-col stretch rule');
check('UI-22 .bank-sources has no min-height dead space',
  !/\.bank-sources\s*\{[^}]*min-height/.test(gd5eCss),
  '.bank-sources still forces a min-height');
check('UI-22 both source cells use .drive-panel (equal visual weight)',
  (s12.match(/class="drive-panel"/g) || []).length === 2,
  `drive-panel count in 1.2 = ${(s12.match(/class="drive-panel"/g) || []).length}`);
check('UI-22 sources row holds both inputs (upload file + Drive URL)',
  (() => {
    const src = html.indexOf('class="bank-sources"');
    return src > 0
      && html.indexOf('id="file-upload-input"', src) > src
      && html.indexOf('id="gdrive-folder-url"', src) > src
      && html.indexOf('id="gdrive-scan-report"', src) > html.indexOf('id="gdrive-folder-url"', src);
  })(), 'upload input / Drive URL / scan report not in sources-then-report order');
check('UI-22 sources stack to 1 column at <=768px',
  /@media\s*\(max-width:\s*768px\)[\s\S]*?\.bank-sources\s*\{\s*grid-template-columns:\s*1fr;/.test(gd5eCss),
  'missing 768px stacking rule for .bank-sources');

// --- 3. No more .grid-2 inside step 1 (the dead-space culprit) ---
check('UI-22 no .grid-2 left inside step 1',
  !step1.includes('class="grid-2"'),
  'grid-2 still used inside step 1');

// --- 4. Upload zone is a compact horizontal strip, not a tall empty box ---
check('UI-22 upload zone is a horizontal strip (upload-zone-row)',
  s12.includes('class="upload-zone upload-zone-row"'),
  'upload zone is not the horizontal strip');
check('UI-22 upload strip stretches to fill its cell (flex:1, no fixed tall padding)',
  /\.upload-zone-row\s*\{[^}]*display:\s*flex;[^}]*flex:\s*1;/.test(gd5eCss)
  && !s12.includes('class="upload-zone upload-zone-row" onclick="document.getElementById(\'file-upload-input\').click()" style="padding: 18px"'),
  'upload strip does not stretch or still has the tall 18px padding');
check('UI-22 upload label stays short ("Tải lên Ma trận gốc" + separate .docx line)',
  html.includes('>Tải lên Ma trận gốc</div>')
  && !html.includes('Tải lên Ma trận gốc (.docx, .pdf)'),
  'upload label changed or recombined');

// --- 5. Every 1.2 id survives, exactly once ---
for (const id of ['file-upload-input', 'uploaded-files-list', 'gdrive-status-badge',
  'gdrive-count-badge', 'gdrive-folder-url', 'gdrive-scan-report', 'scope-raw-text']) {
  const n = (html.match(new RegExp(`id="${id}"`, 'g')) || []).length;
  check(`UI-22 id #${id} present exactly once`, n === 1, `found ${n}`);
}

// --- 6. Every 1.2 handler survives ---
check('UI-22 upload click + change handlers intact',
  html.includes(`onclick="document.getElementById('file-upload-input').click()"`)
  && html.includes('onchange="handleFileUpload(event)"'),
  'upload zone click/change handler missing');
check('UI-22 Drive scan handler intact',
  html.includes('onclick="connectAndScanGoogleDriveBank()"'),
  'Quét button handler missing');
check('UI-22 bank modal handler intact in report template',
  renderBank.includes('onclick="openDriveBankModal()"'),
  'openDriveBankModal() call missing from report');
check('UI-22 header actions intact (File mẫu / Xem Ma trận / Phân tích)',
  s12.includes("loadWorkspaceDocxFile('TIN 12 - MA TRAN KTGK 1.docx')")
  && s12.includes('onclick="openMatrixFullscreenModal()"')
  && s12.includes('onclick="runStep1Analysis()"'),
  'a 1.2 header action is missing');

// --- 7. Exactly ONE "ngân hàng đang trống" message ---
const emptyCount = (html.match(/Ngân hàng đang trống/g) || []).length;
check('UI-22 exactly one "Ngân hàng đang trống" message (duplicate merged)',
  emptyCount === 1, `found ${emptyCount}`);
check('UI-22 duplicate total line "chưa có câu hỏi nào để tạo đề." is gone',
  !html.includes('chưa có câu hỏi nào để tạo đề.'),
  'duplicate empty total line still present');
check('UI-22 empty-bank amber box still has the actionable text',
  renderBank.includes('Ngân hàng đang trống:')
  && renderBank.includes('hãy thêm file Word (.docx) vào thư mục Drive rồi bấm Quét.'),
  'actionable empty-bank text lost');

// --- 8. Report full-width: status strip 1 line, 3 stat boxes, actions right ---
check('UI-22 scan report sits below the sources row (full width, not inside a column)',
  (() => {
    const srcEnd = html.indexOf('id="gdrive-scan-report"');
    const sourcesOpen = html.indexOf('class="bank-sources"');
    const sourcesClose = html.indexOf('</div>\n\n              <!-- GĐ5e', sourcesOpen);
    return sourcesOpen > 0 && srcEnd > sourcesClose;
  })(), 'scan report still nested inside a 2-col cell');
check('UI-22 folder name stays on one line with ellipsis',
  html.includes('overflow: hidden; text-overflow: ellipsis; white-space: nowrap'),
  'folder name can still wrap to 2 lines');
check('UI-22 stat boxes use .bank-stats (3 minmax columns, stacks at <=768px)',
  renderBank.includes('class="bank-stats"')
  && /\.bank-stats\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/.test(gd5eCss)
  && /@media\s*\(max-width:\s*768px\)[\s\S]*?\.bank-stats\s*\{\s*grid-template-columns:\s*1fr;/.test(gd5eCss),
  'stat boxes not on the .bank-stats grid');
check('UI-22 "Xem Thư mục Drive" action still in report template',
  renderBank.includes('Xem Thư mục Drive'),
  'drive folder link missing from report');
check('UI-22 "Tra cứu Ngân hàng" action still in report template',
  renderBank.includes('Tra cứu Ngân hàng ('),
  'bank lookup button missing from report');

// --- 9. No regression on the honest-sync gates (GĐ5c) ---
check('UI-22 empty scan pill "ĐÃ QUÉT: 0 TỆP — NGÂN HÀNG TRỐNG" kept',
  html.includes('ĐÃ QUÉT: 0 TỆP — NGÂN HÀNG TRỐNG'),
  'empty-scan pill text lost');
check('UI-22 sync pill still nowrap / no-shrink',
  renderBank.includes('white-space: nowrap; flex-shrink: 0'),
  'sync pill can wrap/overlap again');

console.log(`\nCỔNG GĐ5e: ${pass} ĐẠT / ${fail} RỚT`);
if (fail > 0) { console.log('Rớt: ' + failures.join(' | ')); process.exit(1); }
