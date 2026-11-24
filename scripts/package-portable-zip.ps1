$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $rootDir "dist"
$portableDir = Join-Path $distDir "MatrixEdu_Portable"
$zipPath = Join-Path $distDir "MatrixEdu_Windows_Portable.zip"

# 1. Đảm bảo MatrixEdu.exe đã được biên dịch
$exePath = Join-Path $rootDir "MatrixEdu.exe"
if (-not (Test-Path $exePath)) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "build-windows-exe.ps1")
}

# 2. Làm sạch thư mục đóng gói
if (Test-Path $portableDir) {
  Remove-Item -Recurse -Force $portableDir
}
New-Item -ItemType Directory -Force -Path $portableDir | Out-Null

# 3. Sao chép các tệp cốt lõi của ứng dụng
$coreFiles = @(
  "MatrixEdu.exe",
  "server.js",
  "index.html",
  "package.json",
  "favicon.ico",
  "favicon.png",
  "favicon.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-64x64.png",
  "apple-touch-icon.png",
  "TIN 12 - MA TRAN KTGK 1.docx"
)

foreach ($f in $coreFiles) {
  $srcFile = Join-Path $rootDir $f
  if (Test-Path $srcFile) {
    Copy-Item -Path $srcFile -Destination (Join-Path $portableDir $f) -Force
  }
}

# 4. Sao chép thư mục mã nguồn src/
Copy-Item -Path (Join-Path $rootDir "src") -Destination (Join-Path $portableDir "src") -Recurse -Force

# 5. Sao chép thư mục dữ liệu chuẩn data/ (loại bỏ dữ liệu tạm/cá nhân nếu cần, giữ nguyên phôi phiếu OMR & ngân hàng đề)
$destData = Join-Path $portableDir "data"
Copy-Item -Path (Join-Path $rootDir "data") -Destination $destData -Recurse -Force

# 6. Nhúng sẵn bộ chạy Node.js (runtime/node.exe) để máy đồng nghiệp KHÔNG CẦN cài đặt Node.js
$runtimeDir = Join-Path $portableDir "runtime"
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$nodePath = (Get-Command node -ErrorAction Stop).Source
Write-Host "📦 Đang nhúng bộ chạy độc lập Node.js từ: $nodePath ..."
Copy-Item -Path $nodePath -Destination (Join-Path $runtimeDir "node.exe") -Force

# 7. Tạo tệp Hướng dẫn sử dụng nhanh cho đồng nghiệp
$readmeContent = @"
================================================================================
   HƯỚNG DẪN SỬ DỤNG PHẦN MỀM MATRIXEDU (BẢN PORTABLE CHẠY NGAY TRÊN WINDOWS)
================================================================================

1. CÁCH MỞ PHẦN MỀM:
   - Bước 1: Giải nén toàn bộ tệp "MatrixEdu_Windows_Portable.zip" ra một thư mục
             trên máy tính (ví dụ: D:\MatrixEdu_Portable hoặc Desktop).
             (Lưu ý: Hãy giải nén ra thư mục trước khi chạy, không chạy trực tiếp
             bên trong cửa sổ giải nén WinRAR/7-Zip).
   - Bước 2: Mở thư mục vừa giải nén và nhấp đúp vào tệp:
             👉 MatrixEdu.exe (có biểu tượng chữ M màu xanh)
   - Bước 3: Phần mềm sẽ tự động bật máy chủ nội bộ và mở ngay cửa sổ làm việc.
             (Có thể bấm nút "📌 Tạo icon ra Màn hình Desktop" trên bảng điều khiển
             để lần sau mở trực tiếp từ màn hình nền).

2. ƯU ĐIỂM CỦA BẢN ĐÓNG GÓI NÀY:
   - Đã tích hợp sẵn toàn bộ bộ chạy (runtime/node.exe), phôi phiếu chuẩn Bộ GD&ĐT
     và công cụ chấm OMR quang học.
   - Máy tính của Thầy/Cô đồng nghiệp KHÔNG CẦN cài đặt thêm bất kỳ phần mềm nào.
   - Hoạt động 100% độc lập trên máy tính cá nhân, không bị giới hạn hay chặn bởi
     máy chủ đám mây.
================================================================================
"@
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText((Join-Path $portableDir "HUONG_DAN_SU_DUNG.txt"), $readmeContent, $utf8Bom)

# 8. Nén thành tệp .ZIP duy nhất để gửi qua Zalo / Google Drive / USB
if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}
Write-Host "🗜️ Đang nén gói chia sẻ MatrixEdu_Windows_Portable.zip ..."
Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($portableDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$zipInfo = Get-Item $zipPath
Write-Host "🎉 HOÀN TẤT ĐÓNG GÓI BẢN CHIA SẺ CHO ĐỒNG NGHIỆP:"
Write-Host "   📁 Thư mục chạy ngay : $portableDir"
Write-Host "   📦 File nén chia sẻ  : $($zipInfo.FullName) ($([math]::Round($zipInfo.Length / 1MB, 1)) MB)"
