# AutoPrint Silent Background Launcher
$ErrorActionPreference = 'SilentlyContinue'
$rootDir = $PSScriptRoot

$exePath = Join-Path $rootDir "AutoPrint.exe"
if (Test-Path $exePath) {
    Start-Process -FilePath $exePath -ArgumentList $args
    exit 0
}

# Fallback: run launcher
$batPath = Join-Path $rootDir "AutoPrint-Launcher.bat"
Start-Process -FilePath $batPath -WindowStyle Hidden
exit 0
