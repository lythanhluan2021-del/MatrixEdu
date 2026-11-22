const fs = require('fs');
const bak = fs.readFileSync('index.html.bak', 'utf8');

const sIdx = bak.indexOf('.matrix-table-wrap');
const eIdx = bak.indexOf('/* FULLSCREEN CHO MA TRẬN', sIdx);
console.log('Matrix CSS from bak:\n');
console.log(bak.substring(sIdx - 50, eIdx));

