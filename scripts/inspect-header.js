const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const headerStart = html.indexOf('<header class="app-header">');
const headerEnd = html.indexOf('</header>') + 9;
console.log(html.substring(headerStart, headerEnd));

