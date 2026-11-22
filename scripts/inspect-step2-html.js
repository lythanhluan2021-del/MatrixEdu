const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const s2Idx = html.indexOf('id="step-2"');
const s3Idx = html.indexOf('id="step-3"');
console.log('Step 2 HTML:\n', html.substring(s2Idx, s2Idx + 1500));

