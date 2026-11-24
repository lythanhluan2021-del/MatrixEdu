/**
 * OMR TEMPLATES - QUẢN LÝ ĐA MẪU PHIẾU TRẢ LỜI TRẮC NGHIỆM THPT
 * Hỗ trợ 4 mẫu phiếu:
 * 1. bgd_2025_4code: Chuẩn Bộ GD&ĐT 2025 (Mã đề 4 số - File PDF gốc)
 * 2. bgd_2025_3code: Chuẩn Bộ GD&ĐT 2025 (Mã đề 3 số)
 * 3. thpt_tong_hop: Phiếu Kiểm Tra Học Kỳ Tổng Hợp (Mã đề 3 số - PDF gốc của trường)
 * 4. thpt_roc_phach: Phiếu Thi Rọc Phách THPT 2025-2026 (Word docx gốc của trường)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const OMR_TEMPLATES = [
  {
    id: 'bgd_2025_4code',
    name: 'Mẫu 1: Chuẩn Bộ GD&ĐT 2025 (Mã đề 4 số - Phôi PDF gốc)',
    shortName: 'Bộ GD&ĐT 2025 (Mã 4 số)',
    badge: 'Chuẩn Bộ GD&ĐT',
    codeDigits: 4,
    sbdDigits: 6,
    width: 2328,
    height: 3381,
    imageRelPath: 'data/omr_templates/bgd_2025_4code.jpg',
    blankFileName: 'Phiếu TLTN 2025 mã đề 4 số đen trắng.pdf',
    blankMime: 'application/pdf',
    description: 'Phiếu TLTN chuẩn Bộ GD&ĐT 2025 dùng cho kiểm tra định kỳ & thi tốt nghiệp THPT (SBD 6 số, Mã đề 4 số, khung Điểm bên trái).',
    hasScoreBoxLeft: true,
    hasPhach: false,
    scoreBox: { x: 222, y: 420, w: 366, h: 164 },
    fiducials: { tl: { x: 76.0, y: 92.0 }, tr: { x: 2244.0, y: 92.0 }, bl: { x: 76.0, y: 3296.0 }, br: { x: 2244.0, y: 3296.0 } },
    timingMarks: {
      topMid: { x: 1543.0, y: 92.0 },
      midLeft: { x: 76.0, y: 1041.0 },
      midCenter: { x: 1533.0, y: 1041.0 },
      midRight: { x: 2244.0, y: 1041.0 },
      topMidNormU: 0.6767,
      colAnchors: [650.5, 1160.0, 1671.0],
      sectionRows: { headerEnd: 1041.0, p1Start: 1196.0, p1End: 1804.0, p2Start: 1891.0, p2End: 2249.0, p3Start: 2293.0, p3End: 3214.0 }
    },
    // Tọa độ chuẩn hệ quy chiếu 2328 x 3381 (đo trực tiếp 582 ô tròn từ phôi gốc)
    coords: {
      sbd: {
        colBaseX: 1594.0,
        colStepX: 47.4,
        numCols: 6,
        boxY: 256.0,
        rowBaseY: 329.0,
        rowStepY: 68.0,
        radius: 18.0
      },
      code: {
        colBaseX: 2043.5,
        colStepX: 47.1,
        numCols: 4,
        boxY: 256.0,
        rowBaseY: 329.0,
        rowStepY: 68.0,
        radius: 18.0
      },
      part1: {
        colBases: [268.3, 778.3, 1287.3, 1798.0],
        optStepX: 101.6,
        rowBaseY: 1279.5,
        rowStepY: 52.7,
        radius: 18.5,
        totalQuestions: 40
      },
      part2: {
        colBases: [269.0, 472.5, 777.5, 981.5, 1287.5, 1494.5, 1799.0, 2003.0],
        optStepX: 101.6,
        rowBaseY: 2042.0,
        rowStepY: 52.25,
        radius: 18.0,
        totalQuestions: 8
      },
      part3: {
        colBases: [248.5, 579.0, 899.5, 1226.0, 1553.0, 1879.5],
        charStepX: 70.4,
        boxY: 2435.0,
        yMinus: 2509.0,
        yComma: 2563.0,
        rowBaseDigitY: 2620.0,
        rowStepDigitY: 53.9,
        radius: 17.0,
        totalQuestions: 6
      }
    }
  },
  {
    id: 'bgd_2025_3code',
    name: 'Mẫu 2: Chuẩn Bộ GD&ĐT 2025 (Mã đề 3 số)',
    shortName: 'Bộ GD&ĐT 2025 (Mã 3 số)',
    badge: 'Bộ GD&ĐT (3 số)',
    codeDigits: 3,
    sbdDigits: 6,
    width: 2328,
    height: 3381,
    imageRelPath: 'data/omr_templates/bgd_2025_4code.jpg',
    blankFileName: 'Phiếu TLTN 2025 mã đề 4 số đen trắng.pdf',
    blankMime: 'application/pdf',
    description: 'Phiếu TLTN chuẩn Bộ GD&ĐT áp dụng mã đề 3 chữ số (101, 102...) tiện lợi cho các kỳ thi thường xuyên tại trường THPT.',
    hasScoreBoxLeft: true,
    hasPhach: false,
    scoreBox: { x: 222, y: 420, w: 366, h: 164 },
    fiducials: { tl: { x: 76.0, y: 92.0 }, tr: { x: 2244.0, y: 92.0 }, bl: { x: 76.0, y: 3296.0 }, br: { x: 2244.0, y: 3296.0 } },
    timingMarks: {
      topMid: { x: 1543.0, y: 92.0 },
      midLeft: { x: 76.0, y: 1041.0 },
      midCenter: { x: 1533.0, y: 1041.0 },
      midRight: { x: 2244.0, y: 1041.0 },
      topMidNormU: 0.6767,
      colAnchors: [650.5, 1160.0, 1671.0],
      sectionRows: { headerEnd: 1041.0, p1Start: 1196.0, p1End: 1804.0, p2Start: 1891.0, p2End: 2249.0, p3Start: 2293.0, p3End: 3214.0 }
    },
    coords: {
      sbd: {
        colBaseX: 1594.0,
        colStepX: 47.4,
        numCols: 6,
        boxY: 256.0,
        rowBaseY: 329.0,
        rowStepY: 68.0,
        radius: 18.0
      },
      code: {
        colBaseX: 2043.5,
        colStepX: 47.1,
        numCols: 3,
        boxY: 256.0,
        rowBaseY: 329.0,
        rowStepY: 68.0,
        radius: 18.0
      },
      part1: {
        colBases: [268.3, 778.3, 1287.3, 1798.0],
        optStepX: 101.6,
        rowBaseY: 1279.5,
        rowStepY: 52.7,
        radius: 18.5,
        totalQuestions: 40
      },
      part2: {
        colBases: [269.0, 472.5, 777.5, 981.5, 1287.5, 1494.5, 1799.0, 2003.0],
        optStepX: 101.6,
        rowBaseY: 2042.0,
        rowStepY: 52.25,
        radius: 18.0,
        totalQuestions: 8
      },
      part3: {
        colBases: [248.5, 579.0, 899.5, 1226.0, 1553.0, 1879.5],
        charStepX: 70.4,
        boxY: 2435.0,
        yMinus: 2509.0,
        yComma: 2563.0,
        rowBaseDigitY: 2620.0,
        rowStepDigitY: 53.9,
        radius: 17.0,
        totalQuestions: 6
      }
    }
  },
  {
    id: 'thpt_tong_hop',
    name: 'Mẫu 3: Phiếu Kiểm Tra Học Kỳ Tổng Hợp (Mã đề 3 số - Viết tay số - PDF gốc)',
    shortName: 'Học kỳ Tổng hợp THPT (Mã 3 số)',
    badge: 'Mẫu Học kỳ THPT',
    codeDigits: 3,
    sbdDigits: 6,
    width: 2480,
    height: 3508,
    imageRelPath: 'data/omr_templates/thpt_tong_hop.jpg',
    blankFileName: 'Phieu_Thi_Tong_Hop_Chinh_Thuc.pdf',
    blankMime: 'application/pdf',
    description: 'Mẫu phiếu thi chính thức dùng cho kiểm tra học kỳ tại các trường THPT (Mã đề 3 số, Giám thị bên trái, Phần III có ô số viết tay).',
    hasScoreBoxLeft: false,
    hasPhach: false,
    scoreBox: { x: 260, y: 390, w: 350, h: 145 },
    fiducials: { tl: { x: 155.0, y: 151.0 }, tr: { x: 2324.0, y: 151.0 }, bl: { x: 155.0, y: 3355.0 }, br: { x: 2324.0, y: 3355.0 } },
    timingMarks: {
      topMid: { x: 1757.5, y: 151.0 },
      midLeft: { x: 155.0, y: 1139.5 },
      midCenter: { x: 1762.0, y: 1100.0 },
      midRight: { x: 2324.0, y: 1100.0 },
      topMidNormU: 0.7388,
      colAnchors: [730.0, 1240.0, 1750.5],
      sectionRows: { headerEnd: 1100.0, p1Start: 1255.0, p1End: 1863.0, p2Start: 1950.0, p2End: 2308.5, p3Start: 2352.0, p3End: 3272.5 }
    },
    coords: {
      sbd: {
        colBaseX: 1821.5,
        colStepX: 47.0,
        numCols: 6,
        boxY: 307.0,
        rowBaseY: 390.0,
        rowStepY: 68.0,
        radius: 17.5
      },
      code: {
        colBaseX: 2171.0,
        colStepX: 46.8,
        numCols: 3,
        boxY: 307.0,
        rowBaseY: 390.0,
        rowStepY: 68.0,
        radius: 17.5
      },
      part1: {
        colBases: [348.0, 856.0, 1365.5, 1875.0],
        optStepX: 101.8,
        rowBaseY: 1340.0,
        rowStepY: 52.4,
        radius: 18.0,
        totalQuestions: 40
      },
      part2: {
        colBases: [347.0, 551.5, 860.0, 1063.0, 1366.0, 1575.0, 1877.5, 2084.0],
        optStepX: 101.6,
        rowBaseY: 2101.0,
        rowStepY: 52.25,
        radius: 18.0,
        totalQuestions: 8
      },
      part3: {
        colBases: [328.0, 653.5, 983.5, 1306.5, 1633.5, 1965.0],
        charStepX: 70.3,
        boxY: 2495.0,
        yMinus: 2570.0,
        yComma: 2622.0,
        rowBaseDigitY: 2679.5,
        rowStepDigitY: 53.85,
        radius: 17.0,
        totalQuestions: 6
      }
    }
  },
  {
    id: 'thpt_roc_phach',
    name: 'Mẫu 4: Phiếu Thi Rọc Phách THPT 2025-2026 (Word docx gốc)',
    shortName: 'Rọc phách THPT 2025-2026',
    badge: 'Mẫu Rọc phách',
    codeDigits: 4,
    sbdDigits: 8,
    width: 582,
    height: 847,
    imageRelPath: 'data/omr_templates/thpt_roc_phach.png',
    blankFileName: 'phiếu TN 2025-2026.docx',
    blankMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    description: 'Mẫu phiếu rọc phách bảo mật dùng trong các kỳ thi tập trung THPT (Khung Điểm bằng số & chữ, Số phách, Giám khảo 1 & 2).',
    hasScoreBoxLeft: true,
    hasPhach: true,
    scoreBox: { x: 18, y: 132, w: 128, h: 62 },
    scoreWordBox: { x: 18, y: 220, w: 128, h: 56 },
    fiducials: { tl: { x: 9.0, y: 10.0 }, tr: { x: 566.5, y: 10.0 }, bl: { x: 8.5, y: 835.0 }, br: { x: 566.5, y: 835.0 } },
    timingMarks: {
      topMid: { x: 386.0, y: 10.0 },
      midLeft: { x: 9.0, y: 254.0 },
      midCenter: { x: 383.5, y: 254.0 },
      midRight: { x: 566.5, y: 254.0 },
      topMidNormU: 0.6762,
      colAnchors: [156.5, 287.5, 419.0],
      sectionRows: { headerEnd: 254.0, p1Start: 293.5, p1End: 450.5, p2Start: 473.0, p2End: 565.5, p3Start: 576.5, p3End: 814.0 }
    },
    coords: {
      sbd: {
        colBaseX: 400.0,
        colStepX: 12.1,
        numCols: 8,
        boxY: 50.0,
        rowBaseY: 71.0,
        rowStepY: 17.55,
        radius: 4.3
      },
      code: {
        colBaseX: 515.0,
        colStepX: 12.0,
        numCols: 4,
        boxY: 50.0,
        rowBaseY: 71.0,
        rowStepY: 17.55,
        radius: 4.3
      },
      part1: {
        colBases: [58.0, 189.5, 320.5, 452.0],
        optStepX: 26.1,
        rowBaseY: 315.5,
        rowStepY: 13.5,
        radius: 4.5,
        totalQuestions: 40
      },
      part2: {
        colBases: [58.0, 111.0, 190.0, 242.0, 321.0, 373.5, 452.0, 505.0],
        optStepX: 25.6,
        rowBaseY: 512.0,
        rowStepY: 13.3,
        radius: 4.3,
        totalQuestions: 8
      },
      part3: {
        colBases: [54.0, 138.0, 221.0, 305.5, 390.0, 473.0],
        charStepX: 18.1,
        boxY: 615.0,
        yMinus: 632.5,
        yComma: 646.5,
        rowBaseDigitY: 661.0,
        rowStepDigitY: 13.85,
        radius: 4.1,
        totalQuestions: 6
      }
    }
  }
];

function resolveCustomTemplatesDir() {
  const localParent = path.join(__dirname, '..', 'data', 'omr_templates');
  const localCustom = path.join(localParent, 'custom');
  if (!process.env.VERCEL) {
    try {
      if (fs.existsSync(localParent)) {
        fs.accessSync(localParent, fs.constants.W_OK);
        if (!fs.existsSync(localCustom)) fs.mkdirSync(localCustom, { recursive: true });
        return localCustom;
      }
    } catch (_) {
      // Fallback to os.tmpdir on read-only environments
    }
  }
  const tmpCustom = path.join(os.tmpdir(), 'matrixedu_data', 'omr_templates', 'custom');
  if (!fs.existsSync(tmpCustom)) fs.mkdirSync(tmpCustom, { recursive: true });
  return tmpCustom;
}

function getCustomRegistryPath() {
  return path.join(resolveCustomTemplatesDir(), 'custom_templates.json');
}

function computeTemplateSignature(tpl) {
  const W = Number(tpl.width) || 2328;
  const H = Number(tpl.height) || 3381;
  const f = tpl.fiducials || {
    tl: { x: W * 0.04, y: H * 0.03 },
    tr: { x: W * 0.96, y: H * 0.03 },
    bl: { x: W * 0.04, y: H * 0.97 },
    br: { x: W * 0.96, y: H * 0.97 }
  };
  const spanW = ((f.tr.x - f.tl.x) + (f.br.x - f.bl.x)) * 0.5;
  const spanH = ((f.bl.y - f.tl.y) + (f.br.y - f.tr.y)) * 0.5;
  let topMidNormU = null;
  if (tpl.timingMarks && typeof tpl.timingMarks.topMidNormU === 'number') {
    topMidNormU = tpl.timingMarks.topMidNormU;
  } else if (tpl.timingMarks && tpl.timingMarks.topMid && spanW > 0) {
    topMidNormU = Number(((tpl.timingMarks.topMid.x - f.tl.x) / spanW).toFixed(4));
  }
  let midLeftNormV = null;
  if (tpl.timingMarks && tpl.timingMarks.midLeft && spanH > 0) {
    midLeftNormV = Number(((tpl.timingMarks.midLeft.y - f.tl.y) / spanH).toFixed(4));
  }
  let midRightNormV = null;
  if (tpl.timingMarks && tpl.timingMarks.midRight && spanH > 0) {
    midRightNormV = Number(((tpl.timingMarks.midRight.y - f.tl.y) / spanH).toFixed(4));
  }
  return {
    aspectRatio: Number((W / H).toFixed(4)),
    spanWRatio: Number((spanW / W).toFixed(4)),
    spanHRatio: Number((spanH / H).toFixed(4)),
    frameAspect: spanH > 0 ? Number((spanW / spanH).toFixed(4)) : Number((W / H).toFixed(4)),
    topMidNormU,
    midLeftNormV,
    midRightNormV,
    codeDigits: Number(tpl.codeDigits) || 4,
    sbdDigits: Number(tpl.sbdDigits) || 6,
    hasPhach: Boolean(tpl.hasPhach)
  };
}

function round2(v) {
  return Math.round(Number(v) * 100) / 100;
}

/**
 * Nội suy toàn bộ hệ tọa độ 582 ô tròn từ một mẫu chuẩn sang ảnh phiếu tùy chỉnh mới tải lên,
 * tự động khớp theo 4 góc định vị (fiducials) + hỗ trợ tinh chỉnh độ lệch (offsetX, offsetY, scaleX, scaleY).
 */
