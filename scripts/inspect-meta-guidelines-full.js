const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const sIdx = docParser.indexOf('if (matrixRows.length > 0) {');
console.log(docParser.substring(sIdx, sIdx + 800));

