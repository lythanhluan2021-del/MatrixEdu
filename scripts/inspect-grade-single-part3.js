const fs = require('fs');
const omrCode = fs.readFileSync('src/omr-engine.js', 'utf8');

const sIdx = omrCode.indexOf('// Tính điểm câu lớn theo thang điểm chuẩn');
console.log(omrCode.substring(sIdx, sIdx + 2000));

