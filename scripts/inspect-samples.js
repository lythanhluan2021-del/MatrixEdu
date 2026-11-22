const fs = require('fs');
const sampleMat = fs.readFileSync('src/sample-materials.js', 'utf8');

console.log('sample-materials.js size:', sampleMat.length);
// Check what subjects and structures are in sample materials
const subjects = [...sampleMat.matchAll(/id:\s*['"]([a-zA-Z0-9_-]+)['"]/g)].map(m => m[1]);
console.log('Sample materials IDs:', subjects);

