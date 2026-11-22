Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\..\extracted_sheet_0.jpg")
$w = $bmp.Width
$h = $bmp.Height

Write-Host "Image size: $w x $h"

# Find Black Calibration Blocks on the sheet:
# The black calibration blocks are rectangles around 60x60 or 40x40 with R,G,B < 40
$markers = @()
for ($y = 20; $y -lt $h - 20; $y += 15) {
    for ($x = 20; $x -lt $w - 20; $x += 15) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 30 -and $c.G -lt 30 -and $c.B -lt 30) {
            # Check if 20x20 area is all black
            $isBlock = $true
            for ($dy = 0; $dy -lt 25; $dy += 8) {
                for ($dx = 0; $dx -lt 25; $dx += 8) {
                    $c2 = $bmp.GetPixel($x + $dx, $y + $dy)
                    if ($c2.R -gt 50 -or $c2.G -gt 50 -or $c2.B -gt 50) {
                        $isBlock = $false; break
                    }
                }
                if (-not $isBlock) { break }
            }
            if ($isBlock) {
                # Check if we already have a marker close by
                $exists = $markers | Where-Object { [Math]::Abs($_.X - $x) -lt 80 -and [Math]::Abs($_.Y - $y) -lt 80 }
                if (-not $exists) {
                    $markers += [PSCustomObject]@{ X = $x; Y = $y }
                    Write-Host "Found black marker at: ($x, $y) [rel: $([Math]::Round($x/$w, 3)), $([Math]::Round($y/$h, 3))]"
                }
            }
        }
    }
}

$bmp.Dispose()

