const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const s62Idx = html.indexOf('6.2. Lưu trữ, Nhân bản & Sao lưu');
console.log('s62Idx:', s62Idx);
if (s62Idx > -1) {
  console.log(html.substring(s62Idx - 50, s62Idx + 800));
}

