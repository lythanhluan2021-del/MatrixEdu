const fs = require('fs');
const path = require('path');

const sampleDir = path.join(__dirname, '..', 'data', 'sample_docs');
if (fs.existsSync(sampleDir)) {
  const files = fs.readdirSync(sampleDir);
  console.log('Sample docs files:', files);
} else {
  console.log('No data/sample_docs folder found');
}
