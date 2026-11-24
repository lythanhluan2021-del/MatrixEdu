/**
 * server.js
 * Máy chủ ứng dụng "AI RA ĐỀ KIỂM TRA TỰ ĐỘNG"
 * Cung cấp giao diện WebApp (index.html) và các REST API xử lý tài liệu, AI, Kiểm định QA, Lưu trữ & Xuất Word (.docx).
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const { generateExamDocx, createMaterialDocx } = require('./src/zip-docx');
const { parseManualExamDocx, buildLosslessShuffledDocx } = require('./src/docx-exam-importer');
const {
  DEFAULT_CLASS_ROSTER,
  getActiveRoster,
  saveActiveRoster,
  listClassRostersSummary,
  saveClassRoster,
  setActiveRosterClass,
  deleteClassRoster,
  clearAllRosters,
  getAuditLogs,
  logAuditRecord,
  gradeSinglePaper,
  generateSampleBatchPapers,
  gradeBatchPapers,
  calculateBatchStatistics,
  updatePaperAndAudit,
  saveGradingSessionSnapshot,
  syncSessionPapers,
  listSavedOmrSessions,
  loadSavedOmrSession,
  deleteSavedOmrSession,
  aggregateGradeReportByExam,
  exportRosterToCsv,
  exportMultiClassGradeCsv,
  exportAuditLogsToCsv,
  exportOmrDatabaseLocalBackup,
  // GĐ2 (P0-09): chấm lại phía máy chủ — khóa đáp án + biểu điểm chuẩn.
  SERVER_POINT_RULES,
  buildStrictAnswerKeysFromExam,
  saveExternalAnswerKeys,
  loadExternalAnswerKeys,
  loadLatestExternalAnswerKeys
} = require('./src/omr-engine');
const {
  OMR_TEMPLATES,
  getAllTemplates,
  getTemplateById,
  saveCustomTemplate,
  deleteCustomTemplate,
  resolveTemplateImagePath
} = require('./src/omr-templates');
const { extractDocumentContent, PDF_UNREADABLE_MESSAGE } = require('./src/doc-parser');
// GĐ3 (P1-08, QĐ4): lưu trữ bền + chặn ghi ở chế độ giới thiệu (Vercel).
const {
  DEMO_MODE_MESSAGE,
  DemoModeError,
  isDemoMode,
  atomicWriteJson,
  atomicWriteFile,
  ensureDir
} = require('./src/storage');
const auth = require('./src/auth'); // GĐ1 (P0-05, QĐ3): đăng nhập quản trị + rate-limit
const { computeMatrixStatistics, validateExamProfile, generateShuffledVariants } = require('./src/qa-validator');
const { SAMPLE_DOCUMENTS } = require('./src/sample-materials');
const { loadDriveQuestionBank, syncGoogleDriveFolder, getDriveBankStatus } = require('./src/drive-bank');
const {
  loadAiConfig,
  step1AnalyzeMaterial,
  step2GenerateMatrix,
  step3GenerateSpecification,
  step4GenerateQuestionsAndAnswers,
  getCandidateQuestionsForSwap,
  regenerateSingleQuestion
} = require('./src/ai-engine');

const PORT = Number(process.env.PORT) || 3000;
const BUNDLED_DATA_DIR = path.join(__dirname, 'data');
const BUNDLED_PROFILES_DIR = path.join(BUNDLED_DATA_DIR, 'profiles');
const SAMPLE_DOCS_DIR = path.join(BUNDLED_DATA_DIR, 'sample_docs');

function resolveWritableRoot() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), 'matrixedu_data');
  }
  try {
    fs.accessSync(BUNDLED_DATA_DIR, fs.constants.W_OK);
    return BUNDLED_DATA_DIR;
  } catch (_) {
    return path.join(os.tmpdir(), 'matrixedu_data');
  }
}

const DATA_DIR = resolveWritableRoot();
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
const DELETED_PROFILES_FILE = path.join(DATA_DIR, 'deleted_profiles.json');

function readDeletedProfileIds() {
  try {
    if (fs.existsSync(DELETED_PROFILES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DELETED_PROFILES_FILE, 'utf8'));
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
    }
  } catch (_) {}
  return new Set();
}

function writeDeletedProfileIds(idSet) {
  // GĐ3 (P1-08): ghi nguyên tử; lỗi ghi lộ ra cho route xử lý.
  atomicWriteJson(DELETED_PROFILES_FILE, Array.from(idSet));
}

// GĐ3 (P1-10): chuẩn hóa tên file xuất Word — chỉ giữ chữ, số, dấu gạch
// (giữ dấu tiếng Việt), mọi ký tự khác (kể cả "/", "\", "..") thành "_";
// đồng thời kiểm tra đường dẫn cuối cùng vẫn nằm trong thư mục exports.
function sanitizeExportFileName(name) {
  const cleaned = String(name || '')
    .replace(/[^\p{L}\p{N}_.\-]+/gu, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    .slice(0, 120);
  return cleaned || 'DeKiemTra';
}

function resolveExportPath(fileName) {
  const safeName = sanitizeExportFileName(fileName);
  const resolved = path.resolve(EXPORTS_DIR, safeName);
  const root = path.resolve(EXPORTS_DIR) + path.sep;
  if (!resolved.startsWith(root)) {
    throw new Error(`Tên file không hợp lệ: "${fileName}"`);
  }
  return resolved;
}

// Khởi tạo thư mục dữ liệu cần thiết (an toàn trên Read-Only Serverless như Vercel)
// GĐ3 (P1-10): tạo cả EXPORTS_DIR ngay khi khởi động.
for (const dir of [DATA_DIR, PROFILES_DIR, EXPORTS_DIR]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_) {}
}

// Khởi tạo sẵn các file tài liệu .docx thực tế (nếu ổ đĩa cho phép ghi)
function ensureSampleDocxFiles() {
  if (process.env.VERCEL) return;
  try {
    if (!fs.existsSync(SAMPLE_DOCS_DIR)) {
      fs.mkdirSync(SAMPLE_DOCS_DIR, { recursive: true });
    }
    for (const [key, doc] of Object.entries(SAMPLE_DOCUMENTS)) {
      const filePath = path.join(SAMPLE_DOCS_DIR, doc.name);
      if (!fs.existsSync(filePath)) {
        const buf = createMaterialDocx(doc.title, doc.paragraphs || []);
        fs.writeFileSync(filePath, buf);
      }
    }
  } catch (_) {}
}
ensureSampleDocxFiles();

// GĐ1 (P0-05): tiêu đề bảo mật áp cho mọi phản hồi JSON/HTML.
// GĐ4 (P0-10) rà soát lại CSP sau các lần viết lại giao diện:
//  - GIỮ 'unsafe-inline' ở script-src/style-src: index.html là ứng dụng một
//    file với ~150 onclick nội tuyến + <script>/<style> nội tuyến; bỏ nó
//    đồng nghĩa viết lại toàn bộ giao diện sang JS ngoài + addEventListener
//    (việc lớn, ngoài phạm vi GĐ4). XSS lúc này chặn bằng escapeHtml ở
//    từng điểm chèn + CSP làm lớp thứ hai. Không thêm <meta CSP> trùng lặp:
//    server đã gửi header này cho mọi phản hồi (sendJson và GET /).
//  - THÊM form-action 'self': không form nào gửi dữ liệu ra ngoài.
//  - THÊM font-src 'self' data:: không tải font ngoài (không có Google
//    Fonts/CDN trong index.html — đã kiểm tra bằng grep).
//  - THÊM frame-src 'none': ứng dụng không nhúng iframe nào.
//  - GIỮ object-src 'none', base-uri 'self', frame-ancestors 'self' (có từ
//    GĐ1), img-src 'self' data: blob: (ảnh canvas/upload), connect-src
//    'self' (client chỉ fetch cùng origin; đồng bộ Drive chạy phía server).
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; frame-src 'none'; form-action 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS
  });
  res.end(body);
}

// GĐ4 (P2-05): escape phía server cho trang 404 — pathname do người dùng
// gõ trên thanh địa chỉ nên phải escape trước khi in ra HTML.
function escapeHtmlServer(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GĐ1 (P0-05, P0-09): chặn API khi chưa đăng nhập quản trị.
function requireAuth(req, res) {
  const st = auth.getAuthState(req);
  if (!st.authenticated) {
    sendJson(res, 401, { ok: false, message: 'Yêu cầu đăng nhập quản trị.' });
    return false;
  }
  return true;
}

// GĐ1 (P0-05): giới hạn gọi AI — 60 lần/giờ/IP.
function requireAiRateLimit(req, res) {
  const ip = auth.getClientIp(req);
  const r = auth.checkRateLimit(`ai:${ip}`, 60, 60 * 60 * 1000);
  if (!r.allowed) {
    sendJson(res, 429, { ok: false, message: `Đã vượt giới hạn gọi AI (60 lần/giờ). Thử lại sau ${r.retryAfterSec} giây.` });
    return false;
  }
  return true;
}

// GĐ1 (P0-08): lược bỏ mọi trường đáp án khỏi câu hỏi ngân hàng.
// GĐ3 bổ sung: lược cả `explanation` — trường này chứa câu "Đáp án đúng
// là X ..." nên vẫn lộ đáp án dù các trường đáp án trực tiếp đã bị lược.
function stripBankAnswers(q) {
  if (!q || typeof q !== 'object') return q;
  const out = { ...q };
  delete out.correctAnswer;
  delete out.answer;
  delete out.explanation;
  if (Array.isArray(out.items)) {
    out.items = out.items.map(it => {
      const c = { ...it };
      delete c.isCorrect;
      delete c.correctAnswer;
      delete c.answer;
      delete c.explanation;
      return c;
    });
  }
  if (Array.isArray(out.statements)) {
    out.statements = out.statements.map(it => {
      const c = { ...it };
      delete c.isCorrect;
      delete c.correctAnswer;
      delete c.answer;
      delete c.explanation;
      return c;
    });
  }
  if (Array.isArray(out.options)) out.options = [...out.options];
  return out;
}

function readRequestBody(req, maxBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Dữ liệu tải lên vượt quá giới hạn 25MB.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function resolveRequestPathname(req, parsedUrl) {
  if (req.query) {
    if (req.query.slug) {
      const s = Array.isArray(req.query.slug) ? req.query.slug.join('/') : String(req.query.slug);
      if (s.startsWith('favicon') || s.startsWith('apple-touch-icon')) {
        return `/${s.replace(/^\/+/, '')}`;
      }
      return `/api/${s.replace(/^\/+/, '')}`;
    }
    if (req.query.__pathname) {
      const p = Array.isArray(req.query.__pathname) ? req.query.__pathname.join('/') : String(req.query.__pathname);
      if (!p.includes(':path') && !p.includes(':slug')) {
        return p.startsWith('/') ? p : `/${p}`;
      }
    }
  }
  const qp = parsedUrl.searchParams.get('__pathname') || parsedUrl.searchParams.get('slug');
  if (qp && !qp.includes(':path') && !qp.includes(':slug') && !qp.includes('$1')) {
    if (parsedUrl.searchParams.has('slug') && !qp.startsWith('/api/')) {
      return `/api/${qp.replace(/^\/+/, '')}`;
    }
    return qp.startsWith('/') ? qp : `/${qp}`;
  }
  const routeMatches = req.headers['x-now-route-matches'];
  if (routeMatches) {
    const matchParams = new URLSearchParams(String(routeMatches));
    const p = matchParams.get('slug') || matchParams.get('path') || matchParams.get('1') || '';
    if (p) {
      return `/api/${p.replace(/^\/+/, '')}`;
    }
  }
  return parsedUrl.pathname;
}

const requestHandler = async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = resolveRequestPathname(req, parsedUrl);

    // 1. Phục vụ trang chủ index.html & Bộ Favicon MatrixEdu (ICO, PNG, SVG)
    if ((req.method === 'GET' || req.method === 'HEAD') && (
      pathname === '/favicon.ico' ||
      pathname.startsWith('/favicon') ||
      pathname === '/apple-touch-icon.png' ||
      pathname === '/api/favicon.ico' ||
      pathname.startsWith('/api/favicon') ||
      pathname === '/api/apple-touch-icon.png'
    )) {
      const fileName = path.basename(pathname);
      const filePath = path.join(__dirname, fileName);
      if (fs.existsSync(filePath)) {
        let contentType = 'image/png';
        if (fileName.endsWith('.ico')) contentType = 'image/x-icon';
        else if (fileName.endsWith('.svg')) contentType = 'image/svg+xml';
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stat.size,
          'Cache-Control': 'public, max-age=86400'
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const htmlPath = path.join(__dirname, 'index.html');
      if (!fs.existsSync(htmlPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Chưa tìm thấy file index.html');
        return;
      }
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
      res.end(html);
      return;
    }

    // 2. API Kiểm tra trạng thái & Cấu hình AI (Không lộ khóa bí mật)
    if (req.method === 'GET' && pathname === '/api/health') {
      const cfg = loadAiConfig();
      // GĐ1 (P0-06): chỉ trả "đã cấu hình: có/không", KHÔNG trả ký tự nào của khóa.
      // GĐ3 (P1-08, QĐ4): báo rõ chế độ giới thiệu để giao diện hiển thị
      // "bản giới thiệu — dữ liệu không được lưu" thay vì hứa hẹn lưu trữ.
      sendJson(res, 200, {
        ok: true,
        app: 'AI RA ĐỀ KIỂM TRA TỰ ĐỘNG',
        demoMode: isDemoMode(),
        demoNotice: isDemoMode() ? DEMO_MODE_MESSAGE : undefined,
        aiConfig: {
          provider: cfg.provider,
          model: cfg.model,
          hasKey: cfg.hasKey
        }
      });
      return;
    }

    // 2b. API Đăng nhập quản trị (GĐ1, P0-05, QĐ3) — mật khẩu băm scrypt,
    // phiên cookie httpOnly. Chỉ dùng khi chưa có mật khẩu (setup) hoặc đã có.
    if (req.method === 'GET' && pathname === '/api/auth/status') {
      const st = auth.getAuthState(req);
      sendJson(res, 200, { ok: true, setup: st.setup, authenticated: st.authenticated });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/setup') {
      if (auth.isSetup()) {
        sendJson(res, 403, { ok: false, message: 'Mật khẩu quản trị đã được đặt. Dùng chức năng đổi mật khẩu sau khi đăng nhập.' });
        return;
      }
      const ip = auth.getClientIp(req);
      const rl = auth.checkRateLimit(`setup:${ip}`, 5, 15 * 60 * 1000);
      if (!rl.allowed) {
        sendJson(res, 429, { ok: false, message: 'Thử lại sau ít phút.' });
        return;
      }
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      try {
        auth.setupAdminPassword(String(body.password || ''));
      } catch (err) {
        sendJson(res, 400, { ok: false, message: err.message });
        return;
      }
      const token = auth.createSession();
      auth.setSessionCookie(res, token);
      sendJson(res, 200, { ok: true, message: 'Đã đặt mật khẩu quản trị và đăng nhập.' });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      if (!auth.isSetup()) {
        sendJson(res, 400, { ok: false, setupRequired: true, message: 'Chưa đặt mật khẩu quản trị. Hãy đặt mật khẩu ở lần chạy đầu tiên.' });
        return;
      }
      const ip = auth.getClientIp(req);
      const rl = auth.checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
      if (!rl.allowed) {
        sendJson(res, 429, { ok: false, message: `Đăng nhập sai quá nhiều lần. Thử lại sau ${rl.retryAfterSec} giây.` });
        return;
      }
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      if (!auth.verifyAdminPassword(String(body.password || ''))) {
        sendJson(res, 401, { ok: false, message: 'Mật khẩu không đúng.' });
        return;
      }
      auth.resetRateLimit(`login:${ip}`);
      const token = auth.createSession();
      auth.setSessionCookie(res, token);
      sendJson(res, 200, { ok: true, message: 'Đăng nhập thành công.' });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      auth.destroySession(auth.parseSessionToken(req));
      auth.clearSessionCookie(res);
      sendJson(res, 200, { ok: true, message: 'Đã đăng xuất.' });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/change-password') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      if (!auth.verifyAdminPassword(String(body.currentPassword || ''))) {
        sendJson(res, 401, { ok: false, message: 'Mật khẩu hiện tại không đúng.' });
        return;
      }
      try {
        auth.setupAdminPassword(String(body.newPassword || ''));
      } catch (err) {
        sendJson(res, 400, { ok: false, message: err.message });
        return;
      }
      sendJson(res, 200, { ok: true, message: 'Đã đổi mật khẩu quản trị. Hãy đăng nhập lại.' });
      return;
    }

    // 3. API Danh sách Tài liệu KHGD / Đề kiểm thử mẫu thực tế (.docx)
    if (req.method === 'GET' && pathname === '/api/presets') {
      const list = Object.values(SAMPLE_DOCUMENTS).map(d => ({
        id: d.id,
        name: d.name,
        title: d.title,
        metadata: d.metadata,
        rawText: (d.paragraphs || []).join('\n'),
        readingPassage: d.readingPassage || '',
        listeningTranscript: d.listeningTranscript || ''
      }));
      sendJson(res, 200, { ok: true, presets: list });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/presets/') && pathname.endsWith('/docx')) {
      const parts = pathname.split('/');
      const presetId = parts[3];
      const doc = SAMPLE_DOCUMENTS[presetId];
      if (!doc) {
        sendJson(res, 404, { ok: false, message: 'Không tìm thấy tài liệu mẫu.' });
        return;
      }
      const filePath = path.join(SAMPLE_DOCS_DIR, doc.name);
      const buf = fs.existsSync(filePath)
        ? fs.readFileSync(filePath)
        : createMaterialDocx(doc.title, doc.paragraphs || []);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`
      });
      res.end(buf);
      return;
    }

    // 3b. API Danh sách các file .docx có sẵn ngay trong thư mục gốc dự án (ví dụ: "TIN 12 - MA TRAN KTGK 1.docx")
    // GĐ4 (P2-05): khóa bằng requireAuth — thư mục gốc trên máy localhost có
    // thể chứa đề thi thật của giáo viên; chỉ liệt kê tên file thôi cũng lộ
    // thông tin. Client mở modal đăng nhập khi gặp 401 (loadWorkspaceDocxFile).
    if (req.method === 'GET' && pathname === '/api/workspace-files') {
      if (!requireAuth(req, res)) return;
      const rootFiles = fs.readdirSync(__dirname)
        .filter(f => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$') && f.toLowerCase() !== 'prompt.docx');
      sendJson(res, 200, { ok: true, files: rootFiles });
      return;
    }

    // GĐ4 (P2-05): khóa bằng requireAuth — đọc toàn văn file .docx trong thư
    // mục dự án (có thể là đề thi thật). basename vẫn chặn path traversal.
    if (req.method === 'POST' && pathname === '/api/load-workspace-file') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const safeName = path.basename(String(body.fileName || ''));
      const fullPath = path.join(__dirname, safeName);
      if (!fs.existsSync(fullPath)) {
        sendJson(res, 404, { ok: false, message: `Không tìm thấy file "${safeName}" trong thư mục dự án.` });
        return;
      }
      const fileBuffer = fs.readFileSync(fullPath);
      const extracted = extractDocumentContent(safeName, fileBuffer, '');
      // GĐ3 (P1-06): PDF quét/không trích được chữ bị từ chối ngay ở bước 1.
      if (extracted.fileType === 'pdf' && extracted.pdfUnreadable) {
        sendJson(res, 400, {
          ok: false,
          errorCode: 'PDF_UNREADABLE',
          message: PDF_UNREADABLE_MESSAGE,
          detail: extracted.unreadableReason || ''
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        fileName: extracted.fileName,
        fileType: extracted.fileType,
        text: extracted.text,
        paragraphsCount: (extracted.paragraphs || []).length,
        tablesCount: (extracted.tables || []).length,
        tables: extracted.tables || [],
        detectedMatrix: extracted.detectedMatrix || null,
        detectedSpec: extracted.detectedSpec || null,
        detectedUnits: extracted.detectedUnits || null,
        detectedMetadata: extracted.detectedMetadata || null
      });
      return;
    }

    // 3c. API Quản lý & Xem Ngân hàng câu hỏi Google Drive (Bóc tách câu hỏi, Zero Hallucination)
    if (req.method === 'GET' && pathname === '/api/drive-bank/status') {
      const statusData = getDriveBankStatus();
      sendJson(res, 200, statusData);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/drive-bank/questions') {
      const bank = loadDriveQuestionBank();
      const type = parsedUrl.searchParams.get('type') || 'all';
      const file = parsedUrl.searchParams.get('file') || '';
      // GĐ4 (P2-01): trần 500 → 2000 câu để modal ngân hàng tải đủ số câu
      // thật (ngân hàng hiện ~162 câu; 2000 là giới hạn an toàn cho phản hồi).
      const limit = Math.min(2000, Math.max(1, parseInt(parsedUrl.searchParams.get('limit') || '200', 10)));
      
      let list = [];
      if (type === 'mcq') list = bank.mcqQuestions;
      else if (type === 'tf') list = bank.tfQuestions;
      else if (type === 'sa') list = bank.saQuestions;
      else list = [...bank.mcqQuestions, ...bank.tfQuestions, ...bank.saQuestions];

      if (file) {
        list = list.filter(q => q.sourceFile === file);
      }

      // GĐ1 (P0-08): mặc định lược bỏ đáp án; chỉ trả đáp án khi đã đăng nhập
      // và có tham số yêu cầu tường minh ?includeAnswers=1.
      const authed = auth.getAuthState(req).authenticated;
      const wantAnswers = parsedUrl.searchParams.get('includeAnswers') === '1';
      const out = list.slice(0, limit).map(q => (authed && wantAnswers) ? q : stripBankAnswers(q));
      sendJson(res, 200, {
        ok: true,
        total: list.length,
        questions: out
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/drive-bank/sync') {
      if (!requireAuth(req, res)) return;
      let bodyData = {};
      try {
        const raw = await readRequestBody(req);
        if (raw) bodyData = JSON.parse(raw);
      } catch (_) {}

      const folderUrl = (bodyData.folderUrl || '').trim();
      try {
        const result = await syncGoogleDriveFolder(folderUrl);
        // GĐ3 (P1-09): thất bại trả về thất bại (kèm nguyên nhân), không
        // ngụy trang thành thành công.
        sendJson(res, result.ok ? 200 : 502, result);
      } catch (err) {
        console.error('[POST /api/drive-bank/sync] Error:', err.message);
        if (err instanceof DemoModeError) {
          sendJson(res, 503, { ok: false, errorCode: 'DEMO_MODE_READONLY', message: err.message });
          return;
        }
        sendJson(res, 400, { ok: false, message: 'Lỗi đồng bộ thư mục Google Drive: ' + err.message });
      }
      return;
    }

    // 4. API Tải lên và bóc tách tài liệu (.docx, .pdf, .txt, .md, hình ảnh)
    // GĐ4 (P2-05): khóa bằng requireAuth — tuy không ghi dữ liệu, tuyến này
    // cho phép bất kỳ ai dùng máy chủ làm dịch vụ bóc tách tài liệu miễn phí
    // (tốn CPU/băng thông) và đọc được nội dung ma trận/đề thi tải lên.
    // Client mở modal đăng nhập khi gặp 401 (handleFileUpload).
    if (req.method === 'POST' && pathname === '/api/upload-doc') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const fileName = body.fileName || 'tailieu.txt';
      const mimeType = body.mimeType || '';
      const fileBuffer = Buffer.from(body.base64Data || '', 'base64');

      if (fileBuffer.length === 0) {
        sendJson(res, 400, { ok: false, message: 'Tệp tải lên rỗng hoặc không hợp lệ.' });
        return;
      }

      const extracted = extractDocumentContent(fileName, fileBuffer, mimeType);
      // GĐ3 (P1-06): PDF quét/không trích được chữ bị từ chối NGAY ở bước 1
      // với đúng nguyên nhân — không trả chữ giữ chỗ như tài liệu thật.
      if (extracted.fileType === 'pdf' && extracted.pdfUnreadable) {
        sendJson(res, 400, {
          ok: false,
          errorCode: 'PDF_UNREADABLE',
          message: PDF_UNREADABLE_MESSAGE,
          detail: extracted.unreadableReason || ''
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        fileName: extracted.fileName,
        fileType: extracted.fileType,
        text: extracted.text,
        paragraphsCount: (extracted.paragraphs || []).length,
        tablesCount: (extracted.tables || []).length,
        tables: extracted.tables || [],
        detectedMatrix: extracted.detectedMatrix || null,
        detectedSpec: extracted.detectedSpec || null,
        detectedUnits: extracted.detectedUnits || null,
        detectedMetadata: extracted.detectedMetadata || null
      });
      return;
    }

    // 5. BƯỚC 1: Phân tích tài liệu & phạm vi kiến thức
    if (req.method === 'POST' && pathname === '/api/step1-analyze') {
      if (!requireAuth(req, res)) return;
      if (!requireAiRateLimit(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      // GĐ3 (P1-06): phòng vệ thêm — văn bản bước 1 là chữ giữ chỗ của PDF
      // quét thì từ chối ngay với đúng nguyên nhân.
      const step1Text = String(body.rawText || body.text || '');
      if (step1Text.trim().startsWith('[Tài liệu PDF dạng ảnh quét')) {
        sendJson(res, 400, {
          ok: false,
          errorCode: 'PDF_UNREADABLE',
          message: PDF_UNREADABLE_MESSAGE
        });
        return;
      }
      const result = await step1AnalyzeMaterial(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 6. BƯỚC 2: Lập Ma trận đề kiểm tra
    if (req.method === 'POST' && pathname === '/api/step2-matrix') {
      if (!requireAuth(req, res)) return;
      if (!requireAiRateLimit(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = await step2GenerateMatrix(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 7. BƯỚC 3: Tạo Bản đặc tả đề kiểm tra
    if (req.method === 'POST' && pathname === '/api/step3-spec') {
      if (!requireAuth(req, res)) return;
      if (!requireAiRateLimit(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = step3GenerateSpecification(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 8. BƯỚC 4 & 5: Soạn Đề kiểm tra, Trộn Mã đề & Tạo Đáp án + Kiểm định QA
    if (req.method === 'POST' && pathname === '/api/step4-exam') {
      if (!requireAuth(req, res)) return;
      if (!requireAiRateLimit(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = await step4GenerateQuestionsAndAnswers(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 9. Tạo lại hoặc Đổi nhanh 1 câu hỏi đơn lẻ từ Ngân hàng đề / AI
    if (req.method === 'POST' && pathname === '/api/regenerate-question') {
      if (!requireAuth(req, res)) return;
      if (!requireAiRateLimit(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = await regenerateSingleQuestion(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 9b. Truy xuất danh sách câu hỏi ứng viên từ Ngân hàng đề để đổi/chọn lại câu hỏi ở Bước 4
    if (req.method === 'POST' && pathname === '/api/bank-candidates') {
      if (!requireAuth(req, res)) return;
      if (!requireAiRateLimit(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = getCandidateQuestionsForSwap(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 9c. Nạp đề thi thủ công từ file Word (.docx) — BẢO TOÀN 100% OOXML (Equation, MathType, Hình ảnh, Bảng biểu) để trộn đề
    if (req.method === 'POST' && pathname === '/api/import-manual-exam') {
      if (!requireAuth(req, res)) return;
      try {
        const raw = await readRequestBody(req, 35 * 1024 * 1024);
        const body = JSON.parse(raw.toString('utf8') || '{}');
        const fileName = String(body.fileName || 'de_goc.docx').trim();
        const fileBase64 = String(body.fileBase64 || '').trim();
        if (!fileBase64) {
          sendJson(res, 400, { ok: false, message: 'Chưa nhận được nội dung file Word (.docx).' });
          return;
        }
        if (!fileName.toLowerCase().endsWith('.docx')) {
          sendJson(res, 400, { ok: false, message: 'Chỉ hỗ trợ nạp đề gốc định dạng Word (.docx) để bảo toàn công thức và hình ảnh.' });
          return;
        }

        const buffer = Buffer.from(fileBase64, 'base64');
        const parsed = parseManualExamDocx(buffer, fileName);
        if (!parsed.questions || parsed.questions.length === 0) {
          sendJson(res, 400, {
            ok: false,
            message: 'Không tìm thấy câu hỏi nào (Câu 1., Câu 2., ...) trong file Word. Vui lòng kiểm tra lại định dạng đề gốc!'
          });
          return;
        }

        const rawCodes = body.customCodes;
        const customCodes = Array.isArray(rawCodes)
          ? rawCodes
          : (typeof rawCodes === 'string' ? rawCodes.split(/[,;\s]+/).filter(Boolean) : []);
        const numVariants = Number(body.numVariants) || (customCodes.length > 0 ? customCodes.length : 4);
        const variants = generateShuffledVariants(
          parsed.questions,
          numVariants,
          Number(body.startCode) || 101,
          customCodes,
          {
            keepFirstCodeOrder: body.keepFirstCodeOrder !== false,
            shuffleTfStatements: Boolean(body.shuffleTfStatements)
          }
        );

        sendJson(res, 200, {
          ok: true,
          sourceId: parsed.sourceId,
          fileName: parsed.fileName,
          detectedMetadata: parsed.detectedMetadata,
          questions: parsed.questions,
          variants,
          stats: parsed.stats
        });
      } catch (err) {
        sendJson(res, 500, { ok: false, message: 'Lỗi đọc file đề gốc (.docx): ' + err.message });
      }
      return;
    }

    // 10. Trộn & Nhân bản mã đề (hỗ trợ tùy chọn giữ mã gốc & đảo ý a/b/c/d Phần II)
    if (req.method === 'POST' && pathname === '/api/shuffle-variants') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const rawCodes = body.customCodes;
      const customCodes = Array.isArray(rawCodes) ? rawCodes : (typeof rawCodes === 'string' ? rawCodes.split(/[,;\s]+/).filter(Boolean) : []);
      const variants = generateShuffledVariants(
        body.questions || [],
        body.numVariants || 4,
        body.startCode || 101,
        customCodes,
        {
          keepFirstCodeOrder: Boolean(body.keepFirstCodeOrder),
          shuffleTfStatements: Boolean(body.shuffleTfStatements)
        }
      );
      sendJson(res, 200, { ok: true, variants });
      return;
    }

    // 11. Kiểm định chất lượng 4 chiều (Ma trận - Đặc tả - Đề - Đáp án) & Kiểm tra phép tính độc lập
    if (req.method === 'POST' && pathname === '/api/validate-qa') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const qaReport = validateExamProfile(body);
      sendJson(res, 200, { ok: true, qaReport });
      return;
    }

    // 12. Xuất file Word (.docx) chuẩn khổ A4 — ưu tiên chế độ Lossless OOXML khi đề có nguồn .docx thủ công
    if (req.method === 'POST' && pathname === '/api/export-docx') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const examData = body.examData || body;
      const mode = body.mode || 'full'; // 'full' | 'matrix' | 'spec' | 'exam' | 'answer'
      const variantCode = body.variantCode || null;

      let docxBuffer = null;
      if (examData.ooxmlSourceId && (mode === 'exam' || mode === 'full' || mode === 'answer')) {
        docxBuffer = buildLosslessShuffledDocx(examData, mode, variantCode);
      }
      if (!docxBuffer) {
        docxBuffer = generateExamDocx(examData, mode, variantCode);
      }
      const subj = (examData.metadata?.subject || 'DeKiemTra').replace(/\s+/g, '_');
      const grade = examData.metadata?.grade || '';
      const modeNames = {
        full: 'HoSo_DayDu_MaTran_DacTa_De_DapAn',
        matrix: 'MaTran_DeKiemTra',
        spec: 'BanDacTa_DeKiemTra',
        matrix_spec: 'MaTran_DacTa_DeKiemTra',
        exam: variantCode ? `DeKiemTra_HocSinh_Ma${variantCode}` : 'DeKiemTra_HocSinh_KhongDapAn',
        answer: 'DapAn_HuongDanCham'
      };
      const fileName = `${modeNames[mode] || 'HoSo'}_${subj}_Lop${grade}.docx`;

      // GĐ3 (P1-10): chuẩn hóa tên file, kiểm tra đường dẫn cuối cùng nằm
      // trong thư mục exports; lưu bản sao bằng ghi nguyên tử; LỖI GHI PHẢI
      // BÁO RA cho người dùng thay vì nuốt im lặng rồi vẫn gửi file.
      let exportPath;
      try {
        exportPath = resolveExportPath(fileName);
        ensureDir(EXPORTS_DIR);
        atomicWriteFile(exportPath, docxBuffer);
      } catch (err) {
        console.error('[POST /api/export-docx] Không lưu được bản sao vào exports:', err);
        if (err instanceof DemoModeError) {
          sendJson(res, 503, { ok: false, errorCode: 'DEMO_MODE_READONLY', message: err.message });
          return;
        }
        sendJson(res, 500, {
          ok: false,
          errorCode: 'EXPORT_SAVE_FAILED',
          message: 'Không lưu được bản sao file Word vào thư mục exports: ' + err.message
        });
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(exportPath))}"`,
        'Content-Length': docxBuffer.length
      });
      res.end(docxBuffer);
      return;
    }

/**
 * Trích xuất chuẩn cấu hình Đáp án & Biểu điểm OMR từ một Hồ sơ Đề thi (Bước 2-4-5)
 */