function scaleTemplateCoordsFromBase(baseTpl, width, height, targetFiducials = null, overrides = {}) {
  const base = baseTpl || OMR_TEMPLATES[0];
  const W = Math.max(200, Math.round(Number(width) || base.width));
  const H = Math.max(200, Math.round(Number(height) || base.height));

  const bf = base.fiducials;
  const bSpanW = Math.max(1, ((bf.tr.x - bf.tl.x) + (bf.br.x - bf.bl.x)) * 0.5);
  const bSpanH = Math.max(1, ((bf.bl.y - bf.tl.y) + (bf.br.y - bf.tr.y)) * 0.5);

  const hasValidFid = targetFiducials && targetFiducials.tl && targetFiducials.tr && targetFiducials.bl && targetFiducials.br;
  const tf = hasValidFid
    ? {
        tl: { x: round2(targetFiducials.tl.x), y: round2(targetFiducials.tl.y) },
        tr: { x: round2(targetFiducials.tr.x), y: round2(targetFiducials.tr.y) },
        bl: { x: round2(targetFiducials.bl.x), y: round2(targetFiducials.bl.y) },
        br: { x: round2(targetFiducials.br.x), y: round2(targetFiducials.br.y) }
      }
    : {
        tl: { x: round2((bf.tl.x / base.width) * W), y: round2((bf.tl.y / base.height) * H) },
        tr: { x: round2((bf.tr.x / base.width) * W), y: round2((bf.tr.y / base.height) * H) },
        bl: { x: round2((bf.bl.x / base.width) * W), y: round2((bf.bl.y / base.height) * H) },
        br: { x: round2((bf.br.x / base.width) * W), y: round2((bf.br.y / base.height) * H) }
      };

  const tSpanW = Math.max(1, ((tf.tr.x - tf.tl.x) + (tf.br.x - tf.bl.x)) * 0.5);
  const tSpanH = Math.max(1, ((tf.bl.y - tf.tl.y) + (tf.br.y - tf.tr.y)) * 0.5);

  const off = overrides.offsets || {};
  const dx = Number(off.dx) || 0;
  const dy = Number(off.dy) || 0;
  const sx = Math.max(0.75, Math.min(1.25, Number(off.sx) || 1));
  const sy = Math.max(0.75, Math.min(1.25, Number(off.sy) || 1));

  const scaleX = (tSpanW / bSpanW) * sx;
  const scaleY = (tSpanH / bSpanH) * sy;
  const centerX = tf.tl.x + tSpanW * 0.5;
  const centerY = tf.tl.y + tSpanH * 0.5;

  const mapX = (bx) => {
    const u = (bx - bf.tl.x) / bSpanW;
    const rawX = tf.tl.x + u * tSpanW;
    return round2(centerX + (rawX - centerX) * sx + dx);
  };
  const mapY = (by) => {
    const v = (by - bf.tl.y) / bSpanH;
    const rawY = tf.tl.y + v * tSpanH;
    return round2(centerY + (rawY - centerY) * sy + dy);
  };
  const scaleR = (br) => round2(Math.max(3.2, br * ((scaleX + scaleY) * 0.5)));

  const bc = base.coords;
  const sbdDigits = Math.max(4, Math.min(10, Number(overrides.sbdDigits) || bc.sbd.numCols || 6));
  const codeDigits = Math.max(2, Math.min(6, Number(overrides.codeDigits) || bc.code.numCols || 4));
  const p1Total = Math.max(10, Math.min(60, Number(overrides.p1Total) || bc.part1.totalQuestions || 40));
  const p2Total = Math.max(0, Math.min(12, overrides.p2Total !== undefined ? Number(overrides.p2Total) : (bc.part2.totalQuestions || 8)));
  const p3Total = Math.max(0, Math.min(10, overrides.p3Total !== undefined ? Number(overrides.p3Total) : (bc.part3.totalQuestions || 6)));

  const coords = {
    sbd: {
      colBaseX: mapX(bc.sbd.colBaseX),
      colStepX: round2(bc.sbd.colStepX * scaleX),
      numCols: sbdDigits,
      boxY: mapY(bc.sbd.boxY),
      rowBaseY: mapY(bc.sbd.rowBaseY),
      rowStepY: round2(bc.sbd.rowStepY * scaleY),
      radius: scaleR(bc.sbd.radius)
    },
    code: {
      colBaseX: mapX(bc.code.colBaseX),
      colStepX: round2(bc.code.colStepX * scaleX),
      numCols: codeDigits,
      boxY: mapY(bc.code.boxY),
      rowBaseY: mapY(bc.code.rowBaseY),
      rowStepY: round2(bc.code.rowStepY * scaleY),
      radius: scaleR(bc.code.radius)
    },
    part1: {
      colBases: bc.part1.colBases.map(mapX),
      optStepX: round2(bc.part1.optStepX * scaleX),
      rowBaseY: mapY(bc.part1.rowBaseY),
      rowStepY: round2(bc.part1.rowStepY * scaleY),
      radius: scaleR(bc.part1.radius),
      totalQuestions: p1Total
    },
    part2: {
      colBases: bc.part2.colBases.map(mapX),
      optStepX: round2(bc.part2.optStepX * scaleX),
      rowBaseY: mapY(bc.part2.rowBaseY),
      rowStepY: round2(bc.part2.rowStepY * scaleY),
      radius: scaleR(bc.part2.radius),
      totalQuestions: p2Total
    },
    part3: {
      colBases: bc.part3.colBases.map(mapX),
      charStepX: round2(bc.part3.charStepX * scaleX),
      boxY: mapY(bc.part3.boxY),
      yMinus: mapY(bc.part3.yMinus),
      yComma: mapY(bc.part3.yComma),
      rowBaseDigitY: mapY(bc.part3.rowBaseDigitY),
      rowStepDigitY: round2(bc.part3.rowStepDigitY * scaleY),
      radius: scaleR(bc.part3.radius),
      totalQuestions: p3Total
    }
  };

  const scoreBox = base.scoreBox
    ? {
        x: mapX(base.scoreBox.x),
        y: mapY(base.scoreBox.y),
        w: round2(base.scoreBox.w * scaleX),
        h: round2(base.scoreBox.h * scaleY)
      }
    : { x: round2(W * 0.1), y: round2(H * 0.12), w: round2(W * 0.15), h: round2(H * 0.05) };

  const timingMarks = {};
  if (overrides.timingMarks && overrides.timingMarks.topMid) {
    timingMarks.topMid = { x: round2(overrides.timingMarks.topMid.x), y: round2(overrides.timingMarks.topMid.y) };
    timingMarks.topMidNormU = Number(((timingMarks.topMid.x - tf.tl.x) / tSpanW).toFixed(4));
  } else if (base.timingMarks && base.timingMarks.topMid) {
    timingMarks.topMid = { x: mapX(base.timingMarks.topMid.x), y: mapY(base.timingMarks.topMid.y) };
    timingMarks.topMidNormU = Number(((timingMarks.topMid.x - tf.tl.x) / tSpanW).toFixed(4));
  }
  if (overrides.timingMarks && overrides.timingMarks.midLeft) {
    timingMarks.midLeft = { x: round2(overrides.timingMarks.midLeft.x), y: round2(overrides.timingMarks.midLeft.y) };
  } else if (base.timingMarks && base.timingMarks.midLeft) {
    timingMarks.midLeft = { x: mapX(base.timingMarks.midLeft.x), y: mapY(base.timingMarks.midLeft.y) };
  }
  if (overrides.timingMarks && overrides.timingMarks.midRight) {
    timingMarks.midRight = { x: round2(overrides.timingMarks.midRight.x), y: round2(overrides.timingMarks.midRight.y) };
  } else if (base.timingMarks && base.timingMarks.midRight) {
    timingMarks.midRight = { x: mapX(base.timingMarks.midRight.x), y: mapY(base.timingMarks.midRight.y) };
  }

  return { fiducials: tf, timingMarks, coords, scoreBox, codeDigits, sbdDigits };
}

