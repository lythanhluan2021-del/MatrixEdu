const fs = require('fs');
const sampleMat = fs.readFileSync('src/sample-materials.js', 'utf8');

const mathIdx = sampleMat.indexOf('primary_math_4');
const matrixStart = sampleMat.indexOf('matrixRows: [', mathIdx);
console.log(sampleMat.substring(matrixStart, matrixStart + 1000));

