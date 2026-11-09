const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const styleStart = html.indexOf('<style>') + 7;
const styleEnd = html.indexOf('</style>');
const css = html.substring(styleStart, styleEnd);

// Check selectors in CSS
const selectorMatches = css.match(/^[.a-zA-Z0-9_#-][^{]+/gm) || [];
console.log('Sample top selectors:', selectorMatches.slice(0, 30).map(s => s.trim()));

