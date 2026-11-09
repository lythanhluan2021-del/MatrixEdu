const http = require('http');
const fs = require('fs');

async function testExportDocx() {
  console.log('Testing export-docx with borderless table formatting...');

  // 1. Load workspace file to get detected matrix & questions
  const post = (path, body) => new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        try { resolve(JSON.parse(buf.toString('utf8'))); } catch (_) { resolve(buf); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  const docxData = await post('/api/load-workspace-file', { fileName: 'TIN 12 - MA TRAN KTGK 1.docx' });
  const examRes = await post('/api/step4-exam', {
    metadata: {
      schoolName: 'TRƯỜNG THPT NGUYỄN SINH SẮC',
      subject: 'Tin học',
      grade: '12',
      examPeriod: 'Giữa học kỳ I',
      numVariants: 4,
      customCodes: ['132', '209', '357', '485']
    },
    matrix: docxData.detectedMatrix,
    specification: docxData.detectedSpec
  });

  console.log('Exam generated, variant codes:', (examRes.variants || []).map(v => v.code));

  // 2. Call export-docx
  const exportedBuf = await post('/api/export-docx', {
    examData: examRes.exam || examRes,
    mode: 'exam',
    variantCode: '132'
  });

  console.log('Exported Word (.docx) size:', exportedBuf.length, 'bytes');
  fs.writeFileSync('De_Kiem_Tra_Ma132_Test.docx', exportedBuf);

  // 3. Inspect XML inside the docx
  const { parseDocxBuffer } = require('../src/zip-docx');
  const parsed = parseDocxBuffer(exportedBuf);
  console.log('Parsed text sample from exported Word:');
  console.log(parsed.text.slice(0, 600));

  console.log('\nDOCX TEST COMPLETE: De_Kiem_Tra_Ma132_Test.docx created successfully!');
}

testExportDocx().catch(console.error);

