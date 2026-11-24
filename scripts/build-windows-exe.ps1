$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$csFile = Join-Path $rootDir "src\desktop-launcher.cs"
$icoFile = Join-Path $rootDir "favicon.ico"
$outExe = Join-Path $rootDir "MatrixEdu.exe"

# Ensure UTF-8 with BOM so csc.exe compiles Vietnamese text accurately
$rawText = [System.IO.File]::ReadAllText($csFile, [System.Text.Encoding]::UTF8)
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($csFile, $rawText, $utf8Bom)

$cscPath = Get-ChildItem "C:\Windows\Microsoft.NET\Framework64\*\csc.exe" | Select-Object -Last 1 -ExpandProperty FullName
if (-not $cscPath) {
  $cscPath = Get-ChildItem "C:\Windows\Microsoft.NET\Framework\*\csc.exe" | Select-Object -Last 1 -ExpandProperty FullName
}
if (-not $cscPath) {
  throw "Không tìm thấy trình biên dịch C# (csc.exe) của .NET Framework trên Windows."
}

Write-Host "🔨 Đang biên dịch MatrixEdu.exe bằng $cscPath ..."
& $cscPath /nologo /target:winexe /optimize+ "/out:$outExe" "/win32icon:$icoFile" /r:System.dll,System.Drawing.dll,System.Windows.Forms.dll "$csFile"
if ($LASTEXITCODE -ne 0) {
  throw "Biên dịch MatrixEdu.exe thất bại (mã lỗi $LASTEXITCODE)."
}

$exeInfo = Get-Item $outExe
Write-Host "✅ Đã đóng gói thành công: $($exeInfo.FullName) ($([math]::Round($exeInfo.Length / 1KB, 1)) KB)"
