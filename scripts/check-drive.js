const fs = require('fs');

async function inspectDriveFolder() {
  const folderId = '1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop';
  const url = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  console.log('Fetching:', url);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'vi,en;q=0.9'
    }
  });

  const html = await res.text();
  console.log('Status:', res.status, 'HTML length:', html.length);
  fs.writeFileSync('data/drive_folder.html', html);

  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  console.log('Title:', titleMatch ? titleMatch[1] : 'No title');

  // Search for file names, IDs, data blobs in Google Drive initial data
  // Look for DS_itemData or window['_DRIVE_INITIAL_DATA_']
  const fileMatches = html.match(/\["(https:\/\/drive\.google\.com\/[^"]+)"/g) || [];
  console.log('Drive links count:', fileMatches.length);

  // Extract strings ending in .docx, .doc, .pdf, .txt
  const docxMatches = html.match(/[a-zA-Z0-9_\-\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]+\.(docx|doc|pdf|txt)/gi) || [];
  console.log('Docx matches:', [...new Set(docxMatches)]);

  // Look for items array in JS data
  const idPattern = /\["([a-zA-Z0-9_-]{25,40})","([^"]+)"/g;
  let match;
  const items = [];
  while ((match = idPattern.exec(html)) !== null) {
    if (match[2].includes('.') || match[2].length > 3) {
      items.push({ id: match[1], name: match[2] });
    }
  }
  console.log('Found items with IDs:', items.slice(0, 30));
}

inspectDriveFolder().catch(console.error);

