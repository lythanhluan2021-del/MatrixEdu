const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('../src/zip-docx');

const sampleDir = path.join(__dirname, '..', 'data', 'sample_docs');
const filesToTest = [
  'KHGD_TiengAnh_Lop12_THPT_CV7991.docx',
  'KHGD_Toan_Lop12_THPT_CV7991.docx',
  'KHGD_Toan_Lop4_TT27_TieuHoc.docx',
  'KHGD_NguVan_Lop9_THCS_CV7991.docx'
];

for (const fn of filesToTest) {
  const fp = path.join(sampleDir, fn);
  if (!fs.existsSync(fp)) continue;
  const buf = fs.readFileSync(fp);
  const doc = parseDocxBuffer(buf);
  console.log(`\n=== File: ${fn} (Tables: ${doc.tables.length}) ===`);
  doc.tables.forEach((tbl, tIdx) => {
    console.log(`Table ${tIdx + 1}: ${tbl.length} rows, header row 0 cols: ${tbl[0]?.length}, row 1 cols: ${tbl[1]?.length}`);
    if (tbl.length > 0) {
      console.log('  Row 0:', tbl[0]?.slice(0, 8));
      if (tbl[1]) console.log('  Row 1:', tbl[1]?.slice(0, 8));
    }
  });
}

