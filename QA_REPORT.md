# BÁO CÁO KIỂM ĐỊNH CHẤT LƯỢNG (QA) — MatrixEdu sau khắc phục triệt để

**Ngày chạy:** 24/11/2026, 19:46 (+07). **Commit được kiểm tra:** `6d46b5a` (GĐ5h; commit GĐ6 sau đó chỉ thêm test/tài liệu/wrapper đóng gói, không đổi code sản phẩm). **Môi trường:** Node v24.22.1, Linux, bản clone `~/workspace/matrixedu-fix`. **Người chạy:** bộ kiểm tra tự động + kiểm chứng độc lập (không phải tự đánh giá của code).

> Tài liệu này thay thế hoàn toàn bản `QA_REPORT.md` cũ. Bản cũ khẳng định 7 kịch bản/35 docx/57 phép tính/"ĐẠT 100/100" mà không ghi ngày, không ghi commit, không có log — trong khi `tests/run-qa-tests.js` thực tế chỉ chạy 5 kịch bản THPT. Những khẳng định đó không còn giá trị.

## 1. Kịch bản đã chạy thật

- `npm test`: 5 kịch bản THPT — `thpt_math_12`, `thpt_eng_12`, `thpt_it_12`, `thpt_phys_12`, `thpt_chem_12` — **5/5 ĐẠT**.
- Số phép tính độc lập được kiểm chứng: **45 trong bản clone làm việc, 46 trong bản sao sạch** (chênh 1 phép tính ở kịch bản Tin 12 — xem §4; cả hai lần đều khớp 100%).
- 12 bộ gate theo vòng + bộ nghiệm thu độc lập: **469 kiểm chứng, 469 ĐẠT, 0 RỚT** (gd2 19, gd3 21, gd4 100, gd5c 32, gd5d 29, gd5e 31, gd5f 36, gd5g 51, gd5h 29, ui-token 17, formula 27, acceptance-gd6 77).
- Kiểm tra sạch: bản sao mới (không `.git`), `npm test` 5/5, server PORT 3200: GET / 200, `/api/health` đúng, API nhạy cảm chưa đăng nhập → 401, đường dẫn lạ → 404 HTML, không lỗi log.

## 2. Từng lỗi P0/P1/P2 — trạng thái ĐÃ SỬA + bằng chứng

- P0-01 Trộn đoán trước được → Fisher–Yates `crypto.randomInt`, không seed (gd2 19/19, acceptance A).
- P0-02 Đáp án thiếu mặc định A → cấm `|| 'A'` trên mọi đường đáp án, validator ném lỗi nêu tên câu (gd2, acceptance B).
- P0-03 Validator không kiểm tra đáp án biến thể → `validateVariantAnswers` đối chiếu từng biến thể với gốc (gd2, acceptance C).
- P0-04 Biến thể 101 không trộn thứ tự câu → mọi mã đề trộn cả trắc nghiệm và tự luận (gd2, acceptance A).
- P0-05 Không auth/rate-limit/CSP → scrypt + cookie httpOnly, auth 37 điểm gọi, CSP header (gd4, acceptance L).
- P0-06 Khóa AI ghi đè/kẻ trộm → xóa `POST /api/ai-config`, `/api/health` chỉ trả `hasKey` (gd4, acceptance L).
- P0-07 SSRF qua baseUrl → allowlist 3 domain + timeout 60s, khóa qua header (acceptance L).
- P0-08 Ngân hàng + đáp án công khai → strip đáp án (kể cả `explanation`) khi chưa đăng nhập (gd4, acceptance J).
- P0-09 Hồ sơ/roster/điểm OMR mở → auth + chấm lại phía máy chủ theo khóa và quy tắc máy chủ (gd2, acceptance E: điểm giả 9.9 → trả đúng 2.0đ).
- P0-10 XSS → `escapeHtml` thoát `'`, rà soát 108 điểm `innerHTML`, `safeDriveFolderUrl` (gd4 100/100, acceptance I).
- P1-01 Ba cách chấm Đúng/Sai → một hàm `src/scoring.js` (0/0.1/0.25/0.5/1.0), `fixed025` bị máy chủ bỏ qua (gd2, acceptance D).
- P1-02 Số ý Đúng/Sai lẻ sinh thêm câu → chặn 400 `TF_ITEMS_NOT_MULTIPLE_OF_4` (gd2).
- P1-03 Gộp ý qua dòng ma trận → nhóm chặt trong một dòng (gd2).
- P1-04 Ngữ văn 5 đơn vị 10đ thành 28đ → chia điểm luận theo tỉ lệ Hiểu:Vận dụng, mọi số đơn vị 3–6 đều tổng 10.0 (gd2, acceptance D).
- P1-05 % mức độ tổng 101% → làm tròn phần dư lớn nhất, 200 ma trận ngẫu nhiên luôn tổng 100 (gd2, acceptance D).
- P1-06 PDF quét cho chữ giữ chỗ → từ chối 400 `PDF_UNREADABLE` (gd3, acceptance F).
- P1-07 Đáp án mẫu chung chung lọt validator → chặn, yêu cầu đáp án thật (gd3, acceptance F).
- P1-08 Mất dữ liệu trên Vercel → chế độ demo 503 `DEMO_MODE_READONLY`, ghi nguyên tử + sao lưu ngày (gd3, acceptance N).
- P1-09 Đồng bộ Drive báo thành công giả → timeout 30s, giới hạn kích thước, lỗi thật + mã 502/503 (gd3, acceptance G).
- P1-10 Xuất file traversal + mất lặng → tên file khử trùng, tạo `EXPORTS_DIR`, lỗi 500 thật (gd3, acceptance H).
- P2-01 162 vs 804 → số liệu trực tiếp từ `/api/drive-bank/status`, giới hạn modal 200→2000 (gd4, acceptance J).
- P2-02 Báo cáo QA không đáng tin → **chính tài liệu này**, viết từ lần chạy thật ngày 24/11/2026 (xem §1, §4).
- P2-03 Roster mẫu chứa tên/ngày sinh thật → thay bằng "Học sinh Mẫu 01…35" (GĐ0).
- P2-04 `.gitignore` thiếu + commit file đề thật → đã dọn (GĐ0); **tái phạm trong `scripts/package-portable-zip.ps1` đã sửa ở GĐ6** (wrapper ủy quyền cho `build-windows-exe.ps1`).
- P2-05 404 JSON thô → trang 404 HTML thân thiện, `/api/*` vẫn JSON 404 (gd4, acceptance L).
- UI (GĐ5–GĐ5h): hệ thống nhận diện Matrix Blue/Amber, 0 màu ngoài token, 0 emoji, 0 gradient; công thức OMML/LaTeX; 1.2/1.3 dời sang Bước 2/3; nút chuyển bước chỉ chuyển trang; thuật ngữ "Soạn đề" thống nhất (gd5h 29/29); ID thư mục Drive ẩn khỏi ô nhập (gd5h); nút đầu trang ổn định theo `/api/auth/status` (gd5h).

