const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const rmtIdx = html.indexOf('function renderMatrixTable');
console.log(html.substring(rmtIdx + 1200, rmtIdx + 3500));

