// GĐ5f gates — restructure steps (UI-23): move 1.2 to Step 2, 1.3 to Step 3.
// User decision 2026-11-24: 1.1 stays in Step 1; 1.2 (Ma trận & Ngân hàng
// Drive) moves to Step 2 (before the matrix table); 1.3 (Đơn vị kiến thức)
// moves to Step 3 (before the spec table) and must AUTO-DISPLAY from the
// already-analyzed matrix data when entering Step 3 (no re-analysis).
// The #step-1-lower wrapper from GĐ5d is gone by design (it only existed to
// hold 1.2+1.3 inside Step 1); the 5 GĐ5d gates asserting it were replaced
// in gd5d-gates.js with GĐ5f equivalents (same 29-gate count).
// Run: node tests/gd5f-gates.js
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
const section = (n) => {
  const open = html.indexOf(`<section id="step-${n}"`);
  const next = n < 7 ? html.indexOf(`<section id="step-${n + 1}"`, open) : html.indexOf('</main>', open);
  return html.slice(open, next);
};
const step1 = section(1), step2 = section(2), step3 = section(3);
const goToStep = html.slice(html.indexOf('function goToStep('), html.indexOf('function syncMetadataFromInputs'));
const count = (s, re) => (s.match(re) || []).length;

// --- 1. Placement: 1.1 in Step 1, 1.2 in Step 2, 1.3 in Step 3 ---
check('UI-23 1.1 stays in Step 1',
  step1.includes('1.1. Thông tin đề') && step1.includes('id="meta-school"'),
  '1.1 not in Step 1');
check('UI-23 1.2 moved to Step 2 (and out of Step 1)',
  step2.includes('1.2. Ma trận') && step2.includes('id="gdrive-scan-report"')
  && !step1.includes('1.2. Ma trận') && !step1.includes('id="gdrive-scan-report"'),
  '1.2 not in Step 2 or still in Step 1');
check('UI-23 1.3 moved to Step 3 (and out of Step 1)',
  step3.includes('1.3. Đơn vị kiến thức') && step3.includes('id="units-table"')
  && !step1.includes('1.3. Đơn vị kiến thức') && !step1.includes('id="units-table"'),
  '1.3 not in Step 3 or still in Step 1');
check('UI-23 1.2 comes before the matrix table card in Step 2',
  step2.indexOf('1.2. Ma trận') > 0 && step2.indexOf('1.2. Ma trận') < step2.indexOf('id="cardStep2"'),
  '1.2 not before cardStep2');
check('UI-23 1.3 comes before the spec card in Step 3',
  step3.indexOf('1.3. Đơn vị kiến thức') > 0 && step3.indexOf('1.3. Đơn vị kiến thức') < step3.indexOf('3. Bản Đặc tả'),
  '1.3 not before the spec card');

// --- 2. #step-1-lower wrapper is gone (superseded by design) ---
check('UI-23 #step-1-lower wrapper removed (no element, no CSS rule; comments may mention it)',
  !html.includes('id="step-1-lower"') && !/#step-1-lower\s*\{/.test(allCss),
  '#step-1-lower element or CSS rule still present');
check('UI-23 no .grid-2 left inside Step 1',
  !step1.includes('class="grid-2"'),
  'grid-2 still used inside Step 1');

// --- 3. Every 1.2 / 1.3 id survives exactly once ---
for (const id of ['file-upload-input', 'uploaded-files-list', 'gdrive-status-badge',
  'gdrive-count-badge', 'gdrive-folder-url', 'gdrive-scan-report', 'scope-raw-text',
  'detected-matrix-preview-box', 'workspace-files-bar']) {
  const n = count(html, new RegExp(`id="${id}"`, 'g'));
  check(`UI-23 id #${id} present exactly once`, n === 1, `found ${n}`);
}
for (const id of ['units-table', 'units-tbody', 'step1-status-msg']) {
  const n = count(html, new RegExp(`id="${id}"`, 'g'));
  check(`UI-23 id #${id} present exactly once`, n === 1, `found ${n}`);
}
check('UI-23 upload/analysis feedback #step1-status-msg lives in Step 2 (1.2 card)',
  step2.includes('id="step1-status-msg"') && !step3.includes('id="step1-status-msg"'),
  'status message not in Step 2');

// --- 4. 1.2 layout from GĐ5e survives the move ---
check('UI-23 1.2 still has two equal .drive-panel source cells',
  count(html.slice(html.indexOf('1.2. Ma trận'), html.indexOf('1.3. Đơn vị kiến thức')), /class="drive-panel"/g) === 2,
  'drive-panel count in 1.2 is not 2');
check('UI-23 stray duplicate class="drive-panel" on the Step-2 Word-export button is gone',
  !html.includes('class="btn btn-sm"\n                    class="drive-panel"'),
  'duplicate class attribute still present');

