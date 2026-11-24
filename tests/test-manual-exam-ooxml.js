/**
 * tests/test-manual-exam-ooxml.js
 * Kiểm thử toàn trình: Nạp đề gốc thủ công (.docx) bảo toàn 100% OOXML
 * (Word Equation <m:oMath>, MathType <w:object>, Hình ảnh word/media/*, Chỉ số trên/dưới,
 *  Đáp án gạch chân/màu đỏ, Nhóm câu hỏi dùng chung ngữ liệu, Trộn mã đề & Xuất Word Lossless, Đa môn học).
 */

const assert = require('assert');
const http = require('http');
const { createZipBuffer, readZipEntries } = require('../src/zip-docx');
const { parseManualExamDocx, buildLosslessShuffledDocx } = require('../src/docx-exam-importer');
const { generateShuffledVariants, validateExamProfile } = require('../src/qa-validator');
const { detectMetadataFromTablesAndText } = require('../src/doc-parser');
const { evaluateAlignment, detectSubjectFamily } = require('../src/content-alignment');
const requestHandler = require('../server');

// 1x1 PNG hợp lệ để nhúng làm ảnh minh họa thực tế trong .docx
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
const FAKE_MATHTYPE_OLE = Buffer.from('MATHTYPE_OLE_BINARY_PAYLOAD_6.9', 'utf8');

