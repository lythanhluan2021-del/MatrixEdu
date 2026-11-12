/**
 * src/content-alignment.js
 * Bộ máy Kiểm định ĐỘ BÁM NỘI DUNG giữa Câu hỏi và Dòng Ma trận (Đơn vị kiến thức).
 *
 * Nguyên tắc (bám sát 100% Ma trận):
 * 1. Mỗi dòng Ma trận được quy về một hoặc nhiều "chủ đề chuẩn" (lexicon) dựa trên TÊN ĐƠN VỊ KIẾN THỨC
 *    (ưu tiên cột Đơn vị kiến thức, chỉ dùng tên Chương/Chủ đề khi đơn vị kiến thức không đủ thông tin).
 * 2. Một câu hỏi chỉ được coi là KHỚP khi nội dung câu hỏi chứa dấu hiệu chuyên môn của chủ đề đích
 *    và KHÔNG thiên về một chủ đề khác cùng môn nhiều hơn chủ đề đích.
 * 3. Nếu dòng Ma trận không thuộc bộ chủ đề chuẩn, dùng phép so khớp cụm từ (n-gram) giữa tên đơn vị kiến thức
 *    và nội dung câu hỏi (phương pháp "generic" — độ tin cậy thấp hơn, cần giáo viên rà soát).
 */

function normalizeText(str) {
  let s = String(str || '');
  // Chuẩn hóa các từ viết tắt VIẾT HOA dễ nhầm với từ tiếng Việt khi bỏ dấu (ai = "ai đó", lan = "lan truyền")
  s = s
    .replace(/\bANI\b/g, ' tri tue nhan tao hep ')
    .replace(/\bAGI\b/g, ' tri tue nhan tao rong ')
    .replace(/\bAI\b/g, ' tri tue nhan tao ')
    .replace(/\bWLAN\b/g, ' mang_lan khong day ')
    .replace(/\bLAN\b/g, ' mang_lan ')
    .replace(/\bWAN\b/g, ' mang_wan ')
    .replace(/\bAP\b/g, ' access point ');
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    // "Đạo đức AI" là nội dung của chủ đề Trí tuệ nhân tạo, không phải Đạo đức trong môi trường số
    .replace(/dao duc (cua |trong |ve )?(tri tue nhan tao|he thong tri tue nhan tao)/g, 'rui ro tri tue nhan tao')
    .replace(/\s+/g, ' ')
    .trim();
}

const R = (src) => new RegExp(src, 'i');

/**
 * Bộ chủ đề chuẩn THPT (CT GDPT 2018). Mỗi chủ đề:
 * - subject: họ môn học
 * - triggers: dấu hiệu nhận diện chủ đề trong TÊN DÒNG MA TRẬN
 * - keywords: dấu hiệu chuyên môn trong NỘI DUNG CÂU HỎI
 */
