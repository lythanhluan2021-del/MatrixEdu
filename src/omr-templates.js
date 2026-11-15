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

function getAllTemplates() {
  return OMR_TEMPLATES;
}

function getTemplateById(templateId) {
  return OMR_TEMPLATES.find(t => t.id === templateId) || OMR_TEMPLATES[0];
}

module.exports = {
  OMR_TEMPLATES,
  getAllTemplates,
  getTemplateById
};

