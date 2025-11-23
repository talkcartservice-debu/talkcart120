# Create real PNG placeholder images using .NET

Add-Type -AssemblyName System.Drawing

function Create-PlaceholderImage {
    param(
        [string]$OutputPath,
        [string]$FileName = "file"
    )
    
    # Create a bitmap
    $width = 800
    $height = 600
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Fill background
    $bgColor = [System.Drawing.Color]::FromArgb(240, 240, 240) # Light gray
    $graphics.Clear($bgColor)
    
    # Draw border
    $borderColor = [System.Drawing.Color]::FromArgb(221, 221, 221)
    $borderPen = New-Object System.Drawing.Pen($borderColor, 2)
    $graphics.DrawRectangle($borderPen, 1, 1, $width - 2, $height - 2)
    
    # Draw text
    $font1 = New-Object System.Drawing.Font("Arial", 36, [System.Drawing.FontStyle]::Bold)
    $font2 = New-Object System.Drawing.Font("Arial", 24)
    $font3 = New-Object System.Drawing.Font("Arial", 16)
    
    $textColor1 = [System.Drawing.Color]::FromArgb(102, 102, 102) # #666
    $textColor2 = [System.Drawing.Color]::FromArgb(153, 153, 153) # #999
    $textColor3 = [System.Drawing.Color]::FromArgb(204, 204, 204) # #ccc
    
    $brush1 = New-Object System.Drawing.SolidBrush($textColor1)
    $brush2 = New-Object System.Drawing.SolidBrush($textColor2)
    $brush3 = New-Object System.Drawing.SolidBrush($textColor3)
    
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    # Draw "TalkCart"
    $rect1 = New-Object System.Drawing.RectangleF(0, 250, $width, 60)
    $graphics.DrawString("TalkCart", $font1, $brush1, $rect1, $stringFormat)
    
    # Draw "Placeholder Image"
    $rect2 = New-Object System.Drawing.RectangleF(0, 310, $width, 40)
    $graphics.DrawString("Placeholder Image", $font2, $brush2, $rect2, $stringFormat)
    
    # Draw filename
    $rect3 = New-Object System.Drawing.RectangleF(0, 350, $width, 30)
    $graphics.DrawString($FileName, $font3, $brush3, $rect3, $stringFormat)
    
    # Save as PNG
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $borderPen.Dispose()
    $font1.Dispose()
    $font2.Dispose()
    $font3.Dispose()
    $brush1.Dispose()
    $brush2.Dispose()
    $brush3.Dispose()
    
    Write-Host "✅ Created PNG: $OutputPath" -ForegroundColor Green
}

# Create the placeholder images
$uploadPath = "D:\talkcart\backend\uploads\talkcart\talkcart"

Write-Host "🎨 Creating PNG placeholder images..." -ForegroundColor Cyan

Create-PlaceholderImage -OutputPath "$uploadPath\file_1760163879851_tt3fdqqim9" -FileName "file_1760163879851_tt3fdqqim9"
Create-PlaceholderImage -OutputPath "$uploadPath\file_1760168733155_lfhjq4ik7ht" -FileName "file_1760168733155_lfhjq4ik7ht"

Write-Host "✅ Done! Created 2 PNG placeholder images" -ForegroundColor Green