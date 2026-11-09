const fs = require('fs');

const bak = fs.readFileSync('index.html.bak', 'utf8');
const cur = fs.readFileSync('index.html', 'utf8');

console.log('bak has matrix-fullscreen-modal:', bak.includes('matrix-fullscreen-modal'));
console.log('cur has matrix-fullscreen-modal:', cur.includes('matrix-fullscreen-modal'));

// Where is matrix-fullscreen-modal in bak?
const pos = bak.indexOf('matrix-fullscreen-modal');
console.log('Position in bak:', pos);
const mainPos = bak.indexOf('</main>');
console.log('Position of </main> in bak:', mainPos);

