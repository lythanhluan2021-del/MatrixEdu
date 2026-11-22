const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Check header buttons
const headerIdx = html.indexOf('<header class="app-header">');
const headerEnd = html.indexOf('</header>');
console.log('Header:\n', html.substring(headerIdx, headerEnd + 9));

// Check Step 1 text and buttons
const s1Idx = html.indexOf('id="step-1"');
const s2Idx = html.indexOf('id="step-2"');
console.log('\nStep 1 snippet (first 1000 chars):\n', html.substring(s1Idx, s1Idx + 1000));

