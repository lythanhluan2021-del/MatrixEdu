const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const matches = [];
let idx = 0;
while ((idx = html.indexOf('stepper', idx)) !== -1) {
  const line = html.substring(Math.max(0, idx - 40), Math.min(html.length, idx + 60));
  matches.push({ idx, snippet: line.replace(/\n/g, ' ') });
  idx += 7;
}
console.log('Occurrences of stepper:', matches);

