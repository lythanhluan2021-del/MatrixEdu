const fs = require('fs');

const bak = fs.readFileSync('index.html.bak', 'utf8');
const cur = fs.readFileSync('index.html', 'utf8');

const bakStyle = bak.substring(bak.indexOf('<style>'), bak.indexOf('</style>'));
const curStyle = cur.substring(cur.indexOf('<style>'), cur.indexOf('</style>'));

// Extract class names from bakStyle
const bakClasses = [...new Set([...bakStyle.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map(m => m[1]))];
const missingClasses = bakClasses.filter(c => !curStyle.includes('.' + c));

console.log('Total classes in bak CSS:', bakClasses.length);
console.log('Classes present in bak but missing in cur CSS (count:', missingClasses.length, '):');
console.log(missingClasses);

