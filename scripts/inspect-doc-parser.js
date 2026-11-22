const fs = require('fs');
const docParser = fs.readFileSync('src/doc-parser.js', 'utf8');

const lines = docParser.split('\n');
console.log('src/doc-parser.js lines count:', lines.length);

const fnMatches = lines.filter(l => l.includes('function ') || l.includes('const parse') || l.includes('exports.'));
console.log('Key functions/exports in doc-parser.js:\n', fnMatches);

