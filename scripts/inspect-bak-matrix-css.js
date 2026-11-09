const fs = require('fs');
const bak = fs.readFileSync('index.html.bak', 'utf8');

const sIdx = bak.indexOf('/* BẢNG MA TRẬN');
if (sIdx > -1) {
  console.log(bak.substring(sIdx, sIdx + 3000));
} else {
  // search matrix-table
  const mIdx = bak.indexOf('.matrix-table');
  console.log(bak.substring(mIdx - 100, mIdx + 2500));
}

