const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const rmtIdx = html.indexOf('let cellsHtml = \'\';');
console.log(html.substring(rmtIdx, rmtIdx + 3000));

