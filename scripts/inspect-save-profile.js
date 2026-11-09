const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const saveIdx = html.indexOf('function saveCurrentProfile');
console.log('saveCurrentProfile idx:', saveIdx);
if (saveIdx > -1) {
  console.log(html.substring(saveIdx, saveIdx + 1200));
}

