const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const s7Idx = html.indexOf('id="step-7"');
const s7End = html.indexOf('</section>', s7Idx);
console.log('Step 7 length:', s7End - s7Idx);
console.log(html.substring(s7Idx, Math.min(s7Idx + 3000, s7End)));