function extractOmrConfigFromProfile(profile = {}) {
  const variants = Array.isArray(profile.variants) && profile.variants.length > 0
    ? profile.variants
    : (Array.isArray(profile.questions) && profile.questions.length > 0
      ? [{ code: profile.selectedVariantCode || '101', questions: profile.questions }]
      : []);

  // GĐ2 (P0-02): dựng khóa đáp án bằng bộ dựng NGHIÊM NGẶT — câu thiếu
  // đáp án hợp lệ thì khóa đó mang null (hiển thị là "chưa có đáp án"),
  // không bao giờ mặc định thành A. Đường chấm bài dùng chính bộ này và
  // từ chối chấm khi có lỗi (xem resolveServerAnswerKeys).
  const { keys: answerKeysByCode } = buildStrictAnswerKeysFromExam(profile);

  const rows = profile.matrix?.rows || [];
  let essayCount = 0;
  let essayPts = 0;
  let mcqCount = 0;
  let tfCount = 0;
  let saCount = 0;
  rows.forEach(r => {
    const counts = r.counts || {};
    mcqCount += (counts.MCQ?.['Biết'] || 0) + (counts.MCQ?.['Hiểu'] || 0) + (counts.MCQ?.['Vận dụng'] || 0) + (r.mcq_b || 0) + (r.mcq_h || 0) + (r.mcq_vd || 0);
    tfCount += (counts.TF?.['Biết'] || 0) + (counts.TF?.['Hiểu'] || 0) + (counts.TF?.['Vận dụng'] || 0) + (r.tf_b || 0) + (r.tf_h || 0) + (r.tf_vd || 0);
    saCount += (counts.SA?.['Biết'] || 0) + (counts.SA?.['Hiểu'] || 0) + (counts.SA?.['Vận dụng'] || 0) + (r.sa_b || 0) + (r.sa_h || 0) + (r.sa_vd || 0);
    const eB = counts.ESSAY?.['Biết'] || 0;
    const eH = counts.ESSAY?.['Hiểu'] || 0;
    const eV = counts.ESSAY?.['Vận dụng'] || 0;
    essayCount += eB + eH + eV;
    if (r.essayPoints && typeof r.essayPoints === 'object') {
      essayPts += Number(r.essayPoints['Biết'] || 0) + Number(r.essayPoints['Hiểu'] || 0) + Number(r.essayPoints['Vận dụng'] || 0);
    }
  });
  if (essayCount === 0 && Array.isArray(profile.questions)) {
    const essayQs = profile.questions.filter(q => q.type === 'ESSAY');
    essayCount = essayQs.length;
    essayPts = essayQs.reduce((acc, q) => acc + Number(q.points || 0), 0);
  }
  const mRules = profile.matrix?.pointRules || {};
  const existingOmrCfg = profile.omrConfig || {};
  const mcqRule = Number(existingOmrCfg.pointRules?.mcq ?? mRules.MCQ ?? 0.25);
  const saRule = Number(existingOmrCfg.pointRules?.sa ?? mRules.SA ?? 0.5);
  // GĐ2 (P1-01, QĐ2): mặc định thang Đúng/Sai chung (moet2025) — không còn
  // kiểu chia đều 0,25đ/ý. Hồ sơ cũ lưu tfStyle fixed025 vẫn được đọc ra
  // để hiển thị, nhưng khi chấm máy chủ luôn dùng SERVER_POINT_RULES.
  const tfStyle = existingOmrCfg.pointRules?.tfStyle === 'fixed025' ? 'moet2025' : (existingOmrCfg.pointRules?.tfStyle || 'moet2025');
  if (essayPts === 0 && essayCount > 0) {
    essayPts = Math.round(essayCount * Number(mRules.ESSAY || 1.0) * 100) / 100;
  }

  const firstKey = Object.values(answerKeysByCode)[0] || { part1: [], part2: {}, part3: {} };
  const p1Total = Math.round((firstKey.part1?.length || mcqCount) * mcqRule * 100) / 100;
  const p2Total = Math.round(Object.keys(firstKey.part2 || {}).length * 1.0 * 100) / 100;
  const p3Total = Math.round(Object.keys(firstKey.part3 || {}).length * saRule * 100) / 100;
  const maxOmrScore = Math.round((p1Total + p2Total + p3Total) * 100) / 100;

  return {
    answerKeysByCode: Object.keys(existingOmrCfg.answerKeysByCode || {}).length > 0
      ? existingOmrCfg.answerKeysByCode
      : answerKeysByCode,
    pointRules: { mcq: mcqRule, tfStyle, sa: saRule },
    examCodes: Object.keys(answerKeysByCode),
    hasEssay: essayCount > 0,
    essayMaxScore: Math.round(essayPts * 100) / 100,
    maxOmrScore: maxOmrScore || 10.0,
    recommendedTemplateId: existingOmrCfg.recommendedTemplateId || ''
  };
}