const TOPIC_LEXICON = [
  // ============================== TOÁN ==============================
  { id: 'math_don_dieu', subject: 'math', label: 'Tính đơn điệu của hàm số',
    triggers: [R('don dieu|dong bien|nghich bien')],
    keywords: [R('dong bien'), R('nghich bien'), R('don dieu'), R("dao ham|f'\\(x\\)|\\by'")] },
  { id: 'math_cuc_tri', subject: 'math', label: 'Cực trị của hàm số',
    triggers: [R('cuc tri|cuc dai|cuc tieu')],
    keywords: [R('cuc dai'), R('cuc tieu'), R('cuc tri'), R("dao ham|f'\\(x\\)|\\by'")] },
  { id: 'math_gtln', subject: 'math', label: 'GTLN - GTNN của hàm số',
    triggers: [R('gtln|gtnn|gia tri lon nhat|gia tri nho nhat')],
    keywords: [R('gia tri lon nhat|gtln|\\bmax\\b'), R('gia tri nho nhat|gtnn|\\bmin\\b'), R('tren (doan|khoang)')] },
  { id: 'math_tiem_can', subject: 'math', label: 'Đường tiệm cận',
    triggers: [R('tiem can')],
    keywords: [R('tiem can'), R('tiem can (dung|ngang|xien)')] },
  { id: 'math_toi_uu', subject: 'math', label: 'Bài toán tối ưu thực tiễn',
    triggers: [R('toi uu|bai toan thuc tien|ung dung thuc tien|ung dung dao ham')],
    keywords: [R('loi nhuan|chi phi|doanh thu|toi uu|nhieu nhat|it nhat|lon nhat|nho nhat'), R('san xuat|xuong|cong ty|nhien lieu|van toc')] },
  { id: 'math_khao_sat_do_thi', subject: 'math', label: 'Khảo sát và vẽ đồ thị hàm số',
    triggers: [R('khao sat (su bien thien )?va ve do thi|do thi ham so|bang bien thien')],
    keywords: [R('do thi'), R('bang bien thien'), R('giao diem|tiep tuyen')] },
  { id: 'math_dao_ham', subject: 'math', label: 'Đạo hàm',
    triggers: [R('(?<!ung dung )dao ham(?! de khao sat)')],
    keywords: [R("dao ham|f'\\(x\\)|\\by'"), R('tiep tuyen|he so goc'), R('dao ham cap hai|f\'\'')] },
  { id: 'math_nguyen_ham', subject: 'math', label: 'Nguyên hàm',
    triggers: [R('nguyen ham')],
    keywords: [R('nguyen ham'), R('∫|\\bdx\\b'), R('\\+ ?c\\b')] },
  { id: 'math_tich_phan', subject: 'math', label: 'Tích phân và ứng dụng',
    triggers: [R('tich phan|dien tich hinh phang|the tich (vat|khoi) tron xoay')],
    keywords: [R('tich phan'), R('∫|\\bdx\\b'), R('dien tich hinh phang|tron xoay')] },
  { id: 'math_vecto_kg', subject: 'math', label: 'Vectơ và tọa độ trong không gian',
    triggers: [R('vec ?to|oxyz|he truc toa do|toa do (cua )?(diem|vec ?to)|toa do trong khong gian')],
    keywords: [R('vec ?to'), R('oxyz|khong gian'), R('toa do'), R('tich vo huong|tich co huong|hinh chieu')] },
  { id: 'math_pt_oxyz', subject: 'math', label: 'Phương trình mặt phẳng, đường thẳng, mặt cầu',
    triggers: [R('phuong trinh (mat phang|duong thang|mat cau)|mat cau')],
    keywords: [R('mat phang'), R('duong thang'), R('mat cau'), R('vec ?to (phap tuyen|chi phuong)')] },
  { id: 'math_thong_ke', subject: 'math', label: 'Thống kê - Mẫu số liệu ghép nhóm',
    triggers: [R('mau so lieu|ghep nhom|phuong sai|do lech chuan|tu phan vi|khoang bien thien|thong ke|so dac trung')],
    keywords: [R('mau so lieu|so lieu'), R('ghep nhom'), R('phuong sai|do lech chuan'), R('tu phan vi|khoang bien thien|so trung binh|trung vi|tan so')] },
  { id: 'math_xac_suat', subject: 'math', label: 'Xác suất',
    triggers: [R('xac suat|bien co')],
    keywords: [R('xac suat'), R('bien co'), R('ngau nhien|gieo|rut|lay ra')] },
  { id: 'math_luong_giac', subject: 'math', label: 'Lượng giác',
    triggers: [R('luong giac')],
    keywords: [R('\\bsin|\\bcos|\\btan|\\bcot'), R('luong giac'), R('radian|goc luong giac')] },
  { id: 'math_mu_log', subject: 'math', label: 'Hàm số mũ - Lôgarit',
    triggers: [R('\\bmu\\b|logarit|luy thua')],
    keywords: [R('\\blog|logarit|\\bln\\b'), R('\\bmu\\b|luy thua'), R('lai suat|tang truong')] },
  { id: 'math_day_so', subject: 'math', label: 'Dãy số - Cấp số',
    triggers: [R('day so|cap so cong|cap so nhan')],
    keywords: [R('day so'), R('cap so (cong|nhan)'), R('cong sai|cong boi|so hang')] },
  { id: 'math_gioi_han', subject: 'math', label: 'Giới hạn - Hàm số liên tục',
    triggers: [R('gioi han|lien tuc')],
    keywords: [R('\\blim\\b|gioi han'), R('lien tuc')] },
  { id: 'math_hinh_kg', subject: 'math', label: 'Hình học không gian (quan hệ vuông góc, khoảng cách, thể tích)',
    triggers: [R('khoi da dien|the tich khoi|quan he vuong goc|quan he song song|khoang cach|goc giua|hinh chop|lang tru')],
    keywords: [R('hinh chop|lang tru|hinh hop|tu dien'), R('vuong goc|song song'), R('the tich|khoang cach|goc giua')] },

  // ============================== VẬT LÍ ==============================
  { id: 'phys_nhiet', subject: 'phys', label: 'Vật lí nhiệt',
    triggers: [R('vat li nhiet|nhiet do|nhiet dong luc|noi nang|nhiet dung|nhiet nong chay|nhiet hoa hoi|kelvin|celsius|cau truc cua chat|chuyen the')],
    keywords: [R('nhiet luong'), R('nhiet dung rieng|nhiet nong chay|nhiet hoa hoi'), R('kelvin|celsius|thang nhiet do'), R('noi nang|dinh luat i|nhiet dong luc'), R('nong chay|hoa hoi|soi|dong dac|nuoc da'), R('dun nong|dun soi|am dien')] },
  { id: 'phys_khi', subject: 'phys', label: 'Khí lí tưởng',
    triggers: [R('khi li tuong|boyle|charles|dang nhiet|dang ap|dang tich|phuong trinh trang thai|dong hoc phan tu')],
    keywords: [R('khi li tuong|luong khi|khoi khi|chat khi'), R('dang nhiet|dang ap|dang tich'), R('boyle|charles|phuong trinh trang thai'), R('ap suat'), R('xilanh|binh kin|pit-?tong'), R('\\bmol\\b|hang so khi')] },
  { id: 'phys_tu_truong', subject: 'phys', label: 'Từ trường - Cảm ứng điện từ',
    triggers: [R('tu truong|cam ung dien tu|luc tu|tu thong|faraday|lenz|dong dien xoay chieu')],
    keywords: [R('tu truong|cam ung tu'), R('luc tu'), R('tu thong|\\bwb\\b'), R('faraday|lenz|suat dien dong cam ung'), R('khung day|nam cham|ong day')] },
  { id: 'phys_hat_nhan', subject: 'phys', label: 'Vật lí hạt nhân',
    triggers: [R('hat nhan|phong xa')],
    keywords: [R('hat nhan'), R('phong xa|chu ki ban ra'), R('nuclon|proton|notron|dong vi')] },
  { id: 'phys_dao_dong', subject: 'phys', label: 'Dao động',
    triggers: [R('dao dong')],
    keywords: [R('dao dong'), R('bien do|tan so goc|pha ban dau'), R('con lac')] },
  { id: 'phys_song', subject: 'phys', label: 'Sóng',
    triggers: [R('song (co|am|dien tu|dung|anh sang|ngang|doc)|giao thoa')],
    keywords: [R('song (co|am|dien tu|anh sang|ngang|doc)|buoc song|truyen song'), R('giao thoa|song dung'), R('\\bnut song|\\bbung song')] },
  { id: 'phys_dien', subject: 'phys', label: 'Điện trường - Dòng điện',
    triggers: [R('dien truong|dien tich|tu dien|dong dien khong doi|dien tro|nguon dien')],
    keywords: [R('dien truong|culong|coulomb|dien tich (diem|q\\b)'), R('tu dien'), R('dien tro|cuong do dong dien|hieu dien the|nguon dien')] },

  // ============================== HÓA HỌC ==============================
  { id: 'chem_ester', subject: 'chem', label: 'Ester - Lipid - Xà phòng',
    triggers: [R('ester|este\\b|lipid|chat beo|xa phong|chat giat rua')],
    keywords: [R('ester|este\\b|acetate|axetat|formate'), R('chat beo|lipid|tristearin|triolein|tripalmitin|glycerol'), R('xa phong|chat giat rua'), R('coo')] },
  { id: 'chem_carb', subject: 'chem', label: 'Carbohydrate',
    triggers: [R('carbohydrate|cacbohidrat|glucose|fructose|saccharose|tinh bot|cellulose|xenlulozo')],
    keywords: [R('carbohydrate|cacbohidrat|saccharide'), R('glucose|fructose|saccharose|sacarozo|maltose'), R('tinh bot|cellulose|xenlulozo'), R('tollens|trang bac|len men|iodine|\\biot'), R('c6h12o6|c12h22o11')] },
  { id: 'chem_nitrogen', subject: 'chem', label: 'Hợp chất chứa Nitrogen (Amine, Amino acid, Peptide, Protein)',
    triggers: [R('amine|\\bamin\\b|amino ?acid|aminoaxit|peptide|peptit|protein|nitrogen|enzyme')],
    keywords: [R('amine|\\bamin\\b|aniline|anilin'), R('amino ?acid|aminoaxit|glycine|alanine|lysine|glutamic|\\bgly\\b|\\bala\\b|\\bval\\b'), R('peptide|peptit|protein|biuret'), R('h2n|nh2'), R('quy tim')] },
  { id: 'chem_polymer', subject: 'chem', label: 'Polymer',
    triggers: [R('polymer|polime|vat lieu polymer|cao su|chat deo|to (tong hop|thien nhien|nilon|capron)')],
    keywords: [R('polymer|polime|monomer'), R('trung hop|trung ngung'), R('cao su|chat deo|nhua|\\bto\\b (nilon|capron|tam)|pvc|polyethylene|pe\\b')] },
  { id: 'chem_dien_hoa', subject: 'chem', label: 'Pin điện - Điện phân',
    triggers: [R('pin dien|dien phan|the dien cuc|dien hoa')],
    keywords: [R('pin dien|pin galvani'), R('dien phan'), R('dien cuc|anode|cathode|the dien cuc chuan')] },
  { id: 'chem_kim_loai', subject: 'chem', label: 'Kim loại',
    triggers: [R('kim loai|hop kim|an mon')],
    keywords: [R('kim loai'), R('hop kim'), R('an mon'), R('tinh khu|day hoat dong')] },

  // ============================== TIẾNG ANH ==============================
  { id: 'eng_listening', subject: 'eng', label: 'Listening',
    triggers: [R('listening|ky nang nghe|\\bnghe\\b')],
    keywords: [R('\\[listening'), R('podcast|tapescript|recording'), R('listen|speaker|interview|according to (dr|mr|ms|the speaker)')] },
  { id: 'eng_phonetics', subject: 'eng', label: 'Phonetics (Pronunciation & Stress)',
    triggers: [R('phonetic|pronunciation|\\bstress\\b|ngu am')],
    keywords: [R('pronunciation|pronounced'), R('underlined part'), R('stress')] },
  { id: 'eng_grammar', subject: 'eng', label: 'Lexico-Grammar',
    triggers: [R('grammar|lexico|tense|article|preposition|relative clause|comparative|vocabulary|ngu phap|tu vung|passive')],
    keywords: [R('_{3,}'), R('correct form|verb in brackets'), R('preposition|article|relative'), R('fill in the blank')] },
  { id: 'eng_reading', subject: 'eng', label: 'Reading Comprehension',
    triggers: [R('reading|doc hieu|cloze')],
    keywords: [R('\\[reading'), R('passage|paragraph|text'), R('according to the (reading|passage|text)')] },
  { id: 'eng_writing', subject: 'eng', label: 'Writing',
    triggers: [R('writing|rewrit|sentence transformation|\\bviet\\b')],
    keywords: [R('rewrite|rewriting'), R('write a|write (a )?(short )?paragraph'), R('\\bwords\\b|sentence')] },

  // ============================== TIN HỌC ==============================
  { id: 'it_ai', subject: 'it', label: 'Trí tuệ nhân tạo',
    triggers: [R('tri tue nhan tao|hoc may|machine learning|he chuyen gia|mycin')],
    keywords: [R('tri tue nhan tao|ai\\b|ani\\b|agi\\b'), R('hoc may|machine learning|du lieu huan luyen'), R('tro ly ao|chatbot|nhan dang|nhan dien|thi giac may tinh|xu li ngon ngu|xu ly ngon ngu|ocr'), R('tao sinh|generative|turing|dartmouth|watson|siri|google assistant|mycin|he chuyen gia|expert system|chuan doan y khoa'), R('rui ro tri tue nhan tao|thien kien|khoa hoc va doi song')] },
  { id: 'it_thiet_bi_mang', subject: 'it', label: 'Thiết bị mạng',
    triggers: [R('thiet bi mang|switch|router|access point|modem|\\bhub\\b')],
    keywords: [R('thiet bi mang'), R('switch|bo chuyen mach'), R('router|bo dinh tuyen'), R('access point|diem truy cap|modem|\\bhub\\b|repeater'), R('cap mang|cap quang|cap xoan|rj-?45')] },
  { id: 'it_giao_thuc', subject: 'it', label: 'Giao thức mạng',
    triggers: [R('giao thuc|tcp/ip|dia chi ip|ipv4|ipv6|\\bdns\\b|dhcp')],
    keywords: [R('giao thuc'), R('tcp|udp'), R('\\bip\\b|ipv4|ipv6|dia chi ip|subnet|gateway'), R('\\bdns\\b|ten mien|dhcp|http|ftp|smtp'), R('ping|ipconfig|tracert|goi tin')] },
  { id: 'it_ket_noi_thiet_bi_so', subject: 'it', label: 'Kết nối các thiết bị số',
    triggers: [R('ket noi (cac |voi )?thiet bi so|thiet bi so')],
    keywords: [R('hdmi|vga|displayport|usb|type-?c'), R('bluetooth|ket noi khong day|wi-?fi'), R('may chieu|tai nghe|chuot|ban phim|may in|loa'), R('cong ket noi|thiet bi so|dien thoai thong minh|thiet bi di dong')] },
  { id: 'it_chia_se', subject: 'it', label: 'Chia sẻ tài nguyên trên mạng',
    triggers: [R('chia se tai nguyen|chia se du lieu|ket noi mang|mang_lan|thuc hanh chia se|chia se tai nguyen tren mang')],
    keywords: [R('chia se|share'), R('thu muc|tep|may in|tai nguyen'), R('mang_lan|mang cuc bo|mang noi bo|workgroup|network discovery'), R('quyen truy cap|read|full control|phan quyen')] },
  { id: 'it_dao_duc_mt_so', subject: 'it', label: 'Đạo đức, pháp luật, văn hóa và ứng xử trong môi trường số',
    triggers: [R('dao duc|phap luat|van hoa|ung xu|giao tiep|khong gian mang|moi truong so|ban quyen')],
    keywords: [R('ung xu|giao tiep|van minh|lich su'), R('mang xa hoi|tin nhan|binh luan'), R('ban quyen|phap luat|luat|nghi dinh'), R('lua dao|tin gia|bat nat|quay roi'), R('thong tin ca nhan|quyen rieng tu|mat khau|otp|can cuoc')] },
  { id: 'it_an_toan', subject: 'it', label: 'An toàn thông tin trên không gian mạng',
    triggers: [R('an toan (tren )?(khong gian mang|thong tin)|bao mat|phan mem doc hai')],
    keywords: [R('virus|phan mem doc hai|ma doc|malware|trojan|worm'), R('bao mat|ma hoa|tuong lua|firewall'), R('lua dao|phishing|tan cong'), R('mat khau|otp|xac thuc')] },
  { id: 'it_web', subject: 'it', label: 'Tạo trang web (HTML/CSS)',
    triggers: [R('trang web|\\bhtml|\\bcss\\b|tao web|website|mobirise')],
    keywords: [R('\\bhtml|<[a-z][a-z0-9]*'), R('\\bcss\\b|selector|bo chon'), R('trang web|website|trinh duyet'), R('the (a|p|img|table|tr|td|th|div|span|form|input|h[1-6]|ul|ol|li|body|head|title|link)\\b|thuoc tinh|bieu mau|sieu lien ket'), R('mobirise')] },
  { id: 'it_csdl', subject: 'it', label: 'Cơ sở dữ liệu',
    triggers: [R('co so du lieu|\\bcsdl\\b|\\bsql\\b|he quan tri')],
    keywords: [R('co so du lieu|\\bcsdl\\b'), R('\\bsql\\b|truy van|select'), R('khoa chinh|khoa ngoai|ban ghi'), R('he quan tri')] },
  { id: 'it_lap_trinh', subject: 'it', label: 'Lập trình',
    triggers: [R('lap trinh|python|thuat toan|cau truc lap|cau truc re nhanh|kieu du lieu')],
    keywords: [R('python|lap trinh'), R('\\bprint\\b|\\binput\\b|\\brange\\b|\\bdef\\b'), R('\\bfor\\b|\\bwhile\\b|\\bif\\b|cau truc lap|re nhanh'), R('kieu du lieu|danh sach|xau ki tu|phep gan'), R('thuat toan|chuong trinh')] },
  { id: 'it_huong_nghiep', subject: 'it', label: 'Hướng nghiệp với Tin học',
    triggers: [R('huong nghiep|nghe nghiep|nhom nghe|dich vu va quan tri')],
    keywords: [R('nghe nghiep|nhom nghe|nganh nghe'), R('ky su|chuyen vien|lap trinh vien|quan tri'), R('tuyen dung|viec lam|nhu cau nhan luc')] },
  { id: 'it_thong_tin', subject: 'it', label: 'Thông tin và xử lí thông tin',
    triggers: [R('thong tin va xu li|xu li thong tin|xu ly thong tin|du lieu va thong tin')],
    keywords: [R('xu li thong tin|xu ly thong tin'), R('du lieu va thong tin|thong tin va du lieu'), R('don vi (do )?(luu tru )?thong tin|\\bbit\\b|\\bbyte\\b|\\bkb\\b|\\bmb\\b|\\bgb\\b'), R('ma hoa thong tin|so hoa')] },
  { id: 'it_thiet_bi_thong_minh', subject: 'it', label: 'Thiết bị thông minh và vai trò của Tin học',
    triggers: [R('thiet bi thong minh|vai tro cua (thiet bi thong minh|tin hoc)')],
    keywords: [R('thiet bi thong minh|dong ho thong minh|dien thoai thong minh|smart'), R('\\biot\\b|internet van vat'), R('cach mang cong nghiep|xa hoi tri thuc')] },
  { id: 'it_mang_may_tinh', subject: 'it', label: 'Mạng máy tính và Internet',
    triggers: [R('mang may tinh|internet|dien toan dam may')],
    keywords: [R('mang may tinh'), R('internet'), R('dien toan dam may|cloud|\\biot\\b'), R('mang_lan|mang_wan')] },
  { id: 'it_tai_nguyen_internet', subject: 'it', label: 'Khai thác tài nguyên trên Internet',
    triggers: [R('khai thac tai nguyen|tim kiem thong tin|thu dien tu')],
    keywords: [R('tim kiem|may tim kiem|tu khoa'), R('email|thu dien tu'), R('tai nguyen|website|trinh duyet')] }
];

