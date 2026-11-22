const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const sIdx = docParser.indexOf('// 2. Phân tích BẢNG MA TRẬN');
const eIdx = docParser.indexOf('return {', sIdx);
console.log(docParser.substring(sIdx, eIdx));

