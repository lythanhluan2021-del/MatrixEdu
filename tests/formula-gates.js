'use strict';
/**
 * Cổng GĐ5b — công thức (UI-09): trích xuất OMML, chuẩn hóa LaTeX khi xuất Word
 * và hiển thị LaTeX phía client.
 *
 * Chạy: node tests/formula-gates.js
 * Dữ liệu: ~/workspace/matrixedu-formula-test/*.docx (đã có sẵn từ vòng kiểm tra
 * công thức 2026-11-24 — KHÔNG tạo file test mới).
 */
const fs = require('fs');
const path = require('path');
const { extractDocumentContent } = require('../src/doc-parser');
const { normalizeMathForWord } = require('../src/zip-docx');

const FORMULA_DIR = process.env.FORMULA_TEST_DIR
  || path.join(process.env.HOME || '', 'workspace', 'matrixedu-formula-test');

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function extractDocx(file) {
  const buf = fs.readFileSync(path.join(FORMULA_DIR, file));
  return extractDocumentContent(file, buf, '').text || '';
}

// --- Lấy hàm hiển thị phía client từ index.html (test đúng code thật) ---
function loadClientFormatter() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('// GĐ5b-START formatMathForDisplay');
  const end = html.indexOf('// GĐ5b-END formatMathForDisplay');
  if (start < 0 || end < 0 || end <= start) return null;
  const src = html.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${src}; return formatMathForDisplay;`)();
}

console.log('=== GĐ5b — CỔNG CÔNG THỨC ===\n');

// 1. Trích xuất OMML (Equation Editor) — phân số và căn phải giữ cấu trúc
console.log('-- 1. Trích xuất OMML --');
const ly = extractDocx('VatLy12.docx');
check('VatLy OMML: phân số 1/2 không thành "12"', /1\/2/.test(ly) && !/Câu 5 \(công thức Equation Editor[^)]*\)\s*:\s*12/.test(ly), JSON.stringify(ly.split('\n').find(l => l.includes('Câu 5')) || ''));
check('VatLy OMML: căn có dấu √', /√/.test(ly), JSON.stringify(ly.split('\n').find(l => l.includes('Câu 5')) || ''));
const omml = extractDocx('OMML_that.docx');
check('OMML thật Câu A: 1/2 + căn 2gh', /1\/2/.test(omml) && /√/.test(omml) && !/12 \+ 2gh/.test(omml), JSON.stringify(omml.split('\n').find(l => l.includes('Câu A')) || ''));
check('OMML thật Câu B: a/b + căn x', /a\/b/.test(omml) && /√/.test(omml) && !/ab \+ x/.test(omml), JSON.stringify(omml.split('\n').find(l => l.includes('Câu B')) || ''));
const toan = extractDocx('Toan12.docx');
check('Toan OMML Câu 6: a/b + căn x', /a\/b/.test(toan) && /√/.test(toan), JSON.stringify(toan.split('\n').find(l => l.includes('Câu 6')) || ''));
// Hồi quy: các dạng cũ vẫn giữ nguyên
check('Toan LaTeX giữ nguyên mã nguồn', toan.includes('\\frac{1}{2}') && toan.includes('\\int_0^1'), 'thiếu chuỗi LaTeX gốc');
check('HoaHoc Unicode giữ nguyên (H₂SO₄, →)', extractDocx('HoaHoc12.docx').includes('H₂SO₄') && extractDocx('HoaHoc12.docx').includes('→'), '');
check('VatLy chỉ số Word → ^/_ (v_0, at^2)', /v_0/.test(ly) && /at\^2/.test(ly), '');

// 2. normalizeMathForWord — hàm lượng giác/logarit
console.log('-- 2. normalizeMathForWord --');
const normCases = [
  ['\\sin x', 'sin x'],
  ['\\cos 2x', 'cos 2x'],
  ['\\tan x + \\cot x', 'tan x + cot x'],
  ['\\log[H^+]', 'log[H^+]'],
  ['\\ln x + \\lg x', 'ln x + lg x'],
  ['\\exp(x)', 'exp(x)'],
  ['\\min(a,b) \\max(a,b)', 'min(a,b) max(a,b)'],
  ['\\frac{1}{2}', '1/2'],
  ['\\sqrt{x^2 + 1}', '√(x^2 + 1)'],
  ['\\int_0^1 x^2 dx', '∫'],
  ['x \\in \\mathbb{R}', 'x ∈ ℝ'],
];
for (const [input, expected] of normCases) {
  const out = normalizeMathForWord('$' + input + '$');
  check(`normalize ${JSON.stringify(input)} → chứa ${JSON.stringify(expected)}`, out.includes(expected) && !out.includes('\\sin') && !out.includes('\\cos') && !out.includes('\\tan') && !out.includes('\\log') && !out.includes('\\ln') && !out.includes('\\lg') && !out.includes('\\exp'), JSON.stringify(out));
}

// 3. Hiển thị phía client — formatMathForDisplay trong index.html
console.log('-- 3. formatMathForDisplay (client) --');
const fmt = loadClientFormatter();
check('index.html có hàm formatMathForDisplay', typeof fmt === 'function', 'không tìm thấy hàm');
if (typeof fmt === 'function') {
  const displayCases = [
    ['$\\frac{1}{2}$', '1/2'],
    ['$\\sqrt{x^2 + 1}$', '√'],
    ['$E = mc^2$', 'E = mc^2'],
    ['$\\sin x$', 'sin x'],
    ['$\\int_0^1 x^2 dx$', '∫'],
    ['$x \\in \\mathbb{R}$', 'ℝ'],
    ['Câu thường không có công thức', 'Câu thường không có công thức'],
  ];
  for (const [input, expected] of displayCases) {
    const out = fmt(input);
    check(`hiển thị ${JSON.stringify(input)} → chứa ${JSON.stringify(expected)}`, out.includes(expected) && !out.includes('\\frac') && !out.includes('\\sin') && !out.includes('\\int') && !out.includes('\\sqrt'), JSON.stringify(out));
  }
}

console.log(`\n================================================================================`);
console.log(` CỔNG GĐ5b CÔNG THỨC: ${pass} ĐẠT / ${fail} RỚT`);
console.log(`================================================================================`);
if (fail > 0) {
  console.log('Rớt:', failures.join(' | '));
  process.exit(1);
}
