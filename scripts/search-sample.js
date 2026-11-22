const fs = require('fs');
const path = require('path');

function searchInDir(dir, needle) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && f !== 'node_modules' && f !== '.git') {
      searchInDir(full, needle);
    } else if (stat.isFile() && (f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.json'))) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(needle.toLowerCase())) {
        console.log(`Found in: ${full}`);
      }
    }
  }
}

searchInDir('.', 'Cấu trúc văn bản');
searchInDir('.', 'cau truc van ban');

