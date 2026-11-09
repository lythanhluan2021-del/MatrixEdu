const fs = require('fs');
const bak = fs.readFileSync('index.html.bak', 'utf8');

const sIdx = bak.indexOf('/* FULLSCREEN CHO MA TRẬN');
console.log(bak.substring(sIdx, sIdx + 1500));

