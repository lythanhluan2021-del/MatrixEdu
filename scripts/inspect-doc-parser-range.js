const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const sIdx = docParser.indexOf('function parseSchoolMatrixAndSpecFromDocx');
const eIdx = docParser.indexOf('return {', sIdx);
console.log(docParser.substring(sIdx + 1200, eIdx));

