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

console.log('\n🎉 ALL 4 EXTERNAL ANSWER KEY TESTS PASSED 100%!');
