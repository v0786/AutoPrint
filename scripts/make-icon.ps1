Add-Type -AssemblyName System.Drawing
$src = [Drawing.Image]::FromFile('dist-installer\ChatGPT Image Sep 19, 2026, 04_18_39 PM.png')
$bmp = New-Object Drawing.Bitmap 256, 256
$g = [Drawing.Graphics]::FromImage($bmp)
$g.Clear([Drawing.Color]::White)
$g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, 256, 256)
$g.Dispose(); $src.Dispose()
$pngPath = 'assets\icon\autoprint-256.png'
$bmp.Save($pngPath, [Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
$png = [IO.File]::ReadAllBytes($pngPath)
$ico = New-Object IO.MemoryStream
$bw = New-Object IO.BinaryWriter($ico)
$bw.Write([UInt16]0); $bw.Write([UInt16]1); $bw.Write([UInt16]1)
$bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0); $bw.Write([Byte]0)
$bw.Write([UInt16]1); $bw.Write([UInt16]32); $bw.Write([UInt32]$png.Length); $bw.Write([UInt32]22)
$bw.Write($png); $bw.Flush()
[IO.File]::WriteAllBytes('assets\icon\autoprint.ico', $ico.ToArray())
$bw.Dispose(); $ico.Dispose(); Remove-Item $pngPath -Force
