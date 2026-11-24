const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const http = require('http');
const { execFileSync } = require('child_process');

const {
  OMR_TEMPLATES,
  getAllTemplates,
  getTemplateById,
  saveCustomTemplate,
  deleteCustomTemplate,
  scaleTemplateCoordsFromBase,
  computeTemplateSignature,
  resolveTemplateImagePath
} = require('../src/omr-templates');

const ROOT = path.resolve(__dirname, '..');

function httpRequest(port, method, urlPath, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const payload = bodyObj ? JSON.stringify(bodyObj) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      } : {}
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let json = null;
        try { json = JSON.parse(buf.toString('utf8')); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, buffer: buf, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function readBmpAsImageElement(bmpPath) {
  const buf = fs.readFileSync(bmpPath);
  const dataOffset = buf.readUInt32LE(10);
  const w = buf.readInt32LE(18);
  const rawH = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);
  const topDown = rawH < 0;
  const h = Math.abs(rawH);
  const bytesPerPx = bpp / 8;
  const stride = Math.ceil((w * bytesPerPx) / 4) * 4;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcRow = topDown ? y : (h - 1 - y);
    const rowOff = dataOffset + srcRow * stride;
    for (let x = 0; x < w; x++) {
      const s = rowOff + x * bytesPerPx;
      const d = (y * w + x) * 4;
      rgba[d] = buf[s + 2];
      rgba[d + 1] = buf[s + 1];
      rgba[d + 2] = buf[s];
      rgba[d + 3] = 255;
    }
  }
  return { naturalWidth: w, naturalHeight: h, _rgba: rgba };
}

function createFakeCanvas() {
  return {
    width: 0,
    height: 0,
    getContext() {
      const self = this;
      return {
        _buf: null,
        drawImage(imgEl, dx, dy, dw, dh) {
          const sw = imgEl.naturalWidth;
          const sh = imgEl.naturalHeight;
          const src = imgEl._rgba;
          const out = new Uint8ClampedArray(dw * dh * 4);
          const rx = sw / dw;
          const ry = sh / dh;
          for (let y = 0; y < dh; y++) {
            const sy = Math.min(sh - 1.001, Math.max(0, y * ry));
            const y0 = Math.floor(sy);
            const y1 = Math.min(sh - 1, y0 + 1);
            const fy = sy - y0;
            for (let x = 0; x < dw; x++) {
              const sx = Math.min(sw - 1.001, Math.max(0, x * rx));
              const x0 = Math.floor(sx);
              const x1 = Math.min(sw - 1, x0 + 1);
              const fx = sx - x0;
              const i00 = (y0 * sw + x0) * 4;
              const i10 = (y0 * sw + x1) * 4;
              const i01 = (y1 * sw + x0) * 4;
              const i11 = (y1 * sw + x1) * 4;
              const oIdx = (y * dw + x) * 4;
              for (let c = 0; c < 3; c++) {
                const top = src[i00 + c] * (1 - fx) + src[i10 + c] * fx;
                const bot = src[i01 + c] * (1 - fx) + src[i11 + c] * fx;
                out[oIdx + c] = Math.round(top * (1 - fy) + bot * fy);
              }
              out[oIdx + 3] = 255;
            }
          }
          self._buf = out;
        },
        getImageData() {
          return { data: self._buf };
        }
      };
    }
  };
}

function loadRecognizerContext() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const extract = (sMarker, eMarker) => {
    const s = html.indexOf(sMarker);
    assert(s !== -1, `Missing marker ${sMarker}`);
    const e = html.indexOf(eMarker, s);
    assert(e !== -1, `Missing end marker ${eMarker}`);
    return html.slice(s, e);
  };
  const tplSnippet = extract('    const OMR_CLIENT_TEMPLATES = [', '    function getActiveOmrTemplate()');
  const activeSnippet = extract('    function getActiveOmrTemplate()', '    function onOmrTemplateChanged(');
  const visionSnippet = extract('    function findOmrSquaresInRoi(', '    async function extractJpegBlobsFromPdfFile(');

  const ctx = {
    Math, Array, Object, String, Number, Boolean, Uint8Array, Int32Array, Uint8ClampedArray, console,
    appState: { omr: { selectedTemplateId: 'bgd_2025_4code' } },
    document: { createElement: () => createFakeCanvas() }
  };
  vm.createContext(ctx);
  vm.runInContext(`${tplSnippet}\n${activeSnippet}\n${visionSnippet}\nthis.OMR_CLIENT_TEMPLATES = OMR_CLIENT_TEMPLATES;`, ctx);
  return ctx;
}

