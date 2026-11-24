// GĐ5c gates — header contrast, 1.1 layout, code presets, honest sync,
// divide-by-zero %, step nav, step-5 render, step-7 message, duplicate save.
// Run: node tests/gd5c-gates.js
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

// --- helpers ---
function luminance(hex) {
  const c = hex.replace('#', '');
  const rgb = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) {
  const l1 = luminance(a); const l2 = luminance(b);
  const hi = Math.max(l1, l2); const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
function pctApplyFixed(totalPts, ptsKnow, ptsUnderstand) {
  const pctKnow = totalPts > 0 ? Math.round((ptsKnow / totalPts) * 100) : 0;
  const pctUnderstand = totalPts > 0 ? Math.round((ptsUnderstand / totalPts) * 100) : 0;
  return totalPts > 0 ? Math.max(0, 100 - pctKnow - pctUnderstand) : 0;
}
function pctOfTen(totalPts) {
  return totalPts > 0 ? Math.round((totalPts / 10) * 100) : 0;
}

// GĐ5c layer must exist and come AFTER the legacy neumorphism block (~line 1443).
const neuIdx = html.indexOf('MATRIXEDU 3D NEUMORPHISM');
const gd5cIdx = html.indexOf('GĐ5c (UI-12)');
check('UI-12 GĐ5c override layer exists after neumorphism block',
  neuIdx > 0 && gd5cIdx > neuIdx, `neu=${neuIdx} gd5c=${gd5cIdx}`);

// 1. Header contrast (tokens from :root).
const dark = '#0F172A'; const surface = '#FFFFFF'; const line = '#CBD5E1';
check('UI-12 white title on dark header contrast >= 4.5', contrast(surface, dark) >= 4.5,
  `ratio=${contrast(surface, dark).toFixed(2)}`);
check('UI-12 subtitle #CBD5E1 on dark header contrast >= 4.5', contrast(line, dark) >= 4.5,
  `ratio=${contrast(line, dark).toFixed(2)}`);
check('UI-12 override restores dark header background',
  /\.app-header\s*\{\s*background:\s*var\(--mx-dark\)/.test(html.slice(gd5cIdx)),
  'missing .app-header dark override in GĐ5c layer');
check('UI-12 header Drive button readable (white text, not blue-soft on white)',
  /#header-drive-bank-btn\s*\{[^}]*color:\s*var\(--mx-surface\)/.test(html.slice(gd5cIdx)),
  'missing #header-drive-bank-btn white-text override');
check('UI-12 ghost-light buttons readable on dark header',
  /\.btn-ghost-light\s*\{[^}]*color:\s*var\(--mx-surface\)/.test(html) && !/\.btn-ghost-light\s*\{/.test(html.slice(gd5cIdx)),
  'ghost-light is not white-on-dark, or the GĐ5c layer redefines it (UI-02 duplicate)');
check('UI-12 toast readable (dark bg, white text)',
  /\.toast\s*\{[^}]*background:\s*var\(--mx-dark\)/.test(html.slice(gd5cIdx)),
  'missing .toast dark override in GĐ5c layer');
check('UI-12 sidebar badge "7 BƯỚC" readable (blue bg, white text)',
  /\.sidebar-title-badge\s*\{[^}]*background:\s*var\(--mx-blue\)[^}]*color:\s*var\(--mx-surface\)/.test(html.slice(gd5cIdx)),
  'missing .sidebar-title-badge override in GĐ5c layer');

// 2. Section 1.1 layout: 2 columns, labels nowrap, table headers nowrap.
const step1 = html.slice(html.indexOf('<section id="step-1"'), html.indexOf('<section id="step-2"'));
check('UI-13 1.1 uses .meta-grid (2 columns) instead of .grid-4',
  step1.includes('class="meta-grid"') && !step1.includes('class="grid-4"'),
  'grid-4 still present in step 1 or meta-grid missing');
check('UI-13 .meta-grid is 2 columns',
  /#step-1 \.meta-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/.test(html),
  'missing 2-column meta-grid rule');
check('UI-13 1.1 labels do not wrap',
  /#step-1 \.meta-grid \.form-group label\s*\{[^}]*white-space:\s*nowrap/.test(html),
  'missing label nowrap rule');
check('UI-13 1.3 table headers do not break vertically',
  /#units-table th\s*\{[^}]*white-space:\s*nowrap/.test(html),
  'missing #units-table th nowrap rule');

// 3. Exam-code presets are clearly presets, not displayed ranges.
const presets = [...html.matchAll(/setQuickExamCodes\('([^']+)'\)/g)].map(m => m[1]);
check('UI-13 four quick presets exist', presets.length === 4, `found ${presets.length}`);
check('UI-13 every preset parses to exactly 4 distinct codes',
  presets.length === 4 && presets.every(p => {
    const codes = p.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    return codes.length === 4 && new Set(codes).size === 4;
  }), JSON.stringify(presets));
check('UI-13 default code list is exactly 101, 102, 103, 104',
  html.includes('id="meta-custom-codes" value="101, 102, 103, 104"'),
  'default meta-custom-codes value wrong');
check('UI-13 presets labelled "Chọn nhanh:" (not mistaken for the list)',
  html.includes('Chọn nhanh:'),
  'missing "Chọn nhanh:" caption');
check('UI-13 no misleading "132–485" range label on a preset button',
  !html.includes('>132–485<'),
  'range-style label 132–485 still present');

// 4. Honest sync status.
const renderBank = html.slice(html.indexOf('function renderDriveBankReport'));
check('UI-13 sync badge only "Đã đồng bộ" when there is data',
  renderBank.includes('setGdriveSyncBadge(hasBankData)') && !renderBank.includes('setGdriveSyncBadge(true);'),
  'unconditional setGdriveSyncBadge(true) still present');
check('UI-13 empty scan reports "ĐÃ QUÉT: 0 TỆP" instead of "ĐỒNG BỘ 0 TỆP"',
  html.includes('ĐÃ QUÉT: 0 TỆP — NGÂN HÀNG TRỐNG'),
  'missing empty-scan pill text');
check('UI-13 "Cam kết nguồn gốc" only shown when bank has questions',
  renderBank.includes('total > 0') && renderBank.includes('Ngân hàng đang trống:'),
  'Cam kết box not conditional / empty-bank message missing');
check('UI-13 sync pill cannot wrap/overlap the folder name',
  renderBank.includes('white-space: nowrap; flex-shrink: 0'),
  'missing nowrap/flex-shrink on sync pill');

// 5. Divide-by-zero percentages.
check('UI-14 pctApply guarded by totalPts > 0 (both sites)',
  (html.match(/const pctApply = totalPts > 0 \? Math\.max\(0, 100 - pctKnow - pctUnderstand\) : 0;/g) || []).length === 2,
  'guarded pctApply count != 2');
check('UI-14 no unguarded pctApply residual remains',
  !/const pctApply = Math\.max\(0, 100 - pctKnow - pctUnderstand\);/.test(html),
  'unguarded pctApply still present');
check('UI-14 points cell uses pctOfTen instead of hardcoded (100%)',
  (html.match(/\(\$\{pctOfTen\}%\)/g) || []).length >= 2 && !/totalPts\.toFixed\(1\)\.replace\([^)]*\)\} điểm \(100%\)<\/td>/.test(html),
  'hardcoded (100%) still present or pctOfTen unused');
// Note: two other "(100%)" strings are legitimate and guarded — the summary
// line (only when summaryParts.length > 0) and the modal badge "Đạt chuẩn 10.0
// điểm (100%)" (only when total is exactly 10.0).
check('UI-14 pctApply(0 total) = 0, not 100', pctApplyFixed(0, 0, 0) === 0);
check('UI-14 pctApply(10 total, 3/3) = 40', pctApplyFixed(10, 3, 3) === 40);
check('UI-14 pctOfTen(0) = 0, pctOfTen(10) = 100',
  pctOfTen(0) === 0 && pctOfTen(10) === 100 && pctOfTen(5) === 50);

// 6. Step navigation: first click on "Bước 2" navigates.
const confirmFn = html.slice(html.indexOf('function confirmStep1AndGoStep2'));
const innerIfIdx = confirmFn.indexOf('if (!appState.units', confirmFn.indexOf('await runStep1Analysis'));
const innerBranch = confirmFn.slice(innerIfIdx, confirmFn.indexOf('}', innerIfIdx));
check('UI-14 first click navigates even with no units (goToStep before return)',
  innerBranch.includes('goToStep(2)') && innerBranch.indexOf('goToStep(2)') < innerBranch.indexOf('return;'),
  'empty-units branch still returns without navigating');
check('UI-14 empty-units branch explains why (toast)',
  confirmFn.includes("showToast('Chưa có đơn vị kiến thức"),
  'missing explanatory toast in empty-units branch');

// 7. Step 5 render + step 7 message + duplicate save.
check('UI-14 goToStep(5) calls the existing render function',
  html.includes('if (stepNum === 5) renderAnswerAndQaStep();') && !html.includes('renderAnswersStep()'),
  'renderAnswersStep() (nonexistent) still called');
check('UI-14 step 5 shows empty-state text when no data',
  html.includes('Chưa có báo cáo kiểm định chất lượng (QA)') && html.includes('Chưa có câu hỏi nào — hãy hoàn thành Bước 4'),
  'missing step-5 empty states');
check('UI-14 step 7 empty message points at step 7, not step 3',
  !html.includes('kéo thả phiếu ở Bước 3') && html.includes('chấm phiếu ở Bước 7'),
  'wrong step reference still present');
const step4 = html.slice(html.indexOf('<section id="step-4"'), html.indexOf('<section id="step-5"'));
const saveCountStep4 = (step4.match(/saveCurrentProfile\(false, true\)/g) || []).length;
check('UI-14 step 4 has exactly one "Lưu kho" button', saveCountStep4 === 1,
  `found ${saveCountStep4} saveCurrentProfile(false, true) calls in step 4`);

console.log(`\nCỔNG GĐ5c: ${pass} ĐẠT / ${fail} RỚT`);
if (fail > 0) { console.log('Rớt: ' + failures.join(' | ')); process.exit(1); }
