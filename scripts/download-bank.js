const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const filesMap = JSON.parse(fs.readFileSync('data/drive_files_map.json', 'utf8'));
const outputDir = path.join(__dirname, '..', 'data', 'google_drive_bank');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const u = new URL(url);
          redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
        }
        res.resume();
        return resolve(fetchUrl(redirectUrl, maxRedirects - 1));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP status ${res.statusCode} for ${url}`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.on('error', reject);
  });
}

async function downloadFile(name, id) {
  const targetPath = path.join(outputDir, name);
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 5000) {
    console.log(`[ALREADY EXISTS] ${name} (${fs.statSync(targetPath).size} bytes)`);
    return targetPath;
  }

  console.log(`[DOWNLOADING] ${name} (ID: ${id})...`);
  // Try direct download URLs
  const candidateUrls = [
    `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0`,
    `https://drive.google.com/uc?export=download&id=${id}&confirm=t`,
    `https://docs.google.com/document/d/${id}/export?format=docx`
  ];

  for (const url of candidateUrls) {
    try {
      const buffer = await fetchUrl(url);
      // Verify buffer is actually a zip/docx (starts with PK\x03\x04 = 0x50 0x4b 0x03 0x04)
      if (buffer.length > 500 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
        fs.writeFileSync(targetPath, buffer);
        console.log(`  -> SUCCESS! Saved ${name} (${buffer.length} bytes)`);
        return targetPath;
      } else {
        console.log(`  -> URL returned non-docx (${buffer.length} bytes, starts with: ${buffer.subarray(0, 30).toString('utf8')}). Trying next...`);
      }
    } catch (err) {
      console.log(`  -> URL failed: ${err.message}. Trying next...`);
    }
  }

  throw new Error(`Failed to download ${name}`);
}

async function run() {
  const entries = Object.entries(filesMap);
  console.log(`Total files to download: ${entries.length}`);

  let success = 0;
  for (const [name, id] of entries) {
    try {
      await downloadFile(name, id);
      success++;
    } catch (err) {
      console.error(`ERROR downloading ${name}:`, err.message);
    }
  }

  console.log(`\nFinished: ${success}/${entries.length} downloaded successfully.`);
}

run();

