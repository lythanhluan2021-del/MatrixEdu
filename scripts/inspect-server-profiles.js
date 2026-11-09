const fs = require('fs');
const server = fs.readFileSync('server.js', 'utf8');

const profIdx = server.indexOf('/api/profiles');
console.log('/api/profiles idx:', profIdx);
if (profIdx > -1) {
  console.log(server.substring(profIdx - 50, profIdx + 1200));
}

