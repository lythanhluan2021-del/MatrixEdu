<#
.SYNOPSIS
  Build MatrixEdu.exe and package a clean Windows Portable ZIP from a fresh Git clone.
.DESCRIPTION
  1. Compiles src/desktop-launcher.cs into MatrixEdu.exe using .NET Framework 4.x csc.exe
     (/target:winexe /optimize+ with favicon.ico).
  2. Copies index.html, server.js, src/, public/, favicons, and clean data/ assets
     (strictly excluding ai_config.json, .env, real grading DB, rosters, custom OMR uploads, exports).
  3. Downloads official Portable Node.js (win-x64) and extracts runtime/node.exe
     (cached under runtime/ locally; never committed to Git).
  4. Compresses dist/MatrixEdu_Portable into dist/MatrixEdu_Windows_Portable.zip.
#>
param(
  [string]$NodeVersion = "24.14.1",
  [switch]$SkipZip
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$rootDir      = Split-Path -Parent $PSScriptRoot
$csFile       = Join-Path $rootDir "src\desktop-launcher.cs"
$icoFile      = Join-Path $rootDir "favicon.ico"
$outExe       = Join-Path $rootDir "MatrixEdu.exe"
$distDir      = Join-Path $rootDir "dist"
$portableDir  = Join-Path $distDir "MatrixEdu_Portable"
$zipPath      = Join-Path $distDir "MatrixEdu_Windows_Portable.zip"
$runtimeCache = Join-Path $rootDir "runtime"
$cachedNode   = Join-Path $runtimeCache "node.exe"

Write-Host "=== MatrixEdu Windows Portable Build (Node.js v$NodeVersion win-x64) ==="

# ----------------------------------------------------------------------------
# 1. Compile MatrixEdu.exe with .NET Framework 4.x csc.exe
# ----------------------------------------------------------------------------
if (-not (Test-Path $csFile)) {
  throw "Khong tim thay ma nguon launcher: $csFile"
}

$cscPath = Get-ChildItem "C:\Windows\Microsoft.NET\Framework64\v4.*\csc.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1 -ExpandProperty FullName
if (-not $cscPath) {
  $cscPath = Get-ChildItem "C:\Windows\Microsoft.NET\Framework\v4.*\csc.exe" -ErrorAction SilentlyContinue | Select-Object -Last 1 -ExpandProperty FullName
}
if (-not $cscPath) {
  throw "Khong tim thay trinh bien dich C# (csc.exe) trong .NET Framework 4.x tren Windows."
}

# Compile from a temporary UTF-8 BOM copy so Vietnamese UI strings compile accurately without modifying tracked source
$tmpCs = Join-Path ([System.IO.Path]::GetTempPath()) ("matrixedu_launcher_" + [System.Guid]::NewGuid().ToString("N") + ".cs")
try {
  $rawText = [System.IO.File]::ReadAllText($csFile, [System.Text.Encoding]::UTF8)
  $utf8Bom = New-Object System.Text.UTF8Encoding($true)
  [System.IO.File]::WriteAllText($tmpCs, $rawText, $utf8Bom)

  $cscArgs = @("/nologo", "/target:winexe", "/optimize+", "/out:$outExe", "/r:System.dll,System.Drawing.dll,System.Windows.Forms.dll")
  if (Test-Path $icoFile) {
    $cscArgs += "/win32icon:$icoFile"
  }
  $cscArgs += $tmpCs

  Write-Host "[1/4] Bien dich MatrixEdu.exe bang $cscPath ..."
  & $cscPath @cscArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Bien dich MatrixEdu.exe that bai (ma loi $LASTEXITCODE)."
  }
} finally {
  if (Test-Path $tmpCs) { Remove-Item -Force $tmpCs -ErrorAction SilentlyContinue }
}

$exeInfo = Get-Item $outExe
Write-Host "      -> OK: $($exeInfo.FullName) ($([math]::Round($exeInfo.Length / 1KB, 1)) KB)"

# ----------------------------------------------------------------------------
# 2. Prepare clean dist/MatrixEdu_Portable staging folder
# ----------------------------------------------------------------------------
Write-Host "[2/4] Dong bo ma nguon & tai nguyen sach vao $portableDir ..."
if (Test-Path $portableDir) {
  Remove-Item -Recurse -Force $portableDir
}
New-Item -ItemType Directory -Path $portableDir -Force | Out-Null

