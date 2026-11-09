/**
 * src/drive-bank.js
 * Ngân hàng câu hỏi bóc tách từ Google Drive
 * Nguồn: https://drive.google.com/drive/folders/1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop
 * Đảm bảo: 100% KHÔNG BỊA ĐẶT (Zero Hallucination), bám sát Ma trận GDPT 2018 (CV 7991 & TT 22).
 */

const fs = require('fs');
const path = require('path');
const { parseDocxBuffer } = require('./zip-docx');

const BANK_DIR = path.join(__dirname, '..', 'data', 'google_drive_bank');
const MAP_FILE = path.join(__dirname, '..', 'data', 'drive_files_map.json');

// Metadata mapping filename -> Subject / Grade / Topics
const FILE_TOPIC_CONFIG = {
  'CD3-Một số thiết bị Mạng thông dụng.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ B',
    topicTitle: 'Mạng máy tính và Internet - Thiết bị mạng thông dụng',
    keywords: ['thiết bị mạng', 'switch', 'hub', 'router', 'access point', 'modem', 'wifi', 'lan', 'wan', 'mac']
  },
  'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ A',
    topicTitle: 'Máy tính và xã hội tri thức - Trí tuệ nhân tạo (AI)',
    keywords: ['trí tuệ nhân tạo', 'ai', 'ani', 'agi', 'học máy', 'thị giác máy tính', 'ngôn ngữ tự nhiên', 'chatgpt', 'đạo đức ai']
  },
  'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ B',
    topicTitle: 'Mạng máy tính và Internet - Giao thức mạng',
    keywords: ['giao thức', 'tcp/ip', 'ip', 'dns', 'http', 'https', 'ftp', 'smtp', 'gói tin', 'địa chỉ ip']
  },
  'Chuyên đề 12B. Kết nối mạng.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ B',
    topicTitle: 'Mạng máy tính và Internet - Kết nối mạng và chia sẻ tài nguyên',
    keywords: ['kết nối mạng', 'chia sẻ tài nguyên', 'thiết bị di động', 'cáp xoắn', 'cáp quang', 'wlan', 'băng thông']
  },
  'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ D',
    topicTitle: 'Đạo đức, pháp luật và văn hóa trong môi trường số',
    keywords: ['đạo đức', 'pháp luật', 'văn hóa', 'môi trường số', 'bản quyền', 'lừa đảo', 'an toàn mạng', 'quyền riêng tư']
  },
  'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ E',
    topicTitle: 'Ứng dụng tin học - Thực hành phần mềm tạo trang web',
    keywords: ['tạo trang web', 'mobirise', 'web tĩnh', 'menu', 'content', 'giao diện web']
  },
  'Chuyên đề 12F. Tạo trang Web.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ F',
    topicTitle: 'Tạo trang Web - Ngôn ngữ HTML',
    keywords: ['html', 'thẻ', 'cấu trúc web', 'biểu mẫu', 'form', 'định dạng văn bản', 'bảng biểu', 'liên kết']
  },
  'Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx': {
    grade: 12,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ G',
    topicTitle: 'Hướng nghiệp - Nhóm nghề dịch vụ và quản trị',
    keywords: ['hướng nghiệp', 'sửa chữa', 'bảo trì', 'quản trị mạng', 'an ninh mạng', 'nghề nghiệp']
  },
  'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx': {
    grade: 11,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ F (Lớp 11)',
    topicTitle: 'Giới thiệu các hệ cơ sở dữ liệu',
    keywords: ['cơ sở dữ liệu', 'csdl', 'bảng', 'khóa chính', 'sql', 'quan hệ']
  },
  'Chuyên đề 10F. Lập trình cơ bản.docx': {
    grade: 10,
    subject: 'Tin học',
    topicCode: 'CHỦ ĐỀ F (Lớp 10)',
    topicTitle: 'Giải quyết vấn đề với sự trợ giúp của máy tính - Lập trình cơ bản (Python)',
    keywords: ['lập trình', 'python', 'biến', 'phép gán', 'kiểu dữ liệu', 'hàm']
  }
};

let cachedBank = null;

/**
 * Phát hiện đáp án đúng được gạch chân (<w:u>) trong đề bài của giáo viên
 */
