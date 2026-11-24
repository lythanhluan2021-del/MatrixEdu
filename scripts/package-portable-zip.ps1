<#
.SYNOPSIS
  Đóng gói MatrixEdu Windows Portable — chuyển tiếp sang scripts/build-windows-exe.ps1.
.DESCRIPTION
  GĐ6 (P2-04): script cũ ở file này đã bị LOẠI BỎ HOÀN TOÀN vì không an toàn:
  nó sao chép NGUYÊN thư mục data/ (gồm ngân hàng câu hỏi kèm đáp án,
  danh sách lớp, CSDL chấm, ai_config.json chứa khóa AI, admin_auth.json),
  sao chép cả file đề thật ở thư mục gốc ("TIN 12 - MA TRAN KTGK 1.docx"),
  và nhúng node.exe lấy từ máy hệ thống KHÔNG kiểm tra checksum.
  Đó chính là các lỗi P2-04 / P0-06 / P0-08 đã sửa ở GĐ0 — không được tái phát.

  File này nay chỉ là lớp chuyển tiếp mỏng: mọi việc đóng gói thực tế do
  scripts/build-windows-exe.ps1 thực hiện (biên dịch MatrixEdu.exe bằng
  csc.exe, chỉ sao chép data/ sạch theo danh sách trắng, tải Node.js chính
  thức và kiểm tra SHA-256 với SHASUMS256.txt).
  Lệnh `npm run package:portable` vẫn gọi file này nên không cần đổi package.json.
#>
param(
  [string]$NodeVersion = "24.14.1",
  [switch]$SkipZip
)

$ErrorActionPreference = 'Stop'
$buildScript = Join-Path $PSScriptRoot "build-windows-exe.ps1"
if (-not (Test-Path $buildScript)) {
  throw "Khong tim thay script dong goi an toan: $buildScript"
}
Write-Host "package-portable-zip.ps1 chi chuyen tiep sang build-windows-exe.ps1 (ban cu da bi loai bo o GD6 vi sao chep toan bo data/ kem dap an + khoa AI)."
$forwardArgs = @("-NodeVersion", $NodeVersion)
if ($SkipZip) { $forwardArgs += "-SkipZip" }
& powershell -ExecutionPolicy Bypass -File $buildScript @forwardArgs
if ($LASTEXITCODE -ne 0) { throw "Dong goi that bai (ma loi $LASTEXITCODE)." }
