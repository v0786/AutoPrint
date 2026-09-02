# ============================================================
# AUTOPRINT - TEST MERCHANT BACKEND AND CLOUDFLARE TUNNEL
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AUTOPRINT - BACKEND + TUNNEL CONNECTION TEST"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$LocalUrl  = "http://localhost:4100"
$TunnelUrl = "https://jim-coral-limit-pair.trycloudflare.com"

Write-Host "[1/4] Testing local merchant backend..." -ForegroundColor Yellow

try {
    $LocalResponse = Invoke-WebRequest `
        -Uri $LocalUrl `
        -UseBasicParsing `
        -TimeoutSec 10

    Write-Host "[PASS] Local backend responded." -ForegroundColor Green
    Write-Host "       Status: $($LocalResponse.StatusCode)"
}
catch {
    Write-Host "[WARN] Local backend did not respond at $LocalUrl" -ForegroundColor Yellow
    Write-Host "       $($_.Exception.Message)"
}

Write-Host ""

Write-Host "[2/4] Checking whether port 4100 is listening..." -ForegroundColor Yellow

$Port = Get-NetTCPConnection `
    -LocalPort 4100 `
    -State Listen `
    -ErrorAction SilentlyContinue

if ($Port) {
    Write-Host "[PASS] Port 4100 is listening." -ForegroundColor Green

    foreach ($Item in $Port) {
        Write-Host "       Process ID: $($Item.OwningProcess)"
    }
}
else {
    Write-Host "[FAIL] Nothing is listening on port 4100." -ForegroundColor Red
    Write-Host ""
    Write-Host "Start your merchant backend before continuing." -ForegroundColor Yellow
}

Write-Host ""

Write-Host "[3/4] Testing Cloudflare public tunnel..." -ForegroundColor Yellow

try {
    $TunnelResponse = Invoke-WebRequest `
        -Uri $TunnelUrl `
        -UseBasicParsing `
        -TimeoutSec 20

    Write-Host "[PASS] Cloudflare Tunnel responded." -ForegroundColor Green
    Write-Host "       Status: $($TunnelResponse.StatusCode)"
}
catch {
    Write-Host "[WARN] Tunnel could not return a successful response." -ForegroundColor Yellow
    Write-Host "       $($_.Exception.Message)"
}

Write-Host ""

Write-Host "[4/4] Summary..." -ForegroundColor Yellow

if ($Port) {
    Write-Host ""
    Write-Host "[INFO] Local merchant API target:" -ForegroundColor Cyan
    Write-Host "       $LocalUrl"

    Write-Host ""
    Write-Host "[INFO] Public Cloudflare endpoint:" -ForegroundColor Cyan
    Write-Host "       $TunnelUrl"

    Write-Host ""
    Write-Host "[NEXT] Configure this URL in the customer application." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "[NEXT] Start the merchant backend first." -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " TEST COMPLETE"
Write-Host "============================================================" -ForegroundColor Cyan