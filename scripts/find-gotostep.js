const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const matches = [];
let idx = 0;
while ((idx = html.indexOf('goToStep(', idx)) !== -1) {
  const line = html.substring(Math.max(0, idx - 30), Math.min(html.length, idx + 50));
  matches.push({ idx, snippet: line.replace(/\n/g, ' ') });
  idx += 9;
}
console.log('Occurrences of goToStep:', matches);