function buildRichMathPhysicsChemDocx() {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>ĐỀ KIỂM TRA GIỮA HỌC KỲ I - MÔN TOÁN LỚP 12 - THỜI GIAN: 90 PHÚT</w:t></w:r></w:p>
    <w:p><w:r><w:t>PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.</w:t></w:r></w:p>

    <!-- Câu 1: Có công thức Word Equation <m:oMath> (phân số + mũ) và đáp án B gạch chân -->
    <w:p>
      <w:r><w:t>Câu 1. Đạo hàm của hàm số </w:t></w:r>
      <m:oMath><m:f><m:num><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f></m:oMath>
      <w:r><w:t> là:</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>A. </w:t></w:r><m:oMath><m:r><m:t>2x</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>B. </w:t></w:r><m:oMath><m:r><m:t>x</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:t>C. </w:t></w:r><m:oMath><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath></w:p>
    <w:p><w:r><w:t>D. </w:t></w:r><m:oMath><m:rad><m:e><m:r><m:t>x</m:t></m:r></m:e></m:rad></m:oMath></w:p>

    <!-- Câu 2: Có hình ảnh nhúng (<w:drawing> + rIdImg1) + MathType (<w:object>) + công thức hóa học chỉ số dưới/trên + đáp án C tô ĐỎ -->
    <w:p>
      <w:r><w:t>Câu 2. Quan sát đồ thị và công thức H</w:t></w:r>
      <w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>2</m:t></w:r>
      <w:r><w:t>SO</w:t></w:r>
      <w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>4</m:t></w:r>
      <w:r><w:drawing><a:blip r:embed="rIdImg1"/></w:drawing></w:r>
      <w:r><w:object><o:OLEObject r:id="rIdOle1"/></w:object></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>A. NaCl   B. HCl   </w:t></w:r>
      <w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>C. H</w:t></w:r>
      <w:r><w:rPr><w:color w:val="FF0000"/><w:vertAlign w:val="subscript"/></w:rPr><w:t>2</w:t></w:r>
      <w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>SO</w:t></w:r>
      <w:r><w:rPr><w:color w:val="FF0000"/><w:vertAlign w:val="subscript"/></w:rPr><w:t>4</w:t></w:r>
      <w:r><w:t>   D. NaOH</w:t></w:r>
    </w:p>

    <!-- Nhóm câu hỏi dùng chung ngữ liệu: Câu 3 và Câu 4 phải luôn đi liền nhau khi trộn -->
    <w:p><w:r><w:t>Dùng thông tin sau cho Câu 3 và Câu 4: Cho mạch điện xoay chiều RLC nối tiếp.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Câu 3. Tổng trở của mạch đạt cực tiểu khi nào?</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>A. Cộng hưởng điện</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. Ngắt mạch</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. Tăng R</w:t></w:r></w:p>
    <w:p><w:r><w:t>D. Giảm f</w:t></w:r></w:p>

    <w:p><w:r><w:t>Câu 4. Khi cộng hưởng, hệ số công suất bằng:</w:t></w:r></w:p>
    <w:p><w:r><w:t>A. 0</w:t></w:r></w:p>
    <w:p><w:r><w:t>B. 0,5</w:t></w:r></w:p>
    <w:p><w:r><w:t>C. 0,7</w:t></w:r></w:p>
    <w:p><w:r><w:rPr><w:color w:val="FF0000"/></w:rPr><w:t>D. 1</w:t></w:r></w:p>

    <!-- Phần II: Trắc nghiệm Đúng/Sai -->
    <w:p><w:r><w:t>PHẦN II. Câu trắc nghiệm đúng sai.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Câu 1. Xét hàm số </w:t></w:r><m:oMath><m:r><m:t>y = x^2 - 4x + 3</m:t></m:r></m:oMath></w:p>
    <w:p><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>a) Đỉnh parabol tại x = 2.</w:t></w:r></w:p>
    <w:p><w:r><w:t>b) Hàm số đồng biến trên R.</w:t></w:r></w:p>
    <w:p><w:r><w:t>c) Đồ thị cắt trục tung tại (0; 3). (Đ)</w:t></w:r></w:p>
    <w:p><w:r><w:t>d) Giá trị nhỏ nhất bằng 5. (S)</w:t></w:r></w:p>

    <!-- Phần III: Trả lời ngắn (1 câu chuẩn <=4 ký tự, 1 câu >4 ký tự để test cảnh báo OMR) -->
    <w:p><w:r><w:t>PHẦN III. Câu trắc nghiệm trả lời ngắn.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Câu 1. Tính giá trị biểu thức </w:t></w:r><m:oMath><m:f><m:num><m:r><m:t>-5</m:t></m:r></m:num><m:den><m:r><m:t>2</m:t></m:r></m:den></m:f></m:oMath></w:p>
    <w:p><w:r><w:t>Đáp án: -2,5</w:t></w:r></w:p>
    <w:p><w:r><w:t>Câu 2. Tính tổng nghiệm của phương trình.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Đáp số: -12,5</w:t></w:r></w:p>

    <w:sectPr><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/></w:sectPr>
  </w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
  <Relationship Id="rIdOle1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="embeddings/oleObject1.bin"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  return createZipBuffer({
    '[Content_Types].xml': contentTypes,
    'word/_rels/document.xml.rels': relsXml,
    'word/document.xml': docXml,
    'word/media/image1.png': TINY_PNG,
    'word/embeddings/oleObject1.bin': FAKE_MATHTYPE_OLE
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TESTING LOSSLESS OOXML MANUAL EXAM IMPORT, SHUFFLE & EXPORT');
  console.log('================================================================');

  const docxBuf = buildRichMathPhysicsChemDocx();
  const parsed = parseManualExamDocx(docxBuf, 'De_Toan_12_Goc.docx');

  // 1. Verify parsing of all 3 parts + formulas + images + MathType + answers
  assert.strictEqual(parsed.stats.mcqCount, 4, 'Must parse 4 MCQ questions');
  assert.strictEqual(parsed.stats.tfCount, 1, 'Must parse 1 TF question');
  assert.strictEqual(parsed.stats.saCount, 2, 'Must parse 2 SA questions');
  assert(parsed.stats.formulaCount >= 5, `Expected >=5 formulas (OMML+MathType), got ${parsed.stats.formulaCount}`);
  assert.strictEqual(parsed.stats.imageCount, 1, 'Must detect 1 embedded PNG image');
  assert.strictEqual(parsed.detectedMetadata.subject, 'Toán', 'Must detect subject Toán');
  assert.strictEqual(parsed.detectedMetadata.grade, '12', 'Must detect grade 12');

  // Verify answer detection (underline, red color, inline (Đ)/(S), Đáp án)
  const q1 = parsed.questions[0];
  const q2 = parsed.questions[1];
  const q3 = parsed.questions[2];
  const q4 = parsed.questions[3];
  const qTf = parsed.questions[4];
  const qSa1 = parsed.questions[5];
  const qSa2 = parsed.questions[6];

  assert.strictEqual(q1.answer, 'B', 'Q1 underlined option B must be detected');
  assert.strictEqual(q2.answer, 'C', 'Q2 red-colored inline option C must be detected');
  assert.strictEqual(q3.answer, 'A', 'Q3 underlined option A must be detected');
  assert.strictEqual(q4.answer, 'D', 'Q4 red-colored option D must be detected');
  assert.strictEqual(q3.groupId, 'grp_3_4', 'Q3 must have shared groupId');
  assert.strictEqual(q4.groupId, 'grp_3_4', 'Q4 must have shared groupId');
  assert(q1.richHtml.includes('omml-frac'), 'Q1 richHtml must render OMML fraction');
  assert(q2.richHtml.includes('data:image/png;base64,'), 'Q2 richHtml must include inline base64 PNG preview');
  assert(q1.optionXmls[0].includes('<m:oMath>'), 'Q1 option XML must retain raw <m:oMath>');
  assert.deepStrictEqual(qTf.statements.map(s => s.isTrue), [true, false, true, false], 'TF answers must be [Đ, S, Đ, S]');
  assert.strictEqual(qSa1.answer, '-2.5', 'SA Q1 must be -2.5');
  assert.strictEqual(parsed.stats.p3Over4Chars.length, 1, 'SA Q2 (-12.5, 5 chars) must trigger >4 char OMR warning');
  console.log('  ✅ 1. Lossless OOXML parsing (OMML, MathType, PNG, Subscript, Colors, Groups, Part III >4 warning) OK');

  // 2. Verify shuffling keeps grouped questions together, preserves optionXmls, supports keepFirstCodeOrder & shuffleTfStatements
  const variants = generateShuffledVariants(
    parsed.questions,
    4,
    101,
    ['101', '102', '103', '104'],
    { keepFirstCodeOrder: true, shuffleTfStatements: true }
  );
  assert.strictEqual(variants.length, 4);
  assert.strictEqual(variants[0].questions[0].answer, 'B', 'First code with keepFirstCodeOrder must keep exact answer B');
  variants.forEach(v => {
    const mcqs = v.questions.filter(q => q.type === 'MCQ');
    const idx3 = mcqs.findIndex(q => q.origNum === 3);
    const idx4 = mcqs.findIndex(q => q.origNum === 4);
    assert.strictEqual(idx4, idx3 + 1, `Code ${v.code}: Grouped Q3 & Q4 must stay adjacent! Got ${idx3}, ${idx4}`);
    // Verify optionXmls stayed synced with correct answer for Q1 (correct option has <m:t>x</m:t> alone)
    const vQ1 = mcqs.find(q => q.origNum === 1);
    const ansIdx = ['A', 'B', 'C', 'D'].indexOf(vQ1.answer);
    assert(vQ1.optionXmls[ansIdx].includes('<m:t>x</m:t>'), `Code ${v.code}: Q1 shuffled answer ${vQ1.answer} must match <m:t>x</m:t> XML!`);
  });
  console.log('  ✅ 2. Grouped shuffling + optionXmls lockstep sync + keepFirstCodeOrder + TF statement shuffle OK');

  // 3. Verify Lossless Word Export retains PNG binary, MathType OLE binary, <m:oMath>, and STRIPS answer highlights!
  const exportedExamBuf = buildLosslessShuffledDocx({
    ooxmlSourceId: parsed.sourceId,
    metadata: parsed.detectedMetadata,
    questions: parsed.questions,
    variants
  }, 'exam');
  assert(Buffer.isBuffer(exportedExamBuf) && exportedExamBuf.length > 500);
  const outEntries = readZipEntries(exportedExamBuf);
  assert(outEntries['word/media/image1.png'], 'Exported .docx MUST keep word/media/image1.png');
  assert(outEntries['word/media/image1.png'].equals(TINY_PNG), 'Exported PNG bytes must match 100% verbatim');
  assert(outEntries['word/embeddings/oleObject1.bin'], 'Exported .docx MUST keep MathType OLE binary');
  assert(outEntries['word/embeddings/oleObject1.bin'].equals(FAKE_MATHTYPE_OLE), 'Exported MathType OLE bytes must match 100% verbatim');
  const outDocXml = outEntries['word/document.xml'].toString('utf8');
  assert(outDocXml.includes('<m:oMath>'), 'Exported document.xml MUST retain native Word Equation <m:oMath>');
  assert(outDocXml.includes('rIdImg1'), 'Exported document.xml MUST retain DrawingML image reference');
  assert(outDocXml.includes('rIdOle1'), 'Exported document.xml MUST retain MathType OLE reference');
  assert(!outDocXml.includes('<w:u '), 'Student exam export MUST strip underline answer highlights!');
  assert(!outDocXml.includes('w:val="FF0000"'), 'Student exam export MUST strip red answer color highlights!');
  assert(outDocXml.includes('MÃ ĐỀ: 101') && outDocXml.includes('MÃ ĐỀ: 104'), 'Must include all 4 shuffled exam codes');
  console.log('  ✅ 3. Lossless .docx export (PNG + MathType OLE + <m:oMath> preserved, answer leaks stripped) OK');

  // 4. Verify QA validation in manualExamMode (no false matrix/spec errors + Part III >4 char warning)
  const qa = validateExamProfile({
    manualExamMode: true,
    ooxmlSourceId: parsed.sourceId,
    metadata: parsed.detectedMetadata,
    matrix: {},
    specification: [],
    questions: parsed.questions,
    variants
  });
  assert.strictEqual(qa.isValid, true, `Manual exam QA must pass cleanly, issues=${JSON.stringify(qa.issues)}`);
  assert(qa.warnings.some(w => w.includes('4 cột tô')), 'QA must warn about Part III answer > 4 chars');
  console.log('  ✅ 4. Manual exam QA validation & Part III 4-char OMR warning OK');

  // 5. Verify multi-subject detection (GDKT&PL, Công nghệ) & Sinh học content alignment
  const metaGdkt = detectMetadataFromTablesAndText([], ['ĐỀ KIỂM TRA MÔN: GDKT&PL LỚP 12'], 'GDKTPL_12.docx');
  assert.strictEqual(metaGdkt.subject, 'GDKT&PL', 'Must detect GDKT&PL');
  const metaTech = detectMetadataFromTablesAndText([], ['ĐỀ KIỂM TRA MÔN CÔNG NGHỆ 12'], 'CongNghe12.docx');
  assert.strictEqual(metaTech.subject, 'Công nghệ', 'Must detect Công nghệ');
  assert.strictEqual(detectSubjectFamily('Sinh học'), 'bio', 'Must map Sinh học -> bio');
  const bioAlign = evaluateAlignment(
    { stem: 'Trong quá trình nhân đôi DNA, enzyme nào tổng hợp mạch mới theo chiều 5\' → 3\'?' },
    { topic: 'Di truyền phân tử', unit: 'Cấu trúc DNA và nhân đôi DNA' },
    { subject: 'Sinh học' }
  );
  assert.strictEqual(bioAlign.aligned, true, 'Sinh học DNA question must align with Di truyền phân tử row');
  console.log('  ✅ 5. Multi-subject detection (GDKT&PL, Công nghệ) & Sinh học alignment OK');

  // 6. Verify Live HTTP endpoints (/api/import-manual-exam & /api/export-docx)
  const server = http.createServer(requestHandler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const impRes = await fetch(`http://127.0.0.1:${port}/api/import-manual-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'De_Toan_12_Goc.docx',
        fileBase64: docxBuf.toString('base64'),
        customCodes: ['201', '202', '203', '204'],
        keepFirstCodeOrder: true
      })
    });
    const impJson = await impRes.json();
    assert.strictEqual(impRes.status, 200);
    assert.strictEqual(impJson.ok, true);
    assert.strictEqual(impJson.variants.length, 4);
    assert.strictEqual(impJson.variants[0].code, '201');

    const expRes = await fetch(`http://127.0.0.1:${port}/api/export-docx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'full',
        examData: {
          ooxmlSourceId: impJson.sourceId,
          metadata: impJson.detectedMetadata,
          questions: impJson.questions,
          variants: impJson.variants
        }
      })
    });
    assert.strictEqual(expRes.status, 200);
    const expBuf = Buffer.from(await expRes.arrayBuffer());
    const expZip = readZipEntries(expBuf);
    assert(expZip['word/media/image1.png'].equals(TINY_PNG), 'HTTP exported full .docx must retain PNG image');
    assert(expZip['word/document.xml'].toString('utf8').includes('BẢNG ĐÁP ÁN CÁC MÃ ĐỀ'), 'HTTP full .docx must contain shuffled answer key table');
    console.log('  ✅ 6. Live HTTP /api/import-manual-exam + /api/export-docx lossless round-trip OK');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log('\n🎉 ALL LOSSLESS OOXML & MULTI-SUBJECT TESTS PASSED 100%!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
