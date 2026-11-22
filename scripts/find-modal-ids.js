const fs = require('fs');
const bak = fs.readFileSync('index.html.bak', 'utf8');

const modalMatches = [...bak.matchAll(/id=["']([a-zA-Z0-9_-]*modal[a-zA-Z0-9_-]*)["']/gi)].map(m => m[1]);
console.log('All modal IDs in bak:', [...new Set(modalMatches)]);

