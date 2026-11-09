const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('loadWorkspaceDocxFile') || l.includes('renderUploadedFilesList') || l.includes('TIN 12 - MA TRAN KTGK 1.docx')) {
    console.log('L' + (idx+1) + ': ' + l.trim());
  }
});

