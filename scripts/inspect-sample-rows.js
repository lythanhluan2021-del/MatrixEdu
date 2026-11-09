const fs = require('fs');
const sampleMat = fs.readFileSync('src/sample-materials.js', 'utf8');

const engIdx = sampleMat.indexOf('thpt_eng_12');
console.log('Snippet of thpt_eng_12:');
console.log(sampleMat.substring(engIdx, engIdx + 1200));

const mathIdx = sampleMat.indexOf('primary_math_4');
console.log('\nSnippet of primary_math_4:');
console.log(sampleMat.substring(mathIdx, mathIdx + 1200));

