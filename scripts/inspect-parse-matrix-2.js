const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const startIdx = docParser.indexOf('// Kiểm tra các loại câu hỏi');
console.log(docParser.substring(startIdx, startIdx + 2000));

