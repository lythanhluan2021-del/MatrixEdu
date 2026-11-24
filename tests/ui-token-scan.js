/**
 * tests/ui-token-scan.js — GĐ5 (UI-01..UI-08) scanner.
 * Quét tĩnh index.html + favicon.svg, kiểm tra hệ thống thiết kế QĐ7:
 *  - mọi mã hex trong <style> phải là token khai báo trong :root (UI-01)
 *  - không gradient / không var(--neu-) trong CSS (UI-07)
 *  - mỗi lớp .btn-* định nghĩa đúng 1 lần, không còn btn-success/accent/outline (UI-02)
 *  - không emoji trong toàn file (UI-06)
 *  - không font-size nào dưới 12px (UI-07)
 *  - không nút nào bị nhuộm màu nền/chữ bằng inline style (UI-02)
 *  - modal đăng nhập GĐ1 + cơ chế ẩn đáp án ngân hàng còn nguyên (không phá GĐ1)
 *
 * Ngoại lệ có ghi chú: mã hex trong code canvas (fillStyle...) được phép vì
 * canvas không hiểu var(); quét hex chỉ áp dụng cho khối <style>.
 * Chạy: node tests/ui-token-scan.js  (exit 0 = đạt, exit 1 = còn lỗi, in danh sách)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const favicon = fs.readFileSync(path.join(ROOT, 'favicon.svg'), 'utf-8');

const failures = [];
const notes = [];
function check(name, ok, detail) {
  if (ok) notes.push(`PASS ${name}${detail ? ' — ' + detail : ''}`);
  else failures.push(`FAIL ${name}${detail ? ' — ' + detail : ''}`);
}

const styleM = html.match(/<style>([\s\S]*?)<\/style>/);
const style = styleM ? styleM[1] : '';

function hexes(text) {
  const out = new Set();
  for (const m of text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    let h = m[0].toLowerCase();
    if (h.length === 4) h = '#' + [...h.slice(1)].map(c => c + c).join('');
    out.add(h);
  }
  return out;
}

// UI-01: hex ngoài token = 0
const rootM = style.match(/:root\s*\{([\s\S]*?)\n    \}/);
const rootHex = rootM ? hexes(rootM[1]) : new Set();
const outside = [...hexes(style)].filter(h => !rootHex.has(h));
check('UI-01 hex ngoài :root = 0', outside.length === 0,
  `${outside.length} ngoài token (${rootHex.size} token): ${outside.join(', ') || 'không có'}`);

// UI-07: không gradient, không neumorphism trong CSS
const grads = (style.match(/(linear|radial)-gradient\(/g) || []).length;
check('UI-07 gradient trong CSS = 0', grads === 0, `${grads} gradient`);
const neu = (style.match(/var\(--neu-/g) || []).length;
check('UI-07 var(--neu-) = 0', neu === 0, `${neu} tham chiếu`);

// UI-02: hệ nút duy nhất
const btnDefs = {};
for (const m of style.matchAll(/\.(btn-(?:primary|secondary|success|accent|danger|outline|ghost-light|sm|lg))\s*\{/g)) {
  btnDefs[m[1]] = (btnDefs[m[1]] || 0) + 1;
}
const dups = Object.entries(btnDefs).filter(([, n]) => n > 1);
check('UI-02 không định nghĩa .btn-* trùng', dups.length === 0,
  dups.length ? JSON.stringify(dups) : 'mỗi lớp 1 lần');
const legacyBtn = ['btn-success', 'btn-accent', 'btn-outline'].filter(b => btnDefs[b]);
check('UI-02 không còn btn-success/accent/outline', legacyBtn.length === 0, legacyBtn.join(', ') || 'đã bỏ');
const btnColour = [...html.matchAll(/<button\b[^>]*style="([^"]*)"/g)]
  .filter(m => /(?<![-\w])(color|background)\s*:/.test(m[1]));
check('UI-02 không nút nhuộm màu inline', btnColour.length === 0, `${btnColour.length} nút`);

// UI-06: không emoji
const emojiRe = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/u;
const emojiHits = [...html.matchAll(new RegExp(emojiRe, 'gu'))];
check('UI-06 emoji = 0', emojiHits.length === 0, `${emojiHits.length} emoji`);
const btnEmoji = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)]
  .reduce((n, m) => n + (m[1].match(new RegExp(emojiRe, 'gu')) || []).length, 0);
check('UI-06 emoji trong nút = 0', btnEmoji === 0, `${btnEmoji} emoji`);
const headEmoji = [...html.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/g)]
  .reduce((n, m) => n + (m[1].match(new RegExp(emojiRe, 'gu')) || []).length, 0);
check('UI-06 emoji trong tiêu đề = 0', headEmoji === 0, `${headEmoji} emoji`);

// UI-07: cỡ chữ tối thiểu 12px (0.75rem / 12px)
const tiny = [];
for (const m of html.matchAll(/font-size:\s*([\d.]+)(rem|em|px)/g)) {
  const px = m[2] === 'px' ? parseFloat(m[1]) : parseFloat(m[1]) * 16;
  if (px < 12) tiny.push(m[0]);
}
check('UI-07 font-size >= 12px', tiny.length === 0, `${tiny.length} vị trí < 12px`);

// UI-05: favicon phẳng 3 màu, không gradient
const favHex = [...hexes(favicon)].sort();
const favOk = favHex.length <= 3 && favHex.every(h => ['#2563eb', '#d97706', '#ffffff'].includes(h));
check('UI-05 favicon tối đa 3 màu QĐ7', favOk, favHex.join(', '));
check('UI-05 favicon không gradient', !/linearGradient|radialGradient/.test(favicon), '');

// Không phá GĐ1: modal đăng nhập + ẩn đáp án ngân hàng
check('GĐ1 #auth-modal còn nguyên', html.includes('id="auth-modal"'), '');
check('GĐ1 #auth-header-btn còn nguyên', html.includes('id="auth-header-btn"'), '');
check('GĐ1 checkAuthStatus còn nguyên', html.includes('checkAuthStatus'), '');
check('GĐ1 ẩn đáp án khi chưa đăng nhập', html.includes('includeAnswers=1') && html.includes('__mxAuthed'), '');

// UI-03: các vùng bước dùng chung màu chủ đạo (không còn mã hex màu bước riêng trong CSS)
const stepColourRules = (style.match(/\.(glass-zone-step-\d|icon-tint-\d)\s*\{/g) || []).length;
check('UI-03 không còn glass-zone-step-*/icon-tint-* riêng', stepColourRules === 0, `${stepColourRules} quy tắc`);

for (const n of notes) console.log(n);
if (failures.length) {
  console.log('\n--- LỖI ---');
  for (const f of failures) console.log(f);
  console.log(`\nUI-TOKEN-SCAN: ${failures.length} lỗi / ${notes.length + failures.length} kiểm tra`);
  process.exit(1);
}
console.log(`\nUI-TOKEN-SCAN: PASS ${notes.length}/${notes.length} kiểm tra`);
