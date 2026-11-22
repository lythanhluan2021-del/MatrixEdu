const fs = require('fs');
const bak = fs.readFileSync('index.html.bak', 'utf8');

const matches = [];
let idx = 0;
while ((idx = bak.indexOf('col-tln', idx)) !== -1) {
  matches.push(bak.substring(Math.max(0, idx - 40), Math.min(bak.length, idx + 80)).replace(/\n/g, ' '));
  idx += 8;
}
console.log('col-tln in bak:', matches);

