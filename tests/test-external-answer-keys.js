/**
 * tests/test-external-answer-keys.js
 * Kiểm thử tính năng Nạp Biểu đáp án từ phần mềm khác (McMIX, TnMaker, SmartTest, QM, Excel, Word, CSV, Zalo)
 */

const assert = require('assert');
const {
  parseTextAnswerKey,
  parseMatrix2DToKeys,
  parseAnyAnswerKeyFile,
  generateSampleAnswerKeyCsv
} = require('../src/answer-key-parser');
const { createZipBuffer } = require('../src/zip-docx');
const { gradeBatchPapers } = require('../src/omr-engine');

console.log('================================================================');
console.log('🧪 TESTING EXTERNAL ANSWER KEY IMPORT ENGINE (McMIX, TnMaker, etc.)');
console.log('================================================================\n');

// 1. TEST CSV SAMPLE (3 PHẦN: PHẦN I, PHẦN II, PHẦN III)
console.log('▶ [Test 1] Testing CSV Sample Import (3 parts)...');
const csvStr = generateSampleAnswerKeyCsv();
const keys1 = parseTextAnswerKey(csvStr);
assert.strictEqual(Object.keys(keys1).length, 4, 'Phải có đủ 4 mã đề: 101, 102, 103, 104');
assert.strictEqual(keys1['101'].part1.length, 18, 'Phần I phải có 18 câu');
assert.strictEqual(Object.keys(keys1['101'].part2).length, 4, 'Phần II phải có 4 câu');
assert.strictEqual(Object.keys(keys1['101'].part3).length, 6, 'Phần III phải có 6 câu');
assert.strictEqual(keys1['101'].part3['1'], '12.5', 'Phần III câu 1 phải là 12.5');
console.log('  ✅ Test 1 Passed: CSV Sample successfully parsed 3 parts!');

// 2. TEST McMIX / SmartTest TEXT EXPORT FORMAT
console.log('\n▶ [Test 2] Testing McMIX Text Export Format...');
const mcmixText = `
BẢNG ĐÁP ÁN ĐỀ THI TRỘN MCMIX
Mã đề: 101
1. A    2. B    3. C    4. D    5. A    6. B    7. C    8. D
Phần II: Câu hỏi Đúng/Sai
Câu 1: a-Đ, b-S, c-Đ, d-S
Câu 2: a-Đ, b-Đ, c-S, d-S
Phần III: Trả lời ngắn
1: 15.5
2: -3
3: 0.25

Mã đề: 102
1. B    2. C    3. D    4. A    5. B    6. C    7. D    8. A
Phần II: Đúng/Sai
1a: Đ, 1b: S, 1c: Đ, 1d: S
Phần III
Câu 1: 2025
`;
const keys2 = parseTextAnswerKey(mcmixText);
assert.strictEqual(Object.keys(keys2).length, 2, 'Phải nhận diện 2 mã đề 101 và 102');
assert.strictEqual(keys2['101'].part1[0], 'A', '101 Câu 1 là A');
assert.strictEqual(keys2['101'].part1[3], 'D', '101 Câu 4 là D');
assert.strictEqual(keys2['101'].part2['1']['b'], 'S', '101 Câu 1b là S');
assert.strictEqual(keys2['101'].part3['1'], '15.5', '101 Câu 1 Part 3 là 15.5');
assert.strictEqual(keys2['101'].part3['2'], '-3', '101 Câu 2 Part 3 là -3');
assert.strictEqual(keys2['102'].part3['1'], '2025', '102 Câu 1 Part 3 là 2025');
console.log('  ✅ Test 2 Passed: McMIX Text format successfully parsed!');

// 3. TEST TnMaker / QM FORMAT
console.log('\n▶ [Test 3] Testing TnMaker / QM Export Format...');
const tnMakerText = `
[101]
1A 2B 3C 4D 5A 6B 7C 8D
1a: Đ, 1b: S, 1c: Đ, 1d: S
2a: S, 2b: Đ, 2c: Đ, 2d: S
[102]
1B 2C 3D 4A 5B 6C 7D 8A
1a: S, 1b: Đ, 1c: S, 1d: Đ
`;
const keys3 = parseTextAnswerKey(tnMakerText);
assert.strictEqual(Object.keys(keys3).length, 2, 'Phải có 2 mã đề');
assert.strictEqual(keys3['101'].part1[1], 'B');
assert.strictEqual(keys3['102'].part1[0], 'B');
assert.strictEqual(keys3['102'].part2['1']['a'], 'S');
console.log('  ✅ Test 3 Passed: TnMaker format successfully parsed!');

