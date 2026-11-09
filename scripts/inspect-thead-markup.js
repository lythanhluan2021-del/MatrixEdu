const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const sIdx = html.indexOf('const thead = document.getElementById(\'matrix-thead\');');
console.log(html.substring(sIdx, sIdx + 1600));