# Core app files & favicons
$rootFilesToCopy = @(
  "MatrixEdu.exe",
  "index.html",
  "server.js",
  "package.json",
  "favicon.ico",
  "favicon.png",
  "favicon.svg",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "favicon-64x64.png",
  "apple-touch-icon.png"
)
foreach ($f in $rootFilesToCopy) {
  $srcPath = Join-Path $rootDir $f
  if (Test-Path $srcPath) {
    Copy-Item -Path $srcPath -Destination (Join-Path $portableDir $f) -Force
  }
}

# Copy src/ (JS backend modules only; exclude C# launcher source)
$dstSrc = Join-Path $portableDir "src"
New-Item -ItemType Directory -Path $dstSrc -Force | Out-Null
Get-ChildItem -Path (Join-Path $rootDir "src") -File -Filter "*.js" | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination (Join-Path $dstSrc $_.Name) -Force
}

# Copy public/ (if present)
$srcPublic = Join-Path $rootDir "public"
if (Test-Path $srcPublic) {
  Copy-Item -Path $srcPublic -Destination (Join-Path $portableDir "public") -Recurse -Force
}

# Copy clean data/ (STRICTLY exclude secrets, real exam profiles, rosters, grading DB, exports)
$srcData = Join-Path $rootDir "data"
$dstData = Join-Path $portableDir "data"
New-Item -ItemType Directory -Path $dstData -Force | Out-Null

if (Test-Path $srcData) {
  # Clean subdirectories to copy (NEVER the question bank with answers:
  # data/google_drive_bank is excluded from the release package)
  $cleanDataDirs = @("omr_templates", "sample_docs")
  foreach ($d in $cleanDataDirs) {
    $fromDir = Join-Path $srcData $d
    if (Test-Path $fromDir) {
      Copy-Item -Path $fromDir -Destination (Join-Path $dstData $d) -Recurse -Force
    }
  }
  # Remove any user-uploaded custom OMR templates from packaged copy
  $pkgCustomOmr = Join-Path $dstData "omr_templates\custom"
  if (Test-Path $pkgCustomOmr) { Remove-Item -Recurse -Force $pkgCustomOmr }

  # Copy only bundled sample profiles (profile_thpt_*.json), NEVER real user exam_*.json
  $srcProfiles = Join-Path $srcData "profiles"
  if (Test-Path $srcProfiles) {
    $dstProfiles = Join-Path $dstData "profiles"
    New-Item -ItemType Directory -Path $dstProfiles -Force | Out-Null
    Get-ChildItem -Path $srcProfiles -File -Filter "profile_thpt_*.json" | ForEach-Object {
      Copy-Item -Path $_.FullName -Destination (Join-Path $dstProfiles $_.Name) -Force
    }
  }

  # Copy clean root files inside data/, strictly excluding secrets & real grading data
  $excludedDataFilePatterns = @(
    "ai_config.json",
    "active_drive_bank.json",
    "drive_files_map.json",
    "drive_folder.html",
    "sample_dapan_*.csv",
    "sample_dapan_*.txt",
    "deleted_profiles.json",
    "omr_audit_logs.json",
    "omr_database.json",
    "omr_rosters.json",
    "omr_active_roster.json",
    "BANG_DIEM_*.csv",
    "CSDL_CHAM_THI_*.json",
    "NHAT_KY_LUU_VET_*.csv"
  )
  Get-ChildItem -Path $srcData -File | ForEach-Object {
    $fileName = $_.Name
    $isExcluded = $false
    foreach ($pat in $excludedDataFilePatterns) {
      if ($fileName -like $pat) { $isExcluded = $true; break }
    }
    if (-not $isExcluded) {
      Copy-Item -Path $_.FullName -Destination (Join-Path $dstData $fileName) -Force
    }
  }
}

# ----------------------------------------------------------------------------
# 3. Provision Portable Node.js runtime/node.exe (auto-download official zip)
# ----------------------------------------------------------------------------
Write-Host "[3/4] Chuan bi Portable Node.js v$NodeVersion (win-x64) ..."
$needDownload = $true
if (Test-Path $cachedNode) {
  try {
    $existingVer = (& $cachedNode -v).Trim().TrimStart('v')
    if ($existingVer -eq $NodeVersion) {
      Write-Host "      -> Su dung lai runtime/node.exe da tai san (v$existingVer)"
      $needDownload = $false
    }
  } catch { }
}

