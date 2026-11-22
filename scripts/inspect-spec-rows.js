const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const sIdx = docParser.indexOf('specificationRows.push({');
console.log(docParser.substring(sIdx - 50, sIdx + 500));

