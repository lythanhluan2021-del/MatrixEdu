const fs = require('fs');
const path = require('path');

const zipDocxPath = path.join(__dirname, '..', 'src', 'zip-docx.js');
let content = fs.readFileSync(zipDocxPath, 'utf8');

// 1. Add wBorderlessTable and renderMcqOptionsWord functions
const newFunctions = `
/**
 * Bảng không viền (Borderless Table) chuẩn Word OpenXML
 * Dùng để căn chỉnh tuyệt đối các cột phương án trắc nghiệm A, B, C, D không bao giờ bị xô lệch
 */
function wBorderlessTable(rows, opts = {}) {
  let tblPr = \`
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:jc w:val="left"/>
      <w:tblBorders>
        <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        <w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="20" w:type="dxa"/>
        <w:left w:w="40" w:type="dxa"/>
        <w:bottom w:w="20" w:type="dxa"/>
        <w:right w:w="40" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblLayout w:type="autofit"/>
    </w:tblPr>\`;

  let bodyRowsXml = '';
  for (const row of rows) {
    bodyRowsXml += '<w:tr><w:trPr><w:cantSplit/></w:trPr>';
    for (const cell of row) {
      const wPct = Math.round((cell.widthPct || 25) * 50); // 25% -> 1250, 50% -> 2500
      bodyRowsXml += \`
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="\${wPct}" w:type="pct"/>
            <w:vAlign w:val="top"/>
          </w:tcPr>
          \${wParagraph([
            { text: cell.label, bold: true, fontSizeHalfPt: 26, underline: cell.isUnderlined },
            { text: cell.text, bold: false, fontSizeHalfPt: 26, underline: cell.isUnderlined }
          ], { spaceBefore: 20, spaceAfter: 20, line: 260 })}
        </w:tc>\`;
    }
    bodyRowsXml += '</w:tr>';
  }

  return \`<w:tbl>\${tblPr}\${bodyRowsXml}</w:tbl>\`;
}

/**
 * Căn chỉnh thông minh các phương án trắc nghiệm A, B, C, D chuẩn thể thức đề thi Bộ GD&ĐT
 * - Dàn 1 hàng 4 cột (mỗi cột 25%): khi cả 4 phương án đều ngắn (maxLen <= 18 và totalLen <= 68)
 * - Dàn 2 hàng 2 cột (mỗi cột 50%): khi độ dài trung bình (maxLen <= 45), A & C thẳng hàng, B & D thẳng hàng
 * - Dàn 4 dòng: khi có phương án dài (> 45 ký tự)
 */
function renderMcqOptionsWord(rawOpts, correctAnswer = null, showUnderline = false) {
  const opts = (rawOpts || []).map(o => String(o || '').replace(/^[A-D][\\.\\)]\\s*/, '').trim());
  const labels = ['A', 'B', 'C', 'D'];
  const maxLen = Math.max(...opts.map(o => o.length), 0);
  const totalLen = opts.reduce((s, o) => s + o.length, 0);

  const makeCell = (idx, widthPct) => ({
    label: \`\${labels[idx]}. \`,
    text: opts[idx] || '',
    isUnderlined: showUnderline && (correctAnswer === labels[idx]),
    widthPct
  });

  // 1. Trường hợp cả 4 phương án đều ngắn (maxLen <= 18 và tổng độ dài <= 68) -> Dàn 1 hàng 4 cột thẳng tắp (mỗi cột 25%)
  if (opts.length === 4 && maxLen <= 18 && totalLen <= 68) {
    return wBorderlessTable([
      [makeCell(0, 25), makeCell(1, 25), makeCell(2, 25), makeCell(3, 25)]
    ]);
  }

  // 2. Trường hợp độ dài trung bình (maxLen <= 45) -> Dàn 2 hàng 2 cột thẳng tắp (mỗi cột 50%)
  // Hàng 1: A và B; Hàng 2: C và D
  if (opts.length === 4 && maxLen <= 45) {
    return wBorderlessTable([
      [makeCell(0, 50), makeCell(1, 50)],
      [makeCell(2, 50), makeCell(3, 50)]
    ]);
  }

  // 3. Trường hợp phương án dài (> 45 ký tự hoặc chứa xuống dòng) -> Mỗi phương án 1 dòng riêng biệt
  let xml = '';
  opts.forEach((optText, oIdx) => {
    const lbl = labels[oIdx];
    const isUnderlined = showUnderline && (correctAnswer === lbl);
    xml += wParagraph([
      { text: \`    \${lbl}. \`, bold: true, fontSizeHalfPt: 26, underline: isUnderlined },
      { text: optText, fontSizeHalfPt: 26, underline: isUnderlined }
    ], { spaceBefore: 20, spaceAfter: 30, align: 'both' });
  });
  return xml;
}
`;

// Insert after wTable function
if (!content.includes('function renderMcqOptionsWord')) {
  const wTableEnd = '  return `<w:tbl>${tblPr}${headerRowXml}${bodyRowsXml}</w:tbl>`;\n}';
  content = content.replace(wTableEnd, wTableEnd + '\n' + newFunctions);
  console.log('✓ Added wBorderlessTable and renderMcqOptionsWord');
}

// 2. Replace MCQ option rendering block in buildStudentExamVariantXml
const oldOptionBlock = `      const opts = q.options || [];
      const labels = ['A', 'B', 'C', 'D'];
      // Nếu các phương án ngắn, trình bày 2 cột hoặc 1 dòng; nếu dài, mỗi phương án 1 dòng
      const maxOptLen = Math.max(...opts.map(o => String(o || '').length), 0);
      if (maxOptLen <= 28 && opts.length === 4) {
        xml += wParagraph([
          { text: \`A. \`, bold: true, fontSizeHalfPt: 26 }, { text: \`\${opts[0]}        \`, fontSizeHalfPt: 26 },
          { text: \`B. \`, bold: true, fontSizeHalfPt: 26 }, { text: \`\${opts[1]}        \`, fontSizeHalfPt: 26 },
          { text: \`C. \`, bold: true, fontSizeHalfPt: 26 }, { text: \`\${opts[2]}        \`, fontSizeHalfPt: 26 },
          { text: \`D. \`, bold: true, fontSizeHalfPt: 26 }, { text: \`\${opts[3]}\`, fontSizeHalfPt: 26 }
        ], { spaceBefore: 20, spaceAfter: 60 });
      } else {
        opts.forEach((optText, oIdx) => {
          const cleanOpt = String(optText || '').replace(/^[A-D][\\.\\)]\\s*/, '');
          xml += wParagraph([
            { text: \`\${labels[oIdx] || ''}. \`, bold: true, fontSizeHalfPt: 26 },
            { text: cleanOpt, fontSizeHalfPt: 26 }
          ], { spaceBefore: 20, spaceAfter: 30 });
        });
      }`;

const newOptionBlock = `      xml += renderMcqOptionsWord(q.options || []);`;

if (content.includes(oldOptionBlock)) {
  content = content.replace(oldOptionBlock, newOptionBlock);
  console.log('✓ Replaced old MCQ option spacing with renderMcqOptionsWord');
} else {
  console.log('⚠ Could not find exact oldOptionBlock');
}

fs.writeFileSync(zipDocxPath, content, 'utf8');
console.log('Updated src/zip-docx.js successfully!');

