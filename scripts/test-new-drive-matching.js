const { loadDriveQuestionBank } = require('../src/drive-bank');
const bank = loadDriveQuestionBank();

function resolveTargetBankFiles(row) {
  const norm = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const t = norm(row.topic || '');
  const u = norm(row.unit || row.noi_dung || '');
  const full = `${t} ${u}`;

  let targetFiles = [];
  let forbiddenFiles = [];
  let preferredKeywords = [];
  let penaltyKeywords = [];

  // Check with word boundaries /\b(ai|ani|agi)\b/i or distinct phrase
  const isAI = /tri tue nhan tao|\b(ai|ani|agi)\b/i.test(full);
  const isNetDevice = /thiet bi mang|switch|router|access point|modem|hub|bai 3\b/i.test(full) && !isAI;
  const isNetProtocol = /giao thuc|tcp\/ip|dia chi ip|ipv4|ipv6|bai 4\b/i.test(full);
  const isResourceSharing = /chia se tai nguyen|ket noi cac thiet bi|ket noi mang|bai 5\b/i.test(full);
  const isCyberLaw = /dao duc|phap luat|van hoa|khong gian mang|moi truong so|ung xu|giao tiep|bai 6\b/i.test(full);
  const isWeb = /tao trang web|trang web|\bhtml\b|web/i.test(full);

  // 1. AI / Trí tuệ nhân tạo
  if (isAI && !isNetDevice && !isNetProtocol && !isResourceSharing && !isCyberLaw) {
    targetFiles = ['Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx'];
    forbiddenFiles = [
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
    if (full.includes('bai 1') || full.includes('lam quen') || full.includes('khai niem')) {
      preferredKeywords = ['khai niem', 'ani', 'agi', 'turing', 'dartmouth', 'tri tue', 'dinh nghia'];
      penaltyKeywords = ['y te', 'giao duc', 'tai chinh', 'dao duc', 'viec lam', 'chan doan'];
    } else if (full.includes('bai 2') || full.includes('khoa hoc') || full.includes('doi song') || full.includes('ung dung')) {
      preferredKeywords = ['khoa hoc', 'doi song', 'y te', 'giao duc', 'tai chinh', 'dao duc', 'ung dung'];
      penaltyKeywords = ['alan turing', 'dartmouth'];
    }
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 2. Thiết bị mạng (Switch, Router, AP, Modem, Hub, cáp...)
  if (isNetDevice) {
    targetFiles = ['CD3-Một số thiết bị Mạng thông dụng.docx'];
    forbiddenFiles = [
      'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
      'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx',
      'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx',
      'Chuyên đề 12F. Tạo trang Web.docx',
      'Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx',
      'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx',
      'Chuyên đề 10F. Lập trình cơ bản.docx'
    ];
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 3. Giao thức mạng (TCP/IP, IP, DNS, HTTP...)
  if (isNetProtocol) {
    targetFiles = ['Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx'];
    forbiddenFiles = [
      'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
      'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx',
      'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx',
      'Chuyên đề 12F. Tạo trang Web.docx',
      'Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx',
      'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx',
      'Chuyên đề 10F. Lập trình cơ bản.docx'
    ];
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 4. Kết nối thiết bị số / Thực hành kết nối mạng & chia sẻ tài nguyên
  if (isResourceSharing) {
    targetFiles = ['Chuyên đề 12B. Kết nối mạng.docx', 'CD3-Một số thiết bị Mạng thông dụng.docx'];
    forbiddenFiles = [
      'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
      'Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx',
      'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx',
      'Chuyên đề 12F. Tạo trang Web.docx',
      'Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx',
      'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx',
      'Chuyên đề 10F. Lập trình cơ bản.docx'
    ];
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  // 5. Đạo đức, pháp luật, văn hóa / Giao tiếp và ứng xử không gian mạng
  if (isCyberLaw) {
    targetFiles = ['Chuyên đề 11D, 12D - DD, VH, PL TRONG MT SO.docx'];
    forbiddenFiles = [
      'Chuyên đề 12A. Giới thiệu trí tuệ nhân tạo-2.docx',
      'CD3-Một số thiết bị Mạng thông dụng.docx',
      'Chuyên đề 12B. Bài 4- Giao Thức Mạng.docx',
      'Chuyên đề 12B. Kết nối mạng.docx',
      'Chuyên đề 12E. Thực hành phần mềm tạo trang web.docx',
      'Chuyên đề 12F. Tạo trang Web.docx',
      'Chuyên đề 12G. Giới thiệu nhóm nghề dịch vụ và quản trị.docx',
      'Chuyên đề 11F - GIỚI THIỆU CÁC HỆ CSDL.docx',
      'Chuyên đề 10F. Lập trình cơ bản.docx'
    ];
    return { targetFiles, forbiddenFiles, preferredKeywords, penaltyKeywords };
  }

  return { targetFiles: [], forbiddenFiles: [], preferredKeywords: [], penaltyKeywords: [] };
}

const testRows = [
  { topic: 'Chủ đề 1. Máy tính và xã hội tri thức.', unit: 'Bài 1. Làm quen với trí tuệ nhân tạo' },
  { topic: 'Chủ đề 1. Máy tính và xã hội tri thức.', unit: 'Bài 2. Trí tuệ nhân tạo trong khoa học và đời sống' },
  { topic: 'Chủ đề 5. Máy tính và xã hội tri thức _ ICT', unit: 'Thực hành kết nối các thiết bị số.' },
  { topic: 'Chủ đề 2. Mạng máy tính và Internet', unit: 'Bài 3: Một số thiết bị mạng thông dụng.' },
  { topic: 'Chủ đề 2. Mạng máy tính và Internet', unit: 'Bài 4: Giao thức mạng' },
  { topic: 'Chủ đề 2. Mạng máy tính và Internet', unit: 'Bài 5.  Thực hành chia sẻ tài nguyên trên mạng máy tính' },
  { topic: 'Chủ đề 3. Đạo đức, pháp luậtvà văn hoá trong môi trường số', unit: 'Bài 6. Giao tiếp và ứng xử trong không gian mạng' }
];

testRows.forEach((r, idx) => {
  const resolved = resolveTargetBankFiles(r);
  console.log(`Row ${idx+1}: [${r.unit}]`);
  console.log(`   -> Targets: ${resolved.targetFiles.join(', ')}`);
});
