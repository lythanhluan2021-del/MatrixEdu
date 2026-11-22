const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const s5Idx = html.indexOf('id="step-5"');
const s6Idx = html.indexOf('id="step-6"');
const s7Idx = html.indexOf('id="step-7"');

console.log('Step 5 snippet:\n', html.substring(s5Idx, s5Idx + 800));
console.log('\nStep 6 snippet:\n', html.substring(s6Idx, s6Idx + 800));
console.log('\nStep 7 snippet:\n', html.substring(s7Idx, s7Idx + 800));

