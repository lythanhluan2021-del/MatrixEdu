const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const rmtIdx = html.indexOf('function renderMatrixTable');
console.log(html.substring(rmtIdx + 2000, rmtIdx + 4500));

