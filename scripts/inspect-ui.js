const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Find stepper section
const stepperIdx = html.indexOf('class="stepper');
console.log('Stepper around index:', stepperIdx);
if (stepperIdx > -1) {
  console.log('Stepper HTML snippet:');
  console.log(html.substring(stepperIdx - 50, stepperIdx + 900));
}

// Find step panes
const regex = /id=["']step-(\d+)["']/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Found step pane id:', m[0], 'at pos:', m.index);
}

// Check goToStep implementation
const goToStepIdx = html.indexOf('function goToStep');
if (goToStepIdx > -1) {
  console.log('\ngoToStep implementation:');
  console.log(html.substring(goToStepIdx, goToStepIdx + 600));
}

