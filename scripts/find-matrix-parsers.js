const fs = require('fs');

const files = fs.readdirSync('src');
console.log('src files:', files);

for (const f of files) {
  const content = fs.readFileSync('src/' + f, 'utf8');
  if (content.includes('parseMatrix') || content.includes('part1') || content.includes('mcq') || content.includes('Phần I')) {
    console.log(`src/${f} has matrix references`);
  }
}

