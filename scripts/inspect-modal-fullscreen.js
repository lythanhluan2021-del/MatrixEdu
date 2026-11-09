const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const mIdx = html.indexOf('id="modalMatrixFullscreen"');
console.log(html.substring(mIdx, mIdx + 2500));

