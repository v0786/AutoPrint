# =====================================================================
# AUTOPRINT - CLOUDFLARE TUNNEL IMPLEMENTATION
# Single Store | Merchant Local Backend | Customer Vercel Application
# =====================================================================

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------

$ProjectRoot = "E:\project\AutoPrint"

$MerchantPath = Join-Path $ProjectRoot "merchant"
$CustomerPath = Join-Path $ProjectRoot "customer"

$TunnelPath = Join-Path $MerchantPath "tunnel"

$CloudflaredExe = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

$MerchantPort = 4100

# ---------------------------------------------------------------------
# HEADER
# ---------------------------------------------------------------------

Clear-Host

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AUTOPRINT - CLOUDFLARE TUNNEL IMPLEMENTATION"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------
# 1. VALIDATE PROJECT STRUCTURE
# ---------------------------------------------------------------------

Write-Host "[1/8] Validating project structure..." -ForegroundColor Yellow

$RequiredPaths = @(
    $ProjectRoot,
    $MerchantPath,
    $CustomerPath,
    (Join-Path $MerchantPath "package.json"),
    (Join-Path $CustomerPath "package.json")
)

foreach ($Path in $RequiredPaths) {

    if (-not (Test-Path $Path)) {
        Write-Host ""
        Write-Host "[FAIL] Required path not found:" -ForegroundColor Red
        Write-Host "       $Path" -ForegroundColor Red
        exit 1
    }

    Write-Host "[PASS] $Path" -ForegroundColor Green
}

# ---------------------------------------------------------------------
# 2. CREATE TUNNEL DIRECTORY
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[2/8] Preparing tunnel directory..." -ForegroundColor Yellow

New-Item `
    -ItemType Directory `
    -Force `
    -Path $TunnelPath | Out-Null

Write-Host "[PASS] Tunnel directory ready:" -ForegroundColor Green
Write-Host "       $TunnelPath"

# ---------------------------------------------------------------------
# 3. INSTALL CLOUDFLARED
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[3/8] Checking cloudflared..." -ForegroundColor Yellow

$CloudflaredCommand = Get-Command cloudflared -ErrorAction SilentlyContinue

if (-not $CloudflaredCommand) {

    Write-Host "[INFO] cloudflared not found." -ForegroundColor Yellow
    Write-Host "[INFO] Installing cloudflared..." -ForegroundColor Cyan

    # Winget installation is preferred.
    $Winget = Get-Command winget -ErrorAction SilentlyContinue

    if ($Winget) {

        winget install `
            --id Cloudflare.cloudflared `
            --exact `
            --accept-package-agreements `
            --accept-source-agreements

    }
    else {

        Write-Host ""
        Write-Host "[FAIL] winget is not available." -ForegroundColor Red
        Write-Host ""
        Write-Host "Install cloudflared manually, then run this script again." `
            -ForegroundColor Yellow
        exit 1
    }

    # Refresh PATH for the current PowerShell session.
    $MachinePath = [Environment]::GetEnvironmentVariable(
        "Path",
        "Machine"
    )

    $UserPath = [Environment]::GetEnvironmentVariable(
        "Path",
        "User"
    )

    $env:Path = "$MachinePath;$UserPath"

    $CloudflaredCommand = Get-Command cloudflared `
        -ErrorAction SilentlyContinue
}

if (-not $CloudflaredCommand) {

    Write-Host ""
    Write-Host "[FAIL] cloudflared installation could not be detected." `
        -ForegroundColor Red

    exit 1
}

Write-Host "[PASS] cloudflared available:" -ForegroundColor Green
cloudflared --version

# ---------------------------------------------------------------------
# 4. CREATE TUNNEL CONFIG TEMPLATE
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[4/8] Creating secure tunnel configuration..." `
    -ForegroundColor Yellow

$ConfigPath = Join-Path $TunnelPath "config.yml"

