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
const {
  DEFAULT_CLASS_ROSTER,
  getActiveRoster,
  saveActiveRoster,
  listClassRostersSummary,
  saveClassRoster,
  setActiveRosterClass,
  deleteClassRoster,
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
  syncOmrDatabaseToGoogleDrive
} = require('./src/omr-engine');
const {
  OMR_TEMPLATES,
  getAllTemplates,
  getTemplateById
} = require('./src/omr-templates');
const { extractDocumentContent } = require('./src/doc-parser');
const { computeMatrixStatistics, validateExamProfile, generateShuffledVariants } = require('./src/qa-validator');
const { SAMPLE_DOCUMENTS } = require('./src/sample-materials');
const { loadDriveQuestionBank, syncGoogleDriveFolder, getDriveBankStatus } = require('./src/drive-bank');
const {
  loadAiConfig,
  saveAiConfig,
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
    const testExportDir = path.join(BUNDLED_DATA_DIR, 'exports');
    if (!fs.existsSync(testExportDir)) {
      fs.mkdirSync(testExportDir, { recursive: true });
    }
    return BUNDLED_DATA_DIR;
  } catch (_) {
    return path.join(os.tmpdir(), 'matrixedu_data');
  }
}

const DATA_DIR = resolveWritableRoot();
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');

// Khởi tạo các thư mục dữ liệu an toàn (Hỗ trợ cả môi trường Read-Only Serverless như Vercel)
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

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
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