## 3. Những gì KHÔNG claiming 100%

- **Không còn khẳng định "100%" chung chung.** Con số duy nhất là kết quả đếm được ở §1.

## 4. Lưu ý về số phép tính 45 vs 46 (đã tìm ra nguyên nhân)

`npm test` đếm số câu hỏi có gắn biểu thức kiểm định `mathVerify`. Bản clone làm việc cho 45, bản sao sạch (chỉ file được git theo dõi) cho 46 (kịch bản Tin 12: 5 so với 6), cả hai đều khớp 100%.

Nguyên nhân đã xác định bằng chia đôi (bisect): **sự hiện diện của thư mục `data/google_drive_bank/`** — gói ngân hàng Drive cục bộ, bị git bỏ qua, có trong bản clone làm việc nhưng không có trong bản sao sạch. Khi thư mục này tồn tại, quá trình sinh đề lấy 1 câu Tin 12 từ ngân hàng Drive (câu này không gắn `mathVerify`) thay cho 1 câu từ ngân hàng tĩnh trong code (có gắn `mathVerify`), nên tổng giảm 1. Cơ chế trong code: `src/drive-bank.js:19,29,36` — bộ nạp ngân hàng ưu tiên `data/google_drive_bank` khi thư mục tồn tại; `src/ai-engine.js:16` dùng `loadDriveQuestionBank` khi sinh đề.

Đã loại trừ bằng thực nghiệm: chép riêng từng phần của `data/` sang bản sao sạch — `profiles/`, `sample_docs/`, `exports/`, `drive_files_map.json`, `drive_folder.html`, `active_drive_bank.json` đều không đổi kết quả; chỉ riêng `data/google_drive_bank/` đổi 46 → 45.

Đây **không phải lỗi code**: cả hai môi trường đều khớp 100% mọi phép tính được kiểm chứng; chỉ là đầu vào của bộ kiểm tra phụ thuộc vào dữ liệu ngân hàng cục bộ có mặt trên máy hay không. Hệ quả thực hành: khi chạy `npm test` trên máy có ngân hàng Drive đầy đủ thì con số chuẩn là **45**; trên bản sao sạch (không có ngân hàng) là **46**.

## 5. CHƯA kiểm chứng được

- Kiểm tra XSS bằng trình duyệt thật (cần đăng nhập quản trị + nhập roster độc hại) — đã chuẩn bị file `~/workspace/matrixedu-xss-test-roster.csv` để thử trên bản portable localhost.
- Ảnh chụp UI-08: 7 bước × 3 kích thước màn hình — chưa có Chromium headless trong VM.
- Đóng gói Windows: cần máy Windows (không biên dịch được `.exe` trên Linux) — xem `WINDOWS-REPACK-GD6.md`.
- Đối chiếu cấu hình dashboard Vercel (P2-05) — xem `VERCEL-NOTE.md`.
- Gỡ bỏ `unsafe-inline` khỏi CSP — công việc viết lại lớn riêng, chưa làm.
- Nhãn nút đầu trang trong ~100ms đầu sau tải trang vẫn là chữ giữ "Quản trị" cho tới khi fetch trạng thái trả về.
- Đề Tin 10 không sinh được cho tới khi có đáp án TLN thật (đúng theo nguyên tắc 1 — không bịa đáp án).
- Ngân hàng demo trên Vercel đang trống (0 câu) cho tới khi dữ liệu ngân hàng được thêm lại một cách chủ ý.
- Quy tắc đáp án ngắn tiếng Anh chỉ kiểm tra độ dài (≤4 từ, ≤40 ký tự) nên một cụm chung chung ngắn có thể lọt — hạn chế nhỏ đã biết.
- Mật khẩu quản trị trên Vercel nằm trong `/tmp`, có thể mất sau mỗi lần triển khai lại và cần đặt lại.
