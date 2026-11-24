// GĐ5d gates — step-1 layout root-cause fix (dangling selector list),
// 1.1 full width, no horizontal overflow, toast placement/cap,
// empty-state button names, autosave label, matrix-table scrollbar,
// upload-zone label.
// Run: node tests/gd5d-gates.js
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
// NOTE: a comment inside <style> contains the literal text "<style>", so
// split('<style>') truncates `style` at that comment (the GĐ5c+ layers live
// after it). Use allCss for any rule that may live in the override layers.
const allCss = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const gd5cIdx = html.indexOf('GĐ5c (UI-12)');
const gd5dIdx = html.indexOf('GĐ5d (UI-15)');
const gd5dCss = gd5dIdx > 0 ? html.slice(gd5dIdx) : '';

// --- 1. Root cause: dangling selector list must be gone ---
// The .grid-4 rule's selector list must be exactly ".grid-4", not a long
// list starting with .glass-zone-step-1 / .icon-tint-6.
const grid4Pos = style.indexOf('.grid-4 {');
const prevBrace = style.lastIndexOf('}', grid4Pos);
const grid4Selector = style.slice(prevBrace + 1, grid4Pos).replace(/\/\*[\s\S]*?\*\//g, '').trim();
check('UI-15 .grid-4 rule starts a fresh rule (nothing but whitespace/comments before it)',
  grid4Selector === '', `selector=${JSON.stringify(grid4Selector.slice(0, 80))}`);
check('UI-15 no .glass-zone-step-* selector left in <style>',
  !/\.glass-zone-step-\d/.test(style), 'dangling glass-zone selectors still present');
check('UI-15 no .icon-tint-* selector left in <style>',
  !/\.icon-tint-\d/.test(style), 'dangling icon-tint selectors still present');

// --- 2. GĐ5d override layer exists after GĐ5c ---
check('UI-15 GĐ5d override layer exists after GĐ5c layer',
  gd5dIdx > gd5cIdx && gd5cIdx > 0, `gd5c=${gd5cIdx} gd5d=${gd5dIdx}`);
check('UI-15 #step-1 has explicit display:block in GĐ5d layer',
  /#step-1\s*\{\s*display:\s*block;/.test(gd5dCss), 'missing #step-1 display:block');

// --- 3. 1.1 full width: 4 columns wide, labels not ellipsized ---
check('UI-15 1.1 meta-grid is 4 columns with minmax(0, 1fr) at wide width',
  /#step-1\s+\.meta-grid\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/.test(gd5dCss),
  'missing 4-col minmax(0,1fr) meta-grid');
check('UI-15 1.1 labels wrap normally (no nowrap+ellipsis)',
  /#step-1\s+\.meta-grid\s+\.form-group\s+label\s*\{\s*white-space:\s*normal;/.test(gd5dCss),
  'label still nowrap/ellipsis');
check('UI-15 all 8 labels present with full text',
  ['Trường / Đơn vị:', 'Tổ chuyên môn:', 'Năm học:', 'Kỳ kiểm tra:',
   'Khối:', 'Môn học:', 'Thời gian (phút):', 'Số mã đề:']
    .every(l => html.includes(`<label>${l}</label>`)),
  'a 1.1 label is missing or truncated in HTML');
check('UI-15 1.1 title fits on one line (no wrap-forcing narrow column)',
  /1\.1\. Thông tin đề/.test(html) && /#step-1\s+\.meta-grid/.test(gd5dCss),
  'title/meta-grid missing');

// --- 4. Lower row (GĐ5f supersedes): #step-1-lower existed only to hold 1.2+1.3
// inside Step 1. GĐ5f moved 1.2 to Step 2 and 1.3 to Step 3, so the wrapper
// and its rules are gone by design; the gates below assert the NEW layout
// instead (same gate count, updated expectations). ---
check('UI-23 (GĐ5f, supersedes UI-15) 1.2 in Step 2 and 1.3 in Step 3, both out of Step 1',
  html.indexOf('1.2. Ma trận') > html.indexOf('<section id="step-2"')
  && html.indexOf('1.2. Ma trận') < html.indexOf('<section id="step-3"')
  && html.indexOf('1.3. Đơn vị kiến thức') > html.indexOf('<section id="step-3"')
  && html.indexOf('1.3. Đơn vị kiến thức') < html.indexOf('<section id="step-4"')
  && !html.slice(html.indexOf('<section id="step-1"'), html.indexOf('<section id="step-2"')).includes('1.2. Ma trận'),
  '1.2/1.3 not in their new steps');
check('UI-23 (GĐ5f, supersedes UI-15) no #step-1-lower CSS rule left',
  !/#step-1-lower\s*\{/.test(allCss),
  '#step-1-lower rule still in <style>');
check('UI-23 (GĐ5f, supersedes UI-15) 1.2 keeps its GĐ5e 2-col .bank-sources inside Step 2',
  /\.bank-sources\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(allCss),
  'bank-sources 2-col rule lost');
check('UI-15 meta-grid drops to 2 columns at <=1280px and 1 column at <=768px',
  /@media\s*\(max-width:\s*1280px\)[\s\S]*?#step-1\s+\.meta-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(gd5dCss)
  && /@media\s*\(max-width:\s*768px\)[\s\S]*?#step-1\s+\.meta-grid\s*\{\s*grid-template-columns:\s*1fr;/.test(gd5dCss),
  'missing responsive meta-grid rules');
check('UI-23 (GĐ5f, supersedes UI-15) no #step-1 .grid-2 rule left (dead min-height:220px gone)',
  !/#step-1\s+\.grid-2\s*\{/.test(allCss) && !/#step-1\s+\.grid-2\s*>\s*\*\s*\{/.test(allCss),
  'dead #step-1 .grid-2 rule still present');

// --- 5. No horizontal overflow at >=1280px ---
check('UI-16 no repeat(4, 1fr) grid applies to #step-1 anymore',
  !/#step-1[^{]*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/.test(style),
  'a 4-col 1fr grid still targets #step-1');
check('UI-23 (GĐ5f, supersedes UI-16) Step 1 has its own footer button "Bước 2: Ma trận →"',
  html.slice(html.indexOf('<section id="step-1"'), html.indexOf('<section id="step-2"')).includes('onclick="confirmStep1AndGoStep2()"'),
  'Step-1 footer button missing after the move');
check('UI-16 units table scrolls inside its wrap (overflow-x:auto present)',
  /\.table-wrap\s*\{[^}]*overflow-x:\s*auto/.test(style),
  'table-wrap lost overflow-x:auto');

// --- 6. Toast: trong luồng trang (GĐ5g supersedes UI-17 top-right/fixed) ---
// GĐ5g (UI-26): toast không còn fixed góc trên-phải (che nút Bước 4) mà
// nằm trong luồng trang, đầu .content-container, tự ẩn khi rỗng.
check('UI-17 [GĐ5g thay thế] toast trong luồng trang, không fixed',
  /#toast-container \{[^}]*display: flex;[^}]*flex-direction: column;[^}]*align-items: flex-end;/.test(allCss)
  && !/#toast-container \{[^}]*position:\s*fixed/.test(allCss)
  && /#toast-container:empty\s*\{\s*display:\s*none;?\s*\}/.test(allCss),
  'toast vẫn fixed hoặc thiếu :empty');
check('UI-17 showToast caps concurrent toasts at 3 (drops oldest)',
  /function showToast[\s\S]*?while\s*\(container\.children\.length\s*>=\s*3\)\s*container\.firstChild\.remove\(\);/.test(html),
  'no 3-toast cap in showToast');
check('UI-17 showToast still auto-dismisses',
  /function showToast[\s\S]*?setTimeout\(\(\)\s*=>\s*el\.remove\(\),\s*4200\)/.test(html),
  'auto-dismiss missing');
check('UI-17 "Đang sinh…" toast only inside runStep4GenerateExam (no auto-generate on step-4 entry)',
  (() => {
    const needle = 'Đang sinh bộ câu hỏi';
    const first = html.indexOf(needle);
    const last = html.lastIndexOf(needle);
    const genStart = html.indexOf('async function runStep4GenerateExam');
    const genEnd = html.indexOf('function onPassageEdit', genStart);
    return first > 0 && first === last && first > genStart && first < genEnd
      && !/goToStep\(4\)[\s\S]{0,200}?runStep4GenerateExam/.test(html);
  })(), '"Đang sinh…" toast appears outside runStep4GenerateExam');
// GĐ5g (UI-25) supersedes: nút chuyển bước CHỈ chuyển trang, không sinh
// đề — nhãn "Bước 4: Sinh đề →" đổi thành "Bước 4: Soạn đề →" (footer
// Bước 2/3) và "Bước 4 →" (toolbar Bước 2). Nút sinh đề thật vẫn ở Bước 4.
check('UI-17 [GĐ5g thay thế] nút chuyển bước mang nhãn "Soạn đề", không sinh đề',
  html.includes('Bước 4: Soạn đề →') && html.includes('Bước 4 →')
  && !html.includes('Bước 4: Sinh đề →'),
  'nhãn nút chuyển bước chưa đổi theo GĐ5g');

// --- 7. Empty-state instructions name the real buttons ---
check('UI-18 step-3 empty state names "Đồng bộ Ma trận"',
  html.includes('Nhấn "Đồng bộ Ma trận" để hiển thị.')
  && !html.includes('Đồng bộ lại Bản đặc tả từ Ma trận'),
  'step-3 instruction still names the wrong button');
check('UI-18 step-4 empty state names "Sinh đề"',
  html.includes('Hãy nhấn "Sinh đề".')
  && !html.includes('Tự động Sinh Bộ Câu Hỏi'),
  'step-4 instruction still names the wrong button');

// --- 8. Autosave label visible ---
check('UI-19 "Tự động sao lưu" is visible text inside the autosave badge',
  (() => {
    const badge = html.indexOf('id="session-autosave-badge"');
    const text = html.indexOf('id="autosave-text"', badge);
    return badge > 0 && html.slice(badge, text).includes('>Tự động sao lưu');
  })(), '"Tự động sao lưu" only exists as a title attribute');

// --- 9. Matrix table: visible scrollbar + min-width so it scrolls instead of squeezing ---
check('UI-20 matrix-table-wrap has a visible horizontal scrollbar (webkit + firefox)',
  /\.matrix-table-wrap::-webkit-scrollbar\s*\{\s*height:\s*10px;/.test(gd5dCss)
  && /\.matrix-table-wrap\s*\{\s*scrollbar-width:\s*thin;/.test(gd5dCss),
  'no visible scrollbar rules for .matrix-table-wrap');
check('UI-20 .matrix-table has min-width so narrow screens scroll it instead of squeezing',
  /\.matrix-table\s*\{\s*min-width:\s*860px;/.test(gd5dCss),
  'missing .matrix-table min-width');
check('UI-20 matrix-table-wrap keeps overflow-x:auto',
  /\.matrix-table-wrap\s*\{[^}]*overflow-x:\s*auto/.test(style),
  'matrix-table-wrap lost overflow-x:auto');

// --- 10. Upload-zone label short enough for a narrow box ---
check('UI-21 upload-zone label is short ("Tải lên Ma trận gốc" + separate .docx line)',
  html.includes('>Tải lên Ma trận gốc</div>')
  && !html.includes('Tải lên Ma trận gốc (.docx, .pdf)'),
  'upload-zone label still long on one line');

console.log(`\nCỔNG GĐ5d: ${pass} ĐẠT / ${fail} RỚT`);
if (fail > 0) { console.log('RỚT: ' + failures.join(', ')); process.exit(1); }
