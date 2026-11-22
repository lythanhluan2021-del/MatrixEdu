const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const startIdx = docParser.indexOf('function parseSchoolMatrixAndSpecFromDocx');
console.log('Snippet of parseSchoolMatrixAndSpecFromDocx:');
console.log(docParser.substring(startIdx, startIdx + 2500));

