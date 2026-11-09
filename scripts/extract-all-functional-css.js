const fs = require('fs');
const bak = fs.readFileSync('index.html.bak', 'utf8');

const sIdx = bak.indexOf('/* Container & Cards */');
const eIdx = bak.indexOf('/* Responsive Mobile', sIdx);
console.log('CSS from bak between Container and Responsive:');
console.log(bak.substring(sIdx, eIdx));

