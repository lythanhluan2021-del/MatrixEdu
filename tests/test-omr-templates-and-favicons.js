/**
 * tests/test-omr-templates-and-favicons.js
 * Kiểm tra bộ Favicon MatrixEdu & tính năng Đa Mẫu Phiếu Tô OMR (CV 7991)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const http = require('http');

const { OMR_TEMPLATES, getAllTemplates, getTemplateById } = require('../src/omr-templates');
const requestHandler = require('../server');

async function runTestSuite() {
  console.log('================================================================================');
  console.log(' KIỂM THỬ TÍNH NĂNG ĐA MẪU PHIẾU TÔ OMR & BỘ FAVICON MATRIXEDU');
  console.log('================================================================================\n');

  // TEST 1: Kiểm tra cấu trúc index.html & DOCTYPE (Không có ký tự lạc ma ở đầu)
  console.log('▶ TEST 1: Kiểm tra index.html & thẻ DOCTYPE');
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(indexHtml.startsWith('<!DOCTYPE html>'), 'index.html PHẢI bắt đầu bằng <!DOCTYPE html>, không có ký tự lạc');
  assert(!indexHtml.substring(0, 50).includes('ma\n'), 'index.html không được chứa ký tự lạc "ma" ở đầu file');
  assert(indexHtml.includes('<link rel="icon" type="image/x-icon" href="/favicon.ico" />'), 'Thiếu thẻ link favicon.ico trong head');
  assert(indexHtml.includes('id="omr-template-selector"'), 'Thiếu bộ chọn Mẫu phiếu id="omr-template-selector" trong giao diện Bước 7');
  assert(indexHtml.includes('downloadSelectedBlankTemplate()'), 'Thiếu hàm tải phôi in trắng downloadSelectedBlankTemplate()');
  console.log('   ✔ index.html đạt chuẩn W3C DOCTYPE, sạch ký tự và có đầy đủ thẻ Favicon + UI chọn mẫu phiếu.\n');

  // TEST 2: Kiểm tra các tệp Favicon vật lý
  console.log('▶ TEST 2: Kiểm tra các tệp Favicon (ICO, PNG, SVG)');
  const icoPath = path.join(__dirname, '..', 'favicon.ico');
  const pngPath = path.join(__dirname, '..', 'favicon.png');
  const svgPath = path.join(__dirname, '..', 'favicon.svg');
  assert(fs.existsSync(icoPath), 'Thiếu file favicon.ico');
  assert(fs.existsSync(pngPath), 'Thiếu file favicon.png');
  assert(fs.existsSync(svgPath), 'Thiếu file favicon.svg');

  const icoBuf = fs.readFileSync(icoPath);
  assert(icoBuf.readUInt16LE(0) === 0 && icoBuf.readUInt16LE(2) === 1, 'Header favicon.ico không đúng chuẩn ICO');

  const pngBuf = fs.readFileSync(pngPath);
  assert(pngBuf[0] === 0x89 && pngBuf[1] === 0x50 && pngBuf[2] === 0x4E && pngBuf[3] === 0x47, 'favicon.png không đúng chuẩn PNG');
  console.log('   ✔ Bộ Favicon vật lý (favicon.ico, favicon.png, favicon.svg) hoàn chỉnh và hợp lệ.\n');

  // TEST 3: Kiểm tra cấu hình và tài nguyên của 4 Mẫu phiếu OMR
  console.log('▶ TEST 3: Kiểm tra cấu hình 4 Mẫu phiếu OMR THPT');
  const templates = getAllTemplates();
  assert.strictEqual(templates.length, 4, 'Hệ thống phải hỗ trợ đúng 4 mẫu phiếu');

  const expectedIds = ['bgd_2025_4code', 'bgd_2025_3code', 'thpt_tong_hop', 'thpt_roc_phach'];
  for (const id of expectedIds) {
    const tpl = getTemplateById(id);
    assert(tpl, `Không tìm thấy template với id ${id}`);
    assert(tpl.coords, `Thiếu tọa độ coords cho template ${id}`);
    assert(tpl.coords.sbd, `Thiếu tọa độ SBD cho template ${id}`);
    assert(tpl.coords.code, `Thiếu tọa độ Mã đề cho template ${id}`);
    assert(tpl.coords.part1, `Thiếu tọa độ Phần I cho template ${id}`);
    assert(tpl.coords.part2, `Thiếu tọa độ Phần II cho template ${id}`);
    assert(tpl.coords.part3, `Thiếu tọa độ Phần III cho template ${id}`);

    // Kiểm tra file phôi in trắng
    const blankPath = path.join(__dirname, '..', tpl.blankFileName);
    const blankInTemplates = path.join(__dirname, '..', 'data', 'omr_templates', 'blank_files', tpl.blankFileName);
    assert(fs.existsSync(blankPath) || fs.existsSync(blankInTemplates), `Thiếu file phôi trắng cho template ${id}: ${tpl.blankFileName}`);

    console.log(`   ✔ Template [${id}]: ${tpl.shortName} (Mã đề: ${tpl.codeDigits} số, SBD: ${tpl.sbdDigits} số, Blank: ${tpl.blankFileName})`);
  }
  console.log('   ✔ Toàn bộ 4 mẫu phiếu và tệp phôi in trắng gốc đã sẵn sàng.\n');

  // TEST 4: Khởi chạy HTTP Server giả lập để kiểm tra REST API endpoints
  console.log('▶ TEST 4: Kiểm tra phản hồi REST API OMR & Favicon trên Server');
  const server = http.createServer(requestHandler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function testGet(urlPath, expectedContentType, checkBuffer = false) {
    return new Promise((resolve, reject) => {
      http.get(baseUrl + urlPath, (res) => {
        let chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const bodyBuf = Buffer.concat(chunks);
          assert.strictEqual(res.statusCode, 200, `Endpoint ${urlPath} trả về mã ${res.statusCode} (kỳ vọng 200)`);
          const ct = res.headers['content-type'] || '';
          assert(ct.includes(expectedContentType), `Endpoint ${urlPath} Content-Type là "${ct}", kỳ vọng chứa "${expectedContentType}"`);
          resolve({ status: res.statusCode, headers: res.headers, buf: bodyBuf, text: bodyBuf.toString('utf8') });
        });
      }).on('error', reject);
    });
  }

  // 4a. Favicon endpoints
  const resIco = await testGet('/favicon.ico', 'image/x-icon');
  assert(resIco.buf.length > 500, 'favicon.ico rỗng hoặc quá nhỏ');

  const resPng = await testGet('/favicon.png', 'image/png');
  assert(resPng.buf.length > 500, 'favicon.png rỗng');

  const resSvg = await testGet('/favicon.svg', 'image/svg+xml');
  assert(resSvg.text.includes('<svg'), 'favicon.svg không chứa thẻ svg');

  // 4b. OMR Templates endpoint
  const resTemplates = await testGet('/api/omr/templates', 'application/json');
  const jsonTemplates = JSON.parse(resTemplates.text);
  assert(jsonTemplates.ok && Array.isArray(jsonTemplates.templates) && jsonTemplates.templates.length === 4, 'Endpoint /api/omr/templates không trả về đúng 4 templates');

  // 4c. OMR Template Image endpoints
  const resImgTongHop = await testGet('/api/omr/template-image?templateId=thpt_tong_hop', 'image/jpeg');
  assert(resImgTongHop.buf.length > 50000, 'Ảnh thpt_tong_hop rỗng hoặc lỗi');

  const resImgRocPhach = await testGet('/api/omr/template-image?templateId=thpt_roc_phach', 'image/png');
  assert(resImgRocPhach.buf.length > 20000, 'Ảnh thpt_roc_phach rỗng hoặc lỗi');

  // 4d. OMR Blank Template Download endpoints
  const resBlankPdf = await testGet('/api/omr/download-blank-template?templateId=thpt_tong_hop', 'application/pdf');
  assert(resBlankPdf.buf.length > 100000, 'File PDF thpt_tong_hop rỗng');

  const resBlankDocx = await testGet('/api/omr/download-blank-template?templateId=thpt_roc_phach', 'application/vnd.openxmlformats');
  assert(resBlankDocx.buf.length > 10000, 'File Docx thpt_roc_phach rỗng');

  server.close();
  console.log('   ✔ Tất cả API REST: Favicon, Templates, Phục vụ ảnh phôi & Tải tệp phôi in trắng hoạt động 100% chuẩn xác!\n');

  console.log('================================================================================');
  console.log(' TẤT CẢ 4 BỘ KIỂM THỬ ĐÃ ĐẠT 100% THÀNH CÔNG!');
  console.log('================================================================================');
}

runTestSuite().catch(err => {
  console.error('❌ LỖI KIỂM THỬ:', err);
  process.exit(1);
});
