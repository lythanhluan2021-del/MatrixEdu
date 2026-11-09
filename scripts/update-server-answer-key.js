const fs = require('fs');
let serverCode = fs.readFileSync('server.js', 'utf8');

const targetPoint = '    // 14.3. Chấm theo lô (Batch Grading)';

const newEndpoint = `    // 14.2b. Phân tích & Nhập Biểu đáp án nạp từ bên ngoài (Excel, CSV, Text, Word, JSON)
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
          summary: \`Đã nhận diện thành công \${codes.length} mã đề (\${codes.join(', ')})\`
        });
        return;
      } catch (err) {
        sendJson(res, 500, { ok: false, message: 'Lỗi phân tích file đáp án: ' + err.message });
        return;
      }
    }

    // 14.3. Chấm theo lô (Batch Grading)`;

if (serverCode.includes(targetPoint)) {
  serverCode = serverCode.replace(targetPoint, newEndpoint);
  fs.writeFileSync('server.js', serverCode, 'utf8');
  console.log('Successfully added /api/omr/parse-answer-key to server.js');
} else {
  console.error('Target point not found in server.js');
}