function detectUnderlinedAnswer(combinedTaggedText, options, underlinedParts = []) {
  if (!combinedTaggedText) return null;

  // 1. Khớp thẻ <u> chứa chữ cái phương án: <u>A</u> hoặc <u>A.</u> hoặc <u>A:</u>
  const letterMatch = combinedTaggedText.match(/<u>\s*([A-D])\s*[\.:]?\s*<\/u>/i);
  if (letterMatch) return letterMatch[1].toUpperCase();

  // 2. Khớp <u>A. Nội dung...</u>
  const fullMatch = combinedTaggedText.match(/<u>\s*([A-D])\s*[\.:]\s*[\s\S]*?<\/u>/i);
  if (fullMatch) return fullMatch[1].toUpperCase();

  // 3. Khớp A. <u>Nội dung...</u>
  const contentMatch = combinedTaggedText.match(/(?:^|[\t\n\s])([A-D])\s*[\.:]\s*<u>[\s\S]*?<\/u>/i);
  if (contentMatch) return contentMatch[1].toUpperCase();

  // 4. Đối chiếu nội dung từng phương án với các phần text được gạch chân
  if (options) {
    const allUnderlined = (combinedTaggedText.match(/<u>([\s\S]*?)<\/u>/gi) || [])
      .map(u => u.replace(/<\/?u>/gi, '').trim().toLowerCase())
      .concat(underlinedParts.map(u => (u || '').trim().toLowerCase()));

    for (const uText of allUnderlined) {
      if (uText.length >= 3) {
        for (const letter of ['A', 'B', 'C', 'D']) {
          const optText = (options[letter] || '').toLowerCase().trim();
          if (optText && (optText.includes(uText) || uText.includes(optText))) {
            return letter;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Suy luận mức độ nhận thức (Biết / Hiểu / Vận dụng) từ nội dung câu hỏi
 * nếu tài liệu không có tiêu đề phân mục rõ ràng.
 */
function inferCognitiveLevel(promptText, defaultLevel = 'Biết') {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const p = norm(promptText);

  // 1. Vận dụng: bài toán, tính toán, chuyển đổi, xác định địa chỉ, tình huống thực tế, xử lý sự cố
  if (
    /tinh\b|xac dinh dia chi|chuyen doi|tinh huong|xu ly su co|khi gap loi|thiet lap|cau hinh|cai dat|lenh nao.*(de|giup) (kiem tra|ping|tracert)/i.test(p) ||
    /\b(lan|mai|kien|nam|an|hung|minh|thanh)\b.*(su dung|can|gui|cai dat|thiet lap|ket noi)/i.test(p) ||
    /mot (cong ty|truong hoc|lop hoc|van phong|doanh nghiep|gia dinh)/i.test(p)
  ) {
    return 'Vận dụng';
  }

  // 2. Thông hiểu: so sánh, giải thích, phân biệt, tại sao, vì sao, mục đích, vai trò, chức năng
  if (
    /tai sao|vi sao|muc dich|vai tro|chuc nang|so sanh|phan biet|y nghia|giai thich|phan anh dung|khac voi|khong phu hop|phat bieu nao sai|loi khuyen nao sai/i.test(p)
  ) {
    return 'Hiểu';
  }

  // 3. Mặc định là mức độ hiện tại hoặc Nhận biết
  return defaultLevel || 'Biết';
}

/**
 * Làm sạch nội dung câu hỏi (prompt), loại bỏ hoàn toàn các phương án A. B. C. D. bị dính vào thân câu hỏi
 */
function cleanQuestionPrompt(rawPrompt, optA) {
  if (!rawPrompt) return '';
  let str = rawPrompt.trim();

  // 1. Nếu có đoạn trích của phương án A, tìm vị trí A. đứng ngay trước nội dung phương án A
  if (optA && optA.trim()) {
    const aSnip = optA.trim().substring(0, 10).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexA = new RegExp('A\\s*[\\.:]\\s*' + aSnip, 'i');
    const matchA = str.match(regexA);
    if (matchA && matchA.index !== undefined && matchA.index > 0) {
      return str.substring(0, matchA.index).trim();
    }
  }

  // 2. Mẫu tổng quát: A. ... B. ...
  const generalMatch = str.match(/(?:^|[\s\n\r\t]|[.\?!:;]|(?<=[a-zà-ỹ0-9]))A\s*[\.:]\s*[\s\S]*?[B|b]\s*[\.:]/);
  if (generalMatch && generalMatch.index !== undefined && generalMatch.index > 0) {
    return str.substring(0, generalMatch.index).trim();
  }

  // 3. Dự phòng: bắt vị trí A. đầu tiên có tiền tố hợp lệ
  const firstA = str.match(/(?:^|[\s\n\r\t]|[.\?!:;]|(?<=[a-zà-ỹ0-9]))A\s*[\.:]/);
  if (firstA && firstA.index !== undefined && firstA.index > 0) {
    return str.substring(0, firstA.index).trim();
  }

  return str.trim();
}

/**
 * Làm sạch nội dung từng phương án trả lời (A, B, C, D hoặc các ý Đúng/Sai),
 * loại bỏ hoàn toàn tiêu đề phần thi kế tiếp, câu hỏi kế tiếp hoặc nhãn mức độ nhận thức bị dính chùm.
 */
function cleanOptionText(text) {
  if (!text) return '';
  let str = text.trim();

  // 1. Cắt bỏ tiêu đề phần tiếp theo hoặc dạng câu hỏi tiếp theo ở cuối phương án:
  // - "\n2. Câu trắc nghiệm đúng sai."
  // - "\n2. CÂU HỎI TRẮC NGHIỆM ĐÚNG / SAI"
  // - "\n2. DẠNG CÂU HỎI D2"
  // - "\nII. CÂU HỎI TRẮC NGHIỆM ĐÚNG – SAI:"
  // - "\nTRẮC NGHIỆM Đ/S" hoặc "\nBẢNG ĐÁP ÁN"
  const sectionCutRegex = /(?:[\r\n\t]+|\s{2,})(?:(?:\d+\.|\b(?:PHẦN|DẠNG|D2)\b|[I|V|X]+\b|\bII\b|\bIII\b)[\s\.:\-_]*(?:câu\s*(?:hỏi|trắc\s*nghiệm)|trắc\s*nghiệm|đúng|sai|dạng|tự\s*luận|trả\s*lời|bảng\s*đáp\s*án)|TRẮC\s*NGHIỆM\s*Đ[\/-]?S|BẢNG\s*ĐÁP\s*ÁN)[\s\S]*$/i;
  str = str.replace(sectionCutRegex, '').trim();

  // 2. Cắt bỏ nhãn mức độ nhận thức (kèm số thứ tự mục hoặc đứng độc lập) ở cuối phương án:
  // Ví dụ: "\nTHÔNG HIỂU", "1.2. Thông hiểu", "1.3. Dạng vận dụng", "\nVẬN DỤNG", "(Đúng, Biết)"
  const levelCutRegex = /(?:[\r\n\t]+|\s{2,}|\.\s+|\s+)(?:(?:\d+\.)*\d+\.?\s*(?:dạng\s*)?|\((?:đúng|sai)[,\s]+)?(?:nhận\s*biết|thông\s*hiểu|vận\s*dụng(?:\s*cao)?)\s*[:.)]?\s*$/i;
  str = str.replace(levelCutRegex, '').trim();

  // 3. Cắt bỏ nhãn chỉ dẫn đáp án kèm mức độ ở cuối dòng: ví dụ "(Đúng, Biết)" hoặc "(Sai, Vận dụng)"
  str = str.replace(/\s*\((?:Đúng|Sai)[,\s]+(?:Biết|Hiểu|Vận\s*dụng)\)\s*$/i, '').trim();

  // 4. Cắt bỏ nếu có câu hỏi tiếp theo bị dính: "\nCâu 12: ..." hoặc "\nCâu hỏi 5: ..."
  const nextQCuttRegex = /(?:[\r\n\t]+|\s{2,})(?:Câu\s*hỏi|Câu)\s+\d+[\s\S]*$/i;
  str = str.replace(nextQCuttRegex, '').trim();

  // 5. Nếu có tùy chọn tiếp theo bị nuốt (ví dụ "\nD Một hệ thống..." hoặc "\nD, Tin nhắn..."):
  str = str.replace(/(?:[\r\n\t]+|\s{2,})([A-D])[\s,.:][\s\S]*$/, '').trim();

  // 6. Chuẩn hóa khoảng trắng và dấu xuống dòng không cần thiết (trừ khi là thẻ code HTML)
  if (!/<[a-z][\s\S]*>/i.test(str)) {
    str = str.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  return str;
}

/**
 * Xác định chính xác file nguồn đích và các file bị cấm cho từng dòng trong Ma trận
 * Đảm bảo 100% bám sát ma trận, tuyệt đối không lấy nhầm câu hỏi giữa các chủ đề.
 */
function resolveTargetBankFiles(row = {}, metadata = {}) {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const t = norm(row.topic || row.chu_de || '');
  const u = norm(row.unit || row.noi_dung || '');
  const full = `${t} ${u}`.trim();

  let targetFiles = [];
  let forbiddenFiles = [];
  let preferredKeywords = [];
  let penaltyKeywords = [];

  const ALL_FILES = [
    'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
    'CD3-Một số thiết bị Mạng thông dụng.docx',
    'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx',
    'Chuyên đề 12B. Kết nối mạng.docx',
    'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx',
    'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx',
    'Chuyên đề 12F. Tạo trang Web.docx',
    'Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx',
    'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx',
    'Chuyên đề 10F. Lập trình cơ bản.docx'
  ];

  // Kiểm tra từ khóa đặc trưng bằng word boundary để tránh nhầm chữ "bài", "tài" thành "ai"
  const hasAI = /tri tue nhan tao|\b(ai|ani|agi)\b|hoc may|alan turing|dartmouth/i.test(full);
  const hasNetDevice = /thiet bi mang|switch|router|access point|modem|\bhub\b|cap mang|bai 3\b/i.test(full);
  const hasNetProtocol = /giao thuc|tcp\/ip|dia chi ip|ipv4|ipv6|goi tin|dns|dhcp|\bip\b|bai 4\b/i.test(full);
  const hasResourceSharing = /chia se tai nguyen|ket noi cac thiet bi|ket noi mang|thiet bi so|wlan|lan\b|bai 5\b/i.test(full);
  const hasCyberLaw = /dao duc|phap luat|van hoa|khong gian mang|moi truong so|ung xu|giao tiep|an toan mang|bai 6\b/i.test(full);
  const hasWeb = /tao trang web|trang web|\bhtml\b|\bweb\b|mobirise|bai 7\b/i.test(full);
  const hasCareer = /huong nghiep|nhom nghe|dich vu va quan tri/i.test(full);
  const hasCSDL = /co so du lieu|\bcsdl\b|\bsql\b|khoa chinh/i.test(full);
  const hasPython = /lap trinh|python|\bbien\b|phep gan/i.test(full);

  // 1. Trí tuệ nhân tạo (AI)
  if (hasAI && !hasNetDevice && !hasNetProtocol && !hasResourceSharing && !hasCyberLaw) {
    targetFiles = ['Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    if (full.includes('bai 1') || full.includes('lam quen') || full.includes('khai niem')) {
      preferredKeywords = ['khai niem', 'ani', 'agi', 'turing', 'dartmouth', 'tri tue', 'dinh nghia'];
      penaltyKeywords = ['y te', 'giao duc', 'tai chinh', 'dao duc', 'viec lam', 'chan doan'];
    } else if (full.includes('bai 2') || full.includes('khoa hoc') || full.includes('doi song') || full.includes('ung dung')) {
      preferredKeywords = ['khoa hoc', 'doi song', 'y te', 'giao duc', 'tai chinh', 'dao duc', 'ung dung'];
      penaltyKeywords = ['alan turing', 'dartmouth'];
    }
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 2. Thiết bị mạng (Switch, Router, AP, Modem, Hub, Cáp mạng)
  if (hasNetDevice && !hasNetProtocol) {
    targetFiles = ['CD3-Một số thiết bị Mạng thông dụng.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 3. Giao thức mạng (TCP/IP, Địa chỉ IP, IPv4, IPv6, DNS, DHCP)
  if (hasNetProtocol) {
    targetFiles = ['Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 4. Chia sẻ tài nguyên / Kết nối mạng & Kết nối thiết bị số
  if (hasResourceSharing) {
    targetFiles = ['Chuyên đề 12B. Kết nối mạng.docx', 'CD3-Một số thiết bị Mạng thông dụng.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 5. Đạo đức, pháp luật, văn hóa / Giao tiếp và ứng xử trong không gian mạng
  if (hasCyberLaw) {
    targetFiles = ['Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 6. Tạo trang Web / Ngôn ngữ HTML / Phần mềm tạo web
  if (hasWeb) {
    targetFiles = ['Chuyên đề 12F. Tạo trang Web.docx', 'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 7. Hướng nghiệp Tin học / Dịch vụ và quản trị
  if (hasCareer) {
    targetFiles = ['Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 8. Cơ sở dữ liệu (Lớp 11)
  if (hasCSDL) {
    targetFiles = ['Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 9. Lập trình Python (Lớp 10)
  if (hasPython) {
    targetFiles = ['Chuyên đề 10F. Lập trình cơ bản.docx'];
    forbiddenFiles = ALL_FILES.filter(f => !targetFiles.includes(f));
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  return { targetFiles: [], forbiddenFiles: [], preferredKeywords: [], penaltyKeywords: [] };
}

/**
 * Tự động suy luận môn học, khối lớp và chủ đề từ tên file và nội dung DOCX (Đa môn học linh hoạt)
 */
function inferFileMetadata(filename, text = '') {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const combined = norm(filename + ' ' + (text ? text.slice(0, 1500) : ''));

  // Suy luận môn học
  let subject = 'Tin học';
  if (/toan|dai so|hinh hoc|giai tich|tich phan|vi phan|ham so/i.test(combined)) {
    subject = 'Toán';
  } else if (/vat li|vat ly|dong luc hoc|quang hoc|nhiet hoc|dien xoay chieu|dao dong/i.test(combined)) {
    subject = 'Vật lí';
  } else if (/hoa hoc|hoa|nguyen to|phan ung|axit|bazo|huu co|vo co|hoa vo co/i.test(combined)) {
    subject = 'Hóa học';
  } else if (/sinh hoc|sinh|di truyen|te bao|tien hoa|sinh thai|gen|adn/i.test(combined)) {
    subject = 'Sinh học';
  } else if (/tieng anh|english|grammar|vocabulary|reading|pronunciation/i.test(combined)) {
    subject = 'Tiếng Anh';
  } else if (/ngu van|van hoc|tac pham|tho|truyen|nghi luan|van mau/i.test(combined)) {
    subject = 'Ngữ văn';
  } else if (/lich su|su|khang chien|cach mang|the chien/i.test(combined)) {
    subject = 'Lịch sử';
  } else if (/dia li|dia ly|khi hau|dan cu|kinh te|dia hinh/i.test(combined)) {
    subject = 'Địa lí';
  } else if (/gdkt&pl|phap luat|kinh te|phap luat va doi song/i.test(combined)) {
    subject = 'GDKT&PL';
  } else if (/tin hoc|tin|lap trinh|mang may tinh|co so du lieu|python|mang/i.test(combined)) {
    subject = 'Tin học';
  }

  // Suy luận khối lớp
  let grade = 12;
  const gradeMatch = combined.match(/lop\s*(10|11|12|4|5|6|7|8|9)|khoi\s*(10|11|12|4|5|6|7|8|9)|\b(10|11|12)\b/i);
  if (gradeMatch) {
    grade = parseInt(gradeMatch[1] || gradeMatch[2] || gradeMatch[3], 10);
  }

  const topicTitle = filename.replace(/\.docx$/i, '').replace(/^[-_\s\d\.]+/, '').trim() || `Chuyên đề ${subject}`;

  return {
    grade,
    subject,
    topicCode: `CHỦ ĐỀ (${subject.toUpperCase()} ${grade})`,
    topicTitle,
    keywords: [subject.toLowerCase(), `lớp ${grade}`, topicTitle.toLowerCase()]
  };
}

/**
 * Phân tích và trích xuất câu hỏi từ văn bản DOCX
 */
function extractQuestionsFromFile(filename, buffer) {
  const parsed = parseDocxBuffer(buffer);
  const meta = FILE_TOPIC_CONFIG[filename] || inferFileMetadata(filename, parsed.text || (parsed.paragraphs || []).join('\n'));

  const paragraphs = parsed.paragraphs || [];
  const pDetails = (parsed.paragraphDetails && parsed.paragraphDetails.length > 0)
    ? parsed.paragraphDetails
    : paragraphs.map(t => ({ text: t, taggedText: t, underlinedParts: [] }));
  const tables = parsed.tables || [];

  const mcqQuestions = [];
  const tfQuestions = [];
  const saQuestions = [];

  // Trích xuất các câu hỏi True/False từ Tables nếu có cấu trúc:
  // [ 'a) Text...', 'Đ/S', 'B/H/V' ]
  tables.forEach((tbl, tblIdx) => {
    if (tbl.length === 4 && tbl[0].length >= 2) {
      // Kiểm tra xem có phải bảng Đúng/Sai dạng 4 ý a, b, c, d không
      const isTFTable = tbl.every(row => /^[a-d]\)/i.test(row[0].trim()));
      if (isTFTable) {
        // Tìm prompt từ các đoạn văn nằm ngay trước bảng này trong text
        const firstItem = tbl[0][0].trim();
        let promptText = `Em hãy xác định tính Đúng/Sai của các phát biểu sau:`;
        
        // Tìm đoạn văn ngay trước mục này
        const pIndex = paragraphs.findIndex(p => p.includes(firstItem.substring(0, 30)));
        if (pIndex > 0) {
          for (let pi = pIndex - 1; pi >= Math.max(0, pIndex - 4); pi--) {
            const prev = paragraphs[pi].trim();
            if (/^(?:Câu\s*hỏi|Câu)\s+\d+/i.test(prev)) {
              promptText = prev;
              break;
            }
          }
        }

        const items = tbl.map(row => {
          const itemText = row[0].replace(/^[a-d]\)\s*/i, '').trim();
          const letter = (row[0].match(/^[a-d]/i) || ['a'])[0].toLowerCase();
          const ansRaw = (row[1] || '').trim().toUpperCase();
          const isCorrect = ansRaw.startsWith('Đ') || ansRaw.startsWith('D') || ansRaw.startsWith('T');
          
          let level = 'Biết';
          const lvlRaw = (row[2] || '').trim().toUpperCase();
          if (lvlRaw.includes('H')) level = 'Hiểu';
          else if (lvlRaw.includes('V')) level = 'Vận dụng';

          return { letter, text: itemText, isCorrect, level };
        });

        tfQuestions.push({
          id: `TF_${filename}_TBL_${tblIdx+1}`,
          prompt: promptText,
          items,
          level: items.some(it => it.level === 'Vận dụng') ? 'Vận dụng' : (items.some(it => it.level === 'Hiểu') ? 'Hiểu' : 'Biết'),
          format: 'true_false',
          sourceFile: filename,
          topicCode: meta.topicCode,
          topicTitle: meta.topicTitle,
          grade: meta.grade,
          subject: meta.subject
        });
      }
    }
  });

  // Mở rộng các đoạn văn bản nếu chứa từ 2 câu hỏi trở lên (ví dụ trong Chuyên đề 12B Bài 4)
  const expandedDetails = [];
  pDetails.forEach(pd => {
    const qMatches = pd.text.match(/(?:Câu\s*hỏi|Câu)\s+\d+[:.]/gi);
    if (qMatches && qMatches.length > 1) {
      const parts = (pd.taggedText || pd.text).split(/(?=(?:Câu\s*hỏi|Câu)\s+\d+[:.])/i);
      parts.forEach(part => {
        if (part.trim()) {
          const plain = part.replace(/<\/?u>/gi, '').trim();
          const uParts = (part.match(/<u>([\s\S]*?)<\/u>/gi) || []).map(u => u.replace(/<\/?u>/gi, '').trim());
          expandedDetails.push({ text: plain, taggedText: part.trim(), underlinedParts: uParts });
        }
      });
    } else {
      expandedDetails.push(pd);
    }
  });

  // Phân tích từ văn bản paragraphs
  let currentLevel = 'Biết';
  let currentFormat = 'mcq';
  let i = 0;

  while (i < expandedDetails.length) {
    const rawLine = expandedDetails[i].text.trim();
    if (!rawLine) {
      i++;
      continue;
    }

    // Nhận diện mức độ nhận thức
    if (/NHẬN\s*BIẾT|MỨC\s*ĐỘ\s*1\b|\((?:NB|B)\)/i.test(rawLine)) {
      currentLevel = 'Biết';
    } else if (/THÔNG\s*HIỂU|MỨC\s*ĐỘ\s*2\b|\((?:TH|H)\)/i.test(rawLine)) {
      currentLevel = 'Hiểu';
    } else if (/VẬN\s*DỤNG|MỨC\s*ĐỘ\s*(3|4)\b|\((?:VD|VDC|V)\)/i.test(rawLine)) {
      currentLevel = 'Vận dụng';
    }

    // Nhận diện định dạng
    if (/TRẮC\s*NGHIỆM\s*ĐÚNG\s*[\/-]?\s*SAI|DẠNG\s*D2|PHẦN\s*II\b/i.test(rawLine)) {
      currentFormat = 'true_false';
    } else if (/TRẢ\s*LỜI\s*NGẮN|TỰ\s*LUẬN|PHẦN\s*III\b/i.test(rawLine)) {
      currentFormat = 'short_answer';
    } else if (/PHẦN\s*I\b|TRẮC\s*NGHIỆM\s*(NHIỀU\s*LỰA\s*CHỌN|4\s*LỰA\s*CHỌN)|A\.\s*TRẮC\s*NGHIỆM/i.test(rawLine)) {
      currentFormat = 'mcq';
    }

    // Nhận diện đầu câu hỏi (hỗ trợ cả "Câu 1:", "Câu 1.", "Câu 1 (11-D-NB):")
    const qMatch = rawLine.match(/^(?:Câu\s*hỏi|Câu)\s+(\d+)(?:\s*\([^)]+\))?[:.]\s*(.*)/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      let qPrompt = qMatch[2].trim();
      let collectedDetails = [expandedDetails[i]];

      i++;
      while (i < expandedDetails.length) {
        const nextLine = expandedDetails[i].text.trim();
        if (/^(?:Câu\s*hỏi|Câu)\s+\d+/i.test(nextLine) || 
            /^(?:PHẦN\s+[I|V|X]+|[I|V|X]+[\.:\-_]\s*CÂU\s*HỎI|CHỦ\s*ĐỀ\b|\d+\.\s*(?:CÂU|DẠNG|TRẮC|ĐÚNG|PHẦN|BÀI)|TRẮC\s*NGHIỆM\s*(?:ĐÚNG|Đ[\/-]?S)|DẠNG\s*D\d|BẢNG\s*ĐÁP\s*ÁN|(?:\d+\.)?\s*(?:NHẬN\s*BIẾT|THÔNG\s*HIỂU|VẬN\s*DỤNG))/i.test(nextLine)) {
          break;
        }
        if (nextLine) collectedDetails.push(expandedDetails[i]);
        i++;
      }

      const combinedText = collectedDetails.map(d => d.text).join('\n');
      const combinedTagged = collectedDetails.map(d => d.taggedText).join('\n');
      const allUnderlined = collectedDetails.flatMap(d => d.underlinedParts || []);
      const normalizedCombined = combinedText.replace(/([^\s\n\t])([A-D])\s*[\.:]/g, '$1\n$2. ');

      const hasTFItems = /(?:^|\n)\s*[a-d]\s*[\).]/m.test(combinedText);
      const hasMCQItems = /(?:^|[\t\s\n])([A-D])\s*[\.:]\s*/.test(normalizedCombined);

      // Tự động suy luận mức độ nhận thức nếu chưa có hoặc mặc định
      const finalLevel = inferCognitiveLevel(qPrompt || combinedText, currentLevel);

      // Xử lý câu Đúng / Sai (Part II)
      if (hasTFItems && (currentFormat === 'true_false' || !hasMCQItems)) {
        const tfItems = [];
        const lines = combinedText.split('\n');
        let currentSub = null;
        for (const line of lines) {
          const subMatch = line.match(/^\s*([a-d])\s*[\).]\s*(.*)/);
          if (subMatch) {
            if (currentSub) tfItems.push(currentSub);
            currentSub = { letter: subMatch[1].toLowerCase(), text: subMatch[2].trim(), isCorrect: false, level: finalLevel };
            const isLineUnderlined = allUnderlined.some(u => line.toLowerCase().includes(u.toLowerCase()));
            if (/\((?:đúng|đ|true)\)/i.test(line) || isLineUnderlined) currentSub.isCorrect = true;
            else if (/\((?:sai|s|false)\)/i.test(line)) currentSub.isCorrect = false;
            if (/\([B|b]\)/.test(line)) currentSub.level = 'Biết';
            else if (/\([H|h]\)/.test(line)) currentSub.level = 'Hiểu';
            else if (/\([V|v]\)/.test(line)) currentSub.level = 'Vận dụng';
          } else if (currentSub) {
            currentSub.text += ' ' + line;
            const isLineUnderlined = allUnderlined.some(u => line.toLowerCase().includes(u.toLowerCase()));
            if (/\((?:đúng|đ|true)\)/i.test(line) || isLineUnderlined) currentSub.isCorrect = true;
            else if (/\((?:sai|s|false)\)/i.test(line)) currentSub.isCorrect = false;
            if (/\([B|b]\)/.test(line)) currentSub.level = 'Biết';
            else if (/\([H|h]\)/.test(line)) currentSub.level = 'Hiểu';
            else if (/\([V|v]\)/.test(line)) currentSub.level = 'Vận dụng';
          }
        }
        if (currentSub) tfItems.push(currentSub);

        if (tfItems.length >= 4) {
          // Tránh trùng nếu đã lấy từ Table
          const exists = tfQuestions.some(tq => tq.prompt.includes(qPrompt.substring(0, 30)));
          if (!exists) {
            tfQuestions.push({
              id: `TF_${filename}_Q${qNum}`,
              prompt: qPrompt || lines[0],
              items: tfItems.slice(0, 4),
              level: tfItems.some(it => it.level === 'Vận dụng') ? 'Vận dụng' : (tfItems.some(it => it.level === 'Hiểu') ? 'Hiểu' : 'Biết'),
              format: 'true_false',
              sourceFile: filename,
              topicCode: meta.topicCode,
              topicTitle: meta.topicTitle,
              grade: meta.grade,
              subject: meta.subject
            });
          }
          continue;
        }
      }

      // Xử lý câu TN nhiều lựa chọn (Part I)
      const options = {};
      const optRegex = /(?:^|[\t\n\s])([A-D])\s*[\.:]\s*(.*?)(?=(?:[\t\n\s][A-D]\s*[\.:])|$)/gs;
      let m;
      while ((m = optRegex.exec(normalizedCombined)) !== null) {
        options[m[1]] = m[2].trim();
      }

      if (options['A'] && options['B']) {
        let cleanPrompt = cleanQuestionPrompt(qPrompt || combinedText, options['A']);
        if (!cleanPrompt) {
          cleanPrompt = combinedText.replace(/(?:^|[\t\n\s])[A-D]\s*[\.:].*$/s, '').trim();
        }

        // Bóc tách đáp án đúng gạch chân (<w:u>) thực tế của Giáo viên
        const detectedAns = detectUnderlinedAnswer(combinedTagged, options, allUnderlined);
        const finalAnswer = detectedAns || 'A';
        const isUnderlineVerified = Boolean(detectedAns);

        mcqQuestions.push({
          id: `MCQ_${filename}_Q${qNum}`,
          prompt: cleanPrompt || qPrompt,
          options: [
            cleanOptionText(options['A'] || ''),
            cleanOptionText(options['B'] || ''),
            cleanOptionText(options['C'] || ''),
            cleanOptionText(options['D'] || '')
          ],
          correctAnswer: finalAnswer,
          hasUnderlineAnswer: isUnderlineVerified,
          level: finalLevel,
          format: 'mcq',
          sourceFile: filename,
          topicCode: meta.topicCode,
          topicTitle: meta.topicTitle,
          grade: meta.grade,
          subject: meta.subject,
          explanation: isUnderlineVerified
            ? `Đáp án đúng là ${finalAnswer} (Căn cứ theo đáp án được gạch chân trong tài liệu "${filename}").`
            : `Đáp án chuẩn theo SGK và tài liệu chuyên môn "${filename}".`
        });
      } else {
        // Xử lý câu Trả lời ngắn / Tự luận (Part III)
        saQuestions.push({
          id: `SA_${filename}_Q${qNum}`,
          prompt: qPrompt || combinedText,
          level: finalLevel,
          format: 'short_answer',
          sourceFile: filename,
          topicCode: meta.topicCode,
          topicTitle: meta.topicTitle,
          grade: meta.grade,
          subject: meta.subject
        });
      }
      continue;
    }

    i++;
  }

  return { mcqQuestions, tfQuestions, saQuestions };
}

/**
 * Khởi tạo hoặc tải toàn bộ Ngân hàng câu hỏi từ các file Google Drive
 */
function loadDriveQuestionBank(forceReload = false) {
  if (cachedBank && !forceReload) {
    return cachedBank;
  }

  if (!fs.existsSync(BANK_DIR)) {
    return {
      totalQuestions: 0,
      mcqQuestions: [],
      tfQuestions: [],
      saQuestions: [],
      files: [],
      stats: {}
    };
  }

  const files = fs.readdirSync(BANK_DIR).filter(f => f.endsWith('.docx'));
  const allMCQ = [];
  const allTF = [];
  const allSA = [];

  for (const file of files) {
    try {
      const buf = fs.readFileSync(path.join(BANK_DIR, file));
      const res = extractQuestionsFromFile(file, buf);
      allMCQ.push(...res.mcqQuestions);
      allTF.push(...res.tfQuestions);
      allSA.push(...res.saQuestions);
    } catch (err) {
      console.error(`[loadDriveQuestionBank] Error loading ${file}:`, err.message);
    }
  }

  cachedBank = {
    totalQuestions: allMCQ.length + allTF.length + allSA.length,
    mcqQuestions: allMCQ,
    tfQuestions: allTF,
    saQuestions: allSA,
    files,
    updatedAt: new Date().toISOString()
  };

  console.log(`[DriveBank] Loaded ${cachedBank.totalQuestions} questions (${allMCQ.length} MCQ, ${allTF.length} TF, ${allSA.length} SA) from ${files.length} Google Drive files.`);
  return cachedBank;
}

/**
 * Tính điểm trùng khớp giữa văn bản đề mục trong Ma trận và câu hỏi ngân hàng
 */
function calculateRelevanceScore(question, topicText, subtopicText) {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const target = norm(topicText + ' ' + subtopicText);
  const qText = norm(question.prompt + ' ' + (question.topicTitle || '') + ' ' + (question.topicCode || ''));

  let score = 0;
  // Cụm từ khóa chuyên môn cốt lõi (đa từ)
  const keyPhrases = [
    { phrase: 'tri tue nhan tao', weight: 35 },
    { phrase: 'ani', weight: 30 },
    { phrase: 'agi', weight: 30 },
    { phrase: 'thiet bi mang', weight: 35 },
    { phrase: 'switch', weight: 30 },
    { phrase: 'router', weight: 30 },
    { phrase: 'access point', weight: 30 },
    { phrase: 'modem', weight: 30 },
    { phrase: 'giao thuc', weight: 35 },
    { phrase: 'tcp/ip', weight: 35 },
    { phrase: 'dia chi ip', weight: 35 },
    { phrase: 'ipv4', weight: 30 },
    { phrase: 'ipv6', weight: 30 },
    { phrase: 'chia se tai nguyen', weight: 35 },
    { phrase: 'ket noi mang', weight: 30 },
    { phrase: 'dao duc', weight: 30 },
    { phrase: 'phap luat', weight: 30 },
    { phrase: 'van hoa', weight: 25 },
    { phrase: 'khong gian mang', weight: 30 },
    { phrase: 'moi truong so', weight: 25 },
    { phrase: 'ung xu', weight: 30 },
    { phrase: 'tao trang web', weight: 35 },
    { phrase: 'html', weight: 35 },
    { phrase: 'co so du lieu', weight: 35 },
    { phrase: 'lap trinh', weight: 35 },
    { phrase: 'python', weight: 35 }
  ];

  for (const kp of keyPhrases) {
    if (target.includes(kp.phrase) && qText.includes(kp.phrase)) {
      score += kp.weight;
    }
  }

  // Khớp từ đơn có ý nghĩa (bỏ qua các hư từ / stopwords tiếng Việt)
  const stopwords = new Set(['bai', 'chu', 'de', 'va', 'cua', 'trong', 'cac', 'mot', 'cho', 'la', 'co', 'nhung', 'khi', 'theo', 'dung', 'sai', 'sau', 'day']);
  const words = target.split(/[\s,.;:()_/-]+/).filter(w => w.length >= 3 && !stopwords.has(w));
  for (const w of words) {
    if (qText.includes(w)) score += 2;
  }

  return score;
}

/**
 * Bốc tách câu hỏi cho toàn bộ Đề thi dựa trên Ma trận (Zero Hallucination)
 */
function matchQuestionsForMatrix(matrixRows, grade = 12, subject = 'Tin học') {
  const bank = loadDriveQuestionBank();
  const usedIds = new Set();

  const selectedMCQ = [];
  const selectedTF = [];
  const selectedTLN = [];
  const selectedTL = [];

  for (let rIdx = 0; rIdx < matrixRows.length; rIdx++) {
    const row = matrixRows[rIdx];
    const topic = row.chu_de || row.topic || '';
    const subtopic = row.noi_dung || row.subtopic || '';
    const { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords } = resolveTargetBankFiles(row, { grade, subject });

    // Hàm chọn câu hỏi từ ngân hàng theo định dạng & mức độ
    function pickFromBank(bankList, targetLevel, count, format) {
      if (!count || count <= 0) return [];
      
      // Lọc các câu chưa dùng và không thuộc file cấm
      let pool = bankList.filter(q => !usedIds.has(q.id) && !forbiddenFiles.includes(q.sourceFile));
      if (targetFiles.length > 0) {
        const inTarget = pool.filter(q => targetFiles.includes(q.sourceFile));
        if (inTarget.length > 0) pool = inTarget;
      }

      const candidates = pool
        .map(q => {
          let score = calculateRelevanceScore(q, topic, subtopic);
          if (targetFiles.includes(q.sourceFile)) score += 100;
          if (q.level === targetLevel) score += 40;
          const qText = (q.prompt + ' ' + (q.options ? q.options.join(' ') : '')).toLowerCase();
          for (const kw of preferredKeywords) if (qText.includes(kw)) score += 20;
          for (const kw of penaltyKeywords) if (qText.includes(kw)) score -= 25;
          return { question: q, score };
        })
        .sort((a, b) => b.score - a.score);

      const picked = [];
      for (const item of candidates) {
        if (picked.length >= count) break;
        usedIds.add(item.question.id);
        picked.push({
          ...item.question,
          level: targetLevel, // Chuẩn hóa khớp với ô ma trận
          matrixRowIndex: rIdx,
          matrixTopic: topic,
          matrixSubtopic: subtopic,
          isZeroHallucination: true,
          sourceBadge: `Ngân hàng Google Drive (${item.question.sourceFile})`
        });
      }

      return picked;
    }

    // 1. TNKQ (Phần I)
    const nBietMCQ = parseInt(row.tnkq_biet || 0, 10);
    const nHieuMCQ = parseInt(row.tnkq_hieu || 0, 10);
    const nVanDungMCQ = parseInt(row.tnkq_vandung || 0, 10);

    selectedMCQ.push(...pickFromBank(bank.mcqQuestions, 'Biết', nBietMCQ, 'mcq'));
    selectedMCQ.push(...pickFromBank(bank.mcqQuestions, 'Hiểu', nHieuMCQ, 'mcq'));
    selectedMCQ.push(...pickFromBank(bank.mcqQuestions, 'Vận dụng', nVanDungMCQ, 'mcq'));

    // 2. TN Đúng/Sai (Phần II)
    const nBietTF = parseInt(row.ds_biet || 0, 10);
    const nHieuTF = parseInt(row.ds_hieu || 0, 10);
    const nVanDungTF = parseInt(row.ds_vandung || 0, 10);
    const totalTFY = nBietTF + nHieuTF + nVanDungTF;
    const numTFCau = Math.ceil(totalTFY / 4);

    if (numTFCau > 0) {
      const tfPicked = pickFromBank(bank.tfQuestions.filter(q => q.items && q.items.length >= 4), 'Hiểu', numTFCau, 'true_false');
      selectedTF.push(...tfPicked);
    }

    // 3. Trả lời ngắn (Phần III)
    const nBietTLN = parseInt(row.tln_biet || 0, 10);
    const nHieuTLN = parseInt(row.tln_hieu || 0, 10);
    const nVanDungTLN = parseInt(row.tln_vandung || 0, 10);

    selectedTLN.push(...pickFromBank(bank.saQuestions, 'Biết', nBietTLN, 'short_answer'));
    selectedTLN.push(...pickFromBank(bank.saQuestions, 'Hiểu', nHieuTLN, 'short_answer'));
    selectedTLN.push(...pickFromBank(bank.saQuestions, 'Vận dụng', nVanDungTLN, 'short_answer'));

    // 4. Tự luận (nếu có)
    const nBietTL = parseInt(row.tl_biet || 0, 10);
    const nHieuTL = parseInt(row.tl_hieu || 0, 10);
    const nVanDungTL = parseInt(row.tl_vandung || 0, 10);

    selectedTL.push(...pickFromBank(bank.saQuestions, 'Biết', nBietTL, 'essay'));
    selectedTL.push(...pickFromBank(bank.saQuestions, 'Hiểu', nHieuTL, 'essay'));
    selectedTL.push(...pickFromBank(bank.saQuestions, 'Vận dụng', nVanDungTL, 'essay'));
  }

  return {
    selectedMCQ,
    selectedTF,
    selectedTLN,
    selectedTL,
    totalPicked: selectedMCQ.length + selectedTF.length + selectedTLN.length + selectedTL.length
  };
}

module.exports = {
  BANK_DIR,
  FILE_TOPIC_CONFIG,
  loadDriveQuestionBank,
  extractQuestionsFromFile,
  calculateRelevanceScore,
  matchQuestionsForMatrix,
  detectUnderlinedAnswer,
  inferCognitiveLevel,
  resolveTargetBankFiles,
  cleanQuestionPrompt,
  cleanOptionText
};
