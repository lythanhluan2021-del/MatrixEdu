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
    fiducials: { tl: { x: 48, y: 60 }, tr: { x: 2280, y: 60 }, bl: { x: 48, y: 3320 }, br: { x: 2280, y: 3320 } },
    // Tọa độ chuẩn hệ quy chiếu 2328 x 3381
    coords: {
      sbd: {
        colBaseX: 1588.3,
        colStepX: 48.625,
        numCols: 6,
        boxY: 288,
        rowBaseY: 365,
        rowStepY: 68.0,
        radius: 18
      },
      code: {
        colBaseX: 2040.7,
        colStepX: 49.375,
        numCols: 4,
        boxY: 288,
        rowBaseY: 365,
        rowStepY: 68.0,
        radius: 18
      },
      part1: {
        colBases: [267.8, 777.8, 1286.8, 1797.0],
        optStepX: 101.6,
        rowBaseY: 1280.0,
        rowStepY: 52.6,
        radius: 18.5,
        totalQuestions: 40
      },
      part2: {
        colBases: [267.3, 474.0, 779.3, 983.0, 1287.5, 1494.5, 1799.5, 2003.5],
        optStepX: 101.5,
        rowBaseY: 2042.0,
        rowStepY: 52.3,
        radius: 18.0,
        totalQuestions: 8
      },
      part3: {
        colBases: [251.5, 577.0, 902.5, 1228.0, 1556.5, 1882.5],
        charStepX: 70.3,
        boxY: 2469.0,
        yMinus: 2511.0,
        yComma: 2566.0,
        rowBaseDigitY: 2621.0,
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
    fiducials: { tl: { x: 48, y: 60 }, tr: { x: 2280, y: 60 }, bl: { x: 48, y: 3320 }, br: { x: 2280, y: 3320 } },
    coords: {
      sbd: {
        colBaseX: 1588.3,
        colStepX: 48.625,
        numCols: 6,
        boxY: 288,
        rowBaseY: 365,
        rowStepY: 68.0,
        radius: 18
      },
      code: {
        colBaseX: 2040.7,
        colStepX: 49.375,
        numCols: 3,
        boxY: 288,
        rowBaseY: 365,
        rowStepY: 68.0,
        radius: 18
      },
      part1: {
        colBases: [267.8, 777.8, 1286.8, 1797.0],
        optStepX: 101.6,
        rowBaseY: 1280.0,
        rowStepY: 52.6,
        radius: 18.5,
        totalQuestions: 40
      },
      part2: {
        colBases: [267.3, 474.0, 779.3, 983.0, 1287.5, 1494.5, 1799.5, 2003.5],
        optStepX: 101.5,
        rowBaseY: 2042.0,
        rowStepY: 52.3,
        radius: 18.0,
        totalQuestions: 8
      },
      part3: {
        colBases: [251.5, 577.0, 902.5, 1228.0, 1556.5, 1882.5],
        charStepX: 70.3,
        boxY: 2469.0,
        yMinus: 2511.0,
        yComma: 2566.0,
        rowBaseDigitY: 2621.0,
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
    fiducials: { tl: { x: 155.5, y: 151.0 }, tr: { x: 2324.0, y: 151.0 }, bl: { x: 155.5, y: 3355.0 }, br: { x: 2324.0, y: 3355.0 } },
    coords: {
      sbd: {
        colBaseX: 1817.5,
        colStepX: 47.0,
        numCols: 6,
        boxY: 307.0,
        rowBaseY: 389.5,
        rowStepY: 68.0,
        radius: 17.5
      },
      code: {
        colBaseX: 2170.5,
        colStepX: 47.0,
        numCols: 3,
        boxY: 307.0,
        rowBaseY: 389.5,
        rowStepY: 68.0,
        radius: 17.5
      },
      part1: {
        colBases: [349.0, 857.0, 1365.0, 1876.0],
        optStepX: 101.5,
        rowBaseY: 1338.0,
        rowStepY: 52.44,
        radius: 18.0,
        totalQuestions: 40
      },
      part2: {
        colBases: [348.0, 552.0, 858.0, 1062.0, 1367.0, 1571.0, 1878.0, 2082.0],
        optStepX: 101.5,
        rowBaseY: 2110.0,
        rowStepY: 52.0,
        radius: 18.0,
        totalQuestions: 8
      },
      part3: {
        colBases: [328.0, 672.0, 1016.0, 1360.0, 1704.0, 2048.0],
        charStepX: 72.0,
        boxY: 2465.0,
        yMinus: 2517.0,
        yComma: 2570.0,
        rowBaseDigitY: 2681.0,
        rowStepDigitY: 53.5,
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
    sbdDigits: 6,
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
    fiducials: { tl: { x: 18, y: 22 }, tr: { x: 564, y: 22 }, bl: { x: 18, y: 825 }, br: { x: 564, y: 825 } },
    coords: {
      sbd: {
        colBaseX: 397.0,
        colStepX: 12.0,
        numCols: 6,
        boxY: 96,
        rowBaseY: 116.0,
        rowStepY: 13.8,
        radius: 4.5
      },
      code: {
        colBaseX: 508.0,
        colStepX: 12.5,
        numCols: 4,
        boxY: 96,
        rowBaseY: 116.0,
        rowStepY: 13.8,
        radius: 4.5
      },
      part1: {
        colBases: [68.0, 196.0, 324.0, 452.0],
        optStepX: 25.5,
        rowBaseY: 338.0,
        rowStepY: 16.6,
        radius: 4.6,
        totalQuestions: 40
      },
      part2: {
        colBases: [68.0, 120.0, 196.0, 248.0, 324.0, 376.0, 452.0, 504.0],
        optStepX: 25.5,
        rowBaseY: 532.0,
        rowStepY: 14.5,
        radius: 4.4,
        totalQuestions: 8
      },
      part3: {
        colBases: [64.0, 146.0, 228.0, 310.0, 392.0, 474.0],
        charStepX: 17.5,
        boxY: 622.0,
        yMinus: 638.0,
        yComma: 651.0,
        rowBaseDigitY: 664.0,
        rowStepDigitY: 13.6,
        radius: 4.2,
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

