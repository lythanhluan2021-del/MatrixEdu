const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const styleStart = html.indexOf('<style>') + 7;
const styleEnd = html.indexOf('</style>');
const lines = html.substring(styleStart, styleEnd).split('\n');
console.log('Total CSS lines:', lines.length);
console.log('Lines 1-60:');
console.log(lines.slice(0, 60).join('\n'));

