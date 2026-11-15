const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { execFileSync } = require('child_process');

const { gradeSinglePaper, buildSmartRosterMap } = require('../src/omr-engine');
const { OMR_TEMPLATES } = require('../src/omr-templates');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractBlock(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  assert(s !== -1, `Missing start marker: ${startMarker}`);
  const e = endMarker ? html.indexOf(endMarker, s) : html.length;
  assert(e !== -1, `Missing end marker: ${endMarker}`);
  return html.slice(s, e);
}

// Trích xuất mã nguồn thực tế từ index.html (không nhân bản/mock logic nhận diện)
const tplSnippet = extractBlock('    const OMR_CLIENT_TEMPLATES = [', '    function getActiveOmrTemplate()');
const activeFnSnippet = extractBlock('    function getActiveOmrTemplate()', '    function onOmrTemplateChanged(');
const visionSnippet = extractBlock('    function findOmrSquaresInRoi(', '    async function extractJpegBlobsFromPdfFile(');

// Mô phỏng HTML5 Canvas faithful 100% (hỗ trợ bilinear scale như trình duyệt Chrome thật)
function createFakeCanvas(backing) {
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
        getImageData(x, y, w, h) {
          return { data: self._buf || backing };
        }
      };
    }
  };
}

function loadClientOmrContext() {
  const ctx = {
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Uint8Array,
    Int32Array,
    Uint8ClampedArray,
    console,
    appState: { omr: { selectedTemplateId: 'bgd_2025_4code' } },
    document: {
      createElement(tag) {
        assert.strictEqual(tag, 'canvas');
        return createFakeCanvas();
      }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(`${tplSnippet}\n${activeFnSnippet}\n${visionSnippet}\nthis.OMR_CLIENT_TEMPLATES = OMR_CLIENT_TEMPLATES;`, ctx);
  return ctx;
}

// Đọc file BMP 24/32-bit uncompressed được xuất từ .NET System.Drawing
function readBmpAsImageElement(bmpPath) {
  const buf = fs.readFileSync(bmpPath);
  assert.strictEqual(buf.toString('ascii', 0, 2), 'BM', 'Expected BMP header');
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
      rgba[d] = buf[s + 2];     // R
      rgba[d + 1] = buf[s + 1]; // G
      rgba[d + 2] = buf[s];     // B
      rgba[d + 3] = 255;
    }
  }
  return { naturalWidth: w, naturalHeight: h, _rgba: rgba };
}

// Xoay ảnh theo chiều kim đồng hồ ở độ phân giải gốc (mô phỏng rotateOmrImageElementAsync trên trình duyệt)
function rotateImageElementCW(img, rotation) {
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 0) return img;
  const sw = img.naturalWidth;
  const sh = img.naturalHeight;
  const quarter = rot === 90 || rot === 270;
  const W = quarter ? sh : sw;
  const H = quarter ? sw : sh;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sx, sy;
      if (rot === 180) { sx = sw - 1 - x; sy = sh - 1 - y; }
      else if (rot === 90) { sx = y; sy = sh - 1 - x; }
      else { sx = sw - 1 - y; sy = x; }
      const si = (sy * sw + sx) * 4;
      const di = (y * W + x) * 4;
      out[di] = img._rgba[si];
      out[di + 1] = img._rgba[si + 1];
      out[di + 2] = img._rgba[si + 2];
      out[di + 3] = 255;
    }
  }
  return { naturalWidth: W, naturalHeight: H, _rgba: out };
}

