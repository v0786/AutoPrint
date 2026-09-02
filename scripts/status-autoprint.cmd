@echo off
setlocal

title AutoPrint System Health & Diagnostic Status
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- SYSTEM TELEMETRY ^& HEALTH STATUS
echo ===============================================================================
echo.

powershell -NoProfile -Command "
`$backendPort = 5000;
`$merchantPort = 8000;
`$customerPort = 7000;

if (Test-Path '.env') {
    Get-Content '.env' | ForEach-Object {
        if (`$_ -match '^PORT=(\d+)') { `$backendPort = [int]`$matches[1] }
        if (`$_ -match '^MERCHANT_PORT=(\d+)') { `$merchantPort = [int]`$matches[1] }
        if (`$_ -match '^CUSTOMER_PORT=(\d+)') { `$customerPort = [int]`$matches[1] }
    }
}

Write-Host '1. Network Port Binding Status:' -ForegroundColor White;
function Check-Port([string]`$Name, [int]`$Port) {
    `$active = Get-NetTCPConnection -LocalPort `$Port -State Listen -ErrorAction SilentlyContinue;
    if (`$active) {
        Write-Host ('   [' + `$Name + ' - Port ' + `$Port + ']: ') -NoNewline;
        Write-Host 'LISTENING' -ForegroundColor Green;
    } else {
        Write-Host ('   [' + `$Name + ' - Port ' + `$Port + ']: ') -NoNewline;
        Write-Host 'OFFLINE' -ForegroundColor Red;
    }
}

Check-Port 'Backend REST Engine' `$backendPort;
Check-Port 'Merchant Counter Desk' `$merchantPort;
Check-Port 'Customer Mobile Kiosk' `$customerPort;

Write-Host '';
Write-Host '2. Backend Service Diagnostic Endpoint:' -ForegroundColor White;
try {
    `$health = Invoke-RestMethod -Uri ('http://localhost:' + `$backendPort + '/health') -TimeoutSec 3;
    Write-Host '   Backend Health     : ' -NoNewline;
    Write-Host 'ONLINE' -ForegroundColor Green;
    Write-Host ('   Database Status    : ' + `$health.database.healthy + ' (Engine: ' + `$health.database.engine + ')');
    Write-Host ('   Datastore Root     : ' + `$health.storage.dataDir);
    Write-Host ('   PageKite State     : ' + `$health.pagekite);
    Write-Host ('   Active Customer URL: ' + `$health.customerUrl) -ForegroundColor Cyan;
} catch {
    Write-Host '   Backend Health     : ' -NoNewline;
    Write-Host 'OFFLINE (Could not connect)' -ForegroundColor Red;
}

Write-Host '';
Write-Host '3. Connected Windows Printers:' -ForegroundColor White;
try {
    `$printers = Get-CimInstance Win32_Printer | Select-Object -First 3 Name, Default;
    foreach (`$p in `$printers) {
        `$tag = if (`$p.Default) { ' (Default)' } else { '' };
        Write-Host ('   - ' + `$p.Name + `$tag) -ForegroundColor Gray;
    }
} catch {
    Write-Host '   Could not enumerate Windows printers.' -ForegroundColor Yellow;
}
"

echo.
echo ===============================================================================
echo.
pause
