# AI RA ĐỀ KIỂM TRA TỰ ĐỘNG (TIỂU HỌC – THCS – THPT)

Ứng dụng WebApp chuyên nghiệp hỗ trợ giáo viên **Tiểu học, THCS và THPT** thực hiện trọn vẹn quy trình 6 bước:
**PHÂN TÍCH TÀI LIỆU → LẬP MA TRẬN → TẠO BẢN ĐẶC TẢ → SOẠN ĐỀ → TẠO ĐÁP ÁN & KIỂM ĐỊNH QA → XUẤT FILE WORD (.DOCX) KHỔ A4**.

---

## 1. CẤU TRÚC THƯ MỤC DỰ ÁN

- [`DESIGN.md`](file:///d:/WEB-APP/MT-DE-DA/DESIGN.md): Bản thiết kế kiến trúc hệ thống, quy trình nghiệp vụ 6 bước và cấu trúc dữ liệu (Câu lệnh 01).
- [`index.html`](file:///d:/WEB-APP/MT-DE-DA/index.html): Giao diện WebApp hoàn chỉnh (hỗ trợ cả Máy tính và Điện thoại di động).
- [`server.js`](file:///d:/WEB-APP/MT-DE-DA/server.js): Máy chủ ứng dụng Node.js xử lý kết nối AI bảo mật, đọc tài liệu, lưu trữ hồ sơ và xuất file Word `.docx`.
- [`src/zip-docx.js`](file:///d:/WEB-APP/MT-DE-DA/src/zip-docx.js): Bộ đọc và kết xuất file Word `.docx` chuẩn OpenXML (Khổ A4, Times New Roman cỡ 13–14pt, bảng biểu tự động vừa trang).
- [`src/doc-parser.js`](file:///d:/WEB-APP/MT-DE-DA/src/doc-parser.js): Bộ đọc tài liệu `.docx`, `.pdf`, `.txt`, `.md`, hình ảnh và bóc tách Chủ đề / Đơn vị kiến thức / Yêu cầu cần đạt.
- [`src/ai-engine.js`](file:///d:/WEB-APP/MT-DE-DA/src/ai-engine.js): Bộ máy tích hợp AI thực tế (Google Gemini / OpenAI / Anthropic Claude) kết hợp Bộ máy Tri thức Chuyên môn theo Thông tư 27/2020/TT-BGDĐT và Thông tư 22/2021 + Công văn 7991/BGDĐT-GDTrH.
- [`src/qa-validator.js`](file:///d:/WEB-APP/MT-DE-DA/src/qa-validator.js): Bộ kiểm định chất lượng 4 chiều (Ma trận ↔ Đặc tả ↔ Đề ↔ Đáp án), trộn mã đề và kiểm chứng phép tính độc lập.
- [`tests/run-qa-tests.js`](file:///d:/WEB-APP/MT-DE-DA/tests/run-qa-tests.js): Kịch bản kiểm thử tự động toàn diện cho 3 cấp học (7 môn học).
- [`QA_REPORT.md`](file:///d:/WEB-APP/MT-DE-DA/QA_REPORT.md): Báo cáo kết quả kiểm thử và thẩm định chuyên môn.
- [`data/sample_docs/`](file:///d:/WEB-APP/MT-DE-DA/data/sample_docs): Các tệp tài liệu Kế hoạch giáo dục (`.docx`) thực tế dùng để kiểm thử.
- [`data/exports/`](file:///d:/WEB-APP/MT-DE-DA/data/exports): Các tệp Hồ sơ Word (`.docx`) hoàn chỉnh đã kết xuất (gồm cả bản Trọn bộ hồ sơ và bản Đề học sinh không đáp án).

---

## 2. HƯỚNG DẪN CHẠY ỨNG DỤNG

### Yêu cầu môi trường
- **Node.js** (phiên bản 18 trở lên; máy hiện tại đã cài sẵn **Node.js v24.14.1**). Không cần cài đặt thêm thư viện ngoài.

### Khởi động máy chủ WebApp
Mở Terminal / PowerShell tại thư mục dự án `d:\WEB-APP\MT-DE-DA` và chạy:

```bash
npm start
```
*(hoặc chạy trực tiếp: `node server.js`)*

Sau đó mở trình duyệt truy cập địa chỉ:
👉 **http://localhost:3000**

### Chạy bộ kiểm thử tự động (QA Test Suite)
```bash
npm test
```

---

## 3. HƯỚNG DẪN CẤU HÌNH DỊCH VỤ AI (BẢO MẬT KHÓA API Ở MÁY CHỦ)

Khóa API được lưu trữ và gọi hoàn toàn ở phía máy chủ (`data/ai_config.json` hoặc biến môi trường), tuyệt đối không nhúng trong HTML trình duyệt:
1. **Cách 1 (Trực tiếp trên giao diện WebApp):**
   - Nhấn nút **`🔑 Cấu hình AI (Server)`** ở góc trên bên phải màn hình.
   - Chọn nhà cung cấp (**Google Gemini**, **OpenAI**, hoặc **Anthropic Claude**), nhập tên Model (ví dụ `gemini-2.5-flash` hoặc `gpt-4o-mini`) và nhập **API Key**, sau đó nhấn **Lưu cấu hình AI trên Máy chủ**.
2. **Cách 2 (Qua biến môi trường khi chạy Server):**
   ```powershell
   $env:GEMINI_API_KEY="AIzaSy..."; node server.js
   ```
3. **Chế độ dự phòng thông minh:** Khi chưa nhập API Key bên ngoài, hệ thống tự động vận hành bằng **Bộ máy Phân tích Tài liệu & Tri thức Chuyên môn Nội bộ** giúp giáo viên vẫn có thể phân tích tài liệu `.docx`/`.txt`, lập ma trận, tạo bản đặc tả, sinh đề, trộn mã đề và xuất file Word `.docx` ngay lập tức.

---

## 4. HƯỚNG DẪN SỬ DỤNG 6 BƯỚC DÀNH CHO GIÁO VIÊN

1. **Bước 1 – Phân tích Tài liệu:**
   - Chọn Cấp học (*Tiểu học*, *THCS*, *THPT*), Lớp, Môn học, Bộ sách, Kỳ kiểm tra, Thời lượng và Số mã đề.
   - Tải lên file `.docx`, `.pdf`, `.txt` (Kế hoạch giáo dục, SGK, mẫu ma trận của trường) hoặc nhấn **`📚 Kho Tài liệu & Đề mẫu (3 Cấp)`** để nạp nhanh 1 trong 7 kịch bản thực tế.
   - Kiểm tra, chỉnh sửa trực tiếp bảng **Đơn vị kiến thức & Yêu cầu cần đạt** rồi nhấn **Xác nhận & Chuyển sang Bước 2**.
2. **Bước 2 – Lập Ma trận:**
   - Chỉnh sửa trực tiếp số câu hỏi theo từng dạng thức (*TN nhiều lựa chọn*, *TN Đúng/Sai*, *TN Trả lời ngắn*, *Tự luận*) và mức độ (*Mức 1, Mức 2, Mức 3* cho Tiểu học; *Biết, Hiểu, Vận dụng* cho THCS/THPT).
   - Hệ thống tự động tính tổng số câu, tổng điểm dòng, tỷ lệ % từng mức độ và kiểm tra tổng điểm = 10,0 điểm.
3. **Bước 3 – Tạo Bản đặc tả:**
   - Xem và chỉnh sửa trực tiếp Yêu cầu cần đạt gắn với **Mã vị trí câu hỏi** khớp 1-1 với Ma trận.
4. **Bước 4 – Soạn Đề kiểm tra & Nhân bản Mã đề:**
   - Chỉnh sửa trực tiếp nội dung từng câu hỏi, phương án trả lời, mệnh đề Đúng/Sai, hoặc nhấn **`🔄 Tạo lại câu này bằng AI`** ở bất kỳ câu nào muốn đổi mới.
   - Nhấn **`🔀 Trộn & Nhân bản Mã đề`** để tạo các mã đề (101, 102, 103...) và nhấn **`👁️ Xem Bản in Đề Học sinh (Chuẩn A4)`** để kiểm tra bản in không đáp án.
5. **Bước 5 – Tạo Đáp án & Kiểm định Chất lượng (QA):**
   - Xem bảng đáp án tổng hợp tất cả các mã đề, hướng dẫn chấm tự luận, lời thoại bài nghe (Tapescript cho môn Tiếng Anh) và bảng **Kiểm chứng độc lập phép tính số học**.
6. **Bước 6 – Xuất File Word (`.docx`) & Lưu Hồ sơ:**
   - Tải xuống **Trọn bộ Hồ sơ (`.docx`)** hoặc tải riêng **Đề Học sinh không đáp án (`.docx`)**, **Ma trận (`.docx`)**, **Bản đặc tả (`.docx`)**, **Đáp án & HDC (`.docx`)**.

