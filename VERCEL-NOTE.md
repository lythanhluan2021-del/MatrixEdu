# Ghi chú đối chiếu cấu hình Vercel (GĐ0 — P2-05)

Ngày ghi: 2026-11-24. Trạng thái: **chưa xác minh hết** — phần dưới chỉ ghi lại
những gì đọc được từ `vercel.json` trong repo và từ hành vi đã quan sát trên
trang live `https://matrixeducation.vercel.app/`. Cần đối chiếu trực tiếp trên
Vercel dashboard trước khi kết luận.

## Những gì `vercel.json` trong repo đang có

- Chỉ có 3 rewrite, tất cả đều trỏ về `/api/[...slug]`:
  - `/favicon:slug*` → `/api/[...slug]`
  - `/apple-touch-icon:slug*` → `/api/[...slug]`
  - `/api/:slug*` → `/api/[...slug]`
- **Không có rewrite nào cho `/`, `/login`, hay bất kỳ route lạ nào ngoài `/api`.**
- `functions.api/**/*.js.includeFiles` gom cả `*.docx, *.pdf, *.jpg, *.png` ở
  thư mục gốc cùng `src/**` và `data/**` vào bundle của function.
- Không có mục `headers` (không CSP/HSTS), không có `maxDuration`.

## Điểm lệch đã quan sát (chưa giải thích được bằng repo)

- Trên trang live, các route lạ như `/login` hay `/khong-ton-tai-xyz` trả về
  JSON thô `{"ok":false,"message":"Không tìm thấy đường dẫn API: ..."}` thay
  vì trang 404. Theo `vercel.json` trong repo, các route này không hề được
  rewrite tới `requestHandler` trong `server.js`, nên không thể trả JSON từ
  `server.js:1282`.
- Kết luận tạm thời: **cấu hình deploy thực tế trên Vercel khác với
  `vercel.json` trong repo** (có thể do cấu hình đặt trực tiếp trên dashboard,
  hoặc do remote `matrixeducation` trỏ tới một repo khác với `MatrixEdu`).
  Cần kiểm tra trên Vercel dashboard: Project Settings → Domains, Functions,
  và xem project đang deploy từ repo/branch nào.

## Cập nhật GĐ4 (P2-05) — 2026-11-24

- `server.js` nay có trang 404 thân thiện: mọi đường dẫn **không phải
  `/api/*`** mà tới được `requestHandler` sẽ nhận trang HTML 404 tiếng Việt
  (nút "Về trang chính MatrixEdu") thay vì JSON thô; `/api/*` lạ vẫn trả
  JSON 404 như cũ để client xử lý bằng máy. Đường dẫn người dùng gõ được
  escape trước khi in ra trang 404 (tránh XSS qua thanh địa chỉ).
- **Giới hạn đã biết:** trang 404 này chỉ hiện khi request được rewrite tới
  function. `vercel.json` trong repo vẫn chỉ rewrite `/api/*`, `/favicon*`,
  `/apple-touch-icon*` — không đổi trong GĐ4 vì cấu hình deploy thực tế trên
  Vercel vẫn chưa đối chiếu với dashboard (xem mục "Điểm lệch" ở trên). Trên
  bản **localhost (bản chính theo QĐ1)** trang 404 luôn hoạt động. Nếu muốn
  trang 404 cũng hiện trên Vercel cho mọi đường dẫn lạ, cần thêm rewrite
  `{"source": "/:path*", "destination": "/api/[...slug]"}` vào `vercel.json`
  **hoặc** cấu hình tương đương trên dashboard — quyết định này để cho đợt
  đối chiếu dashboard, không tự sửa trong GĐ4 vì có thể đổi hành vi deploy.

## Quyết định theo kế hoạch (QĐ1)

- Bản chính là **Windows portable chạy localhost**; Vercel chỉ là bản giới
  thiệu/demo. Sau GĐ1, mọi API nhạy cảm trên Vercel đều yêu cầu đăng nhập,
  và dữ liệu chấm thật không lưu trên Vercel.
- Không sửa `vercel.json` trong GĐ0; việc đồng bộ cấu hình Vercel (nếu cần)
  làm sau khi đối chiếu dashboard, ghi kết quả bổ sung vào file này.

## Lưu ý về dữ liệu đã từng công khai

- Các file đề thi thật ở thư mục gốc và ngân hàng câu hỏi kèm đáp án đã từng
  được commit lên repo công khai và hiển thị trên Vercel. Coi toàn bộ đề và
  ngân hàng đó là **đã lộ**: không dùng lại cho kiểm tra thật. GĐ0 đã gỡ
  chúng khỏi chỉ mục git và chuyển file đề gốc ra thư mục lưu trữ ngoài repo
  (`~/workspace/matrixedu-fix-archived-exams/` trên máy làm việc); lịch sử
  git cũ vẫn còn chứa chúng cho đến khi có quyết định rewrite history riêng.
