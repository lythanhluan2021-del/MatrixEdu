const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('btn-analyze-doc') || l.includes('runStep1Analysis')) {
    console.log('L' + (idx+1) + ': ' + l.trim());
  }
});

