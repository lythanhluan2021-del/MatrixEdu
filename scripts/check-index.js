// Helper script to inspect index.html sections
const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const content = fs.readFileSync(indexHtmlPath, 'utf8');

console.log('index.html length:', content.length);
console.log('Has scope-raw-text:', content.includes('scope-raw-text'));
console.log('Has modalDriveBank:', content.includes('modalDriveBank'));

