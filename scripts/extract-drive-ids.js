const fs = require('fs');

const html = fs.readFileSync('data/drive_folder.html', 'utf8');

// Approach 1: Parse window['_DRIVE_ivd']
let filesMap = {};

const ivdMatch = html.match(/window\['_DRIVE_ivd'\]\s*=\s*'([^']+)'/);
if (ivdMatch) {
  try {
    const rawString = ivdMatch[1];
    // Decode \x5b etc.
    const decoded = rawString.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    const parsed = JSON.parse(decoded);
    console.log('Successfully decoded _DRIVE_ivd!');
    
    // Inspect structure
    function walk(obj) {
      if (!obj) return;
      if (Array.isArray(obj)) {
        if (obj.length >= 3 && typeof obj[0] === 'string' && typeof obj[2] === 'string' && obj[2].endsWith('.docx')) {
          filesMap[obj[2]] = obj[0];
        }
        for (const item of obj) {
          walk(item);
        }
      }
    }
    walk(parsed);
  } catch (err) {
    console.error('Error decoding _DRIVE_ivd:', err.message);
  }
}

// Approach 2: DOM-like regex scanning
const fileBlocks = html.split('data-id="');
for (let i = 1; i < fileBlocks.length; i++) {
  const block = fileBlocks[i];
  const idMatch = block.match(/^([a-zA-Z0-9_-]{28,45})"/);
  if (idMatch) {
    const id = idMatch[1];
    const nameMatch = block.match(/<strong[^>]*>([^<]+\.docx)<\/strong>/i) || block.match(/data-tooltip="([^"]+\.docx)/i);
    if (nameMatch) {
      const name = nameMatch[1].replace(/ Microsoft Word.*/, '').trim();
      filesMap[name] = id;
    }
  }
}

console.log('Total files found:', Object.keys(filesMap).length);
console.log(JSON.stringify(filesMap, null, 2));

// Save to data/drive_files_map.json
fs.writeFileSync('data/drive_files_map.json', JSON.stringify(filesMap, null, 2), 'utf8');