async function runTests() {
  console.log('=== TEST CUSTOM OMR TEMPLATES & MULTI-FEATURE RECOGNITION ===');

  // 1. Unit test scaleTemplateCoordsFromBase + signature
  const baseBgd = OMR_TEMPLATES[0];
  const scaled = scaleTemplateCoordsFromBase(baseBgd, 1164, 1690, null, {
    codeDigits: 3,
    sbdDigits: 6,
    offsets: { dx: 4, dy: -6, sx: 1.0, sy: 1.0 }
  });
  assert.strictEqual(scaled.codeDigits, 3);
  assert.strictEqual(scaled.coords.code.numCols, 3);
  assert.strictEqual(scaled.coords.part1.colBases.length, 4);
  assert(scaled.coords.part1.radius > 7 && scaled.coords.part1.radius < 12, 'Radius should scale proportionally (~9.25)');
  console.log('[PASS] 1. scaleTemplateCoordsFromBase proportional mapping & offsets');

  // 2. Unit test persistence saveCustomTemplate / resolveTemplateImagePath / deleteCustomTemplate
  const sampleImgBuf = fs.readFileSync(path.join(ROOT, 'data/omr_templates/thpt_tong_hop.jpg'));
  const sampleDataUrl = 'data:image/jpeg;base64,' + sampleImgBuf.toString('base64');
  const saved = saveCustomTemplate({
    name: 'Phiếu KTGK Trường THPT Test',
    baseTemplateId: 'thpt_tong_hop',
    imageBase64: sampleDataUrl,
    fileName: 'phieu_ktgk_test.jpg',
    width: 2480,
    height: 3508,
    codeDigits: 3,
    sbdDigits: 6
  });
  assert(saved.id.startsWith('custom_'), 'Custom ID should start with custom_');
  assert.strictEqual(saved.isCustom, true);
  assert(getAllTemplates().some(t => t.id === saved.id), 'getAllTemplates should include saved custom template');
  assert.strictEqual(getTemplateById(saved.id).name, 'Phiếu KTGK Trường THPT Test');
  const resolvedImg = resolveTemplateImagePath(saved);
  assert(resolvedImg && fs.existsSync(resolvedImg), 'Saved custom image file must exist on disk');
  assert.strictEqual(deleteCustomTemplate(saved.id), true);
  assert(!getAllTemplates().some(t => t.id === saved.id), 'Deleted template must not appear in getAllTemplates');
  console.log('[PASS] 2. saveCustomTemplate / getAllTemplates / resolveTemplateImagePath / deleteCustomTemplate');

  // 3. Live HTTP API test via server.js
  const { server } = require('../server');
  await new Promise(resolve => {
    if (server.listening) return resolve();
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  try {
    const rList0 = await httpRequest(port, 'GET', '/api/omr/templates');
    assert.strictEqual(rList0.status, 200);
    assert(rList0.json.templates.length >= 4);

    const rPost = await httpRequest(port, 'POST', '/api/omr/templates/custom', {
      name: 'Mẫu Riêng THPT API',
      baseTemplateId: 'bgd_2025_4code',
      imageBase64: sampleDataUrl,
      fileName: 'mau_rieng_api.jpg',
      width: 2480,
      height: 3508,
      codeDigits: 4,
      sbdDigits: 6
    });
    assert.strictEqual(rPost.status, 200, `Expected 200, got ${rPost.status}: ${JSON.stringify(rPost.json)}`);
    assert.strictEqual(rPost.json.ok, true);
    const customId = rPost.json.template.id;

    const rImg = await httpRequest(port, 'GET', `/api/omr/template-image?templateId=${encodeURIComponent(customId)}`);
    assert.strictEqual(rImg.status, 200);
    assert(rImg.headers['content-type'].includes('image/jpeg'));
    assert.strictEqual(rImg.buffer.length, sampleImgBuf.length);

    const rBlank = await httpRequest(port, 'GET', `/api/omr/download-blank-template?templateId=${encodeURIComponent(customId)}`);
    assert.strictEqual(rBlank.status, 200);
    assert.strictEqual(rBlank.buffer.length, sampleImgBuf.length);

    const rDel = await httpRequest(port, 'DELETE', `/api/omr/templates/custom/${encodeURIComponent(customId)}`);
    assert.strictEqual(rDel.status, 200);
    assert.strictEqual(rDel.json.deleted, true);
    console.log('[PASS] 3. Live HTTP API (GET/POST/image/blank/DELETE /api/omr/templates/custom)');
  } finally {
    server.close();
  }

  // 4. Multi-feature template recognition test (4 built-ins + faded/erased topMid + custom template!)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omr-recog-'));
  try {
    const ps = `
Add-Type -AssemblyName System.Drawing
function Save-Bmp($src, $out, $eraseTopMid) {
  $bmp = [System.Drawing.Bitmap]::new($src)
  $b24 = [System.Drawing.Bitmap]::new($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b24)
  $g.DrawImage($bmp, 0, 0, $bmp.Width, $bmp.Height)
  if ($eraseTopMid) {
    $wb = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
    $g.FillRectangle($wb, [int]($bmp.Width * 0.55), 0, [int]($bmp.Width * 0.30), [int]($bmp.Height * 0.08))
    $wb.Dispose()
  }
  $g.Dispose()
  $b24.Save($out, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $b24.Dispose(); $bmp.Dispose()
}
Save-Bmp '${path.join(ROOT, 'data/omr_templates/bgd_2025_4code.jpg').replace(/'/g, "''")}' '${path.join(tmpDir, 'bgd.bmp').replace(/'/g, "''")}' $false
Save-Bmp '${path.join(ROOT, 'data/omr_templates/thpt_tong_hop.jpg').replace(/'/g, "''")}' '${path.join(tmpDir, 'th.bmp').replace(/'/g, "''")}' $false
Save-Bmp '${path.join(ROOT, 'data/omr_templates/thpt_tong_hop.jpg').replace(/'/g, "''")}' '${path.join(tmpDir, 'th_notopmid.bmp').replace(/'/g, "''")}' $true
Save-Bmp '${path.join(ROOT, 'data/omr_templates/thpt_roc_phach.png').replace(/'/g, "''")}' '${path.join(tmpDir, 'roc.bmp').replace(/'/g, "''")}' $false
`;
    execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'pipe' });

    const ctx = loadRecognizerContext();
    const imgBgd = readBmpAsImageElement(path.join(tmpDir, 'bgd.bmp'));
    const imgTh = readBmpAsImageElement(path.join(tmpDir, 'th.bmp'));
    const imgThNoTop = readBmpAsImageElement(path.join(tmpDir, 'th_notopmid.bmp'));
    const imgRoc = readBmpAsImageElement(path.join(tmpDir, 'roc.bmp'));

    const dBgd4 = ctx.detectOmrTemplateDetailed(imgBgd, ['1012', '2048']);
    assert.strictEqual(dBgd4.templateId, 'bgd_2025_4code', `Expected bgd_2025_4code, got ${JSON.stringify(dBgd4)}`);
    assert(dBgd4.confidence >= 80, `Expected high confidence for bgd4, got ${dBgd4.confidence}`);

    const dBgd3 = ctx.detectOmrTemplateDetailed(imgBgd, ['101', '102']);
    assert.strictEqual(dBgd3.templateId, 'bgd_2025_3code', `Expected bgd_2025_3code, got ${JSON.stringify(dBgd3)}`);

    const dTh = ctx.detectOmrTemplateDetailed(imgTh, ['101', '102']);
    assert.strictEqual(dTh.templateId, 'thpt_tong_hop', `Expected thpt_tong_hop, got ${JSON.stringify(dTh)}`);

    // Even when topMid timing mark is completely erased/obscured, multi-feature geom + Bubble-Ring Grid Alignment still nails thpt_tong_hop!
    const dThNoTop = ctx.detectOmrTemplateDetailed(imgThNoTop, []);
    assert.strictEqual(dThNoTop.templateId, 'thpt_tong_hop', `Expected thpt_tong_hop even without topMid, got ${JSON.stringify(dThNoTop)}`);

    const dRoc = ctx.detectOmrTemplateDetailed(imgRoc, ['1001']);
    assert.strictEqual(dRoc.templateId, 'thpt_roc_phach', `Expected thpt_roc_phach, got ${JSON.stringify(dRoc)}`);

    // Custom uploaded template recognition test
    const customTpl = {
      ...OMR_TEMPLATES[2],
      id: 'custom_school_test',
      shortName: 'Phiếu Riêng Trường ABC',
      isCustom: true,
      signature: computeTemplateSignature(OMR_TEMPLATES[2])
    };
    ctx.OMR_CLIENT_TEMPLATES.push(customTpl);
    ctx.appState.omr.selectedTemplateId = 'custom_school_test';
    const dCustom = ctx.detectOmrTemplateDetailed(imgTh, ['101']);
    assert.strictEqual(dCustom.templateId, 'custom_school_test', `Expected custom_school_test, got ${JSON.stringify(dCustom)}`);

    console.log(`[PASS] 4. Multi-feature recognizer: BGD4(${dBgd4.confidence}%), BGD3(${dBgd3.confidence}%), TH(${dTh.confidence}%), TH-NoTopMid(${dThNoTop.confidence}%), RocPhach(${dRoc.confidence}%), Custom(${dCustom.confidence}%)`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('=== ALL CUSTOM OMR TEMPLATE TESTS PASSED! ===');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
