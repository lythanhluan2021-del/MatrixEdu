Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\extracted_sheet_0.jpg")

# Find Y centers for Questions 1 to 10 at X=268 (center of option A)
$yCenters = @()
for ($y = 1250; $y -lt 1800; $y++) {
    $c = $bmp.GetPixel(268, $y)
    # top/bottom of circles
    if ($c.R -lt 150) {
        # edge of circle
    }
}

# Scan along X=268 from Y=1240 to 1800
$darkY = @()
for ($y = 1240; $y -lt 1800; $y++) {
    $c = $bmp.GetPixel(268, $y)
    if ($c.R -lt 150) { $darkY += $y }
}
Write-Host "Dark Y points along X=268: $($darkY -join ', ')"

$bmp.Dispose()