function maskApiKey(key) {
  if (!key || key.length < 8) return '';
  return key.slice(0, 4) + '••••••••••••' + key.slice(-4);
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // 2. API Kiểm tra trạng thái & Cấu hình AI (Không lộ khóa bí mật)
    if (req.method === 'GET' && pathname === '/api/health') {
      const cfg = loadAiConfig();
      sendJson(res, 200, {
        ok: true,
        app: 'AI RA ĐỀ KIỂM TRA TỰ ĐỘNG',
        aiConfig: {
          provider: cfg.provider,
          model: cfg.model,
          baseUrl: cfg.baseUrl,
          hasKey: cfg.hasKey,
          maskedKey: maskApiKey(cfg.apiKey)
        }
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/ai-config') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const updated = saveAiConfig(body);
      sendJson(res, 200, {
        ok: true,
        message: updated.hasKey
          ? `Đã lưu cấu hình AI (${updated.provider.toUpperCase()} - ${updated.model}) an toàn trên máy chủ.`
          : 'Đã cập nhật cấu hình AI (chế độ Bộ máy Tri thức Nội bộ).',
        aiConfig: {
          provider: updated.provider,
          model: updated.model,
          baseUrl: updated.baseUrl,
          hasKey: updated.hasKey,
          maskedKey: maskApiKey(updated.apiKey)
        }
      });
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
    if (req.method === 'GET' && pathname === '/api/workspace-files') {
      const rootFiles = fs.readdirSync(__dirname)
        .filter(f => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$') && f.toLowerCase() !== 'prompt.docx');
      sendJson(res, 200, { ok: true, files: rootFiles });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/load-workspace-file') {
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
      const limit = Math.min(500, Math.max(1, parseInt(parsedUrl.searchParams.get('limit') || '200', 10)));
      
      let list = [];
      if (type === 'mcq') list = bank.mcqQuestions;
      else if (type === 'tf') list = bank.tfQuestions;
      else if (type === 'sa') list = bank.saQuestions;
      else list = [...bank.mcqQuestions, ...bank.tfQuestions, ...bank.saQuestions];

      if (file) {
        list = list.filter(q => q.sourceFile === file);
      }

      sendJson(res, 200, {
        ok: true,
        total: list.length,
        questions: list.slice(0, limit)
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/drive-bank/sync') {
      let bodyData = {};
      try {
        const raw = await readRequestBody(req);
        if (raw) bodyData = JSON.parse(raw);
      } catch (_) {}

      const folderUrl = (bodyData.folderUrl || '').trim();
      try {
        const result = await syncGoogleDriveFolder(folderUrl);
        sendJson(res, 200, result);
      } catch (err) {
        console.error('[POST /api/drive-bank/sync] Error:', err.message);
        sendJson(res, 400, { ok: false, message: 'Lỗi đồng bộ thư mục Google Drive: ' + err.message });
      }
      return;
    }

    // 4. API Tải lên và bóc tách tài liệu (.docx, .pdf, .txt, .md, hình ảnh)
    if (req.method === 'POST' && pathname === '/api/upload-doc') {
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
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = await step1AnalyzeMaterial(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 6. BƯỚC 2: Lập Ma trận đề kiểm tra
    if (req.method === 'POST' && pathname === '/api/step2-matrix') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = await step2GenerateMatrix(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 7. BƯỚC 3: Tạo Bản đặc tả đề kiểm tra
    if (req.method === 'POST' && pathname === '/api/step3-spec') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = step3GenerateSpecification(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 8. BƯỚC 4 & 5: Soạn Đề kiểm tra, Trộn Mã đề & Tạo Đáp án + Kiểm định QA
    if (req.method === 'POST' && pathname === '/api/step4-exam') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = await step4GenerateQuestionsAndAnswers(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 9. Tạo lại hoặc Đổi nhanh 1 câu hỏi đơn lẻ từ Ngân hàng đề / AI
    if (req.method === 'POST' && pathname === '/api/regenerate-question') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = await regenerateSingleQuestion(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 9b. Truy xuất danh sách câu hỏi ứng viên từ Ngân hàng đề để đổi/chọn lại câu hỏi ở Bước 4
    if (req.method === 'POST' && pathname === '/api/bank-candidates') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const result = getCandidateQuestionsForSwap(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    // 10. Trộn & Nhân bản mã đề
    if (req.method === 'POST' && pathname === '/api/shuffle-variants') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const rawCodes = body.customCodes;
      const customCodes = Array.isArray(rawCodes) ? rawCodes : (typeof rawCodes === 'string' ? rawCodes.split(/[,;\s]+/).filter(Boolean) : []);
      const variants = generateShuffledVariants(body.questions || [], body.numVariants || 4, body.startCode || 101, customCodes);
      sendJson(res, 200, { ok: true, variants });
      return;
    }

    // 11. Kiểm định chất lượng 4 chiều (Ma trận - Đặc tả - Đề - Đáp án) & Kiểm tra phép tính độc lập
    if (req.method === 'POST' && pathname === '/api/validate-qa') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const qaReport = validateExamProfile(body);
      sendJson(res, 200, { ok: true, qaReport });
      return;
    }

    // 12. Xuất file Word (.docx) chuẩn khổ A4, Times New Roman 13-14pt
    if (req.method === 'POST' && pathname === '/api/export-docx') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const examData = body.examData || body;
      const mode = body.mode || 'full'; // 'full' | 'matrix' | 'spec' | 'exam' | 'answer'
      const variantCode = body.variantCode || null;

      const docxBuffer = generateExamDocx(examData, mode, variantCode);
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

      // Lưu bản sao vào thư mục data/exports để phục vụ đối chiếu
      try {
        fs.writeFileSync(path.join(EXPORTS_DIR, fileName), docxBuffer);
      } catch (_) {}

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
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

  const answerKeysByCode = {};
  variants.forEach(v => {
    const code = String(v.code || '101').trim();
    const p1 = [];
    const p2 = {};
    const p3 = {};
    (v.questions || []).forEach(q => {
      if (q.format === 'mcq' || q.type === 'MCQ' || (!q.format && q.options?.length === 4)) {
        const rawAns = String(q.answer || q.correctAnswer || 'A').trim().toUpperCase();
        p1.push(['A', 'B', 'C', 'D'].includes(rawAns) ? rawAns : 'A');
      } else if (q.format === 'tf' || q.type === 'TF' || (!q.format && (q.statements?.length === 4 || q.subItems?.length === 4))) {
        const stmts = q.statements || q.subItems || [];
        const resolveTf = (item, fallback) => {
          if (!item) return fallback;
          if (typeof item.isTrue === 'boolean') return item.isTrue ? 'Đ' : 'S';
          if (typeof item.correctAnswer === 'string') return item.correctAnswer.toUpperCase().startsWith('S') ? 'S' : 'Đ';
          if (typeof item.answer === 'string') return item.answer.toUpperCase().startsWith('S') ? 'S' : 'Đ';
          return fallback;
        };
        p2[String(Object.keys(p2).length + 1)] = {
          a: resolveTf(stmts[0], 'Đ'),
          b: resolveTf(stmts[1], 'S'),
          c: resolveTf(stmts[2], 'Đ'),
          d: resolveTf(stmts[3], 'S')
        };
      } else if (q.format === 'short_answer' || q.type === 'SA') {
        p3[String(Object.keys(p3).length + 1)] = String(q.answer ?? q.correctAnswer ?? '');
      }
    });
    answerKeysByCode[code] = { part1: p1, part2: p2, part3: p3 };
  });

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
  const tfStyle = existingOmrCfg.pointRules?.tfStyle || 'fixed025';
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

    // 13. Quản lý Lưu trữ Hồ sơ đề kiểm tra (CRUD Profiles)
    if (req.method === 'GET' && pathname === '/api/profiles') {
      const profileMap = new Map();
      for (const dir of [BUNDLED_PROFILES_DIR, PROFILES_DIR]) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const f of files) {
          try {
            const fullP = path.join(dir, f);
            const content = JSON.parse(fs.readFileSync(fullP, 'utf8'));
            const omrCfg = extractOmrConfigFromProfile(content);
            const item = {
              id: content.id || f.replace(/\.json$/, ''),
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
      const id = pathname.split('/')[3].replace(/[^a-zA-Z0-9_\-]/g, '');
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

      try {
        if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
        fs.writeFileSync(path.join(PROFILES_DIR, `${id}.json`), JSON.stringify(cleanProfile, null, 2), 'utf8');
      } catch (_) {}
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
      const id = pathname.split('/')[3].replace(/[^a-zA-Z0-9_\-]/g, '');
      for (const dir of [PROFILES_DIR, BUNDLED_PROFILES_DIR]) {
        try {
          const filePath = path.join(dir, `${id}.json`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (_) {}
      }
      sendJson(res, 200, { ok: true, deletedId: id });
      return;
    }

    
    // ========================================================================
    // CHỨC NĂNG 7: CHẤM BÀI TRẮC NGHIỆM (PHIẾU TLTN 2025 BGD) & THỐNG KÊ - BÁO CÁO
    // ========================================================================

    // 14.0. Danh sách tất cả các Mẫu Phiếu Trả lời trắc nghiệm hỗ trợ
    if (req.method === 'GET' && pathname === '/api/omr/templates') {
      sendJson(res, 200, {
        ok: true,
        templates: getAllTemplates()
      });
      return;
    }

    // 14.1. Thông tin Phiếu TLTN chuẩn Bộ GD&ĐT và thông tin mẫu
    if (req.method === 'GET' && pathname === '/api/omr/template-info') {
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
          parsedRoster = parseStudentRosterText(body.rawText, { defaultClassName: targetClass || '12A1' });
        } else if (body.fileBase64 && body.fileName) {
          const buf = Buffer.from(body.fileBase64, 'base64');
          parsedRoster = parseStudentRosterFile(body.fileName, buf, { defaultClassName: targetClass || '12A1' });
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
        const firstClass = savedRoster[0]?.className || rostersSummary.activeClass || '12A1';
        sendJson(res, 200, {
          ok: true,
          roster: savedRoster,
          totalStudents: savedRoster.length,
          className: firstClass,
          rostersSummary,
          message: rostersSummary.classes.length > 1 && !targetClass && !body.resetDefault
            ? `Đã nạp thành công danh sách ${savedRoster.length} học sinh thuộc ${rostersSummary.classes.length} lớp!`
            : `Đã nạp thành công danh sách ${savedRoster.length} học sinh (Lớp ${firstClass})!`
        });
        return;
      } catch (err) {
        sendJson(res, 500, { ok: false, message: 'Lỗi phân tích danh sách học sinh: ' + err.message });
        return;
      }
    }

    // 14.1c2. Quản lý Kho Danh sách Nhiều Lớp (Rosters)
    if (req.method === 'GET' && pathname === '/api/omr/rosters') {
      sendJson(res, 200, {
        ok: true,
        ...listClassRostersSummary()
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/omr/rosters/select') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const summary = setActiveRosterClass(body.className || '12A1');
      sendJson(res, 200, {
        ok: true,
        ...summary,
        roster: summary.activeRoster
      });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/omr/rosters/')) {
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
      sendJson(res, 200, {
        ok: true,
        sessions: listSavedOmrSessions()
      });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/api/omr/sessions/')) {
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
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const snap = saveGradingSessionSnapshot({
        gradedPapers: body.gradedPapers || [],
        answerKeysByCode: body.answerKeysByCode || {},
        pointRules: body.pointRules || {},
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
        sessions: listSavedOmrSessions()
      });
      return;
    }

    if (req.method === 'DELETE' && pathname.startsWith('/api/omr/sessions/')) {
      const sessionId = pathname.split('/')[4];
      const deleted = deleteSavedOmrSession(sessionId);
      sendJson(res, 200, {
        ok: true,
        deleted,
        sessions: listSavedOmrSessions()
      });
      return;
    }

    // 14.1b. Phục vụ ảnh Mẫu phiếu TLTN theo templateId (Hỗ trợ 4 mẫu: BGD 4 số, BGD 3 số, Tổng hợp, Rọc phách)
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/api/omr/template-image' || pathname === '/api/omr/template-sheet-image')) {
      const templateId = parsedUrl.searchParams.get('templateId') || 'bgd_2025_4code';
      const template = getTemplateById(templateId);

      // Tìm file ảnh theo template: kiểm tra thư mục data/omr_templates/, sau đó thư mục data, rồi thư mục gốc
      const candidatePaths = [
        path.join(__dirname, template.imageRelPath),
        path.join(BUNDLED_DATA_DIR, 'omr_templates', path.basename(template.imageRelPath)),
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
        const isPng = targetPath.toLowerCase().endsWith('.png');
        const stat = fs.statSync(targetPath);
        res.writeHead(200, {
          'Content-Type': isPng ? 'image/png' : 'image/jpeg',
          'Content-Length': stat.size,
          'Cache-Control': 'public, max-age=86400'
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

    // 14.1d. Tải file Phôi Phiếu Trắng in ấn (PDF / Docx) theo templateId
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/api/omr/download-blank-template' || pathname === '/api/omr/template-pdf')) {
      const templateId = parsedUrl.searchParams.get('templateId') || 'bgd_2025_4code';
      const template = getTemplateById(templateId);

      const candidateFiles = [
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

        sendJson(res, 200, {
          ok: true,
          answerKeysByCode: answerKeys,
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
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      let answerKeysByCode = body.answerKeysByCode || {};
      let pointRules = body.pointRules || { mcq: 0.25, tfStyle: 'fixed025' };
      const targetClassName = String(body.className || '').trim();
      const roster = Array.isArray(body.roster) && body.roster.length > 0
        ? body.roster
        : getActiveRoster(targetClassName && targetClassName !== '__ALL__' ? targetClassName : null);

      if (!body.useSampleBatch && (!answerKeysByCode || Object.keys(answerKeysByCode).length === 0)) {
        sendJson(res, 400, {
          ok: false,
          message: 'Chưa có Biểu đáp án mã đề! Vui lòng chọn một Đề thi từ Kho đề hoặc nạp file Đáp án trước khi bấm Chấm.'
        });
        return;
      }

      let papers = body.papers;
      if (!Array.isArray(papers) || papers.length === 0 || body.useSampleBatch) {
        // Sinh lô bài làm học sinh khớp chuẩn 100% với các mã đề thực tế đã tạo (101, 102, ...)
        papers = generateSampleBatchPapers(answerKeysByCode, roster);
      }

      const gradeResult = gradeBatchPapers({
        papers,
        answerKeysByCode,
        pointRules,
        roster,
        targetClassName
      });

      // Tự động lưu snapshot ca chấm vào data/omr_database (gắn Đề × Lớp nếu có examId)
      let savedSession = null;
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
      } catch (_) {}

      sendJson(res, 200, {
        ok: true,
        ...gradeResult,
        answerKeysByCode,
        pointRules,
        roster,
        sessionId: savedSession ? savedSession.id : null,
        savedSession,
        auditLogs: getAuditLogs()
      });
      return;
    }

    // 14.4. Hiệu chỉnh bài thi học sinh & Ghi nhận Lưu vết (Audit Trail)
    if (req.method === 'POST' && pathname === '/api/omr/update-paper') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const { paperId, updates, allPapers, answerKeysByCode, pointRules, roster, user, sessionId } = body;

      if (!paperId || !updates || !Array.isArray(allPapers)) {
        sendJson(res, 400, { ok: false, message: 'Dữ liệu hiệu chỉnh bài thi không hợp lệ!' });
        return;
      }

      const result = updatePaperAndAudit({
        paperId,
        updates,
        allPapers,
        answerKeysByCode: answerKeysByCode || {},
        pointRules: pointRules || {},
        roster: Array.isArray(roster) && roster.length > 0 ? roster : getActiveRoster(),
        user: user || 'Giáo viên bộ môn'
      });

      if (sessionId) {
        syncSessionPapers(sessionId, allPapers);
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
      const examId = parsedUrl.searchParams.get('examId') || '';
      const report = aggregateGradeReportByExam(examId);
      sendJson(res, 200, report);
      return;
    }

    // 14.5. Lấy toàn bộ lịch sử Lưu vết can thiệp (Audit Trail)
    if (req.method === 'GET' && pathname === '/api/omr/audit-logs') {
      sendJson(res, 200, {
        ok: true,
        auditLogs: getAuditLogs()
      });
      return;
    }

    // 14.6. Đồng bộ CSDL Chấm thi & Lưu vết vào Thư mục Google Drive
    if (req.method === 'POST' && pathname === '/api/omr/sync-gdrive') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const folderId = body.folderId || '1wcSRCsZ9wzjO9ypblF_9L4si9kPm_uop';
      const gradedPapers = body.gradedPapers || [];
      const metadata = body.metadata || {};
      const answerKeysByCode = body.answerKeysByCode || {};
      const pointRules = body.pointRules || {};

      const syncRes = syncOmrDatabaseToGoogleDrive({ folderId, gradedPapers, metadata, answerKeysByCode, pointRules });
      sendJson(res, 200, syncRes);
      return;
    }

    // 14.7. Xuất Bảng điểm lớp hoặc Toàn khối dạng CSV (tương thích Microsoft Excel UTF-8 BOM)
    if (req.method === 'POST' && pathname === '/api/omr/export-roster-csv') {
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

    sendJson(res, 404, { ok: false, message: `Không tìm thấy đường dẫn API: ${pathname}` });
  } catch (err) {
    sendJson(res, 500, { ok: false, message: err.message || 'Lỗi máy chủ nội bộ.' });
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

