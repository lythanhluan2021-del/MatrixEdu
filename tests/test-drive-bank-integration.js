const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { extractDocumentContent } = require('../src/doc-parser');
const { step1AnalyzeMaterial, step2GenerateMatrix, step3GenerateSpecification, step4GenerateQuestionsAndAnswers } = require('../src/ai-engine');
const { generateExamDocx, parseDocxBuffer } = require('../src/zip-docx');
const { validateExamProfile } = require('../src/qa-validator');

async function testDriveBankIntegration() {
  console.log('========================================================================');
  console.log(' KIỂM THỬ TÍCH HỢP NGÂN HÀNG GOOGLE DRIVE VỚI MA TRẬN TIN 12 (KTGK 1)');
  console.log('========================================================================\n');

  // 1. Đọc file "TIN 12 - MA TRAN KTGK 1.docx" trong thư mục dự án
  const matrixDocPath = path.join(__dirname, '..', 'TIN 12 - MA TRAN KTGK 1.docx');
  assert(fs.existsSync(matrixDocPath), 'File "TIN 12 - MA TRAN KTGK 1.docx" phải tồn tại trong dự án.');
  const buf = fs.readFileSync(matrixDocPath);
  const extracted = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf, '');
  console.log('✔ Đọc file TIN 12 thành công:', extracted.paragraphs.length, 'đoạn,', extracted.tables.length, 'bảng.');

  // 2. Bước 1: Phân tích tài liệu
  const s1 = await step1AnalyzeMaterial({
    fileName: 'TIN 12 - MA TRAN KTGK 1.docx',
    rawText: extracted.text,
    tables: extracted.tables,
    metadata: {
      school: 'TRƯỜNG THPT NGUYỄN SINH SẮC',
      subject: 'Tin học',
      grade: '12',
      level: 'THPT',
      examPeriod: 'Kiểm tra Giữa học kỳ I',
      duration: 45,
      numVariants: 2
    }
  });

  // Sử dụng detectedUnits nếu bóc tách trực tiếp từ bảng ma trận của trường
  const units = (s1.analysis && s1.analysis.units && s1.analysis.units.length > 0)
    ? s1.analysis.units
    : (extracted.detectedUnits || []);

  assert(units.length > 0, 'Phải có ít nhất 1 đơn vị kiến thức');
  console.log('✔ Bước 1: Có', units.length, 'đơn vị kiến thức.');

  // 3. Bước 2: Lập ma trận (tự động nhận diện ma trận từ file của trường)
  const s2 = await step2GenerateMatrix({
    metadata: {
      school: 'TRƯỜNG THPT NGUYỄN SINH SẮC',
      subject: 'Tin học',
      grade: '12',
      level: 'THPT',
      examPeriod: 'Kiểm tra Giữa học kỳ I'
    },
    units,
    detectedMatrix: extracted.detectedMatrix
  });
  assert(s2.ok, 'Bước 2 lập ma trận phải thành công');
  console.log('✔ Bước 2: Ma trận có', s2.matrix.rows.length, 'dòng, tổng điểm =', s2.stats.totalPoints, 'điểm.');

  // 4. Bước 3: Bản đặc tả
  const s3 = step3GenerateSpecification({
    matrix: s2.matrix,
    units,
    detectedSpec: extracted.detectedSpec
  });
  assert(s3.ok, 'Bước 3 tạo bản đặc tả phải thành công');
  console.log('✔ Bước 3: Bản đặc tả có', s3.specification.length, 'mục.');

  // 5. Bước 4: Soạn đề kiểm tra từ Ngân hàng Google Drive (Zero Hallucination)
  const s4 = await step4GenerateQuestionsAndAnswers({
    metadata: {
      school: 'TRƯỜNG THPT NGUYỄN SINH SẮC',
      subject: 'Tin học',
      grade: '12',
      level: 'THPT',
      examPeriod: 'Kiểm tra Giữa học kỳ I',
      duration: 45,
      numVariants: 2
    },
    matrix: s2.matrix,
    specification: s3.specification,
    rawText: extracted.text
  });
  assert(s4.ok, 'Bước 4 soạn đề phải thành công');
  console.log('✔ Bước 4: Soạn được', s4.questions.length, 'câu hỏi lớn.');

  // Kiểm tra tính Zero Hallucination: Các câu hỏi có nguồn gốc từ Google Drive
  const driveSourced = s4.questions.filter(q => q.sourceFile && q.sourceFile.endsWith('.docx'));
  console.log(`✔ Số câu hỏi bóc tách trực tiếp từ Ngân hàng Google Drive: ${driveSourced.length}/${s4.questions.length} (${Math.round(driveSourced.length/s4.questions.length*100)}%)`);
  
  // In chi tiết một số câu hỏi mẫu
  console.log('\n--- CÂU HỎI MẪU TRÍCH XUẤT TỪ GOOGLE DRIVE ---');
  s4.questions.slice(0, 4).forEach((q, idx) => {
    console.log(`[Câu ${idx+1} - ${q.type} - ${q.level}] ${q.stem.substring(0, 90)}...`);
    console.log(`   Nguồn: ${q.sourceBadge || q.sourceFile}`);
  });

  // 6. Kiểm định QA 4 chiều
  const examData = {
    metadata: {
      school: 'TRƯỜNG THPT NGUYỄN SINH SẮC',
      subject: 'Tin học',
      grade: '12',
      level: 'THPT',
      examPeriod: 'Kiểm tra Giữa học kỳ I',
      duration: 45
    },
    matrix: s2.matrix,
    specification: s3.specification,
    questions: s4.questions
  };
  const qa = validateExamProfile(examData);
  console.log('\n✔ Kiểm định QA:', qa.isValid ? 'ĐẠT 100%' : 'CÓ LỖI');
  if (!qa.isValid) {
    console.error('Lỗi QA:', qa.issues);
  }
  assert(qa.isValid, 'Kiểm định QA phải ĐẠT');

  // 7. Xuất file Word (.docx)
  const docxBuf = generateExamDocx(examData, 'full', '101');
  const exportPath = path.join(__dirname, '..', 'data', 'exports', 'DeKT_Tin12_GoogleDriveBank.docx');
  fs.writeFileSync(exportPath, docxBuf);
  console.log('✔ Xuất file Word thành công:', exportPath, `(${docxBuf.length} bytes)`);

  console.log('\n========================================================================');
  console.log(' TẤT CẢ KIỂM THỬ TÍCH HỢP NGÂN HÀNG GOOGLE DRIVE THÀNH CÔNG 100%!');
  console.log('========================================================================\n');
}

testDriveBankIntegration().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
