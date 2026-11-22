const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const dir = path.join(__dirname, '..', 'data', 'google_drive_bank');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.docx'));

console.log('Found files in google_drive_bank:', files.length);

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const buf = fs.readFileSync(filePath);
    const parsed = parseDocxBuffer(buf);
    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);
    console.log(`Paragraphs: ${parsed.paragraphs ? parsed.paragraphs.length : 0}`);
    console.log(`Tables: ${parsed.tables ? parsed.tables.length : 0}`);
    
    // Sample first 10 paragraphs
    if (parsed.paragraphs && parsed.paragraphs.length > 0) {
      console.log('--- Sample paragraphs ---');
      parsed.paragraphs.slice(0, 8).forEach((p, idx) => {
        console.log(`[P${idx+1}] ${p.substring(0, 120)}`);
      });
    }

    // Check for "Câu 1", "Câu", "A.", "B.", "C.", "D."
    const fullText = (parsed.paragraphs || []).join('\n');
    const cauMatches = fullText.match(/Câu\s+\d+[:.]/gi) || [];
    console.log(`Found "Câu X": ${cauMatches.length} occurrences`);
    
    // Also check if tables contain questions
    if (parsed.tables && parsed.tables.length > 0) {
      console.log(`Table 1 headers/rows sample:`);
      const t = parsed.tables[0];
      console.log('Headers:', t.headers);
      if (t.rows && t.rows.length > 0) {
        console.log('Row 0:', t.rows[0]);
      }
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}

