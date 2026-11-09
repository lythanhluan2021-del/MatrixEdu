const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const sIdx = html.indexOf('/* NEUMORPHIC 3D & GORILLA GLASS CARDS & SECTIONS');
console.log(html.substring(sIdx, sIdx + 1600));