const SUBJECT_ALIASES = [
  { family: 'math', re: /toan/ },
  { family: 'phys', re: /vat li|vat ly|\bli\b|\bly\b/ },
  { family: 'chem', re: /hoa hoc|\bhoa\b/ },
  { family: 'eng', re: /tieng anh|\banh\b|english/ },
  { family: 'it', re: /tin hoc|\btin\b|cong nghe thong tin|khoa hoc may tinh/ }
];

function detectSubjectFamily(subject = '') {
  const s = normalizeText(subject);
  if (!s) return null;
  const found = SUBJECT_ALIASES.find(a => a.re.test(s));
  return found ? found.family : null;
}

const STOPWORDS = new Set([
  'bai', 'chuong', 'chu', 'de', 'phan', 'muc', 'tiet', 'va', 'cua', 'trong', 'cac', 'mot', 'so', 'cho', 'la', 'co',
  'nhung', 'khi', 'theo', 've', 'voi', 'tren', 'duoi', 'cach', 'su', 'viec', 'nay', 'do', 'den', 'tu', 'thi', 'ma',
  'duoc', 'nao', 'sau', 'day', 'gi', 'hay', 'hoac', 'the', 'and', 'of', 'the', 'with', 'for', 'to', 'in', 'on', 'a', 'an'
]);

