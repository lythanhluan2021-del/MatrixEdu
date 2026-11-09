const fs = require('fs');
const { extractDocumentContent } = require('../src/doc-parser');

async function testApi() {
  const buf = fs.readFileSync('TIN 12 - MA TRAN KTGK 1.docx');
  const parsed = extractDocumentContent('TIN 12 - MA TRAN KTGK 1.docx', buf);

  const res = await fetch('http://localhost:3000/api/step4-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metadata: { grade: '12', subject: 'Tin học' },
      matrix: parsed.detectedMatrix,
      specification: parsed.detectedSpec?.specification || []
    })
  });

  const data = await res.json();
  console.log('API Status ok:', data.ok);
  console.log('Total questions generated:', data.questions?.length);
  
  console.log('\n--- SAMPLE GENERATED QUESTIONS ---');
  data.questions?.slice(0, 5).forEach((q, i) => {
    console.log(`Q${i+1} [${q.type}] [${q.level}] (Ref: ${q.matrixRef})`);
    console.log(`   Source: ${q.sourceBadge}`);
    console.log(`   Prompt: ${q.stem.slice(0, 80)}...`);
  });

  console.log('\n--- PART II TRUE/FALSE QUESTIONS ---');
  data.questions?.filter(q => q.type === 'TF').forEach((q, i) => {
    console.log(`TF${i+1} (Ref: ${q.matrixRef})`);
    console.log(`   Source: ${q.sourceBadge}`);
    console.log(`   Prompt: ${q.stem.slice(0, 80)}...`);
    q.statements?.forEach((s, si) => {
      console.log(`     ${String.fromCharCode(97+si)}) [${s.level}] [${s.answer}]: ${s.text.slice(0, 50)}...`);
    });
  });
}

testApi();

