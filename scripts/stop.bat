@echo off
setlocal

echo [AutoPrint] Stopping AutoPrint system services...
taskkill /F /IM AutoPrint.exe /T > nul 2>&1
taskkill /F /IM node.exe /T > nul 2>&1
taskkill /F /IM python.exe /T > nul 2>&1

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000, 7000, 8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" > nul 2>&1

echo [AutoPrint] All AutoPrint services stopped.
exit /b 0