if (-not (Test-Path $ConfigPath)) {

    $ConfigContent = @"
# =====================================================================
# AUTOPRINT CLOUDFLARE TUNNEL
# SINGLE STORE CONFIGURATION
# =====================================================================

# IMPORTANT:
#
# After running:
#
#   cloudflared tunnel create autoprint-merchant
#
# Replace the values below with the generated tunnel ID and credentials.

tunnel: REPLACE_WITH_TUNNEL_ID

credentials-file: C:\Users\$env:USERNAME\.cloudflared\REPLACE_WITH_TUNNEL_ID.json

ingress:

  # Merchant API exposed securely through Cloudflare.
  - hostname: merchant.REPLACE_WITH_YOUR_DOMAIN.com
    service: http://localhost:$MerchantPort

  # Return 404 for all unmatched requests.
  - service: http_status:404
"@

    Set-Content `
        -Path $ConfigPath `
        -Value $ConfigContent `
        -Encoding UTF8

    Write-Host "[PASS] Created tunnel config template." `
        -ForegroundColor Green
}
else {

    Write-Host "[INFO] Existing config.yml preserved." `
        -ForegroundColor Yellow
}

# ---------------------------------------------------------------------
# 5. CREATE CUSTOMER ENVIRONMENT TEMPLATE
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[5/8] Preparing customer connectivity environment..." `
    -ForegroundColor Yellow

$CustomerEnvExample = Join-Path $CustomerPath ".env.example"

$CustomerEnvContent = @"
# =====================================================================
# AUTOPRINT CUSTOMER APPLICATION
# =====================================================================

# Public HTTPS endpoint created by Cloudflare Tunnel.
#
# Example:
# https://merchant.example.com

NEXT_PUBLIC_MERCHANT_API_URL=https://merchant.REPLACE_WITH_YOUR_DOMAIN.com

# Server-side merchant API endpoint.
MERCHANT_API_URL=https://merchant.REPLACE_WITH_YOUR_DOMAIN.com

# Customer Vercel deployment URL.
NEXT_PUBLIC_APP_URL=https://customer.REPLACE_WITH_YOUR_DOMAIN.com

# Razorpay public key.
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Server-only Razorpay secret.
RAZORPAY_KEY_SECRET=

# Razorpay webhook verification secret.
RAZORPAY_WEBHOOK_SECRET=
"@

Set-Content `
    -Path $CustomerEnvExample `
    -Value $CustomerEnvContent `
    -Encoding UTF8

Write-Host "[PASS] Customer .env.example configured." `
    -ForegroundColor Green

# ---------------------------------------------------------------------
# 6. CREATE MERCHANT ENVIRONMENT TEMPLATE
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[6/8] Preparing merchant connectivity environment..." `
    -ForegroundColor Yellow

$MerchantEnvExample = Join-Path $MerchantPath ".env.example"

$MerchantEnvContent = @"
# =====================================================================
# AUTOPRINT MERCHANT APPLICATION
# =====================================================================

# Local backend.
PORT=$MerchantPort
MERCHANT_API_BASE_URL=http://localhost:$MerchantPort

# Public Cloudflare Tunnel URL.
CLOUDFLARE_TUNNEL_URL=https://merchant.REPLACE_WITH_YOUR_DOMAIN.com

# Customer application origin.
CUSTOMER_APP_URL=https://customer.REPLACE_WITH_YOUR_DOMAIN.com

# IMPORTANT:
# Generate a long random value before production deployment.
PUBLIC_API_KEY=

# Razorpay webhook secret.
RAZORPAY_WEBHOOK_SECRET=

# Database
DB_NAME=qrprint_merchant
"@

Set-Content `
    -Path $MerchantEnvExample `
    -Value $MerchantEnvContent `
    -Encoding UTF8

Write-Host "[PASS] Merchant .env.example configured." `
    -ForegroundColor Green

# ---------------------------------------------------------------------
# 7. CREATE TUNNEL COMMAND HELPER
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[7/8] Creating Cloudflare command helper..." `
    -ForegroundColor Yellow

$HelperPath = Join-Path $TunnelPath "setup-tunnel-commands.ps1"

$HelperContent = @"
# =====================================================================
# AUTOPRINT - CLOUDFLARE TUNNEL COMMAND HELPER
# =====================================================================

Write-Host ""
Write-Host "STEP 1 - LOGIN TO CLOUDFLARE"
Write-Host ""
Write-Host "cloudflared tunnel login"
Write-Host ""

Write-Host "STEP 2 - CREATE THE TUNNEL"
Write-Host ""
Write-Host "cloudflared tunnel create autoprint-merchant"
Write-Host ""

Write-Host "STEP 3 - CREATE DNS ROUTE"
Write-Host ""
Write-Host "Example:"
Write-Host ""
Write-Host "cloudflared tunnel route dns autoprint-merchant merchant.yourdomain.com"
Write-Host ""

Write-Host "STEP 4 - UPDATE config.yml"
Write-Host ""
Write-Host "Replace:"
Write-Host "REPLACE_WITH_TUNNEL_ID"
Write-Host ""
Write-Host "and:"
Write-Host "merchant.REPLACE_WITH_YOUR_DOMAIN.com"
Write-Host ""

Write-Host "STEP 5 - START TUNNEL"
Write-Host ""
Write-Host "cloudflared tunnel --config config.yml run"
Write-Host ""
"@

Set-Content `
    -Path $HelperPath `
    -Value $HelperContent `
    -Encoding UTF8

Write-Host "[PASS] Tunnel command helper created." `
    -ForegroundColor Green

# ---------------------------------------------------------------------
# 8. FINAL SUMMARY
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[8/8] Implementation summary..." `
    -ForegroundColor Yellow

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " CLOUDFLARE TUNNEL IMPLEMENTATION COMPLETE"
Write-Host "============================================================" -ForegroundColor Green

Write-Host ""

Write-Host "Created / configured:" -ForegroundColor Cyan

Write-Host ""
Write-Host "Merchant tunnel:"
Write-Host "  $TunnelPath"

Write-Host ""
Write-Host "Tunnel config:"
Write-Host "  $ConfigPath"

Write-Host ""
Write-Host "Customer environment:"
Write-Host "  $CustomerEnvExample"

Write-Host ""
Write-Host "Merchant environment:"
Write-Host "  $MerchantEnvExample"

Write-Host ""
Write-Host "Tunnel helper:"
Write-Host "  $HelperPath"

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow

Write-Host ""
Write-Host "1. Login:"
Write-Host "   cloudflared tunnel login"

Write-Host ""
Write-Host "2. Create tunnel:"
Write-Host "   cloudflared tunnel create autoprint-merchant"

Write-Host ""
Write-Host "3. Configure DNS:"
Write-Host "   cloudflared tunnel route dns autoprint-merchant merchant.yourdomain.com"

Write-Host ""
Write-Host "4. Edit:"
Write-Host "   $ConfigPath"

Write-Host ""
Write-Host "5. Start merchant backend:"
Write-Host "   cd $MerchantPath"
Write-Host "   npm run dev"

Write-Host ""
Write-Host "6. Start tunnel:"
Write-Host "   cd $TunnelPath"
Write-Host "   cloudflared tunnel --config config.yml run"

Write-Host ""
Write-Host "IMPORTANT:"
Write-Host "The backend should NOT be exposed directly using router port forwarding." `
    -ForegroundColor Yellow

Write-Host ""