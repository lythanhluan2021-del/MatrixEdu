const fs = require('fs');

const html = fs.readFileSync('data/drive_folder.html', 'utf8');

// Find occurrences of the file names and inspect surrounding data
const targetNames = [
  'CD3-Một số thiết bị Mạng thông dụng.docx',
  'PL TRONG MT SO.docx',
  'Giới thiệu trí tuệ nhân tạo-2.docx',
  'Bài 4- Giao Thức Mạng.docx',
  'Kết nối mạng.docx',
  'Thực hành phần mềm tạo trang web.docx',
  'Tạo trang Web.docx',
  'Giới thiệu nhóm nghề dịch vụ và quản trị.docx',
  'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx',
  'Lập trình cơ bản.docx'
];

targetNames.forEach(name => {
  const idx = html.indexOf(name);
  if (idx !== -1) {
    const chunk = html.substring(Math.max(0, idx - 400), Math.min(html.length, idx + 400));
    console.log('=== FILE:', name, '===');
    // Look for Google Drive file ID pattern in chunk (alphanumeric 28-44 chars)
    const idMatches = chunk.match(/["']([a-zA-Z0-9_-]{28,44})["']/g) || [];
    console.log('Surrounding IDs:', idMatches);
    console.log('Chunk snippet:', chunk.replace(/\\n/g, '\n').substring(0, 300));
  } else {
    console.log('Not found:', name);
  }
});

