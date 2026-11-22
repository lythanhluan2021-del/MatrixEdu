const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Stepper block range
const stepperStart = html.indexOf('<nav class="stepper-bar">');
const stepperEnd = html.indexOf('</nav>', stepperStart) + 6;
console.log('Stepper HTML:\n', html.substring(stepperStart, stepperEnd));

// Container start
const mainContainerIdx = html.indexOf('class="container"', stepperEnd);
console.log('\nMain container around index:', mainContainerIdx);
console.log(html.substring(mainContainerIdx - 40, mainContainerIdx + 300));

// Find references to nav-step in script
const navMatches = [...html.matchAll(/nav-step-\d+/g)].map(m => m[0]);
console.log('\nReferences to nav-step-:', [...new Set(navMatches)]);

