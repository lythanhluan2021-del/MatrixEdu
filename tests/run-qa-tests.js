/**
 * tests/run-qa-tests.js
 * Kịch bản Kiểm thử Toàn diện & Thẩm định Chuyên môn Thực tế Cấp THPT (Lớp 10, 11, 12):
 * - Bộ 5 đề cấp THPT gồm: Toán 12, Tiếng Anh 12, Tin học 12, Vật lí 12, Hóa học 12 (theo Thông tư 22/2021 & Công văn 7991/BGDĐT-GDTrH).
 * - Kiểm tra đọc file .docx đầu vào, kiểm định 4 chiều Ma trận-Đặc tả-Đề-Đáp án, kiểm chứng phép tính độc lập,
 *   xuất file Word (.docx) thực tế và kiểm tra cấu trúc XML bên trong file Word xuất ra.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { SAMPLE_DOCUMENTS } = require('../src/sample-materials');
const { createMaterialDocx, generateExamDocx, parseDocxBuffer, readZipEntries } = require('../src/zip-docx');
const { extractDocumentContent } = require('../src/doc-parser');
const {
  step1AnalyzeMaterial,
  step2GenerateMatrix,
  step3GenerateSpecification,
  step4GenerateQuestionsAndAnswers,
  regenerateSingleQuestion
} = require('../src/ai-engine');
const { validateExamProfile } = require('../src/qa-validator');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SAMPLE_DOCS_DIR = path.join(DATA_DIR, 'sample_docs');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');

for (const d of [DATA_DIR, SAMPLE_DOCS_DIR, EXPORTS_DIR, PROFILES_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function runAllTests() {
  console.log('================================================================================');
  console.log(' BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG "AI RA ĐỀ KIỂM TRA TỰ ĐỘNG - CẤP THPT"');
  console.log('================================================================================\n');

  const scenarioKeys = [
    'thpt_math_12',   // Kịch bản 1: Toán Lớp 12 THPT
    'thpt_eng_12',    // Kịch bản 2: Tiếng Anh Lớp 12 THPT (Có Listening + Tapescript)
    'thpt_it_12',     // Kịch bản 3: Tin học Lớp 12 THPT
    'thpt_phys_12',   // Kịch bản 4: Vật lí Lớp 12 THPT
    'thpt_chem_12'    // Kịch bản 5: Hóa học Lớp 12 THPT
  ];

  const summaryResults = [];
  let totalMathChecks = 0;

  for (const key of scenarioKeys) {
    const sample = SAMPLE_DOCUMENTS[key];
    console.log(`▶ Đang kiểm thử kịch bản [${key}]: ${sample.title}`);

    // 1. Tạo và đọc file .docx tài liệu KHGD thực tế
    const inputDocxPath = path.join(SAMPLE_DOCS_DIR, sample.name);
    const inputDocxBuf = createMaterialDocx(sample.title, sample.paragraphs);
    fs.writeFileSync(inputDocxPath, inputDocxBuf);

    const extractedDoc = extractDocumentContent(sample.name, inputDocxBuf);
    assert(extractedDoc.text.length > 100, `Lỗi đọc file .docx đầu vào cho ${key}`);

    // 2. Bước 1: Phân tích tài liệu
    const step1Res = await step1AnalyzeMaterial({
      metadata: sample.metadata,
      rawText: extractedDoc.text,
      tables: extractedDoc.tables
    });
    assert(step1Res.ok, `Bước 1 thất bại cho ${key}: ${step1Res.message}`);
    assert(step1Res.analysis.units.length > 0, `Không tách được đơn vị kiến thức cho ${key}`);

    // 3. Bước 2: Lập Ma trận
    const step2Res = await step2GenerateMatrix({
      metadata: sample.metadata,
      units: step1Res.analysis.units
    });
    assert(step2Res.ok, `Bước 2 thất bại cho ${key}`);
    assert(Math.abs(step2Res.stats.totalPoints - 10.0) <= 0.01, `Tổng điểm Ma trận ${key} khác 10.0: ${step2Res.stats.totalPoints}`);

    // 4. Bước 3: Tạo Bản đặc tả
    const step3Res = step3GenerateSpecification({
      metadata: sample.metadata,
      matrix: step2Res.matrix,
      units: step1Res.analysis.units
    });
    assert(step3Res.ok, `Bước 3 thất bại cho ${key}`);
    assert.strictEqual(step3Res.specification.length, step2Res.matrix.rows.length, `Bản đặc tả không khớp số dòng Ma trận (${key})`);

    // 5. Bước 4 & 5: Soạn Đề kiểm tra, Nhân bản Mã đề, Tạo Đáp án & Kiểm định QA
    const step4Res = await step4GenerateQuestionsAndAnswers({
      metadata: sample.metadata,
      matrix: step2Res.matrix,
      specification: step3Res.specification,
      rawText: extractedDoc.text
    });
    assert(step4Res.ok, `Bước 4 thất bại cho ${key}`);
    assert(step4Res.questions.length > 0, `Đề kiểm tra ${key} không có câu hỏi`);
    assert(step4Res.variants.length === sample.metadata.numVariants, `Số mã đề trộn không khớp (${key})`);

    const qa = step4Res.qaReport;
    if (!qa.isValid) {
      console.error(`❌ Lỗi QA ở kịch bản ${key}:`, qa.issues);
    }
    assert(qa.isValid, `Kiểm định QA thất bại cho ${key}: ${qa.issues.join('; ')}`);
    totalMathChecks += (qa.mathVerifications || []).length;

    // Kiểm tra chức năng Tạo lại 1 câu hỏi đơn lẻ (Regenerate Single Question)
    const regenRes = await regenerateSingleQuestion({
      question: step4Res.questions[0],
      metadata: sample.metadata,
      customInstruction: 'Kiểm thử đổi biến thể câu hỏi số 1'
    });
    assert(regenRes.ok && regenRes.question.stem, `Lỗi tạo lại câu hỏi đơn lẻ cho ${key}`);

    // 6. Lưu Hồ sơ vào data/profiles/
    const fullProfile = {
      id: `profile_${key}`,
      title: `${sample.metadata.examPeriod} - ${sample.metadata.subject} Lớp ${sample.metadata.grade} (${sample.metadata.level})`,
      updatedAt: new Date().toISOString(),
      metadata: sample.metadata,
      units: step1Res.analysis.units,
      matrix: step2Res.matrix,
      specification: step3Res.specification,
      questions: step4Res.questions,
      variants: step4Res.variants,
      readingPassage: step4Res.readingPassage,
      listeningTranscript: step4Res.listeningTranscript,
      qaReport: qa
    };
    fs.writeFileSync(path.join(PROFILES_DIR, `profile_${key}.json`), JSON.stringify(fullProfile, null, 2), 'utf8');

    // 7. Xuất các file Word (.docx) thực tế (Full Hồ sơ & Đề Học sinh không đáp án) và kiểm định cấu trúc Word
    const subjSlug = sample.metadata.subject.replace(/\s+/g, '_');
    const fullDocxBuf = generateExamDocx(fullProfile, 'full');
    const studentExamDocxBuf = generateExamDocx(fullProfile, 'exam');
    const matrixDocxBuf = generateExamDocx(fullProfile, 'matrix');
    const specDocxBuf = generateExamDocx(fullProfile, 'spec');
    const answerDocxBuf = generateExamDocx(fullProfile, 'answer');

    const fullDocxName = `HoSo_DayDu_${subjSlug}_Lop${sample.metadata.grade}.docx`;
    const studentDocxName = `DeHocSinh_KhongDapAn_${subjSlug}_Lop${sample.metadata.grade}.docx`;

    fs.writeFileSync(path.join(EXPORTS_DIR, fullDocxName), fullDocxBuf);
    fs.writeFileSync(path.join(EXPORTS_DIR, studentDocxName), studentExamDocxBuf);
    fs.writeFileSync(path.join(EXPORTS_DIR, `MaTran_${subjSlug}_Lop${sample.metadata.grade}.docx`), matrixDocxBuf);
    fs.writeFileSync(path.join(EXPORTS_DIR, `BanDacTa_${subjSlug}_Lop${sample.metadata.grade}.docx`), specDocxBuf);
    fs.writeFileSync(path.join(EXPORTS_DIR, `DapAn_${subjSlug}_Lop${sample.metadata.grade}.docx`), answerDocxBuf);

    // Kiểm tra độc lập file Word Đề Học Sinh:
    // - Phải đọc lại được bằng parseDocxBuffer
    // - Phải có khổ giấy A4 (w:w="11906" w:h="16838") và font Times New Roman cỡ 13-14pt
    // - TUYỆT ĐỐI KHÔNG chứa bảng đáp án hoặc chuỗi "ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM" hay "TAPESCRIPT FOR LISTENING"
    const studentZip = readZipEntries(studentExamDocxBuf);
    const studentXml = studentZip['word/document.xml'].toString('utf8');
    const parsedStudent = parseDocxBuffer(studentExamDocxBuf);

    assert(studentXml.includes('w:w="11906" w:h="16838"'), `File Word ${studentDocxName} chưa đúng khổ A4`);
    assert(studentXml.includes('Times New Roman'), `File Word ${studentDocxName} chưa đặt phông Times New Roman`);
    assert(studentXml.includes('w:type="autofit"'), `Bảng trong ${studentDocxName} chưa bật autofit chống tràn trang`);
    assert(!parsedStudent.text.includes('ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM'), `Đề học sinh ${studentDocxName} bị lộ tiêu đề đáp án!`);
    assert(!parsedStudent.text.includes('LỜI GIẢI CHI TIẾT VÀ ĐỐI CHIẾU MA TRẬN'), `Đề học sinh ${studentDocxName} bị lộ lời giải chi tiết!`);
    assert(!parsedStudent.text.includes('TAPESCRIPT FOR LISTENING SECTION'), `Đề học sinh ${studentDocxName} bị lộ lời thoại bài nghe của giáo viên!`);

    console.log(`   ✔ Ma trận: ${step2Res.matrix.rows.length} dòng | Tổng điểm: ${step2Res.stats.totalPoints.toFixed(1)}đ | Các mức độ: ${ JSON.stringify(step2Res.stats.levelPercentages) }%`);
    console.log(`   ✔ Số câu hỏi: ${step4Res.questions.length} câu lớn (MCQ:${step2Res.stats.byType.MCQ}, TF:${step2Res.stats.byType.TF} ý, SA:${step2Res.stats.byType.SA}, TL:${step2Res.stats.byType.ESSAY})`);
    console.log(`   ✔ Kiểm chứng phép tính độc lập: ${(qa.mathVerifications || []).length} phép tính — Khớp 100%`);
    console.log(`   ✔ Xuất Word (.docx) thành công: ${fullDocxName} (${Math.round(fullDocxBuf.length / 1024)} KB) & ${studentDocxName} (${Math.round(studentExamDocxBuf.length / 1024)} KB)\n`);

    summaryResults.push({
      key,
      level: sample.metadata.level,
      grade: sample.metadata.grade,
      subject: sample.metadata.subject,
      regulation: 'TT 22/2021 & CV 7991/BGDĐT-GDTrH',
      matrixRows: step2Res.matrix.rows.length,
      totalQuestions: step4Res.questions.length,
      totalPoints: step2Res.stats.totalPoints,
      levelPct: step2Res.stats.levelPercentages,
      mathChecks: (qa.mathVerifications || []).length,
      fullDocxName,
      studentDocxName
    });
  }

  // Kiểm thử bổ sung: Thông báo khi tài liệu đầu vào rỗng / chưa đủ dữ liệu
  const emptyRes = await step1AnalyzeMaterial({ metadata: { level: 'THPT', grade: '12', subject: 'Toán' }, rawText: 'Ngắn', tables: [] });
  assert.strictEqual(emptyRes.ok, false, 'Phải cảnh báo khi tài liệu đầu vào quá ngắn/thiếu dữ liệu');
  console.log('✔ Kiểm thử cảnh báo khi tài liệu chưa đủ dữ liệu: ĐẠT (' + emptyRes.message + ')');

  console.log('\n================================================================================');
  console.log(` HOÀN TẤT KIỂM THỬ: 5/5 KỊCH BẢN CẤP THPT ĐẠT 100% — ĐÃ KIỂM CHỨNG ${totalMathChecks} PHÉP TÍNH ĐỘC LẬP!`);
  console.log('================================================================================');
}

runAllTests().catch(err => {
  console.error('❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
});

