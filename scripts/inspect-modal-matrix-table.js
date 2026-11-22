const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const mPageIdx = html.indexOf('id="modal-page-matrix"');
console.log(html.substring(mPageIdx, mPageIdx + 2000));

