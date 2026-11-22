const fs = require('fs');
const omrCode = fs.readFileSync('src/omr-engine.js', 'utf8');

const sIdx = omrCode.indexOf('function gradeSinglePaper');
console.log(omrCode.substring(sIdx, sIdx + 2000));

