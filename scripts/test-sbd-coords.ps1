Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\extracted_sheet_0.jpg")

# SBD circles: let's scan along Y=350 to find column centers
$darkSbd = @()
for ($x = 1550; $x -lt 1960; $x++) {
    $c = $bmp.GetPixel($x, 350)
    if ($c.R -lt 150) { $darkSbd += $x }
}
Write-Host "Dark pixels at Y=350 (SBD row 0): $($darkSbd -join ', ')"

# SBD digit rows (0 to 9) along X=1600 (approx col 1):
$darkSbdY = @()
for ($y = 300; $y -lt 1000; $y++) {
    $c = $bmp.GetPixel(1600, $y)
    if ($c.R -lt 150) { $darkSbdY += $y }
}
Write-Host "Dark Y points along X=1600: $($darkSbdY -join ', ')"

$bmp.Dispose()

