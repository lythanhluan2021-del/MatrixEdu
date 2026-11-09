const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + 8;
console.log('Style tags:', styleStart, styleEnd);

const bodyStart = html.indexOf('<body>');
console.log('body starts at:', bodyStart);

const headerStart = html.indexOf('<header class="app-header">');
const headerEnd = html.indexOf('</header>') + 9;
console.log('header:', headerStart, headerEnd);

const stepperStart = html.indexOf('<nav class="stepper-bar">');
const stepperEnd = html.indexOf('</nav>', stepperStart) + 6;
console.log('stepper:', stepperStart, stepperEnd);

const mainStart = html.indexOf('<main class="container">');
const mainEnd = html.indexOf('</main>', mainStart) + 7;
console.log('main container:', mainStart, mainEnd);

console.log('After main container (first 100 chars):', html.substring(mainEnd, mainEnd + 100));

