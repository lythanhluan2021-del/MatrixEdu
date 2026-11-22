const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('detectedMatrix') || l.includes('upload-doc') || l.includes('step1-analyze') || l.includes('step2-matrix') || l.includes('detectedSpec')) {
    console.log('L' + (idx+1) + ': ' + l.trim());
  }
});