function contentTokens(normText) {
  return normText
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w) && !/^[ivxlc]+$/.test(w));
}

/**
 * Lấy văn bản đầy đủ của một câu hỏi (thân câu + phương án + các ý Đúng/Sai + tiêu đề chuyên đề trong ngân hàng)
 */
function getQuestionText(q = {}) {
  const parts = [q.stem || q.prompt || ''];
  if (Array.isArray(q.options)) parts.push(...q.options);
  const stmts = q.statements || q.items || q.subItems || [];
  if (Array.isArray(stmts)) parts.push(...stmts.map(s => (s && s.text) || ''));
  if (q.topicTitle) parts.push(q.topicTitle);
  return parts.filter(Boolean).join(' \n ');
}

function countHits(topic, normText) {
  let hits = 0;
  for (const re of topic.keywords) {
    if (re.test(normText)) hits++;
  }
  return hits;
}

/**
 * Xác định các chủ đề chuẩn của một dòng Ma trận (kết hợp cả Đơn vị kiến thức và Tên Chủ đề/Chương)
 */
const rowTopicCache = new Map();
function resolveRowTopics(row = {}, metadata = {}) {
  const unitText = normalizeText(row.unit || row.noi_dung || '');
  const topicText = normalizeText(row.topic || row.chu_de || '');
  const family = detectSubjectFamily(metadata.subject || '');
  const cacheKey = `${family}|${unitText}|${topicText}`;
  if (rowTopicCache.has(cacheKey)) return rowTopicCache.get(cacheKey);

  const pool = family ? TOPIC_LEXICON.filter(t => t.subject === family) : TOPIC_LEXICON;
  const unitMatched = pool.filter(t => t.triggers.some(re => re.test(unitText)));
  const topicMatched = pool.filter(t => t.triggers.some(re => re.test(topicText)));

  // Tập hợp các chủ đề được phép cho dòng này (cả bài học cụ thể lẫn chương/chủ đề lớn)
  const allowed = Array.from(new Set([...unitMatched, ...topicMatched]));
  const primary = unitMatched.length > 0 ? unitMatched : topicMatched;
  const competitors = family
    ? TOPIC_LEXICON.filter(t => t.subject === family && !allowed.includes(t))
    : [];

  const result = {
    family,
    unitText,
    topicText,
    primary,
    allowed,
    topics: allowed,
    competitors
  };
  rowTopicCache.set(cacheKey, result);
  return result;
}