/**
 * GĐ2 (P0-09): Đọc một hồ sơ đề từ ổ cứng (tôn trọng tombstone đã xóa),
 * dùng chung cho tra khóa đáp án phía máy chủ.
 */
function loadProfileById(id) {
  const safeId = String(id || '').replace(/[^a-zA-Z0-9_\-]/g, '');
  if (!safeId) return null;
  if (readDeletedProfileIds().has(safeId)) return null;
  const writablePath = path.join(PROFILES_DIR, `${safeId}.json`);
  const bundledPath = path.join(BUNDLED_PROFILES_DIR, `${safeId}.json`);
  const filePath = fs.existsSync(writablePath) ? writablePath : (fs.existsSync(bundledPath) ? bundledPath : null);
  if (!filePath) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * GĐ2 (P0-09): Tra khóa đáp án CHỈ từ dữ liệu máy chủ lưu giữ — không bao
 * giờ tin body client. Thứ tự tra cứu:
 *   1. sessionId → ca chấm đã lưu trên máy chủ;
 *   2. examId (hồ sơ đề) → dựng khóa nghiêm ngặt từ variants của hồ sơ
 *      (câu thiếu đáp án hợp lệ thì báo rõ và từ chối chấm);
 *   3. examId dạng ext_* → kho khóa ngoài do /api/omr/parse-answer-key
 *      đã trích xuất và lưu (rồi mới nhất nếu không khớp đúng tên);
 *   4. Chưa có nguồn nào mà body kèm khóa đáp án hợp lệ về cấu trúc →
 *      LƯU bộ khóa đó thành nguồn máy chủ cho examId này (lần xác lập đầu
 *      tiên của giáo viên đã đăng nhập — tương đương việc nạp file đáp án),
 *      từ lần sau trở đi chỉ đọc từ kho đã lưu, body gửi lại bị bỏ qua.
 * Trả về { ok, keys, source } hoặc { ok: false, errorCode, message }.
 */
function resolveServerAnswerKeys({ examId = '', sessionId = '', bodyKeys = null, metadata = {} }) {
  const safeExamId = String(examId || '').trim();
  const safeSessionId = String(sessionId || '').trim();

  // 1. Ca chấm đã lưu.
  if (safeSessionId) {
    const session = loadSavedOmrSession(safeSessionId);
    if (session && session.answerKeysByCode && Object.keys(session.answerKeysByCode).length > 0) {
      return { ok: true, keys: session.answerKeysByCode, source: `ca chấm đã lưu ${safeSessionId}` };
    }
  }

  // 2. Hồ sơ đề đã lưu.
  if (safeExamId && !safeExamId.startsWith('ext_') && safeExamId !== 'exam_current') {
    const profile = loadProfileById(safeExamId);
    if (profile) {
      const built = buildStrictAnswerKeysFromExam(profile);
      if (built.problems.length > 0) {
        return {
          ok: false,
          errorCode: 'INVALID_ANSWER_KEY',
          message: `Không thể chấm đề "${safeExamId}": biểu đáp án trong hồ sơ đề có lỗi — ${built.problems.slice(0, 3).join(' ')}`
        };
      }
      if (Object.keys(built.keys).length > 0) {
        return { ok: true, keys: built.keys, source: `hồ sơ đề ${safeExamId}` };
      }
    }
  }

  // 3. Khóa ngoài đã nạp qua parse-answer-key.
  if (safeExamId.startsWith('ext_')) {
    const stored = loadExternalAnswerKeys(safeExamId) || loadLatestExternalAnswerKeys();
    if (stored && Object.keys(stored).length > 0) {
      return { ok: true, keys: stored, source: `file đáp án ngoài đã nạp (${safeExamId})` };
    }
  }

  // 3b. Kho khóa đã xác lập từ lần chấm trước cho cùng đề (xem bước 4).
  const m = metadata || {};
  const workflowId = `wf_${[safeExamId || 'exam', m.subject || '', m.grade || '', m.examPeriod || ''].join('_').replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 64)}`;
  if (safeExamId) {
    const established = loadExternalAnswerKeys(workflowId);
    if (established && Object.keys(established).length > 0) {
      return { ok: true, keys: established, source: `kho khóa đã xác lập cho ${safeExamId}` };
    }
  }

  // 4. Xác lập lần đầu từ khóa body gửi lên (đã đăng nhập) — chỉ khi chưa
  // có nguồn máy chủ nào. Từ lần sau, kho đã lưu thắng body.
  if (bodyKeys && typeof bodyKeys === 'object' && Object.keys(bodyKeys).length > 0) {
    const structuralProblems = [];
    for (const [code, key] of Object.entries(bodyKeys)) {
      if (!key || typeof key !== 'object') { structuralProblems.push(`mã đề ${code}: biểu đáp án không đúng định dạng.`); continue; }
      (key.part1 || []).forEach((ans, i) => {
        if (!['A', 'B', 'C', 'D'].includes(String(ans || '').trim().toUpperCase())) {
          structuralProblems.push(`mã đề ${code} Phần I câu ${i + 1}: đáp án "${ans}" không phải A–D.`);
        }
      });
      for (const [qNum, subs] of Object.entries(key.part2 || {})) {
        for (const letter of ['a', 'b', 'c', 'd']) {
          const v = String(subs?.[letter] || '').trim().toUpperCase();
          if (v !== 'Đ' && v !== 'S') {
            structuralProblems.push(`mã đề ${code} Phần II câu ${qNum}${letter}: đáp án Đúng/Sai "${subs?.[letter] ?? ''}" không xác định được.`);
          }
        }
      }
    }
    if (structuralProblems.length > 0) {
      return {
        ok: false,
        errorCode: 'INVALID_ANSWER_KEY',
        message: `Không thể chấm: biểu đáp án gửi lên có lỗi — ${structuralProblems.slice(0, 3).join(' ')}`
      };
    }
    const m = metadata || {};
    const workflowId = `wf_${[safeExamId || 'exam', m.subject || '', m.grade || '', m.examPeriod || ''].join('_').replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 64)}`;
    saveExternalAnswerKeys(workflowId, bodyKeys, `Xác lập từ lần chấm đầu (${safeExamId || 'chưa lưu hồ sơ'})`);
    return { ok: true, keys: bodyKeys, source: `xác lập lần đầu cho ${safeExamId || 'đề chưa lưu hồ sơ'}` };
  }

  return {
    ok: false,
    errorCode: 'MISSING_ANSWER_KEYS',
    message: 'Chưa có Biểu đáp án mã đề trên máy chủ! Vui lòng lưu Hồ sơ đề (Bước 4–5) hoặc nạp file Đáp án (Bước 7) trước khi bấm Chấm — máy chủ chỉ chấm bằng đáp án do chính mình lưu giữ.'
  };
}

    // 13. Quản lý Lưu trữ Hồ sơ đề kiểm tra (CRUD Profiles)
    if (req.method === 'GET' && pathname === '/api/profiles') {
      if (!requireAuth(req, res)) return;
      const deletedIds = readDeletedProfileIds();
      const profileMap = new Map();
      for (const dir of [BUNDLED_PROFILES_DIR, PROFILES_DIR]) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const f of files) {
          try {
            const fullP = path.join(dir, f);
            const content = JSON.parse(fs.readFileSync(fullP, 'utf8'));
            const pid = content.id || f.replace(/\.json$/, '');
            if (deletedIds.has(String(pid))) continue;
            const omrCfg = extractOmrConfigFromProfile(content);
            const item = {
              id: pid,
              isSampleProfile: String(pid).startsWith('profile_thpt_'),
              title: content.title || `${content.metadata?.subject || ''} Lớp ${content.metadata?.grade || ''} - ${content.metadata?.examPeriod || ''}`,
              updatedAt: content.updatedAt || fs.statSync(fullP).mtime.toISOString(),
              metadata: content.metadata || {},
              questionsCount: (content.questions || []).length,
              variantsCount: (content.variants || []).length,
              examCodes: omrCfg.examCodes,
              hasEssay: omrCfg.hasEssay,
              essayMaxScore: omrCfg.essayMaxScore,
              maxOmrScore: omrCfg.maxOmrScore,
              tfStyle: omrCfg.pointRules.tfStyle
            };
            profileMap.set(item.id, item);
          } catch (_) {}
        }
      }
      const profiles = Array.from(profileMap.values());
      profiles.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      sendJson(res, 200, { ok: true, profiles });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/profiles/')) {
      if (!requireAuth(req, res)) return;
      const id = pathname.split('/')[3].replace(/[^a-zA-Z0-9_\-]/g, '');
      const deletedIds = readDeletedProfileIds();
      if (deletedIds.has(String(id))) {
        sendJson(res, 404, { ok: false, message: 'Hồ sơ đề kiểm tra đã bị xóa.' });
        return;
      }
      const writablePath = path.join(PROFILES_DIR, `${id}.json`);
      const bundledPath = path.join(BUNDLED_PROFILES_DIR, `${id}.json`);
      const filePath = fs.existsSync(writablePath) ? writablePath : (fs.existsSync(bundledPath) ? bundledPath : null);
      if (!filePath) {
        sendJson(res, 404, { ok: false, message: 'Không tìm thấy hồ sơ đề kiểm tra.' });
        return;
      }
      const profile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      profile.omrConfig = extractOmrConfigFromProfile(profile);
      sendJson(res, 200, { ok: true, profile });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/profiles') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const profile = JSON.parse(raw.toString('utf8') || '{}');
      const id = (profile.id || `exam_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '');
      profile.id = id;
      profile.updatedAt = new Date().toISOString();
      if (!profile.title) {
        const m = profile.metadata || {};
        profile.title = `${m.examPeriod || 'Đề kiểm tra'} - ${m.subject || 'Môn'} Lớp ${m.grade || ''}`;
      }
      // Làm gọn hồ sơ đề: không nhồi dữ liệu ảnh scan OMR tạm thời của từng lớp vào file đề gốc
      const cleanProfile = { ...profile };
      if (cleanProfile.omr) {
        cleanProfile.omrConfig = {
          ...(cleanProfile.omrConfig || {}),
          pointRules: cleanProfile.omr.pointRules || cleanProfile.omrConfig?.pointRules,
          recommendedTemplateId: cleanProfile.omr.selectedTemplateId || cleanProfile.omrConfig?.recommendedTemplateId
        };
        delete cleanProfile.omr;
      }
      cleanProfile.omrConfig = extractOmrConfigFromProfile(cleanProfile);

      if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
      // GĐ3 (P1-08): lưu hồ sơ đề bằng ghi nguyên tử; lỗi ghi lộ ra
      // (requestHandler trả 500, hoặc 503 ở chế độ giới thiệu).
      atomicWriteJson(path.join(PROFILES_DIR, `${id}.json`), cleanProfile);
      const deletedIds = readDeletedProfileIds();
      if (deletedIds.has(id)) {
        deletedIds.delete(id);
        writeDeletedProfileIds(deletedIds);
      }
      sendJson(res, 200, {
        ok: true,
        id,
        title: cleanProfile.title,
        updatedAt: cleanProfile.updatedAt,
        examCodes: cleanProfile.omrConfig.examCodes,
        hasEssay: cleanProfile.omrConfig.hasEssay,
        maxOmrScore: cleanProfile.omrConfig.maxOmrScore
      });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/profiles/')) {
      if (!requireAuth(req, res)) return;
      const id = pathname.split('/')[3].replace(/[^a-zA-Z0-9_\-]/g, '');
      const writablePath = path.join(PROFILES_DIR, `${id}.json`);
      const bundledPath = path.join(BUNDLED_PROFILES_DIR, `${id}.json`);
      const isBundledSample = String(id).startsWith('profile_thpt_') && fs.existsSync(bundledPath);
      if (!isBundledSample && fs.existsSync(writablePath)) {
        fs.unlinkSync(writablePath);
      }
      // Nếu file gốc nằm trong thư mục bundled read-only (trên Vercel) hoặc không xóa trực tiếp được, ghi tombstone để ẩn vĩnh viễn khỏi Kho đề
      let stillBundled = fs.existsSync(bundledPath);
      if (stillBundled && !process.env.VERCEL && !String(id).startsWith('profile_thpt_')) {
        try {
          fs.unlinkSync(bundledPath);
          stillBundled = false;
        } catch (_) {}
      }
      if (stillBundled) {
        const deletedIds = readDeletedProfileIds();
        deletedIds.add(String(id));
        writeDeletedProfileIds(deletedIds);
      }
      sendJson(res, 200, { ok: true, deletedId: id });
      return;
    }

    
    // ========================================================================
    // CHỨC NĂNG 7: CHẤM BÀI TRẮC NGHIỆM (PHIẾU TLTN 2025 BGD) & THỐNG KÊ - BÁO CÁO
    // ========================================================================

    // 14.0. Danh sách tất cả các Mẫu Phiếu Trả lời trắc nghiệm hỗ trợ (4 mẫu chuẩn + mẫu tùy chỉnh người dùng tải lên)
    if (req.method === 'GET' && pathname === '/api/omr/templates') {
      sendJson(res, 200, {
        ok: true,
        templates: getAllTemplates()
      });
      return;
    }

    // 14.0b. Tải lên & lưu Mẫu Phiếu Chấm tùy chỉnh của người dùng (PNG/JPG/WEBP/PDF đã render)
    if (req.method === 'POST' && pathname === '/api/omr/templates/custom') {
      if (!requireAuth(req, res)) return;
      try {
        const raw = await readRequestBody(req);
        const body = JSON.parse(raw.toString('utf8') || '{}');
        const saved = saveCustomTemplate(body);
        sendJson(res, 200, {
          ok: true,
          template: saved,
          templates: getAllTemplates(),
          message: `Đã lưu mẫu phiếu chấm "${saved.name}" thành công!`
        });
      } catch (err) {
        sendJson(res, 400, {
          ok: false,
          message: err.message || 'Không thể lưu mẫu phiếu chấm tùy chỉnh.'
        });
      }
      return;
    }

    // 14.0c. Xóa Mẫu Phiếu Chấm tùy chỉnh
    if (req.method === 'DELETE' && pathname.startsWith('/api/omr/templates/custom/')) {
      if (!requireAuth(req, res)) return;
      const tplId = decodeURIComponent(pathname.split('/')[5] || '').trim();
      const deleted = deleteCustomTemplate(tplId);
      if (!deleted) {
        sendJson(res, 404, {
          ok: false,
          message: 'Không tìm thấy mẫu phiếu tùy chỉnh cần xóa (chỉ xóa được mẫu do người dùng tải lên).'
        });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        deleted: true,
        templates: getAllTemplates()
      });
      return;
    }

    // 14.1. Thông tin Phiếu TLTN chuẩn Bộ GD&ĐT và thông tin mẫu
    if (req.method === 'GET' && pathname === '/api/omr/template-info') {
      if (!requireAuth(req, res)) return;
      const templateId = parsedUrl.searchParams.get('templateId') || 'bgd_2025_4code';
      const template = getTemplateById(templateId);
      const blankFilePath = path.join(__dirname, template.blankFileName);
      const exists = fs.existsSync(blankFilePath);
      sendJson(res, 200, {
        ok: true,
        currentTemplate: template,
        templates: getAllTemplates(),
        fileName: template.blankFileName,
        pdfUrl: `/api/omr/download-blank-template?templateId=${template.id}`,
        fileSize: exists ? fs.statSync(blankFilePath).size : 0,
        description: template.description,
        defaultRoster: getActiveRoster(),
        rostersSummary: listClassRostersSummary()
      });
      return;
    }

    // 14.1c. Phân tích & Lưu Danh sách Học sinh (Excel, CSV, Text hoặc Mảng trực tiếp - Hỗ trợ Đa Lớp)
    if (req.method === 'POST' && pathname === '/api/omr/parse-roster') {
      if (!requireAuth(req, res)) return;
      try {
        const raw = await readRequestBody(req);
        const body = JSON.parse(raw.toString('utf8') || '{}');
        const { parseStudentRosterFile, parseStudentRosterText } = require('./src/answer-key-parser');
        const targetClass = String(body.className || '').trim();

        let parsedRoster = [];
        if (body.resetDefault) {
          parsedRoster = DEFAULT_CLASS_ROSTER;
        } else if (Array.isArray(body.roster) && body.roster.length > 0) {
          parsedRoster = body.roster;
        } else if (body.rawText) {
          parsedRoster = parseStudentRosterText(body.rawText, { defaultClassName: targetClass });
        } else if (body.fileBase64 && body.fileName) {
          const buf = Buffer.from(body.fileBase64, 'base64');
          parsedRoster = parseStudentRosterFile(body.fileName, buf, { defaultClassName: targetClass });
        }

        if (!Array.isArray(parsedRoster) || parsedRoster.length === 0) {
          sendJson(res, 400, {
            ok: false,
            message: 'Không nhận diện được học sinh nào từ dữ liệu cung cấp. Vui lòng kiểm tra định dạng (SBD, Họ và tên, Lớp, Ngày sinh)!'
          });
          return;
        }

        const savedRoster = saveActiveRoster(parsedRoster, {
          className: body.resetDefault ? '' : targetClass,
          isDefaultReset: Boolean(body.resetDefault)
        });
        const rostersSummary = listClassRostersSummary();
        const firstClass = savedRoster[0]?.className || rostersSummary.activeClass || '';
        sendJson(res, 200, {
          ok: true,
          roster: savedRoster,
          totalStudents: savedRoster.length,
          className: firstClass,
          rostersSummary,
          message: rostersSummary.classes.length > 1 && !targetClass && !body.resetDefault
            ? `Đã nạp thành công danh sách ${savedRoster.length} học sinh thuộc ${rostersSummary.classes.length} lớp!`
            : `Đã nạp thành công danh sách ${savedRoster.length} học sinh${firstClass ? ' (Lớp ' + firstClass + ')' : ''}!`
        });
        return;
      } catch (err) {
        sendJson(res, 500, { ok: false, message: 'Lỗi phân tích danh sách học sinh: ' + err.message });
        return;
      }
    }

    // 14.1c2. Quản lý Kho Danh sách Nhiều Lớp (Rosters)
    if (req.method === 'GET' && pathname === '/api/omr/rosters') {
      if (!requireAuth(req, res)) return;
      sendJson(res, 200, {
        ok: true,
        ...listClassRostersSummary()
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/omr/rosters/select') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const requested = String(body.className || '').trim();
      if (!requested) {
        sendJson(res, 400, { ok: false, message: 'Thiếu tên lớp cần chọn.' });
        return;
      }
      const summary = setActiveRosterClass(requested);
      sendJson(res, 200, {
        ok: true,
        ...summary,
        roster: summary.activeRoster
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/omr/rosters/clear') {
      if (!requireAuth(req, res)) return;
      const summary = clearAllRosters();
      sendJson(res, 200, {
        ok: true,
        ...summary,
        roster: []
      });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/omr/rosters/')) {
      if (!requireAuth(req, res)) return;
      const clsName = decodeURIComponent(pathname.split('/')[4] || '');
      const summary = deleteClassRoster(clsName);
      sendJson(res, 200, {
        ok: true,
        ...summary,
        roster: summary.activeRoster
      });
      return;
    }

    // 14.1d. Quản lý các ca chấm đã lưu trong ổ cứng (data/omr_database)
    if (req.method === 'GET' && pathname === '/api/omr/sessions') {
      if (!requireAuth(req, res)) return;
      sendJson(res, 200, {
        ok: true,
        sessions: listSavedOmrSessions()
      });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/omr/sessions/')) {
      if (!requireAuth(req, res)) return;
      const sessionId = pathname.split('/')[4];
      const sessionData = loadSavedOmrSession(sessionId);
      if (!sessionData) {
        sendJson(res, 404, { ok: false, message: 'Không tìm thấy ca chấm đã lưu!' });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        session: sessionData
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/omr/sessions') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      // GĐ2 (P0-09): lưu ca chấm thì chấm lại bằng khóa đáp án + biểu điểm
      // của MÁY CHỦ (khi tra được nguồn khóa và bài nào cũng còn phiếu tô).
      // Bài không còn phiếu tô thì giữ nguyên kết quả cũ và ghi rõ là
      // chưa chấm lại được — không tự chấm 0 điểm cho bài không có dữ liệu.
      let gradedPapers = body.gradedPapers || [];
      let answerKeysByCode = body.answerKeysByCode || {};
      let pointRules = body.pointRules || {};
      let serverRegraded = false;
      const resolved = resolveServerAnswerKeys({
        examId: body.examId || '',
        sessionId: body.sessionId || '',
        bodyKeys: body.answerKeysByCode || null,
        metadata: body.metadata || {}
      });
      if (resolved.ok && gradedPapers.length > 0 && gradedPapers.every(p => p && p.answers && typeof p.answers === 'object')) {
        const regraded = gradeBatchPapers({
          papers: gradedPapers.map(p => {
            const copy = { ...(p || {}) };
            delete copy.result;
            delete copy.totalScore;
            delete copy.statistics;
            return copy;
          }),
          answerKeysByCode: resolved.keys,
          pointRules: { ...SERVER_POINT_RULES },
          roster: getActiveRoster(body.className && body.className !== '__ALL__' ? body.className : null),
          targetClassName: body.className || '',
          persistDbState: false
        });
        gradedPapers = regraded.gradedPapers;
        answerKeysByCode = resolved.keys;
        pointRules = { ...SERVER_POINT_RULES };
        serverRegraded = true;
      }
      const snap = saveGradingSessionSnapshot({
        gradedPapers,
        answerKeysByCode,
        pointRules,
        metadata: body.metadata || {},
        title: body.title || '',
        examId: body.examId || '',
        examTitle: body.examTitle || '',
        className: body.className || '',
        templateId: body.templateId || '',
        overwriteSameExamClass: Boolean(body.overwriteSameExamClass),
        sessionId: body.sessionId || ''
      });
      sendJson(res, 200, {
        ok: true,
        session: snap,
        serverRegraded,
        sessions: listSavedOmrSessions()
      });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/omr/sessions/')) {
      if (!requireAuth(req, res)) return;
      const sessionId = pathname.split('/')[4];
      const deleted = deleteSavedOmrSession(sessionId);
      sendJson(res, 200, {
        ok: true,
        deleted,
        sessions: listSavedOmrSessions()
      });
      return;
    }

    // 14.1b. Phục vụ ảnh Mẫu phiếu TLTN theo templateId (Hỗ trợ 4 mẫu chuẩn + mẫu tùy chỉnh người dùng tải lên)
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/api/omr/template-image' || pathname === '/api/omr/template-sheet-image')) {
      const templateId = parsedUrl.searchParams.get('templateId') || 'bgd_2025_4code';
      const template = getTemplateById(templateId);

      // Tìm file ảnh theo template: ưu tiên resolveTemplateImagePath (hỗ trợ cả custom template), sau đó fallback
      const resolvedCustomOrBuiltIn = resolveTemplateImagePath(template);
      const candidatePaths = [
        resolvedCustomOrBuiltIn,
        template.imageRelPath ? path.join(__dirname, template.imageRelPath) : null,
        template.imageRelPath ? path.join(BUNDLED_DATA_DIR, 'omr_templates', path.basename(template.imageRelPath)) : null,
        path.join(BUNDLED_DATA_DIR, 'omr_template_sheet.jpg'),
        path.join(__dirname, 'extracted_sheet_0.jpg')
      ];

      let targetPath = null;
      for (const p of candidatePaths) {
        if (p && fs.existsSync(p)) {
          targetPath = p;
          break;
        }
      }

      if (targetPath) {
        const lowerP = targetPath.toLowerCase();
        const contentType = lowerP.endsWith('.png') ? 'image/png' : (lowerP.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
        const stat = fs.statSync(targetPath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stat.size,
          'Cache-Control': template.isCustom ? 'no-cache' : 'public, max-age=86400'
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        fs.createReadStream(targetPath).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Không tìm thấy ảnh mẫu phiếu cho id ${templateId}!`);
      return;
    }

    // 14.1d. Tải file Phôi Phiếu Trắng in ấn (PDF / Docx / Ảnh mẫu tùy chỉnh) theo templateId
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/api/omr/download-blank-template' || pathname === '/api/omr/template-pdf')) {
      const templateId = parsedUrl.searchParams.get('templateId') || 'bgd_2025_4code';
      const template = getTemplateById(templateId);

      const candidateFiles = [
        template.isCustom ? resolveTemplateImagePath(template) : null,
        path.join(BUNDLED_DATA_DIR, 'omr_templates', 'blank_files', template.blankFileName),
        path.join(__dirname, template.blankFileName),
        path.join(BUNDLED_DATA_DIR, 'omr_templates', template.blankFileName)
      ];

      let targetBlankPath = null;
      for (const p of candidateFiles) {
        if (p && fs.existsSync(p)) {
          targetBlankPath = p;
          break;
        }
      }

      if (!targetBlankPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Không tìm thấy file phôi mẫu in cho template: ${templateId}`);
        return;
      }

      const fileBuf = fs.readFileSync(targetBlankPath);
      const asciiFilename = template.blankFileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const encodedFilename = encodeURIComponent(template.blankFileName);
      res.writeHead(200, {
        'Content-Type': template.blankMime || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': fileBuf.length
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(fileBuf);
      return;
    }

    // 14.2b. Tải file Mẫu Biểu đáp án ngoài (.csv chuẩn 3 phần cho Excel/McMIX/TnMaker)
    if (req.method === 'GET' && pathname === '/api/omr/download-answer-key-template') {
      const { generateSampleAnswerKeyCsv } = require('./src/answer-key-parser');
      const csvContent = generateSampleAnswerKeyCsv();
      // Thêm UTF-8 BOM (\uFEFF) để Microsoft Excel hiển thị tiếng Việt có dấu chuẩn 100%
      const buffer = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(csvContent, 'utf8')]);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Bieu_Dap_An_Mau_3Phan_BGD2025.csv"',
        'Content-Length': buffer.length
      });
      res.end(buffer);
      return;
    }

    // 14.2c. Phân tích & Nhập Biểu đáp án nạp từ bên ngoài (Excel, CSV, Text, Word, JSON, McMIX, TnMaker)
    if (req.method === 'POST' && pathname === '/api/omr/parse-answer-key') {
      if (!requireAuth(req, res)) return;
      try {
        const raw = await readRequestBody(req);
        const body = JSON.parse(raw.toString('utf8') || '{}');
        const { parseAnyAnswerKeyFile, parseTextAnswerKey } = require('./src/answer-key-parser');

        let answerKeys = {};
        if (body.rawText) {
          answerKeys = parseTextAnswerKey(body.rawText);
        } else if (body.fileBase64 && body.fileName) {
          const buf = Buffer.from(body.fileBase64, 'base64');
          answerKeys = parseAnyAnswerKeyFile(body.fileName, buf);
        }

        const codes = Object.keys(answerKeys || {});
        if (codes.length === 0) {
          sendJson(res, 400, {
            ok: false,
            message: 'Không nhận diện được mã đề hoặc câu trả lời nào từ dữ liệu cung cấp. Vui lòng kiểm tra định dạng hoặc dán chuỗi đáp án (VD: Mã 101: 1A 2B 3C...)!'
          });
          return;
        }

        // GĐ2 (P0-09): LƯU bộ khóa vừa trích xuất xuống máy chủ để lần chấm
        // sau tra được từ kho máy chủ — không phụ thuộc body client gửi lại.
        // ID kho khớp đúng examId mà giao diện tính ra (ext_ + tên nguồn đã
        // chuẩn hóa, giống hệt buildOmrGradingContext trong index.html).
        let answerKeySetId = '';
        try {
          const crypto = require('crypto');
          if (body.fileBase64 && body.fileName) {
            const label = `File: ${body.fileName}`;
            answerKeySetId = 'ext_' + label.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 32);
            saveExternalAnswerKeys(answerKeySetId, answerKeys, label);
          } else {
            const label = 'Dán văn bản (Zalo/Email)';
            answerKeySetId = 'ext_' + label.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 32);
            saveExternalAnswerKeys(answerKeySetId, answerKeys, label);
            // Lưu thêm theo hash nội dung để lần chấm sau tra được ngay cả
            // khi giao diện đặt tên nguồn khác (vd. nạp văn bản mẫu).
            const contentId = 'ext_content_' + crypto.createHash('sha256').update(String(body.rawText || '')).digest('hex').slice(0, 16);
            saveExternalAnswerKeys(contentId, answerKeys, label);
          }
        } catch (storeErr) {
          console.error('[POST /api/omr/parse-answer-key] Không lưu được biểu đáp án xuống máy chủ:', storeErr);
        }

        sendJson(res, 200, {
          ok: true,
          answerKeysByCode: answerKeys,
          answerKeySetId,
          detectedCodes: codes,
          totalCodes: codes.length,
          summary: `Đã nhận diện thành công ${codes.length} mã đề (${codes.join(', ')})`
        });
        return;
      } catch (err) {
        sendJson(res, 500, { ok: false, message: 'Lỗi phân tích file đáp án: ' + err.message });
        return;
      }
    }

    // 14.3. Chấm theo lô (Batch Grading)
    if (req.method === 'POST' && pathname === '/api/omr/grade-batch') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const targetClassName = String(body.className || '').trim();
      const isDemoSimulation = body.useSampleBatch === true;

      // GĐ2 (P0-09): MÁY CHỦ là nguồn sự thật duy nhất khi chấm.
      // - Khóa đáp án: tra từ dữ liệu máy chủ lưu giữ (hồ sơ đề / ca chấm
      //   đã lưu / file đáp án đã nạp / kho đã xác lập) — xem
      //   resolveServerAnswerKeys. Khóa client gửi lên chỉ dùng để xác lập
      //   lần đầu khi chưa có nguồn nào, từ lần sau bị bỏ qua.
      // - Biểu điểm: luôn là bảng chuẩn của máy chủ (SERVER_POINT_RULES).
      // - Roster: lấy từ máy chủ theo lớp. Điểm trong từng bài (result /
      //   totalScore) do client tự tính đều bị xóa trước khi chấm lại.
      const pointRules = { ...SERVER_POINT_RULES };
      const serverRoster = getActiveRoster(targetClassName && targetClassName !== '__ALL__' ? targetClassName : null);

      let answerKeysByCode;
      let answerKeySource = 'mẫu mô phỏng';
      if (isDemoSimulation) {
        answerKeysByCode = body.answerKeysByCode || {};
        if (!answerKeysByCode || Object.keys(answerKeysByCode).length === 0) {
          answerKeysByCode = {
            '101': { part1: ['A','B','C','D','A','B','C','D','B','C','A','D','C','B','A','D','C','A','D','B','A','C','B','D'], part2: { '1': { a:'Đ',b:'S',c:'Đ',d:'S' }, '2': { a:'S',b:'Đ',c:'S',d:'Đ' } }, part3: {} },
            '102': { part1: ['B','C','D','A','B','C','D','A','C','D','B','A','D','C','B','A','D','B','A','C','B','D','C','A'], part2: { '1': { a:'S',b:'Đ',c:'S',d:'Đ' }, '2': { a:'Đ',b:'S',c:'Đ',d:'S' } }, part3: {} }
          };
        }
      } else {
        const resolved = resolveServerAnswerKeys({
          examId: body.examId || '',
          sessionId: body.sessionId || '',
          bodyKeys: body.answerKeysByCode || null,
          metadata: body.metadata || {}
        });
        if (!resolved.ok) {
          sendJson(res, 400, { ok: false, errorCode: resolved.errorCode, message: resolved.message });
          return;
        }
        answerKeysByCode = resolved.keys;
        answerKeySource = resolved.source;
      }

      let papers = body.papers;
      if (isDemoSimulation) {
        // Chấm thử chỉ dùng roster mẫu giả định — không đụng roster thật.
        papers = generateSampleBatchPapers(answerKeysByCode, DEFAULT_CLASS_ROSTER);
      } else if (!Array.isArray(papers) || papers.length === 0) {
        sendJson(res, 400, {
          ok: false,
          errorCode: 'NO_SCANNED_PAPERS',
          message: 'Chưa có bài scan phiếu thật nào được nạp! Tuyệt đối không tự sinh CSDL ảo khi chấm phiếu thật — hãy tải ảnh/PDF bài thi lên (hoặc nhấn "Chấm thử 35 bài mẫu chuẩn" nếu muốn chạy mô phỏng).'
        });
        return;
      } else {
        // Xóa mọi điểm client tự tính trong từng bài trước khi chấm lại.
        papers = papers.map(p => {
          const copy = { ...(p || {}) };
          delete copy.result;
          delete copy.totalScore;
          delete copy.statistics;
          return copy;
        });
      }

      const gradeResult = gradeBatchPapers({
        papers,
        answerKeysByCode,
        pointRules,
        roster: isDemoSimulation ? DEFAULT_CLASS_ROSTER : serverRoster,
        targetClassName: isDemoSimulation && !targetClassName ? '12A1 (Mẫu thử)' : targetClassName,
        persistDbState: !isDemoSimulation
      });

      // Tự động lưu snapshot ca chấm THẬT vào CSDL (KHÔNG trộn dữ liệu chấm thử mô phỏng vào CSDL chấm thật!)
      // GĐ3 (P1-08): lỗi lưu phiên phải BÁO RÕ trong phản hồi (persistence),
      // không nuốt im lặng rồi trả sessionId null như đã lưu.
      let savedSession = null;
      let persistence = null;
      if (!isDemoSimulation) {
        if (isDemoMode()) {
          persistence = { saved: false, error: DEMO_MODE_MESSAGE };
        } else {
          try {
            savedSession = saveGradingSessionSnapshot({
              gradedPapers: gradeResult.gradedPapers,
              answerKeysByCode,
              pointRules,
              metadata: body.metadata || {},
              examId: body.examId || '',
              examTitle: body.examTitle || '',
              className: targetClassName,
              templateId: body.templateId || '',
              overwriteSameExamClass: Boolean(body.overwriteSameExamClass && body.examId),
              sessionId: body.sessionId || ''
            });
            persistence = { saved: true, sessionId: savedSession.id };
          } catch (err) {
            console.error('[POST /api/omr/grade-batch] Không lưu được phiên chấm:', err);
            persistence = { saved: false, error: err.message };
          }
        }
      }
      if (gradeResult.persistenceError) {
        // Lỗi lưu CSDL tổng (omr_database.json) — phiên snapshot vẫn có
        // thể đã lưu được; báo riêng để người dùng biết mà kiểm tra.
        persistence = persistence || { saved: false };
        persistence.dbError = gradeResult.persistenceError;
      }

      sendJson(res, 200, {
        ok: true,
        isDemoSimulation,
        demoMode: isDemoMode(),
        answerKeySource,
        ...gradeResult,
        answerKeysByCode,
        pointRules,
        roster: isDemoSimulation ? DEFAULT_CLASS_ROSTER : serverRoster,
        sessionId: savedSession ? savedSession.id : null,
        savedSession,
        persistence,
        auditLogs: getAuditLogs()
      });
      return;
    }

    // 14.4. Hiệu chỉnh bài thi học sinh & Ghi nhận Lưu vết (Audit Trail)
    if (req.method === 'POST' && pathname === '/api/omr/update-paper') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      // GĐ1 (P0-09): tên người sửa lấy từ phiên đăng nhập, không lấy từ body client.
      // GĐ2 (P0-09): chấm lại bằng khóa đáp án + biểu điểm + roster của MÁY
      // CHỦ — khóa/biểu điểm/roster client gửi lên bị bỏ qua.
      const { paperId, updates, allPapers, sessionId } = body;
      const user = 'Quản trị viên';

      if (!paperId || !updates || !Array.isArray(allPapers)) {
        sendJson(res, 400, { ok: false, message: 'Dữ liệu hiệu chỉnh bài thi không hợp lệ!' });
        return;
      }

      const resolved = resolveServerAnswerKeys({
        examId: body.examId || '',
        sessionId: sessionId || '',
        bodyKeys: body.answerKeysByCode || null,
        metadata: body.metadata || {}
      });
      if (!resolved.ok) {
        sendJson(res, 400, { ok: false, errorCode: resolved.errorCode, message: resolved.message });
        return;
      }

      const result = updatePaperAndAudit({
        paperId,
        updates,
        allPapers,
        answerKeysByCode: resolved.keys,
        pointRules: { ...SERVER_POINT_RULES },
        roster: getActiveRoster(),
        user: user || 'Giáo viên bộ môn'
      });

      if (sessionId) {
        // GĐ3 (P1-08): lỗi ghi phiên hiệu chỉnh phải báo rõ, không nuốt.
        try {
          syncSessionPapers(sessionId, allPapers);
        } catch (err) {
          console.error('[POST /api/omr/update-paper] Không lưu được phiên đã hiệu chỉnh:', err);
          if (err instanceof DemoModeError) {
            sendJson(res, 503, { ok: false, errorCode: 'DEMO_MODE_READONLY', message: err.message });
            return;
          }
          sendJson(res, 500, {
            ok: false,
            errorCode: 'SESSION_SAVE_FAILED',
            message: 'Đã tính lại điểm nhưng không lưu được phiên chấm: ' + err.message
          });
          return;
        }
      }

      const newStats = calculateBatchStatistics(allPapers);

      sendJson(res, 200, {
        ok: true,
        message: 'Đã hiệu chỉnh thành công bài làm và lưu vết thao tác vào hệ thống!',
        updatedPaper: result.updatedPaper,
        newAuditRecords: result.newAuditRecords,
        allAuditLogs: result.allAuditLogs,
        statistics: newStats,
        allPapers
      });
      return;
    }

    // 14.4b. Báo cáo Tổng hợp Toàn Khối theo Đề thi (Multi-Class Grade Report)
    if (req.method === 'GET' && pathname === '/api/omr/grade-report') {
      if (!requireAuth(req, res)) return;
      const examId = parsedUrl.searchParams.get('examId') || '';
      const report = aggregateGradeReportByExam(examId);
      sendJson(res, 200, report);
      return;
    }

    // 14.5. Lấy toàn bộ lịch sử Lưu vết can thiệp (Audit Trail)
    if (req.method === 'GET' && pathname === '/api/omr/audit-logs') {
      if (!requireAuth(req, res)) return;
      sendJson(res, 200, {
        ok: true,
        auditLogs: getAuditLogs()
      });
      return;
    }

    // 14.6. Đóng gói & Xuất CSDL Chấm thi + Lưu vết (JSON/CSV)
    if (req.method === 'POST' && pathname === '/api/omr/sync-gdrive') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const folderId = String(body.folderId || '').trim();
      const gradedPapers = body.gradedPapers || [];
      const metadata = body.metadata || {};
      const answerKeysByCode = body.answerKeysByCode || {};
      const pointRules = body.pointRules || {};

      // GĐ3 (P1-09): đây là XUẤT BẢN SAO LƯU CỤC BỘ, không phải đồng bộ lên
      // Google Drive — xem exportOmrDatabaseLocalBackup trong omr-engine.js.
      const syncRes = exportOmrDatabaseLocalBackup({ folderId, gradedPapers, metadata, answerKeysByCode, pointRules });
      sendJson(res, 200, syncRes);
      return;
    }

    // 14.7. Xuất Bảng điểm lớp hoặc Toàn khối dạng CSV (tương thích Microsoft Excel UTF-8 BOM)
    if (req.method === 'POST' && pathname === '/api/omr/export-roster-csv') {
      if (!requireAuth(req, res)) return;
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const gradedPapers = body.gradedPapers || [];
      const metadata = body.metadata || {};

      let csvContent = '';
      let downloadName = 'Bang_Diem_Lop_TLTN_2025.csv';
      if (body.includeAllClasses && body.examId) {
        const gradeReport = aggregateGradeReportByExam(body.examId);
        csvContent = exportMultiClassGradeCsv(gradeReport);
        downloadName = 'Bao_Cao_Diem_Toan_Khoi_MatrixEdu.csv';
      } else {
        csvContent = exportRosterToCsv(gradedPapers, metadata, { hasEssay: Boolean(body.hasEssay) });
        const safeCls = String(body.className || gradedPapers[0]?.className || '').replace(/[^a-zA-Z0-9_\-]/g, '');
        if (safeCls) downloadName = `Bang_Diem_${safeCls}_TLTN_2025.csv`;
      }
      const csvBuffer = Buffer.from(csvContent, 'utf8');

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': csvBuffer.length
      });
      res.end(csvBuffer);
      return;
    }

    // 14.8. Xuất Nhật ký lưu vết can thiệp dạng CSV
    if (req.method === 'GET' && pathname === '/api/omr/export-audit-csv') {
      if (!requireAuth(req, res)) return;
      const csvContent = exportAuditLogsToCsv();
      const csvBuffer = Buffer.from(csvContent, 'utf8');

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Nhat_Ky_Luu_Vet_Cham_Thi.csv"',
        'Content-Length': csvBuffer.length
      });
      res.end(csvBuffer);
      return;
    }

    // GĐ4 (P2-05): đường dẫn không tồn tại.
    //  - /api/* giữ JSON 404 như cũ để client xử lý bằng máy.
    //  - Đường dẫn thường (vd: /login, /khong-ton-tai) trả trang 404 thân
    //    thiện bằng tiếng Việt, có nút về trang chính, thay vì JSON thô.
    //    Lưu ý: trên Vercel, trang này chỉ hiện khi request được rewrite
    //    tới function (vercel.json hiện chỉ rewrite /api/*, /favicon*,
    //    /apple-touch-icon* — xem VERCEL-NOTE.md); bản localhost thì luôn
    //    hiện trang này. pathname được escape trước khi in ra HTML.
    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { ok: false, message: `Không tìm thấy đường dẫn API: ${pathname}` });
    } else {
      const safePath = escapeHtmlServer(pathname);
      const html404 = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>404 — Không tìm thấy trang | MatrixEdu</title>
<style>
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #f1f5f9; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .box { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 36px; max-width: 520px; margin: 16px; text-align: center; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); }
  .code { font-size: 3rem; font-weight: 800; color: #2563eb; line-height: 1; }
  h1 { font-size: 1.25rem; margin: 12px 0 8px; }
  p { color: #475569; font-size: 0.95rem; line-height: 1.6; margin: 6px 0; }
  code { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 1px 6px; font-size: 0.85rem; word-break: break-all; }
  a.btn { display: inline-block; margin-top: 16px; background: #2563eb; color: #fff; text-decoration: none; font-weight: 700; padding: 10px 22px; border-radius: 8px; }
  a.btn:hover { background: #1d4ed8; }
</style>
</head>
<body>
<div class="box">
  <div class="code">404</div>
  <h1>Không tìm thấy trang này</h1>
  <p>Địa chỉ <code>${safePath}</code> không tồn tại trên MatrixEdu.</p>
  <p>Có thể thầy/cô đã gõ nhầm địa chỉ, hoặc liên kết đã cũ.</p>
  <a class="btn" href="/">Về trang chính MatrixEdu</a>
</div>
</body>
</html>`;
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS });
      res.end(html404);
    }
  } catch (err) {
    console.error('[requestHandler]', err);
    try {
      // GĐ3 (P1-08): chế độ giới thiệu chặn ghi dữ liệu — trả 503 kèm
      // thông báo rõ ràng thay vì lỗi máy chủ chung chung.
      if (err instanceof DemoModeError) {
        sendJson(res, 503, { ok: false, errorCode: 'DEMO_MODE_READONLY', message: err.message });
        return;
      }
      sendJson(res, 500, { ok: false, message: 'Lỗi máy chủ nội bộ.' });
    } catch (_) {}
  }
};

const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`====================================================================`);
    console.log(`  AI RA ĐỀ KIỂM TRA TỰ ĐỘNG - Máy chủ đang chạy tại:`);
    console.log(`  👉 http://localhost:${PORT}`);
    console.log(`====================================================================`);
  });
}

requestHandler.server = server;
requestHandler.default = requestHandler;
module.exports = requestHandler;

