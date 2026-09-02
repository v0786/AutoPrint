# AutoPrint / QRPrint — Quick Start Reference

Get AutoPrint running on Windows in under 2 minutes.

---

## ⚡ 1. One-Line Installation

Open PowerShell (Run as Administrator recommended) and execute:

```powershell
irm https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/bootstrap.ps1 | iex
```

---

## 🌐 2. Default Access URLs

Once launched, the following browser interfaces are active:

| Portal | URL | Purpose |
| :--- | :--- | :--- |
| **Customer Kiosk** | [`http://localhost:7000`](http://localhost:7000) | Document upload, print options, dynamic pricing, & 8-digit verification code. |
| **Merchant Desk** | [`http://localhost:6000`](http://localhost:6000) | Code lookup, cash collection, change calculation, & physical handover. |
| **Backend Health** | [`http://localhost:5000/health`](http://localhost:5000/health) | Live server diagnostic and SQLite database connection status. |
| **Backend REST API** | [`http://localhost:5000/api`](http://localhost:5000/api) | Authoritative REST API service endpoints. |

*Note: If custom ports were configured during installation, use your chosen ports in the URLs above.*

---

## 🛠 3. Control Commands

### Start All Services:
```cmd
scripts\start-all.cmd
```

### Stop All Services:
```cmd
scripts\stop-all.cmd
```

### Check System Health:
```cmd
scripts\health-check.cmd
```

### Run Automated Tests:
```powershell
npm run test:backend
```