// 4. TEST WORD (.DOCX) TABLE FORMAT
console.log('\n▶ [Test 4] Testing Word (.docx) Table Import...');
const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>ĐÁP ÁN ĐỀ THI</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Câu</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>101</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>102</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>B</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>2</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>C</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>D</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>1a</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Đ</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>S</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
const docxBuf = createZipBuffer({ 'word/document.xml': Buffer.from(docXml, 'utf8') });
const keys4 = parseAnyAnswerKeyFile('dapan_word.docx', docxBuf);
assert.strictEqual(Object.keys(keys4).length, 2, 'Docx phải parse được 2 mã đề');
assert.strictEqual(keys4['101'].part1[0], 'A');
assert.strictEqual(keys4['102'].part1[1], 'D');
assert.strictEqual(keys4['101'].part2['1']['a'], 'Đ');
assert.strictEqual(keys4['102'].part2['1']['a'], 'S');
console.log('  ✅ Test 4 Passed: Word .docx table successfully parsed!');

// 5. TEST REAL .XLSX (attribute order t="s" before r="B1", inlineStr, self-closing <c/>, title year banner, col offset)
console.log('\n▶ [Test 5] Testing Tricky Real .xlsx XML Edge Cases...');
const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7">
  <si><t>TRƯỜNG THPT ABC - NĂM HỌC</t></si>
  <si><t>Câu</t></si>
  <si><t>A</t></si>
  <si><t>B</t></si>
  <si><t>C</t></si>
  <si><t>D</t></si>
  <si><t>Đ</t></si>
</sst>`;
const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="B1" t="s"><v>0</v></c>
      <c r="C1"><v>2025</v></c>
      <c r="D1"><v>2026</v></c>
    </row>
    <row r="2">
      <c t="s" r="B2"><v>1</v></c>
      <c r="C2"><v>101</v></c>
      <c r="D2" t="inlineStr"><is><t>Mã 102</t></is></c>
    </row>
    <row r="3">
      <c r="B3"><v>1</v></c>
      <c t="s" r="C3"><v>2</v></c>
      <c r="D3" t="inlineStr"><is><t>D</t></is></c>
    </row>
    <row r="4">
      <c r="B4"><v>2</v></c>
      <c r="C4" t="str"><v>C</v></c>
      <c r="D4" t="s"><v>3</v></c>
    </row>
    <row r="5">
      <c r="A5"/>
      <c r="B5" t="inlineStr"><is><t>1a</t></is></c>
      <c t="s" r="C5"><v>6</v></c>
      <c r="D5" t="inlineStr"><is><t>S</t></is></c>
    </row>
  </sheetData>
</worksheet>`;
const xlsxBuf = createZipBuffer({
  'xl/sharedStrings.xml': Buffer.from(sharedStringsXml, 'utf8'),
  'xl/worksheets/sheet1.xml': Buffer.from(sheet1Xml, 'utf8')
});
const keys5 = parseAnyAnswerKeyFile('dapan_thpt.xlsx', xlsxBuf);
assert.deepStrictEqual(Object.keys(keys5).sort(), ['101', '102'], 'Không được nhận nhầm 2025/2026 ở dòng tiêu đề và phải đọc được B2..D5');
assert.strictEqual(keys5['101'].part1[0], 'A');
assert.strictEqual(keys5['102'].part1[0], 'D');
assert.strictEqual(keys5['101'].part1[1], 'C');
assert.strictEqual(keys5['102'].part1[1], 'B');
assert.strictEqual(keys5['101'].part2['1']['a'], 'Đ');
assert.strictEqual(keys5['102'].part2['1']['a'], 'S');
console.log('  ✅ Test 5 Passed: Real .xlsx edge cases (t before r, inlineStr, <c/>, year banner, B-col offset) passed!');

