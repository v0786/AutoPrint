# AutoPrint Express — Diagnostics & Troubleshooting Guide

This guide provides troubleshooting solutions for port conflicts, offline hardware, PageKite tunnel status, and service recovery.

---

## 1. Port Already in Use Error

**Symptom**: AutoPrint alerts that port 5000, 7000, or 8000 is occupied.

**Solution**:
1. Check what process is using the port:
   ```powershell
   Get-NetTCPConnection -LocalPort 5000, 7000, 8000 -State Listen
   ```
2. Reconfigure AutoPrint to use alternative ports:
   - Edit `C:\ProgramData\AutoPrint\config\appsettings.json`.
   - Update `ports.backend`, `ports.merchant`, or `ports.customer`.
   - Right-click AutoPrint tray icon $\rightarrow$ **Restart Services**.

---

## 2. No Printers Detected

**Symptom**: Merchant Dashboard indicates "No printers detected".

**Solution**:
1. Verify printer is powered on and connected via USB or local network.
2. In Windows, open **Settings** $\rightarrow$ **Bluetooth & devices** $\rightarrow$ **Printers & scanners**. Ensure the printer appears as an active device.
3. In the Merchant Dashboard, navigate to **Hardware & Printers** and click **Refresh Fleet**.

---

## 3. Customer Cannot Connect Over Mobile / QR Code

**Symptom**: Scanning customer QR displays "Site cannot be reached".

**Solution**:
1. Check PageKite status in the Merchant Dashboard or system tray.
2. Verify internet connection on the store computer.
3. Check `C:\ProgramData\AutoPrint\logs\pagekite.log` for tunnel connection errors.
4. Ensure your PageKite secret and subdomain match in `appsettings.json`.

---

## 4. Viewing Application Logs

All runtime diagnostic logs are stored at:
`C:\ProgramData\AutoPrint\logs\`

- `backend.log`: REST API requests, SQLite database migrations, and verification logs.
- `merchant.log`: Staff portal and authentication telemetry.
- `customer.log`: Kiosk proxy and document upload logs.
- `pagekite.log`: Public tunnel connection events.

You can instantly open this folder by right-clicking the AutoPrint system tray icon $\rightarrow$ **View Logs Directory**.
