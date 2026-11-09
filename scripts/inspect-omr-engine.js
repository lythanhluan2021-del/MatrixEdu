const fs = require('fs');
const omrCode = fs.readFileSync('src/omr-engine.js', 'utf8');

console.log('omr-engine.js lines count:', omrCode.split('\n').length);
const functions = [...omrCode.matchAll(/function\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
console.log('Functions:', functions);

