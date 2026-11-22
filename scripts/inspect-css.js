const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');
console.log('Style tags from', styleStart, 'to', styleEnd, 'length:', styleEnd - styleStart);
const css = html.substring(styleStart + 7, styleEnd);
console.log('CSS lines count:', css.split('\n').length);

