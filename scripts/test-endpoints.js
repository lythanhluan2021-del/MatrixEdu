const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          resolve(data);
        }
      });
      res.on('error', reject);
    });
  });
}

async function run() {
  console.log('Testing /api/drive-bank/status...');
  const status = await get('/api/drive-bank/status');
  console.log('Status result:', {
    ok: status.ok,
    status: status.status,
    totalQuestions: status.totalQuestions,
    mcqCount: status.mcqCount,
    tfCount: status.tfCount,
    saCount: status.saCount,
    filesCount: status.filesCount
  });

  console.log('\nTesting /api/drive-bank/questions?limit=3...');
  const questions = await get('/api/drive-bank/questions?limit=3');
  console.log('Questions result: total =', questions.total, ', count =', questions.questions?.length);
  if (questions.questions && questions.questions.length > 0) {
    console.log('Sample question 1:', {
      prompt: questions.questions[0].prompt.substring(0, 60),
      format: questions.questions[0].format,
      sourceFile: questions.questions[0].sourceFile
    });
  }

  console.log('\nAll endpoint tests PASSED!');
}

run().catch(console.error);

