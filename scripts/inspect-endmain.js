const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const mainEnd = html.indexOf('</main>');
console.log('</main> at index:', mainEnd);
console.log('HTML after </main> (first 1000 chars):');
console.log(html.substring(mainEnd, mainEnd + 1000));

