const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const sIdx = docParser.indexOf('// 2. Phân tích BẢNG MA TRẬN');
console.log(docParser.substring(sIdx, sIdx + 1800));