function generateTestBitmaps(tmpDir) {
  const tplTongHop = OMR_TEMPLATES.find(t => t.id === 'thpt_tong_hop');
  const tplBgd4 = OMR_TEMPLATES.find(t => t.id === 'bgd_2025_4code');

  // Tạo danh sách các hình tròn cần tô + nhiễu trên ảnh gốc trước khi xoay/nghiêng để mô phỏng 100% ảnh scan thật
  const p1MarksTongHop = [];
  const expectedP1TH = {};
  const sampleAns = ['A', 'B', 'C', 'D'];
  for (let q = 1; q <= 24; q++) {
    if (q === 8 || q === 9) continue; // Câu 8 tô đúp, Câu 9 tô mờ không rõ
    const opt = sampleAns[(q * 3 + 1) % 4];
    expectedP1TH[q] = opt;
    const cIdx = Math.floor((q - 1) / 10);
    const rIdx = (q - 1) % 10;
    const oIdx = sampleAns.indexOf(opt);
    p1MarksTongHop.push({
      x: tplTongHop.coords.part1.colBases[cIdx] + oIdx * tplTongHop.coords.part1.optStepX,
      y: tplTongHop.coords.part1.rowBaseY + rIdx * tplTongHop.coords.part1.rowStepY,
      r: 14,
      gray: (q % 2 === 0) ? 182 : 120 // nửa câu dùng bút chì HB-2B nhạt (gray=182 > 160!), nửa dùng chì đậm
    });
  }
  // Câu 8 tô đúp B & C
  for (const oIdx of [1, 2]) {
    p1MarksTongHop.push({
      x: tplTongHop.coords.part1.colBases[0] + oIdx * tplTongHop.coords.part1.optStepX,
      y: tplTongHop.coords.part1.rowBaseY + 7 * tplTongHop.coords.part1.rowStepY,
      r: 14,
      gray: 105
    });
  }
  // Câu 9 tẩy xóa / tô mờ nhẹ không rõ tại D (diện tích hẹp ~35% lõi ô)
  p1MarksTongHop.push({
    x: tplTongHop.coords.part1.colBases[0] + 3 * tplTongHop.coords.part1.optStepX + 3,
    y: tplTongHop.coords.part1.rowBaseY + 8 * tplTongHop.coords.part1.rowStepY,
    r: 6.2,
    gray: 190
  });

  // SBD 035 tô ở 3 cột cuối (cột 4, 5, 6), để trống 3 cột đầu
  const sbdDigitsTH = [3, 4, 5].map((col, idx) => ({
    col,
    digit: [0, 3, 5][idx]
  }));
  sbdDigitsTH.forEach(({ col, digit }) => {
    p1MarksTongHop.push({
      x: tplTongHop.coords.sbd.colBaseX + col * tplTongHop.coords.sbd.colStepX,
      y: tplTongHop.coords.sbd.rowBaseY + digit * tplTongHop.coords.sbd.rowStepY,
      r: 13.5,
      gray: 178 // chì nhẹ
    });
  });

  // Mã đề 102
  [1, 0, 2].forEach((digit, col) => {
    p1MarksTongHop.push({
      x: tplTongHop.coords.code.colBaseX + col * tplTongHop.coords.code.colStepX,
      y: tplTongHop.coords.code.rowBaseY + digit * tplTongHop.coords.code.rowStepY,
      r: 13.5,
      gray: 174
    });
  });

  // Phần II (4 câu, thang Lũy tiến Bộ GD 2025: Câu 1 đúng 4 ý -> 1.0, Câu 2 đúng 3 ý -> 0.5, Câu 3 đúng 2 ý -> 0.25, Câu 4 đúng 1 ý -> 0.1)
  const thP2Ans = {
    1: { a: 'Đ', b: 'Đ', c: 'S', d: 'S' },
    2: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' },
    3: { a: 'S', b: 'Đ', c: 'S', d: 'Đ' },
    4: { a: 'Đ', b: 'Đ', c: 'S', d: 'Đ' }
  };
  for (let c = 1; c <= 4; c++) {
    ['a', 'b', 'c', 'd'].forEach((sub, sIdx) => {
      const optIdx = thP2Ans[c][sub] === 'Đ' ? 0 : 1;
      p1MarksTongHop.push({
        x: tplTongHop.coords.part2.colBases[c - 1] + optIdx * tplTongHop.coords.part2.optStepX,
        y: tplTongHop.coords.part2.rowBaseY + sIdx * tplTongHop.coords.part2.rowStepY,
        r: 14,
        gray: 180
      });
    });
  }

  // Phần III (4 câu: Câu 1 = "12", Câu 2 = "-3,5", Câu 3 = "0,25", Câu 4 = "405")
  const thP3Expected = { 1: '12', 2: '-3,5', 3: '0,25', 4: '405' };
  const addP3Marks = (tplObj, qNum, chars, targetArr) => {
    const qBaseX = tplObj.coords.part3.colBases[qNum - 1];
    for (let cIdx = 0; cIdx < chars.length; cIdx++) {
      const ch = chars[cIdx];
      let y;
      if (ch === '-') y = tplObj.coords.part3.yMinus;
      else if (ch === ',') y = tplObj.coords.part3.yComma;
      else y = tplObj.coords.part3.rowBaseDigitY + parseInt(ch, 10) * tplObj.coords.part3.rowStepDigitY;
      targetArr.push({
        x: qBaseX + cIdx * tplObj.coords.part3.charStepX,
        y,
        r: 13.5,
        gray: 175
      });
    }
  };
  addP3Marks(tplTongHop, 1, '12', p1MarksTongHop);
  addP3Marks(tplTongHop, 2, '-3,5', p1MarksTongHop);
  addP3Marks(tplTongHop, 3, '0,25', p1MarksTongHop);
  addP3Marks(tplTongHop, 4, '405', p1MarksTongHop);

  // Phiếu 2: Mẫu Bộ GD 2025 Mã 4 số (2104), BỎ TRỐNG SBD hoàn toàn, Câu 1a Phần II tô đúp Đ & S, nghiêng -1.2 độ
  const bgdMarks = [];
  [2, 1, 0, 4].forEach((digit, col) => {
    bgdMarks.push({
      x: tplBgd4.coords.code.colBaseX + col * tplBgd4.coords.code.colStepX,
      y: tplBgd4.coords.code.rowBaseY + digit * tplBgd4.coords.code.rowStepY,
      r: 14,
      gray: 150
    });
  });
  for (let q = 1; q <= 12; q++) {
    const optIdx = (q - 1) % 4;
    const cIdx = Math.floor((q - 1) / 10);
    const rIdx = (q - 1) % 10;
    bgdMarks.push({
      x: tplBgd4.coords.part1.colBases[cIdx] + optIdx * tplBgd4.coords.part1.optStepX,
      y: tplBgd4.coords.part1.rowBaseY + rIdx * tplBgd4.coords.part1.rowStepY,
      r: 14,
      gray: 165
    });
  }
  // Câu 1a tô ĐÚP cả Đ và S
  bgdMarks.push({ x: tplBgd4.coords.part2.colBases[0], y: tplBgd4.coords.part2.rowBaseY, r: 14, gray: 110 });
  bgdMarks.push({ x: tplBgd4.coords.part2.colBases[0] + tplBgd4.coords.part2.optStepX, y: tplBgd4.coords.part2.rowBaseY, r: 14, gray: 110 });
  addP3Marks(tplBgd4, 1, '-2,5', bgdMarks);

  const specPath = path.join(tmpDir, 'spec.json');
  fs.writeFileSync(specPath, JSON.stringify({
    thSrc: path.join(ROOT, 'data/omr_templates/thpt_tong_hop.jpg'),
    bgdSrc: path.join(ROOT, 'data/omr_templates/bgd_2025_4code.jpg'),
    rocSrc: path.join(ROOT, 'data/omr_templates/thpt_roc_phach.png'),
    outDir: tmpDir,
    thMarks: p1MarksTongHop,
    bgdMarks
  }));

  const psScript = `
Add-Type -AssemblyName System.Drawing
$spec = Get-Content -Raw '${specPath.replace(/\\/g, '\\\\')}' | ConvertFrom-Json

function ConvertTo-Bmp($srcPath, $outPath) {
  $bmp = [System.Drawing.Bitmap]::new($srcPath)
  $b24 = [System.Drawing.Bitmap]::new($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($b24)
  $g.DrawImage($bmp, 0, 0, $bmp.Width, $bmp.Height)
  $g.Dispose()
  $b24.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $b24.Dispose()
  $bmp.Dispose()
}

function Render-Synthetic($srcPath, $outPath, $marks, $angleDeg, $shiftX, $shiftY, $rightBorderW) {
  $orig = [System.Drawing.Bitmap]::new($srcPath)
  $w = $orig.Width; $h = $orig.Height
  $canvas = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear([System.Drawing.Color]::White)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $g.TranslateTransform($w / 2.0 + $shiftX, $h / 2.0 + $shiftY)
  $g.RotateTransform($angleDeg)
  $g.TranslateTransform(-$w / 2.0, -$h / 2.0)
  $g.DrawImage($orig, 0, 0, $w, $h)

  foreach ($m in $marks) {
    $c = [int]$m.gray
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, $c, $c, $c))
    $r = [float]$m.r
    $g.FillEllipse($brush, [float]($m.x - $r), [float]($m.y - $r), [float](2 * $r), [float](2 * $r))
    $brush.Dispose()
  }
  $g.ResetTransform()

  if ($rightBorderW -gt 0) {
    $darkBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 22, 22, 24))
    $g.FillRectangle($darkBrush, $w - $rightBorderW, 0, $rightBorderW, $h)
    $g.FillRectangle($darkBrush, 0, $h - 24, $w, 24)
    $darkBrush.Dispose()
  }
  $g.Dispose()
  $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $canvas.Dispose()
  $orig.Dispose()
}

ConvertTo-Bmp $spec.thSrc (Join-Path $spec.outDir 'clean_th.bmp')
ConvertTo-Bmp $spec.bgdSrc (Join-Path $spec.outDir 'clean_bgd.bmp')
ConvertTo-Bmp $spec.rocSrc (Join-Path $spec.outDir 'clean_roc.bmp')
Render-Synthetic $spec.thSrc (Join-Path $spec.outDir 'synth_th.bmp') $spec.thMarks 1.4 -18 14 78
Render-Synthetic $spec.bgdSrc (Join-Path $spec.outDir 'synth_bgd.bmp') $spec.bgdMarks -1.2 14 -12 52

function Save-Rotated($inPath, $outPath, $flip) {
  $src = [System.Drawing.Bitmap]::new($inPath)
  $copy = [System.Drawing.Bitmap]::new($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($copy)
  $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $g.Dispose()
  $src.Dispose()
  $copy.RotateFlip($flip)
  $copy.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  $copy.Dispose()
}

# Phiếu bị lật ngược 180 độ và phiếu scan nằm ngang 90/270 độ
Save-Rotated (Join-Path $spec.outDir 'synth_th.bmp') (Join-Path $spec.outDir 'synth_th_flip180.bmp') ([System.Drawing.RotateFlipType]::Rotate180FlipNone)
Save-Rotated (Join-Path $spec.outDir 'clean_th.bmp') (Join-Path $spec.outDir 'clean_th_flip180.bmp') ([System.Drawing.RotateFlipType]::Rotate180FlipNone)
Save-Rotated (Join-Path $spec.outDir 'synth_bgd.bmp') (Join-Path $spec.outDir 'synth_bgd_rot90.bmp') ([System.Drawing.RotateFlipType]::Rotate90FlipNone)
Save-Rotated (Join-Path $spec.outDir 'clean_roc.bmp') (Join-Path $spec.outDir 'clean_roc_rot270.bmp') ([System.Drawing.RotateFlipType]::Rotate270FlipNone)
Save-Rotated (Join-Path $spec.outDir 'clean_roc.bmp') (Join-Path $spec.outDir 'clean_roc_flip180.bmp') ([System.Drawing.RotateFlipType]::Rotate180FlipNone)
`;
  const psPath = path.join(tmpDir, 'render.ps1');
  fs.writeFileSync(psPath, psScript);
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath], { stdio: 'pipe' });

  return { expectedP1TH, thP2Ans, thP3Expected };
}