if ($needDownload) {
  if (-not (Test-Path $runtimeCache)) {
    New-Item -ItemType Directory -Path $runtimeCache -Force | Out-Null
  }
  $nodeZipName = "node-v$NodeVersion-win-x64.zip"
  $nodeUrl     = "https://nodejs.org/dist/v$NodeVersion/$nodeZipName"
  $shaUrl      = "https://nodejs.org/dist/v$NodeVersion/SHASUMS256.txt"
  $tmpNodeZip  = Join-Path ([System.IO.Path]::GetTempPath()) $nodeZipName
  $tmpExtract  = Join-Path ([System.IO.Path]::GetTempPath()) ("node_extract_" + [System.Guid]::NewGuid().ToString("N"))

  try {
    Write-Host "      -> Dang tai $nodeUrl ..."
    Invoke-WebRequest -Uri $nodeUrl -OutFile $tmpNodeZip -UseBasicParsing
    # Verify SHA-256 against the official SHASUMS256.txt before extracting.
    # Reference value for v24.14.1 (from https://nodejs.org/dist/v24.14.1/SHASUMS256.txt):
    # 6e50ce5498c0cebc20fd39ab3ff5df836ed2f8a31aa093cecad8497cff126d70  node-v24.14.1-win-x64.zip
    Write-Host "      -> Dang kiem tra SHA-256 voi $shaUrl ..."
    $shaText = (Invoke-WebRequest -Uri $shaUrl -UseBasicParsing).Content
    $expectedLine = ($shaText -split "`n") | Where-Object { $_ -match [regex]::Escape($nodeZipName) } | Select-Object -First 1
    if (-not $expectedLine) {
      throw "Khong tim thay checksum SHA-256 cho $nodeZipName trong SHASUMS256.txt."
    }
    $expectedHash = ($expectedLine -split '\s+')[0].ToLower()
    $actualHash = (Get-FileHash -Path $tmpNodeZip -Algorithm SHA256).Hash.ToLower()
    if ($actualHash -ne $expectedHash) {
      throw "Checksum SHA-256 khong khop cho $nodeZipName (mong doi $expectedHash, nhan $actualHash). Dung giai nen."
    }
    Write-Host "      -> SHA-256 khop: $actualHash"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($tmpNodeZip, $tmpExtract)

    $extractedNode = Join-Path $tmpExtract "node-v$NodeVersion-win-x64\node.exe"
    if (-not (Test-Path $extractedNode)) {
      throw "Khong tim thay node.exe trong goi tai ve: $nodeZipName"
    }
    Copy-Item -Path $extractedNode -Destination $cachedNode -Force
    Write-Host "      -> Da luu cache: $cachedNode"
  } finally {
    if (Test-Path $tmpNodeZip) { Remove-Item -Force $tmpNodeZip -ErrorAction SilentlyContinue }
    if (Test-Path $tmpExtract) { Remove-Item -Recurse -Force $tmpExtract -ErrorAction SilentlyContinue }
  }
}

$dstRuntime = Join-Path $portableDir "runtime"
New-Item -ItemType Directory -Path $dstRuntime -Force | Out-Null
Copy-Item -Path $cachedNode -Destination (Join-Path $dstRuntime "node.exe") -Force
Write-Host "      -> Da nhung runtime/node.exe vao ban Portable"

# ----------------------------------------------------------------------------
# 4. Compress dist/MatrixEdu_Portable -> dist/MatrixEdu_Windows_Portable.zip
# ----------------------------------------------------------------------------
if (-not $SkipZip) {
  Write-Host "[4/4] Nen ban phan phoi ZIP: $zipPath ..."
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $portableDir,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )
  $zipInfo = Get-Item $zipPath
  Write-Host "      -> OK: $($zipInfo.FullName) ($([math]::Round($zipInfo.Length / 1MB, 2)) MB)"
}

Write-Host "=== HOAN TAT DONG GOI MATRIXEDU WINDOWS PORTABLE ==="
