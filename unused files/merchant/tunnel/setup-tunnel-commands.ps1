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
