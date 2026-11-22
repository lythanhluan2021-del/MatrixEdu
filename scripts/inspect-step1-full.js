const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const s1Idx = html.indexOf('id="step-1"');
const s2Idx = html.indexOf('id="step-2"');
console.log('Step 1 full text:\n', html.substring(s1Idx, s2Idx));

