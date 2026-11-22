const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const styleStart = html.indexOf('<style>') + 7;
const styleEnd = html.indexOf('</style>');
const lines = html.substring(styleStart, styleEnd).split('\n');
console.log('Lines 580-691:');
console.log(lines.slice(580).join('\n'));

