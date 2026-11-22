const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const startIdx = docParser.indexOf('const col9 = parseMatrixCellValue');
console.log(docParser.substring(startIdx, startIdx + 1500));

