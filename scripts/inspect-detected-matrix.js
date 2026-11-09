const { extractDocumentContent } = require('../src/doc-parser');
const fs = require('fs');

async function test() {
  const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
  const res = await extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  console.log('detectedSpec length:', res.detectedSpec?.length);
  res.detectedSpec.forEach((sp, idx) => {
    console.log(`\n--- Spec Row ${idx + 1}: ${sp.topic} | ${sp.unit} ---`);
    console.log('  Biết:', (sp.outcomes?.['Biết'] || '').substring(0, 70) + '...');
    console.log('  Hiểu:', (sp.outcomes?.['Hiểu'] || '').substring(0, 70) + '...');
    console.log('  Vận dụng:', (sp.outcomes?.['Vận dụng'] || '').substring(0, 70) + '...');
  });
}

test().catch(console.error);