function loadCustomTemplates() {
  try {
    const regPath = getCustomRegistryPath();
    if (!fs.existsSync(regPath)) return [];
    const parsed = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(t => ({
      ...t,
      isCustom: true,
      signature: t.signature || computeTemplateSignature(t)
    }));
  } catch (_) {
    return [];
  }
}

function writeCustomTemplates(list) {
  const regPath = getCustomRegistryPath();
  const dir = path.dirname(regPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(regPath, JSON.stringify(list, null, 2), 'utf8');
}

function saveCustomTemplate(payload = {}) {
  const rawName = String(payload.name || '').trim();
  if (!rawName) {
    throw new Error('Vui lòng nhập tên mẫu phiếu chấm!');
  }

  const baseId = String(payload.baseTemplateId || 'bgd_2025_4code').trim();
  const baseTpl = OMR_TEMPLATES.find(t => t.id === baseId) || OMR_TEMPLATES[0];

  const customDir = resolveCustomTemplatesDir();
  const existing = loadCustomTemplates();

  const rawId = String(payload.id || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '');
  const id = (rawId && rawId.startsWith('custom_'))
    ? rawId
    : `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  let ext = '.jpg';
  let mimeType = String(payload.mimeType || 'image/jpeg').toLowerCase();
  let imgBuffer = null;

  if (payload.imageBase64) {
    let b64 = String(payload.imageBase64).trim();
    const dataUrlMatch = b64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1].toLowerCase();
      b64 = dataUrlMatch[2];
    }
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else {
      ext = '.jpg';
      mimeType = 'image/jpeg';
    }
    imgBuffer = Buffer.from(b64, 'base64');
    if (imgBuffer.length < 256) {
      throw new Error('Ảnh mẫu phiếu tải lên quá nhỏ hoặc không hợp lệ.');
    }
    if (imgBuffer.length > 18 * 1024 * 1024) {
      throw new Error('Ảnh mẫu phiếu vượt quá giới hạn 18MB.');
    }
  } else {
    const prev = existing.find(t => t.id === id);
    if (!prev) {
      throw new Error('Thiếu dữ liệu ảnh mẫu phiếu chấm (PNG/JPG/PDF).');
    }
    ext = path.extname(prev.customImageFile || '') || '.jpg';
    mimeType = prev.blankMime || 'image/jpeg';
  }

  const imgFileName = `${id}${ext}`;
  const imgFullPath = path.join(customDir, imgFileName);
  if (imgBuffer) {
    fs.writeFileSync(imgFullPath, imgBuffer);
  }

  const width = Math.max(200, Math.round(Number(payload.width) || baseTpl.width));
  const height = Math.max(200, Math.round(Number(payload.height) || baseTpl.height));

  const scaled = scaleTemplateCoordsFromBase(baseTpl, width, height, payload.fiducials || null, {
    codeDigits: payload.codeDigits,
    sbdDigits: payload.sbdDigits,
    p1Total: payload.p1Total,
    p2Total: payload.p2Total,
    p3Total: payload.p3Total,
    timingMarks: payload.timingMarks,
    offsets: payload.offsets || {}
  });

  const finalCoords = (payload.coords && payload.coords.part1 && payload.coords.sbd && payload.coords.code)
    ? payload.coords
    : scaled.coords;

  const shortName = String(payload.shortName || rawName).trim().slice(0, 42);
  const safeBlankName = String(payload.fileName || `${id}${ext}`).replace(/[\\/:*?"<>|]/g, '_');

  const tplObj = {
    id,
    name: rawName,
    shortName,
    badge: 'Mẫu tự tải lên',
    isCustom: true,
    baseTemplateId: baseTpl.id,
    codeDigits: scaled.codeDigits,
    sbdDigits: scaled.sbdDigits,
    width,
    height,
    imageRelPath: `data/omr_templates/custom/${imgFileName}`,
    customImageFile: imgFileName,
    blankFileName: safeBlankName,
    blankMime: mimeType,
    description: String(payload.description || `Mẫu phiếu tùy chỉnh do giáo viên tải lên (nền ${baseTpl.shortName}).`).trim(),
    hasScoreBoxLeft: Boolean(baseTpl.hasScoreBoxLeft),
    hasPhach: Boolean(payload.hasPhach !== undefined ? payload.hasPhach : baseTpl.hasPhach),
    scoreBox: payload.scoreBox || scaled.scoreBox,
    fiducials: scaled.fiducials,
    timingMarks: scaled.timingMarks,
    offsets: payload.offsets || { dx: 0, dy: 0, sx: 1, sy: 1 },
    coords: finalCoords,
    createdAt: new Date().toISOString()
  };
  tplObj.signature = payload.signature || computeTemplateSignature(tplObj);

  const idx = existing.findIndex(t => t.id === id);
  if (idx >= 0) existing[idx] = tplObj;
  else existing.push(tplObj);
  writeCustomTemplates(existing);

  return tplObj;
}

function deleteCustomTemplate(templateId) {
  const id = String(templateId || '').trim();
  if (!id || !id.startsWith('custom_')) return false;
  const existing = loadCustomTemplates();
  const target = existing.find(t => t.id === id);
  if (!target) return false;
  const next = existing.filter(t => t.id !== id);
  writeCustomTemplates(next);
  try {
    const imgPath = resolveTemplateImagePath(target);
    if (imgPath && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  } catch (_) {}
  return true;
}

function resolveTemplateImagePath(template) {
  if (!template) return null;
  if (template.isCustom && template.customImageFile) {
    const pCustom = path.join(resolveCustomTemplatesDir(), path.basename(template.customImageFile));
    if (fs.existsSync(pCustom)) return pCustom;
  }
  const rootDir = path.join(__dirname, '..');
  const candidates = [
    template.imageRelPath ? path.join(rootDir, template.imageRelPath) : null,
    template.imageRelPath ? path.join(rootDir, 'data', 'omr_templates', path.basename(template.imageRelPath)) : null
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getAllTemplates() {
  const builtIns = OMR_TEMPLATES.map(t => ({
    ...t,
    isCustom: false,
    signature: t.signature || computeTemplateSignature(t)
  }));
  return [...builtIns, ...loadCustomTemplates()];
}

function getTemplateById(templateId) {
  const all = getAllTemplates();
  return all.find(t => t.id === templateId) || all[0];
}

module.exports = {
  OMR_TEMPLATES,
  getAllTemplates,
  getTemplateById,
  loadCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
  scaleTemplateCoordsFromBase,
  computeTemplateSignature,
  resolveTemplateImagePath,
  resolveCustomTemplatesDir
};