/**
 * Đánh giá độ bám nội dung của 1 câu hỏi so với 1 dòng Ma trận.
 * @param {object} question  Câu hỏi (stem/prompt, options, statements/items, topicTitle)
 * @param {object} row       Dòng ma trận { topic, unit }
 * @param {object} metadata  { subject }
 * @param {object} opts      { fromTargetFile: boolean } — câu hỏi lấy từ đúng file chuyên đề được chỉ định cho dòng này
 */
function evaluateAlignment(question, row, metadata = {}, opts = {}) {
  const info = resolveRowTopics(row, metadata);
  const normQ = normalizeText(getQuestionText(question));

  if (!normQ) {
    return { aligned: false, method: 'empty', score: 0, reason: 'Câu hỏi chưa có nội dung.' };
  }

  // Phát hiện câu hỏi mẫu template giả
  if (/dap ung chuan xac yeu cau can dat cua|sai lech dieu kien ap dung co ban cua|nham lan khai niem thuoc chu de khac ngoai pham vi|thieu dieu kien xac dinh cua bai toan trong|trong mo hinh thuc hanh cua chu de|tinh gia tri tich cua hai dai luong|tri tue nhan tao.*(gia tri chuan|he so ti le)|khai niem va tinh chat co ban cua.*bi ap dung sai dieu kien/i.test(normQ)) {
    return {
      aligned: false,
      method: 'template_detected',
      score: -100,
      targetScore: 0,
      competitorScore: 0,
      matchedTopic: null,
      competingTopic: null,
      expectedTopics: info.topics.map(t => t.label),
      reason: 'Câu hỏi dạng khuôn mẫu tổng hợp (template rỗng nội dung chuyên môn), chưa phải câu hỏi kiểm tra thực tế.'
    };
  }

  if (info.topics.length > 0) {
    let targetScore = 0;
    let targetTopic = null;
    for (const t of info.topics) {
      const h = countHits(t, normQ);
      if (h > targetScore) { targetScore = h; targetTopic = t; }
    }
    let competitorScore = 0;
    let competitorTopic = null;
    for (const t of info.competitors) {
      const h = countHits(t, normQ);
      if (h > competitorScore) { competitorScore = h; competitorTopic = t; }
    }

    let aligned = false;
    let reason = '';
    const isSiblingNetworking = Boolean(targetTopic && competitorTopic &&
      ['it_thiet_bi_mang', 'it_giao_thuc', 'it_chia_se', 'it_mang_may_tinh'].includes(targetTopic.id) &&
      ['it_thiet_bi_mang', 'it_giao_thuc', 'it_chia_se', 'it_mang_may_tinh'].includes(competitorTopic.id));

    if (targetScore > 0 && (targetScore >= competitorScore || (isSiblingNetworking && targetScore >= competitorScore - 1) || opts.fromTargetFile)) {
      aligned = true;
      reason = `Khớp chủ đề "${targetTopic.label}".`;
    } else if (targetScore === 0 && competitorScore === 0 && opts.fromTargetFile) {
      aligned = true;
      reason = 'Thuộc đúng file chuyên đề được chỉ định cho dòng Ma trận này.';
    } else if (competitorScore > targetScore) {
      reason = `Nội dung thuộc chủ đề "${competitorTopic.label}", không thuộc đơn vị kiến thức "${row.unit || row.topic || ''}".`;
    } else {
      reason = `Không tìm thấy dấu hiệu chuyên môn của "${info.topics.map(t => t.label).join(' / ')}" trong câu hỏi.`;
    }

    return {
      aligned,
      method: 'lexicon',
      score: targetScore * 10 - competitorScore * 4 + (opts.fromTargetFile ? 5 : 0),
      targetScore,
      competitorScore,
      matchedTopic: targetTopic ? targetTopic.label : null,
      competingTopic: competitorTopic && competitorScore > targetScore ? competitorTopic.label : null,
      expectedTopics: info.topics.map(t => t.label),
      reason
    };
  }

  // Phương pháp generic: so khớp cụm 2 từ và từ khóa nội dung của Đơn vị kiến thức
  const unitTokens = contentTokens(info.unitText || info.topicText);
  const qTokensSet = new Set(contentTokens(normQ));
  const bigrams = [];
  for (let i = 0; i < unitTokens.length - 1; i++) bigrams.push(`${unitTokens[i]} ${unitTokens[i + 1]}`);
  const qTokenStr = ` ${contentTokens(normQ).join(' ')} `;
  const bigramHits = bigrams.filter(b => qTokenStr.includes(` ${b} `)).length;
  const uniqueUnitTokens = Array.from(new Set(unitTokens.filter(w => w.length >= 3)));
  const unigramHits = uniqueUnitTokens.filter(w => qTokensSet.has(w)).length;
  const aligned = bigramHits >= 1 || unigramHits >= Math.min(2, uniqueUnitTokens.length || 2) || (opts.fromTargetFile === true);

  return {
    aligned,
    method: 'generic',
    score: bigramHits * 6 + unigramHits * 2 + (opts.fromTargetFile ? 5 : 0),
    targetScore: bigramHits + unigramHits,
    competitorScore: 0,
    matchedTopic: null,
    competingTopic: null,
    expectedTopics: [row.unit || row.topic || ''],
    reason: aligned
      ? 'Câu hỏi chứa cụm từ trọng tâm của đơn vị kiến thức (đối chiếu tự động mức cơ bản — giáo viên nên rà soát).'
      : `Câu hỏi không chứa cụm từ trọng tâm nào của đơn vị kiến thức "${row.unit || row.topic || ''}".`
  };
}

