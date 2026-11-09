const fs = require('fs');
const { extractDocumentContent } = require('../src/doc-parser');
const { step1AnalyzeMaterial, step2GenerateMatrix, step3GenerateSpecification, step4GenerateQuestionsAndAnswers } = require('../src/ai-engine');

async function test() {
  const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
  const extracted = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf, '');
  const s1 = await step1AnalyzeMaterial({ fileName: 'TIN 12', rawText: extracted.text, tables: extracted.tables, metadata: { subject: 'Tin học', grade: '12', level: 'THPT' } });
  const s2 = await step2GenerateMatrix({ metadata: { subject: 'Tin học', grade: '12', level: 'THPT' }, units: extracted.detectedUnits, detectedMatrix: extracted.detectedMatrix });
  const s3 = step3GenerateSpecification({ matrix: s2.matrix, units: extracted.detectedUnits, detectedSpec: extracted.detectedSpec });
  const s4 = await step4GenerateQuestionsAndAnswers({ metadata: { subject: 'Tin học', grade: '12', level: 'THPT' }, matrix: s2.matrix, specification: s3.specification });
  
  const mcqs = s4.questions.filter(q => q.type === 'MCQ');
  console.log('Total MCQ in Exam:', mcqs.length);
  mcqs.forEach((q, idx) => {
    console.log(`Q${idx+1}: Answer = [${q.answer}] | Prompt: ${q.stem.substring(0, 55)}...`);
  });
}
test();

