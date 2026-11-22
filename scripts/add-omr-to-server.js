const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, '..', 'server.js');
let content = fs.readFileSync(serverJsPath, 'utf8');

// 1. Add omr-engine require at the top
const omrRequire = `const {
  DEFAULT_CLASS_ROSTER,
  getAuditLogs,
  logAuditRecord,
  gradeSinglePaper,
  generateSampleBatchPapers,
  gradeBatchPapers,
  calculateBatchStatistics,
  updatePaperAndAudit,
  exportRosterToCsv,
  exportAuditLogsToCsv,
  syncOmrDatabaseToGoogleDrive
} = require('./src/omr-engine');
`;

if (!content.includes('src/omr-engine')) {
  content = content.replace("const { extractDocumentContent }", omrRequire + "const { extractDocumentContent }");
  console.log('✓ Added omr-engine require to server.js');
}

// 2. Add OMR Endpoints
const omrEndpoints = `
    // ========================================================================
    // CHỨC NĂNG 7: CHẤM BÀI TRẮC NGHIỆM (PHIẾU TLTN 2025 BGD) & THỐNG KÊ - BÁO CÁO
    // ========================================================================

    // 14.1. Thông tin Phiếu TLTN 2025 chuẩn Bộ GD&ĐT
    if (req.method === 'GET' && pathname === '/api/omr/template-info') {
      const pdfPath = path.join(__dirname, 'Phiếu TLTN 2025 mã đề 4 số đen trắng.pdf');
      const exists = fs.existsSync(pdfPath);
      sendJson(res, 200, {
        ok: true,
        fileName: 'Phiếu TLTN 2025 mã đề 4 số đen trắng.pdf',
        pdfUrl: '/api/omr/template-pdf',
        fileSize: exists ? fs.statSync(pdfPath).size : 0,
        description: 'Mẫu Phiếu trả lời trắc nghiệm chuẩn Bộ GD&ĐT 2025 (Mã đề 4 số, Số báo danh 6 số, Phần I, Phần II Đúng/Sai, Phần III Trả lời ngắn)',
        defaultRoster: DEFAULT_CLASS_ROSTER
      });
      return;
    }

    // 14.2. Xem / Tải file PDF Phiếu TLTN 2025 trực tiếp
    if (req.method === 'GET' && (pathname === '/api/omr/template-pdf' || decodeURIComponent(pathname).includes('Phiếu TLTN 2025'))) {
      const pdfPath = path.join(__dirname, 'Phiếu TLTN 2025 mã đề 4 số đen trắng.pdf');
      if (!fs.existsSync(pdfPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Không tìm thấy file Phiếu TLTN 2025');
        return;
      }
      const pdfBuffer = fs.readFileSync(pdfPath);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Phieu_TLTN_2025_BGD_MaDe4So.pdf"',
        'Content-Length': pdfBuffer.length
      });
      res.end(pdfBuffer);
      return;
    }

    // 14.3. Chấm theo lô (Batch Grading)
    if (req.method === 'POST' && pathname === '/api/omr/grade-batch') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const answerKeysByCode = body.answerKeysByCode || {};
      const pointRules = body.pointRules || { mcq: 0.25, tfStyle: 'moet2025' };
      const roster = Array.isArray(body.roster) && body.roster.length > 0 ? body.roster : DEFAULT_CLASS_ROSTER;

      let papers = body.papers;
      if (!Array.isArray(papers) || papers.length === 0 || body.useSampleBatch) {
        // Sinh lô bài làm học sinh mô phỏng (gồm 35 học sinh kèm các ca có vấn đề thực tế để kiểm thử)
        papers = generateSampleBatchPapers(answerKeysByCode, roster);
      }

      const gradeResult = gradeBatchPapers({
        papers,
        answerKeysByCode,
        pointRules,
        roster
      });

      sendJson(res, 200, {
        ok: true,
        ...gradeResult,
        auditLogs: getAuditLogs()
      });
      return;
    }

    // 14.4. Hiệu chỉnh bài thi học sinh & Ghi nhận Lưu vết (Audit Trail)
    if (req.method === 'POST' && pathname === '/api/omr/update-paper') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const { paperId, updates, allPapers, answerKeysByCode, pointRules, user } = body;

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
        user: user || 'Giáo viên bộ môn'
      });

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

      const syncRes = syncOmrDatabaseToGoogleDrive({ folderId, gradedPapers, metadata });
      sendJson(res, 200, syncRes);
      return;
    }

    // 14.7. Xuất Bảng điểm lớp dạng CSV (tương thích Microsoft Excel UTF-8 BOM)
    if (req.method === 'POST' && pathname === '/api/omr/export-roster-csv') {
      const raw = await readRequestBody(req);
      const body = JSON.parse(raw.toString('utf8') || '{}');
      const gradedPapers = body.gradedPapers || [];
      const metadata = body.metadata || {};

      const csvContent = exportRosterToCsv(gradedPapers, metadata);
      const csvBuffer = Buffer.from(csvContent, 'utf8');

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Bang_Diem_Lop_TLTN_2025.csv"',
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
`;

if (!content.includes('/api/omr/grade-batch')) {
  // Chèn vào trước dòng sendJson(res, 404, ...)
  content = content.replace("sendJson(res, 404, { ok: false, message: `Không tìm thấy đường dẫn API: ${pathname}` });", omrEndpoints + "\n    sendJson(res, 404, { ok: false, message: `Không tìm thấy đường dẫn API: ${pathname}` });");
  fs.writeFileSync(serverJsPath, content, 'utf8');
  console.log('✓ Injected OMR endpoints into server.js successfully!');
} else {
  console.log('OMR endpoints already present in server.js');
}