/**
 * Đánh giá độ bám nội dung so với NHIỀU dòng Ma trận (câu Đúng/Sai ghép nhiều bài): phải khớp TẤT CẢ các dòng.
 */
function evaluateAlignmentMultiRow(question, rows = [], metadata = {}, opts = {}) {
  const list = (rows || []).filter(Boolean);
  if (list.length <= 1) return evaluateAlignment(question, list[0] || {}, metadata, opts);

  const stmts = question.statements || question.items || [];
  const perRow = list.map((row, rIdx) => {
    // Ưu tiên kiểm tra theo các ý được phân cho dòng này (nếu biết), nếu không thì toàn bộ câu hỏi
    const letters = Array.isArray(row.__letters) ? row.__letters : null;
    let subject = question;
    if (letters && Array.isArray(stmts) && stmts.length >= 4) {
      const idxs = letters.map(l => ['a', 'b', 'c', 'd'].indexOf(l)).filter(i => i >= 0);
      subject = {
        stem: question.stem || question.prompt,
        statements: idxs.map(i => stmts[i]).filter(Boolean),
        topicTitle: question.topicTitle
      };
      const partial = evaluateAlignment(subject, row, metadata, opts);
      if (partial.aligned) return partial;
    }
    return evaluateAlignment(question, row, metadata, opts);
  });

  const failed = perRow.find(r => !r.aligned);
  return {
    aligned: !failed,
    method: perRow.some(r => r.method === 'generic') ? 'generic' : 'lexicon',
    score: Math.min(...perRow.map(r => r.score)),
    perRow,
    matchedTopic: perRow.map(r => r.matchedTopic).filter(Boolean).join(' & ') || null,
    competingTopic: failed ? failed.competingTopic : null,
    expectedTopics: perRow.flatMap(r => r.expectedTopics || []),
    reason: failed ? failed.reason : 'Khớp tất cả các đơn vị kiến thức tham gia câu hỏi.'
  };
}

/**
 * Chuyển kết quả đánh giá thành đối tượng gọn để lưu kèm câu hỏi và hiển thị trên giao diện
 */
function summarizeAlignment(res) {
  if (!res) return null;
  return {
    aligned: Boolean(res.aligned),
    method: res.method,
    score: res.score,
    matchedTopic: res.matchedTopic || null,
    competingTopic: res.competingTopic || null,
    reason: res.reason || ''
  };
}

module.exports = {
  TOPIC_LEXICON,
  normalizeText,
  detectSubjectFamily,
  getQuestionText,
  resolveRowTopics,
  evaluateAlignment,
  evaluateAlignmentMultiRow,
  summarizeAlignment
};
