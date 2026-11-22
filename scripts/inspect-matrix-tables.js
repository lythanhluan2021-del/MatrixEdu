const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const rootFiles = ['TIN 12 - MA TRAN KTGK 1.docx', 'data/sample_docs/MA_TRAN_KTGK1_TIN_10_THPT_NGUYEN_SINH_SAC.docx'];

for (const fn of rootFiles) {
  if (!fs.existsSync(fn)) continue;
  const buf = fs.readFileSync(fn);
  const doc = parseDocxBuffer(buf);
  console.log(`\n=== File: ${fn} (Tables: ${doc.tables.length}) ===`);
  doc.tables.forEach((tbl, tIdx) => {
    console.log(`Table ${tIdx + 1}: ${tbl.length} rows, header row 0 cols: ${tbl[0]?.length}, row 1 cols: ${tbl[1]?.length}`);
    if (tbl.length > 0) {
      console.log('  Row 0:', tbl[0]?.slice(0, 10));
      if (tbl[1]) console.log('  Row 1:', tbl[1]?.slice(0, 10));
      if (tbl[2]) console.log('  Row 2:', tbl[2]?.slice(0, 10));
    }
  });
}

