@echo off
setlocal

echo [AutoPrint] Stopping AutoPrint system services...
taskkill /F /IM AutoPrint.exe /T > nul 2>&1
taskkill /F /IM node.exe /T > nul 2>&1
taskkill /F /IM python.exe /T > nul 2>&1

powershell -NoProfile -Command "
$ports = @(5000, 7000, 8000);
$cfgFile = 'C:\ProgramData\AutoPrint\config\appsettings.json';
if (Test-Path $cfgFile) {
    try {
        $cfg = Get-Content $cfgFile -Raw | ConvertFrom-Json;
        if ($cfg.backendPort) { $ports += [int]$cfg.backendPort }
        if ($cfg.ports.backend) { $ports += [int]$cfg.ports.backend }
        if ($cfg.merchantDesktopPort) { $ports += [int]$cfg.merchantDesktopPort }
        if ($cfg.ports.merchant) { $ports += [int]$cfg.ports.merchant }
        if ($cfg.customerWebPort) { $ports += [int]$cfg.customerWebPort }
        if ($cfg.ports.customer) { $ports += [int]$cfg.ports.customer }
    } catch {}
}
$ports = $ports | Select-Object -Unique;
Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
" > nul 2>&1

echo [AutoPrint] All AutoPrint services stopped.
exit /b 0
