const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const s7Idx = html.indexOf('id="step-7"');
console.log('step-7 index:', s7Idx);
const s7End = html.indexOf('</section>', s7Idx);
console.log(html.substring(s7Idx, s7Idx + 2500));