function run() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omr-vision-test-'));
  try {
    const { expectedP1TH, thP2Ans, thP3Expected } = generateTestBitmaps(tmpDir);
    const ctx = loadClientOmrContext();

    // 1. Kiểm tra đồng bộ số lượng ô đo được giữa OMR_CLIENT_TEMPLATES và chuẩn 572/582
    const tplTH = ctx.OMR_CLIENT_TEMPLATES.find(t => t.id === 'thpt_tong_hop');
    const tplBgd4 = ctx.OMR_CLIENT_TEMPLATES.find(t => t.id === 'bgd_2025_4code');
    const tplBgd3 = ctx.OMR_CLIENT_TEMPLATES.find(t => t.id === 'bgd_2025_3code');
    const countBubbles = tpl => (tpl.coords.sbd.numCols * 10)
      + (tpl.coords.code.numCols * 10)
      + (40 * 4) + (8 * 4 * 2) + (6 * (1 + 2 + 4 * 10));
    assert.strictEqual(countBubbles(tplBgd3), 572, 'Mẫu 3 số phải đủ 572 ô tròn');
    assert.strictEqual(countBubbles(tplBgd4), 582, 'Mẫu 4 số phải đủ 582 ô tròn');
    assert.strictEqual(countBubbles(tplTH), 572, 'Mẫu Tổng hợp THPT phải đủ 572 ô tròn');
    console.log('✓ Tọa độ mẫu phiếu chuẩn xác (572 & 582 ô).');

    // 2. Auto-detect & ZERO false positive trên 3 phôi gốc trống hoàn toàn
    const cleanThImg = readBmpAsImageElement(path.join(tmpDir, 'clean_th.bmp'));
    const cleanBgdImg = readBmpAsImageElement(path.join(tmpDir, 'clean_bgd.bmp'));
    const cleanRocImg = readBmpAsImageElement(path.join(tmpDir, 'clean_roc.bmp'));

    assert.strictEqual(ctx.detectOmrTemplateFromImageData(cleanThImg, ['102', '103']), 'thpt_tong_hop');
    assert.strictEqual(ctx.detectOmrTemplateFromImageData(cleanBgdImg, ['2101', '2104']), 'bgd_2025_4code');
    assert.strictEqual(ctx.detectOmrTemplateFromImageData(cleanBgdImg, ['101', '102']), 'bgd_2025_3code');
    assert.strictEqual(ctx.detectOmrTemplateFromImageData(cleanRocImg, ['2101']), 'thpt_roc_phach');

    ctx.appState.omr.selectedTemplateId = 'thpt_tong_hop';
    const blankThRes = ctx.scanOmrSheetFromImageElement(cleanThImg, 0.35, { expectedP1Count: 40, expectedP2Count: 8, expectedP3Count: 6 });
    assert.strictEqual(blankThRes.totalFilledBubbles, 0, 'Phiếu gốc trắng thpt_tong_hop không được bắt nhầm ô nào');
    assert.strictEqual(blankThRes.isBlankPaper, true);
    assert(blankThRes.detectedFiducials, 'Phải bắt đủ 4 góc định vị trên thpt_tong_hop');

    ctx.appState.omr.selectedTemplateId = 'bgd_2025_4code';
    const blankBgdRes = ctx.scanOmrSheetFromImageElement(cleanBgdImg, 0.35, { expectedP1Count: 40, expectedP2Count: 8, expectedP3Count: 6 });
    assert.strictEqual(blankBgdRes.totalFilledBubbles, 0, 'Phiếu gốc trắng bgd_2025_4code không được bắt nhầm ô nào');
    console.log('✓ Nhận diện mẫu tự động & 0 dương tính giả trên tất cả các phôi gốc.');

    // 3. Phiếu Tổng Hợp xoay nghiêng 1.4°, dịch (-18,+14), sọc đen mép phải photocopy, bút chì nhạt (gray=174..182), SBD '035', Mã 102
    const synthThImg = readBmpAsImageElement(path.join(tmpDir, 'synth_th.bmp'));
    const autoThId = ctx.detectOmrTemplateFromImageData(synthThImg, ['102', '103']);
    assert.strictEqual(autoThId, 'thpt_tong_hop', 'Phải tự nhận diện đúng thpt_tong_hop dù ảnh nghiêng & có viền đen photocopy');

    ctx.appState.omr.selectedTemplateId = autoThId;
    const thRes = ctx.scanOmrSheetFromImageElement(synthThImg, 0.35, { expectedP1Count: 24, expectedP2Count: 4, expectedP3Count: 4 });
    assert(thRes.detectedFiducials, 'Phải bắt chuẩn 4 ô vuông định vị dù có sọc đen mép phải');
    assert.strictEqual(thRes.sbd, '035', `SBD 3 số phải đọc đúng '035', got '${thRes.sbd}'`);
    assert.deepStrictEqual(Array.from(thRes.sbdColDigits), [null, null, null, '0', '3', '5']);
    assert(thRes.warnings.some(w => w.type === 'INCOMPLETE_SBD'), 'SBD 3/6 cột phải gắn cờ kiểm tra INCOMPLETE_SBD');
    assert.strictEqual(thRes.scannedExamCode, '102', `Mã đề phải đọc đúng '102', got '${thRes.scannedExamCode}'`);

    for (let q = 1; q <= 24; q++) {
      if (q === 8) {
        assert.strictEqual(thRes.answers.part1[8], '', 'Câu 8 tô đúp B/C KHÔNG được tự đoán');
        assert.deepStrictEqual(Array.from(thRes.ambiguous.part1[8]), ['B', 'C']);
        assert(thRes.warnings.some(w => w.type === 'DOUBLE_FILL' && w.message.includes('Câu 8')));
      } else if (q === 9) {
        assert.strictEqual(thRes.answers.part1[9], '', 'Câu 9 tô mờ không rõ KHÔNG được tự đoán');
        assert(thRes.warnings.some(w => w.type === 'AMBIGUOUS_FILL' && w.message.includes('Câu 9')));
      } else {
        assert.strictEqual(thRes.answers.part1[q], expectedP1TH[q], `Sai Phần I Câu ${q} (chì nhạt/đậm): kỳ vọng ${expectedP1TH[q]}, nhận ${thRes.answers.part1[q]}`);
      }
    }
    for (let q = 25; q <= 40; q++) {
      assert(!thRes.answers.part1[q], `Câu trống ${q} (đặc biệt cột phải 31..40) không được bắt nhầm`);
    }
    for (let c = 1; c <= 4; c++) {
      assert.deepStrictEqual(JSON.parse(JSON.stringify(thRes.answers.part2[c])), thP2Ans[c], `Sai Phần II Câu ${c}`);
    }
    for (let q = 1; q <= 4; q++) {
      assert.strictEqual(thRes.answers.part3[q], thP3Expected[q], `Sai Phần III Câu ${q}: kỳ vọng ${thP3Expected[q]}, nhận ${thRes.answers.part3[q]}`);
    }

    // Kiểm tra chấm điểm chuẩn barem MoET 2025 (P1=0.25, P2 lũy tiến 0.1/0.25/0.5/1.0, P3=0.5) & định danh SBD không pad nhầm
    const p1Key = [];
    for (let q = 1; q <= 24; q++) {
      p1Key.push(expectedP1TH[q] || 'A');
    }
    const p2Key = {
      1: { a: 'Đ', b: 'Đ', c: 'S', d: 'S' }, // 4/4 đúng -> 1.00
      2: { a: 'Đ', b: 'S', c: 'Đ', d: 'Đ' }, // 3/4 đúng -> 0.50
      3: { a: 'S', b: 'Đ', c: 'Đ', d: 'S' }, // 2/4 đúng -> 0.25
      4: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' }  // 1/4 đúng -> 0.10
    };
    const keyByCode = {
      '102': { part1: p1Key, part2: p2Key, part3: thP3Expected }
    };
    const smartRoster = buildSmartRosterMap([{ sbd: '035', fullName: 'Nguyễn Hữu Toàn', className: '10A8' }]);
    assert(smartRoster.get('035') && smartRoster.get('000035'), 'Smart roster phải khớp cả 035 và 000035');
    const graded = gradeSinglePaper({
      sbd: thRes.sbd,
      scannedExamCode: thRes.scannedExamCode,
      answers: thRes.answers
    }, keyByCode['102'], { mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 });

    // P1 đúng 22/24 câu (Q8 tô đúp trống, Q9 mờ trống -> 22 * 0.25 = 5.50)
    // P2 đúng 1.00 + 0.50 + 0.25 + 0.10 = 1.85
    // P3 đúng 4 * 0.50 = 2.00 => Tổng = 9.35đ
    assert.strictEqual(graded.part1Score, 5.5, 'Điểm P1 phải đúng 5.50đ');
    assert.strictEqual(graded.part2Score, 1.85, 'Điểm P2 theo lũy tiến BGD 2025 phải đúng 1.85đ');
    assert.strictEqual(graded.part3Score, 2.0, 'Điểm P3 phải đúng 2.00đ');
    assert.strictEqual(graded.totalScore, 9.35, 'Tổng điểm phải khớp chấm tay 9.35đ');
    console.log('✓ Phiếu Tổng Hợp nghiêng 1.4° + sọc đen photocopy + chì nhạt (gray=174..182) + SBD 035 + Mã 102 + Barem MoET 2025 đạt 9.35/9.35!');

    // 4. Phiếu BGD 2025 4 số nghiêng -1.2°, BỎ TRỐNG SBD hoàn toàn, Mã 2104, Câu 1a Phần II tô đúp Đ/S
    const synthBgdImg = readBmpAsImageElement(path.join(tmpDir, 'synth_bgd.bmp'));
    const autoBgdId = ctx.detectOmrTemplateFromImageData(synthBgdImg, ['2101', '2104']);
    assert.strictEqual(autoBgdId, 'bgd_2025_4code');
    ctx.appState.omr.selectedTemplateId = autoBgdId;
    const bgdRes = ctx.scanOmrSheetFromImageElement(synthBgdImg, 0.35, { expectedP1Count: 12, expectedP2Count: 4, expectedP3Count: 2 });
    assert.strictEqual(bgdRes.sbd, '', 'Lưới SBD bỏ trống phải trả về rỗng, không được tự đoán');
    assert(bgdRes.warnings.some(w => w.type === 'MISSING_SBD'), 'Phải gắn cờ MISSING_SBD');
    assert.strictEqual(bgdRes.scannedExamCode, '2104', `Mã đề 4 số phải đọc '2104', got '${bgdRes.scannedExamCode}'`);
    assert.strictEqual(bgdRes.answers.part2[1].a, 'Đ/S', 'Phần II Câu 1a tô đúp phải gắn Đ/S');
    assert(bgdRes.warnings.some(w => w.type === 'DOUBLE_FILL' && w.message.includes('1a')));
    assert.strictEqual(bgdRes.answers.part3[1], '-2,5');
    for (let q = 1; q <= 12; q++) {
      const expOpt = ['A', 'B', 'C', 'D'][(q - 1) % 4];
      assert.strictEqual(bgdRes.answers.part1[q], expOpt, `BGD 4 số P1 Câu ${q} sai`);
    }
    console.log('✓ Phiếu Bộ GD&ĐT 2025 Mã 4 số (2104) + bỏ trống SBD + tô đúp P2 1a + P3 -2,5 đạt chính xác 100%!');

    // 5. PHIẾU BỊ LẬT NGƯỢC / SCAN NẰM NGANG: tự phát hiện góc xoay, xoay về đúng chiều rồi chấm cho kết quả y hệt
    const orientCases = [
      { file: 'clean_th.bmp', expect: 0, label: 'Phôi Tổng hợp đúng chiều' },
      { file: 'synth_th.bmp', expect: 0, label: 'Phiếu Tổng hợp đã tô đúng chiều' },
      { file: 'synth_bgd.bmp', expect: 0, label: 'Phiếu BGD đã tô đúng chiều' },
      { file: 'clean_th_flip180.bmp', expect: 180, label: 'Phôi Tổng hợp lật ngược' },
      { file: 'synth_th_flip180.bmp', expect: 180, label: 'Phiếu Tổng hợp đã tô bị lật ngược' },
      { file: 'synth_bgd_rot90.bmp', expect: 270, label: 'Phiếu BGD scan nằm ngang (xoay 90°)' },
      { file: 'clean_roc_rot270.bmp', expect: 90, label: 'Phôi Rọc phách nằm ngang (xoay 270°)' },
      { file: 'clean_roc_flip180.bmp', expect: 180, label: 'Phôi Rọc phách lật ngược' }
    ];
    const orientImgs = {};
    for (const oc of orientCases) {
      const img = readBmpAsImageElement(path.join(tmpDir, oc.file));
      orientImgs[oc.file] = img;
      const res = ctx.detectOmrSheetOrientation(img);
      assert.strictEqual(res.rotation, oc.expect, `${oc.label}: kỳ vọng xoay ${oc.expect}°, nhận ${res.rotation}° (scores=${JSON.stringify(res.scores)})`);
      if (oc.expect !== 0) assert(res.confident, `${oc.label}: phải xác định hướng với độ tin cậy cao (scores=${JSON.stringify(res.scores)})`);
      console.log(`  ✓ ${oc.label}: xoay ${res.rotation}° (scores=${JSON.stringify(res.scores)})`);
    }

    // Phiếu Tổng hợp lật ngược: gọi trực tiếp scanOmrSheetFromImageElement trên ảnh ngược đầu vẫn tự động lật 180° & chấm đúng 9.35đ
    ctx.appState.omr.selectedTemplateId = 'thpt_tong_hop';
    const directFlipRes = ctx.scanOmrSheetFromImageElement(orientImgs['synth_th_flip180.bmp'], 0.35, { expectedP1Count: 24, expectedP2Count: 4, expectedP3Count: 4 });
    assert.strictEqual(directFlipRes.autoRotatedDeg, 180, 'scanOmrSheetFromImageElement phải tự động xoay 180° khi gặp ảnh ngược đầu');
    assert.strictEqual(directFlipRes.sbd, '035');
    assert.strictEqual(directFlipRes.scannedExamCode, '102');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(directFlipRes.answers)), JSON.parse(JSON.stringify(thRes.answers)), 'Đáp án quét trực tiếp trên ảnh ngược đầu phải trùng khớp 100%');

    // Phiếu Tổng hợp lật ngược: sau khi xoay ảnh -> nhận diện mẫu & chấm giống hệt phiếu đúng chiều
    const fixedTh = rotateImageElementCW(orientImgs['synth_th_flip180.bmp'], 180);
    assert.strictEqual(ctx.detectOmrTemplateFromImageData(fixedTh, ['102', '103']), 'thpt_tong_hop');
    ctx.appState.omr.selectedTemplateId = 'thpt_tong_hop';
    const fixedThRes = ctx.scanOmrSheetFromImageElement(fixedTh, 0.35, { expectedP1Count: 24, expectedP2Count: 4, expectedP3Count: 4 });
    assert.strictEqual(fixedThRes.sbd, '035');
    assert.strictEqual(fixedThRes.scannedExamCode, '102');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(fixedThRes.answers)), JSON.parse(JSON.stringify(thRes.answers)), 'Đáp án phiếu lật ngược sau khi xoay phải trùng khớp phiếu đúng chiều');
    const gradedFlip = gradeSinglePaper({ answers: fixedThRes.answers }, keyByCode['102'], { mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 });
    assert.strictEqual(gradedFlip.totalScore, 9.35, 'Phiếu lật ngược sau khi xoay phải được 9.35đ như chấm tay');

    // Phiếu BGD scan nằm ngang: sau khi xoay -> mã đề 2104, MISSING_SBD, 12 câu P1 đúng
    const fixedBgd = rotateImageElementCW(orientImgs['synth_bgd_rot90.bmp'], 270);
    assert.strictEqual(ctx.detectOmrTemplateFromImageData(fixedBgd, ['2101', '2104']), 'bgd_2025_4code');
    ctx.appState.omr.selectedTemplateId = 'bgd_2025_4code';
    const fixedBgdRes = ctx.scanOmrSheetFromImageElement(fixedBgd, 0.35, { expectedP1Count: 12, expectedP2Count: 4, expectedP3Count: 2 });
    assert.strictEqual(fixedBgdRes.scannedExamCode, '2104');
    assert(fixedBgdRes.warnings.some(w => w.type === 'MISSING_SBD'));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(fixedBgdRes.answers)), JSON.parse(JSON.stringify(bgdRes.answers)), 'Đáp án phiếu nằm ngang sau khi xoay phải trùng khớp phiếu đúng chiều');
    console.log('✓ Phiếu lật ngược 180° & scan nằm ngang 90°/270°: tự phát hiện, xoay đúng chiều và chấm trùng khớp 100% (9.35đ)!');
    console.log('\n🎉 ALL PIXEL-LEVEL OMR VISION & GRADING ACCURACY TESTS PASSED!');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

run();