// --- 5. Step-1 footer button (was the 1.3 card footer) ---
check('UI-23 Step 1 has its own footer button "Bước 2: Ma trận →"',
  step1.includes('onclick="confirmStep1AndGoStep2()"') && step1.includes('Bước 2: Ma trận →'),
  'footer button missing from Step 1');
check('UI-23 exactly one confirmStep1AndGoStep2() call site (in Step 1)',
  count(html, /onclick="confirmStep1AndGoStep2\(\)"/g) === 1,
  'confirmStep1AndGoStep2 called from more than one place');
check('UI-23 1.3 card has no navigation footer anymore (Step 3 footer handles it)',
  !step3.slice(step3.indexOf('1.3. Đơn vị kiến thức'), step3.indexOf('3. Bản Đặc tả')).includes('confirmStep1AndGoStep2'),
  'old "Bước 2" footer still inside the 1.3 card');

// --- 6. Auto-display: entering Step 3 renders the units table ---
check('UI-23 goToStep(3) renders the units table (auto-display, no re-analysis)',
  /if\s*\(stepNum\s*===\s*3\)\s*renderUnitsTable\(\);/.test(goToStep),
  'renderUnitsTable() not called on entering Step 3');
check('UI-23 goToStep(3) still renders the spec table too',
  /if\s*\(stepNum\s*===\s*3\)\s*renderSpecTable\(\);/.test(goToStep),
  'renderSpecTable() lost from goToStep(3)');

// --- 7. Step footers still navigate correctly ---
check('UI-23 Step-2 footer: back to 1, "Bước 3: Đặc tả →", "Bước 4: Sinh đề →"',
  step2.includes('onclick="goToStep(1)"') && step2.includes('onclick="confirmStep2AndGoStep3()"')
  && step2.includes('onclick="confirmStep2AndGoStep4()"'),
  'Step-2 footer navigation broken');
check('UI-23 Step-3 footer: back to 2, "Bước 4: Sinh đề →"',
  step3.includes('onclick="goToStep(2)"') && step3.includes('onclick="confirmStep3AndGoStep4()"'),
  'Step-3 footer navigation broken');

// --- 8. Sidebar labels match the new flow ---
check('UI-23 sidebar Step 1 relabelled "1. Thông tin đề" / "Nhập thông tin đề"',
  html.includes('<div class="step-title">1. Thông tin đề</div>')
  && html.includes('<div class="step-desc">Nhập thông tin đề</div>')
  && html.includes('title="Bước 1: Thông tin đề"')
  && !html.includes('<div class="step-title">1. Tài liệu</div>'),
  'Step-1 sidebar label not updated');
check('UI-23 sidebar Step 2/3 subtitles reflect the new content',
  html.includes('<div class="step-desc">Ngân hàng &amp; Cấu trúc</div>')
  && html.includes('<div class="step-desc">Đơn vị &amp; Yêu cầu đạt</div>'),
  'Step-2/3 sidebar subtitles not updated');

// --- 9. Step-1 readiness pill is metadata-based now (units live in Step 3) ---
check('UI-23 Step-1 nav pill reflects exam info, not units',
  (() => {
    const fn = html.slice(html.indexOf('function refreshWorkflowReadiness'));
    const pill1 = fn.slice(fn.indexOf('setNavPill(1,'), fn.indexOf('setNavPill(2,'));
    return pill1.includes('Đã nhập thông tin') && pill1.includes('Chờ nhập thông tin')
      && !pill1.includes('Chờ nhập tài liệu');
  })(), 'Step-1 pill still units-based');

// --- 10. Texts that pointed at the old layout now point at Step 2 ---
check('UI-23 1.3 empty state points at Step 2, not "ở trên"',
  html.includes('Tải Ma trận và bấm <b>"Phân tích"</b> ở Bước 2.')
  && !html.includes('hoặc tải Ma trận ở trên.'),
  '1.3 placeholder still says "ở trên"');
check('UI-23 units-table empty state points at Step 2',
  html.includes('Hãy tải ma trận ở Bước 2 rồi bấm "Phân tích"'),
  'renderUnitsTable empty state not updated');
check('UI-23 confirmStep1 toast points at Step 2, not "quay lại Bước 1"',
  html.includes('Hãy tải ma trận và bấm "Phân tích"')
  && !html.includes('quay lại Bước 1 để phân tích'),
  'confirmStep1 toast still points at Bước 1');

// --- 11. Structure intact: still 7 step sections, in order ---
check('UI-23 still exactly 7 step sections in order',
  [1, 2, 3, 4, 5, 6, 7].every(n => html.includes(`id="step-${n}"`))
  && html.indexOf('id="step-1"') < html.indexOf('id="step-2"')
  && html.indexOf('id="step-2"') < html.indexOf('id="step-3"'),
  'step sections changed count/order');

console.log(`\nCỔNG GĐ5f: ${pass} ĐẠT / ${fail} RỚT`);
if (fail > 0) { console.log('RỚT: ' + failures.join(' | ')); process.exit(1); }
