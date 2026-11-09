const fs = require('fs');
const server = fs.readFileSync('server.js', 'utf8');

const pDirIdx = server.indexOf('PROFILES_DIR');
console.log('PROFILES_DIR idx:', pDirIdx);
if (pDirIdx > -1) {
  console.log(server.substring(pDirIdx - 50, pDirIdx + 300));
}

