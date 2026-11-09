const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const rmtIdx = html.indexOf('function renderMatrixTable');
console.log('renderMatrixTable idx:', rmtIdx);
if (rmtIdx > -1) {
  console.log(html.substring(rmtIdx, rmtIdx + 2000));
}

