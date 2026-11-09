const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');

// Check the exact CSS rules affecting modal-matrix-num-input
console.log('CSS modal-matrix-num-input exists:', indexHtml.includes('.modal-matrix-num-input'));
console.log('Has webkit appearance none on modal input:', indexHtml.includes('.modal-matrix-num-input::-webkit-inner-spin-button'));

