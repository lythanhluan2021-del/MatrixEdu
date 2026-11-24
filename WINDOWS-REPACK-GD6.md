# ĐÓNG GÓI LẠI MATRIXEDU WINDOWS PORTABLE — HƯỚNG DẪN CHO ANTIGRAVITY (GĐ6)

Tài liệu này dành cho người chạy đóng gói trên máy Windows sau khi kéo code
mới nhất (đã bao gồm toàn bộ các vòng khắc phục GĐ0–GĐ6). Chỉ chạy trên
Windows — không biên dịch được trên Linux (không có csc.exe).

## 0. Trước khi chạy — kiểm tra nhanh

```powershell
git pull origin main
git log --oneline -3
git status --short
```

- Commit mới nhất phải là `chore(GD6)` (sau `fix(GD5g)`). Nếu chưa thấy, dừng
  lại và báo cho người phụ trách.
- `git status` phải sạch (không có file lạ). Tuyệt đối KHÔNG commit kèm
  `dist/`, `runtime/`, `*.exe`, `*.zip` — đã có trong `.gitignore`.
- Kiểm tra không còn file đề thật hay dữ liệu nhạy cảm trong repo:
  `data/ai_config.json`, `data/admin_auth.json`, `data/active_drive_bank.json`,
  `data/google_drive_bank/`, `data/profiles/profile_thpt_*.json` (hồ sơ đề thật),
  file `.docx`/`.pdf` đề thi ở thư mục gốc — tất cả đều KHÔNG được có trong
  repo (đã gỡ ở GĐ0). Nếu thấy file nào trong số đó, dừng lại và báo ngay.

## 1. Yêu cầu máy Windows

- Windows 10/11 64-bit, PowerShell 5.1 trở lên.
- .NET Framework 4.x (có sẵn trên Windows 10/11) để có `csc.exe`.
- Mạng internet để tải Node.js chính thức từ nodejs.org (script tự kiểm tra
  SHA-256 với file SHASUMS256.txt chính thức trước khi giải nén).
- Không cần cài Node.js trước — script tự tải và nhúng `runtime/node.exe`.
- Không cần cài thêm gì khác.

## 2. Chạy đóng gói (chỉ dùng script an toàn)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-windows-exe.ps1
```

- **CHỈ dùng script này.** Lệnh `npm run package:portable` nay đã chuyển
  tiếp sang script này (file `scripts/package-portable-zip.ps1` cũ từng sao
  chép nguyên thư mục `data/` kèm đáp án + khóa AI đã bị loại bỏ ở GĐ6).
- Script làm 4 việc: (1) biên dịch `src/desktop-launcher.cs` thành
  `MatrixEdu.exe` bằng `csc.exe`; (2) sao chép `index.html`, `server.js`,
  `src/*.js`, `public/`, favicon và `data/` SẠCH theo danh sách trắng (chỉ
  `omr_templates`, `sample_docs`, hồ sơ mẫu — KHÔNG ngân hàng kèm đáp án,
  KHÔNG danh sách lớp, KHÔNG CSDL chấm, KHÔNG khóa AI, KHÔNG mật khẩu);
  (3) tải Node.js v24.14.1 win-x64 chính thức, kiểm tra SHA-256 rồi nhúng
  `runtime/node.exe`; (4) nén thành `dist\MatrixEdu_Windows_Portable.zip`.
- Nếu script báo lỗi checksum SHA-256 không khớp thì DỪNG NGAY, không giải
  nén, và báo lại (không được bỏ qua bước kiểm tra này).

## 3. Kết quả mong đợi

- `MatrixEdu.exe` ở thư mục gốc (khoảng 20 KB).
- `dist\MatrixEdu_Portable\` chứa: `MatrixEdu.exe`, `index.html`, `server.js`,
  `package.json`, `src\` (chỉ file `.js`), `public\`, favicon, `data\`
  (chỉ `omr_templates`, `sample_docs`, hồ sơ mẫu), `runtime\node.exe`.
- `dist\MatrixEdu_Windows_Portable.zip` (khoảng 55–70 MB).
- Kiểm tra nhanh trong gói: mở `dist\MatrixEdu_Portable\data\` và xác nhận
  KHÔNG có `ai_config.json`, `admin_auth.json`, `active_drive_bank.json`,
  thư mục `google_drive_bank`, file `omr_*.json` hay `BANG_DIEM_*.csv`.
  Nếu có bất kỳ file nào trong số đó thì gói đã sai — dừng lại và báo ngay.

## 4. Kiểm tra nhanh sau khi đóng gói (smoke test)

1. Giải nén file ZIP ra một thư mục mới (ví dụ `D:\MatrixEdu_Portable`),
   KHÔNG chạy trực tiếp trong cửa sổ WinRAR/7-Zip.
2. Nhấp đúp `MatrixEdu.exe` — bảng điều khiển hiện ra, máy chủ khởi động
   ở `http://localhost:3000`, trình duyệt tự mở giao diện MatrixEdu.
3. Lần đầu mở: modal yêu cầu **đặt mật khẩu quản trị** (≥ 8 ký tự). Đặt mật
   khẩu và ghi nhớ — mật khẩu chỉ lưu trên máy này (đã mã hoá scrypt trong
   `data\admin_auth.json`), KHÔNG gửi đi đâu, KHÔNG chia sẻ cho người khác.
4. Đăng nhập bằng mật khẩu vừa đặt, đi qua 7 bước: Bước 1 nhập thông tin đề,
   Bước 2 xem mục 1.2 (Ma trận & Ngân hàng Drive), Bước 3 xem mục 1.3,
   Bước 4–6 xem trạng thái trống có thông báo rõ ràng, Bước 7 bấm
   **"Chấm thử 35 bài mẫu"** — phải chấm xong và hiện bảng điểm mẫu (không
   cần dữ liệu thật).
5. Thử tải lên 1 file `.docx` mẫu trong `data\sample_docs\` ở Bước 2 rồi bấm
   **Phân tích** — phải hiện thông báo rõ ràng (không được hiện toast lỗi
   `innerHTML` hay toast tự sinh đề).
6. Tắt phần mềm bằng nút "Dừng máy chủ & Thoát" ở khay hệ thống — tiến
   trình Node phải dừng theo (không còn chạy ngầm ở cổng 3000).

## 5. Những gì cần báo lại

- Ảnh chụp hoặc copy toàn bộ log của script đóng gói (đặc biệt dòng
  SHA-256 và kích thước file ZIP cuối cùng).
- Kết quả 6 bước kiểm tra nhanh ở mục 4 (đạt/rớt từng bước, kèm ảnh chụp
  nếu có bước nào rớt).
- Nếu bước nào rớt: ghi rõ bước, thông báo lỗi nguyên văn, và dừng lại —
  không tự sửa code rồi đóng gói tiếp.
- Sau khi kiểm tra đạt: đẩy tag đánh dấu trạng thái sau khắc phục:
  `git push origin v-sau-khac-phuc` (tag đã được tạo sẵn ở commit GĐ6).
- File ZIP thành phẩm KHÔNG commit lên GitHub (đã có trong `.gitignore`) —
  gửi qua Zalo / Google Drive / USB như trước.