// 6. TEST WORD .DOCX MULTI-TABLE (Table 1 Phần I + Table 2 Phần II separate Ý col + Table 3 Phần III)
console.log('\n▶ [Test 6] Testing Multi-Table Word .docx (Phần I, II, III split across 3 tables)...');
const multiTblDocXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>PHẦN I</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>Câu</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>101</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>102</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>D</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:t>PHẦN II</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>Câu</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Ý</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>101</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>102</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>a</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Đ</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>S</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:t>PHẦN III</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc><w:p><w:r><w:t>Câu</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>101</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>102</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>12.5</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>-3</w:t></w:r></w:p></w:tc></w:tr>
    </w:tbl>
  </w:body>
</w:document>`;
const keys6 = parseAnyAnswerKeyFile('multi.docx', createZipBuffer({ 'word/document.xml': Buffer.from(multiTblDocXml, 'utf8') }));
assert.strictEqual(keys6['101'].part1[0], 'A');
assert.strictEqual(keys6['101'].part2['1']['a'], 'Đ');
assert.strictEqual(keys6['101'].part3['1'], '12.5');
assert.strictEqual(keys6['102'].part3['1'], '-3');
console.log('  ✅ Test 6 Passed: Multi-table Word .docx merged Phần I, II, III!');

// 7. TEST HORIZONTAL MATRIX (Dạng C: row = mã đề, cols = câu) & HTML-DISGUISED .XLS + OLE2 BINARY GUARD
console.log('\n▶ [Test 7] Testing Horizontal Table, HTML .xls, and Binary OLE2 .xls Error Message...');
const horizKeys = parseMatrix2DToKeys([
  ['Mã đề', '1', '2', '3', '4', '1a', '1b'],
  ['201', 'A', 'B', 'C', 'D', 'Đ', 'S'],
  ['202', 'D', 'C', 'B', 'A', 'S', 'Đ']
]);
assert.strictEqual(horizKeys['201'].part1[0], 'A');
assert.strictEqual(horizKeys['202'].part1[3], 'A');
assert.strictEqual(horizKeys['201'].part2['1']['b'], 'S');

const htmlXls = Buffer.from(`<html><body><table>
  <tr><th>Câu</th><th>301</th><th>302</th></tr>
  <tr><td>1</td><td>B</td><td>C</td></tr>
  <tr><td>1a</td><td>Đ</td><td>S</td></tr>
</table></body></html>`, 'utf8');
const htmlKeys = parseAnyAnswerKeyFile('mcmix_export.xls', htmlXls);
assert.strictEqual(htmlKeys['301'].part1[0], 'B');
assert.strictEqual(htmlKeys['302'].part2['1']['a'], 'S');

const ole2Header = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0x00, 0x00]);
assert.throws(() => parseAnyAnswerKeyFile('legacy.xls', ole2Header), /97-2003|\.xlsx/i);

const singleCodeXlsx = createZipBuffer({
  'xl/sharedStrings.xml': Buffer.from('<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Câu</t></si><si><t>A</t></si></sst>', 'utf8'),
  'xl/worksheets/sheet1.xml': Buffer.from('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c t="s" r="A1"><v>0</v></c><c r="B1"><v>501</v></c></row><row r="2"><c r="A2"><v>1</v></c><c t="s" r="B2"><v>1</v></c></row></sheetData></worksheet>', 'utf8')
});
const singleKeys = parseAnyAnswerKeyFile('single_501.xlsx', singleCodeXlsx);
assert.deepStrictEqual(Object.keys(singleKeys), ['501']);
assert.strictEqual(singleKeys['501'].part1[0], 'A');
console.log('  ✅ Test 7 Passed: Horizontal table, HTML .xls, binary .xls guard, and single-code small .xlsx verified!');

// Test 8: TNMaker 2025 formats (Compact ĐSĐS cells, Contiguous ABCD strings, Horizontal P1+P2+P3, Word Merged Cells)
console.log('\n▶ [Test 8] Testing TNMaker 2025 & Word Per-Code Formats...');
const tnmakerHorizontalCsv = [
  'Mã đề,P1.1,P1.2,P1.3,P1.4,P2.1,P2.2,P3.1,P3.2',
  '101,A,B,C,D,ĐSĐS,SĐSĐ,12.5,-3',
  '102,B,C,D,A,SĐSĐ,ĐĐSS,0.25,2025'
].join('\n');
const tnm1 = parseTextAnswerKey(tnmakerHorizontalCsv);
assert.deepStrictEqual(tnm1['101'].part1, ['A', 'B', 'C', 'D']);
assert.deepStrictEqual(tnm1['101'].part2['1'], { a: 'Đ', b: 'S', c: 'Đ', d: 'S' });
assert.deepStrictEqual(tnm1['102'].part2['2'], { a: 'Đ', b: 'Đ', c: 'S', d: 'S' });
assert.strictEqual(tnm1['101'].part3['1'], '12.5');
assert.strictEqual(tnm1['102'].part3['2'], '2025');

const tnmakerStringCsv = [
  'Mã đề,Đáp án P1,Đáp án P2',
  '201,ABCDABCD,ĐSĐS SĐSĐ',
  '202,DCBADCB A,1:ĐĐSS;2:SSĐĐ'
].join('\n');
const tnm2 = parseTextAnswerKey(tnmakerStringCsv);
assert.strictEqual(tnm2['201'].part1.length, 8);
assert.strictEqual(tnm2['201'].part1[0], 'A');
assert.deepStrictEqual(tnm2['201'].part2['1'], { a: 'Đ', b: 'S', c: 'Đ', d: 'S' });
assert.deepStrictEqual(tnm2['202'].part2['2'], { a: 'S', b: 'S', c: 'Đ', d: 'Đ' });

const tnmakerTxt = `Mã đề 301: ABCDABCDABCD
Phần II:
Câu 1: Đ-S-Đ-S
Câu 2: a) Sai, b) Đúng, c) Đúng, d) Sai
Phần III:
1: -4,5`;
const tnm3 = parseTextAnswerKey(tnmakerTxt);
assert.strictEqual(tnm3['301'].part1.length, 12);
assert.deepStrictEqual(tnm3['301'].part2['1'], { a: 'Đ', b: 'S', c: 'Đ', d: 'S' });
assert.deepStrictEqual(tnm3['301'].part2['2'], { a: 'S', b: 'Đ', c: 'Đ', d: 'S' });
assert.strictEqual(tnm3['301'].part3['1'], '-4.5');

const mergedWordMatrix = [
  ['Câu', 'Ý', 'Mã 101', 'Mã 102'],
  ['Câu 1 (1,0đ)', 'a)', 'Sai (Gốc C1.d)', 'Đúng (Gốc C2.a)'],
  ['', 'b)', 'Đúng (Gốc C1.c)', 'Sai (Gốc C2.b)'],
  ['', 'c)', 'Đúng (Gốc C1.a)', 'Đúng (Gốc C2.c)'],
  ['', 'd)', 'Sai (Gốc C1.b)', 'Sai (Gốc C2.d)']
];
const tnm4 = parseMatrix2DToKeys(mergedWordMatrix);
assert.deepStrictEqual(tnm4['101'].part2['1'], { a: 'S', b: 'Đ', c: 'Đ', d: 'S' });
assert.deepStrictEqual(tnm4['102'].part2['1'], { a: 'Đ', b: 'S', c: 'Đ', d: 'S' });
console.log('  ✅ Test 8 Passed: TNMaker 2025 compact ĐSĐS, contiguous ABCD strings, and merged Word cells verified!');

// Test 9: Full 3-Part MoET 2025 (Phần I + Phần II + Phần III: single digits 1..4, decimals, essay ignore, TNMaker 3-part compact, Toán 0.5đ & KHTN 0.25đ grading)
console.log('\n▶ [Test 9] Testing Full 3-Part MoET 2025 Word/TNMaker Import & Grading (Toán 0.5đ + KHTN 0.25đ)...');
function makeDocxRowXml(cells) {
  return `<w:tr>${cells.map(c => `<w:tc><w:p><w:r><w:t>${c}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
}
function makeDocxParaXml(text) {
  return `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
}
const fullMoetDocxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
  ${makeDocxParaXml('PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN')}
  <w:tbl>
    ${makeDocxRowXml(['Câu', '101', '102'])}
    ${Array.from({ length: 12 }, (_, idx) => makeDocxRowXml([String(idx + 1), ['A','B','C','D'][idx % 4], ['B','C','D','A'][idx % 4]])).join('')}
  </w:tbl>
  ${makeDocxParaXml('PHẦN II. TRẮC NGHIỆM ĐÚNG SAI')}
  <w:tbl>
    ${makeDocxRowXml(['Câu', 'Ý', '101', '102'])}
    ${[1,2,3,4].map(q => ['a','b','c','d'].map((s, si) => makeDocxRowXml([si === 0 ? `Câu ${q}` : '', `${s})`, si % 2 === 0 ? 'Đ' : 'S', si % 2 === 0 ? 'S' : 'Đ'])).join('')).join('')}
  </w:tbl>
  ${makeDocxParaXml('PHẦN III. TRẢ LỜI NGẮN')}
  <w:tbl>
    ${makeDocxRowXml(['Câu', '101', '102'])}
    ${makeDocxRowXml(['1', '1', '4'])}
    ${makeDocxRowXml(['2', '2', '3'])}
    ${makeDocxRowXml(['3', '12,5', '-2,5'])}
    ${makeDocxRowXml(['4', '-3', '0,25'])}
    ${makeDocxRowXml(['5', '7', '9'])}
    ${makeDocxRowXml(['6', '2025', '100'])}
  </w:tbl>
  ${makeDocxParaXml('PHẦN IV. HƯỚNG DẪN CHẤM TỰ LUẬN')}
  <w:tbl>
    ${makeDocxRowXml(['Câu', 'Nội dung', 'Điểm'])}
    ${makeDocxRowXml(['1', 'Chứng minh...', '1,0'])}
  </w:tbl>
</w:body></w:document>`;
const fullMoetDocxBuf = createZipBuffer({ 'word/document.xml': Buffer.from(fullMoetDocxXml, 'utf8') });
const moetWordKeys = parseAnyAnswerKeyFile('Dap_an_Toan12_BGD2025.docx', fullMoetDocxBuf);
assert.strictEqual(moetWordKeys['101'].part1.length, 12);
assert.strictEqual(moetWordKeys['101'].part1[0], 'A', 'Part III single digit 1 must NOT overwrite Part I Q1');
assert.strictEqual(Object.keys(moetWordKeys['101'].part2).length, 4);
assert.strictEqual(moetWordKeys['101'].part3['1'], '1');
assert.strictEqual(moetWordKeys['101'].part3['2'], '2');
assert.strictEqual(moetWordKeys['101'].part3['3'], '12.5');
assert.strictEqual(moetWordKeys['101'].part3['4'], '-3');
assert.strictEqual(moetWordKeys['101'].part3['5'], '7');
assert.strictEqual(moetWordKeys['101'].part3['6'], '2025');
assert.strictEqual(moetWordKeys['102'].part3['3'], '-2.5');

// Per-code Word Part III (horizontal 2-row + vertical 2-col)
const perCodeP3DocxXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
  ${makeDocxParaXml('MÃ ĐỀ 201')}
  ${makeDocxParaXml('PHẦN III. TRẢ LỜI NGẮN')}
  <w:tbl>
    ${makeDocxRowXml(['Câu', '1', '2', '3', '4', '5', '6'])}
    ${makeDocxRowXml(['Đáp án', '1', '2', '12,5', '-3', '8', '0,25'])}
  </w:tbl>
  ${makeDocxParaXml('MÃ ĐỀ 202')}
  ${makeDocxParaXml('PHẦN III. TRẢ LỜI NGẮN')}
  <w:tbl>
    ${makeDocxRowXml(['Câu', 'Đáp án'])}
    ${makeDocxRowXml(['1', '4'])}
    ${makeDocxRowXml(['2', '-1,5'])}
  </w:tbl>
</w:body></w:document>`;
const perCodeP3Keys = parseAnyAnswerKeyFile('PerCode_P3.docx', createZipBuffer({ 'word/document.xml': Buffer.from(perCodeP3DocxXml, 'utf8') }));
assert.strictEqual(perCodeP3Keys['201'].part3['1'], '1');
assert.strictEqual(perCodeP3Keys['201'].part3['3'], '12.5');
assert.strictEqual(perCodeP3Keys['201'].part3['6'], '0.25');
assert.strictEqual(perCodeP3Keys['202'].part3['1'], '4');
assert.strictEqual(perCodeP3Keys['202'].part3['2'], '-1.5');

// 3-Part TNMaker compact CSV
const tnmCompact3PartCsv = [
  'Mã đề,P1,P2,P3',
  '301,ABCDABCDABCD,ĐSĐS SĐSĐ ĐĐSS SSĐĐ,12.5; -3; 0.25; 100; 8; 4'
].join('\n');
const tnmCompact3 = parseTextAnswerKey(tnmCompact3PartCsv);
assert.strictEqual(tnmCompact3['301'].part1.length, 12);
assert.strictEqual(Object.keys(tnmCompact3['301'].part2).length, 4);
assert.strictEqual(tnmCompact3['301'].part3['1'], '12.5');
assert.strictEqual(tnmCompact3['301'].part3['2'], '-3');
assert.strictEqual(tnmCompact3['301'].part3['6'], '4');

// Verify Toán 12 (12 TN x 0.25 + 4 Đ/S x 1.0 + 6 TLN x 0.5 = 10.00) with comma decimal matching
const toanP1Ans = {};
moetWordKeys['101'].part1.forEach((opt, i) => { toanP1Ans[i + 1] = opt; });
const toanGrade = gradeBatchPapers({
  answerKeysByCode: moetWordKeys,
  pointRules: { mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 },
  persistDbState: false,
  papers: [{
    id: 'toan-1',
    sbd: '000001',
    scannedExamCode: '101',
    answers: {
      part1: toanP1Ans,
      part2: moetWordKeys['101'].part2,
      part3: { '1': '1', '2': '2', '3': '12,5', '4': '-3', '5': '7', '6': '2025' }
    }
  }]
});
assert.strictEqual(toanGrade.gradedPapers[0].result.totalScore, 10, `Toán 12 must score 10.00, got ${toanGrade.gradedPapers[0].result.totalScore}`);
assert.strictEqual(toanGrade.gradedPapers[0].result.part3Score, 3, 'Toán 12 Part III (6 x 0.5) must be 3.0');

// Verify Lí/Hóa/Sinh/Địa (18 TN x 0.25 + 4 Đ/S x 1.0 + 6 TLN x 0.25 = 10.00)
const khtnKeys = {
  '401': {
    part1: Array.from({ length: 18 }, (_, i) => ['A','B','C','D'][i % 4]),
    part2: moetWordKeys['101'].part2,
    part3: { '1': '1', '2': '-2.5', '3': '0.25', '4': '100', '5': '7', '6': '2025' }
  }
};
const khtnP1Ans = {};
khtnKeys['401'].part1.forEach((opt, i) => { khtnP1Ans[i + 1] = opt; });
const khtnGrade = gradeBatchPapers({
  answerKeysByCode: khtnKeys,
  pointRules: { mcq: 0.25, tfStyle: 'moet2025', sa: 0.25 },
  persistDbState: false,
  papers: [{
    id: 'khtn-1',
    sbd: '000002',
    scannedExamCode: '401',
    answers: {
      part1: khtnP1Ans,
      part2: khtnKeys['401'].part2,
      part3: { '1': '1', '2': '-2,5', '3': '0,25', '4': '100', '5': '7', '6': '2025' }
    }
  }]
});
assert.strictEqual(khtnGrade.gradedPapers[0].result.totalScore, 10, `KHTN 12 must score 10.00, got ${khtnGrade.gradedPapers[0].result.totalScore}`);
assert.strictEqual(khtnGrade.gradedPapers[0].result.part3Score, 1.5, 'KHTN 12 Part III (6 x 0.25) must be 1.5');
console.log('  ✅ Test 9 Passed: Full 3-Part MoET 2025 Word/TNMaker import & Toán (0.5đ) / KHTN (0.25đ) grading verified!');

console.log('\n🎉 ALL 9 EXTERNAL ANSWER KEY TESTS PASSED 100%!');

