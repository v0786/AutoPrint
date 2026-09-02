# AutoPrint Express — Production Deployment & Configuration Guide

This document outlines the architecture, port routing, hardware printer integration, and production configuration parameters for AutoPrint.

---

## 1. Production Architecture Overview

```
                      [Customer Mobile Phone]
                                 │
                                 ▼
                     https://autoprint.pagekite.me
                                 │
                                 ▼ (PageKite Ingress)
┌────────────────────────────────────────────────────────────────────────┐
│ WINDOWS STORE PC                                                       │
│                                                                        │
│   ┌─────────────────────┐       ┌──────────────────────────────────┐   │
│   │ Customer Web Portal │ ◄───► │ AutoPrint Backend API Engine     │   │
│   │ Port 7000           │       │ Port 5000                        │   │
│   └─────────────────────┘       └────────────────┬─────────────────┘   │
│                                                  │                     │
│   ┌─────────────────────┐                        ▼                     │
│   │ Merchant Desk Portal│ ◄────────────────► [SQLite Database]         │
│   │ Port 8000           │                    C:\ProgramData\AutoPrint  │
│   └──────────┬──────────┘                        │                     │
│              │                                   ▼                     │
│              ▼                              [Windows Spooler]          │
│   [AutoPrint System Tray] ───────────────►  Win32 Hardware Printers    │
│   AutoPrint.exe (WinExe)                                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Data Separation

| Path | Purpose | Permissions | Update Persistence |
| :--- | :--- | :--- | :--- |
| `C:\Program Files\AutoPrint\` | Binaries, Node runtime, server scripts, UI builds | Read-Only | Overwritten on upgrade |
| `C:\ProgramData\AutoPrint\datastore\` | Persistent SQLite DB (`autoprint.db`), uploaded files | Read-Write | Preserved on upgrade |
| `C:\ProgramData\AutoPrint\config\` | Configuration file (`appsettings.json`) | Read-Write | Preserved on upgrade |
| `C:\ProgramData\AutoPrint\logs\` | Server, customer, and PageKite runtime logs | Read-Write | Preserved on upgrade |

---

## 3. Configuration File (`appsettings.json`)

The application loads its configuration from `C:\ProgramData\AutoPrint\config\appsettings.json`:

```json
{
  "ports": {
    "backend": 5000,
    "merchant": 8000,
    "customer": 7000
  },
  "paths": {
    "dataDirectory": "C:\\ProgramData\\AutoPrint\\datastore",
    "logsDirectory": "C:\\ProgramData\\AutoPrint\\logs"
  },
  "pagekite": {
    "enabled": true,
    "subdomain": "autoprint",
    "domain": "pagekite.me",
    "secret": "xakd4af2azx229x94effe9az79262cxz"
  }
}
```

---

## 4. Hardware Printer Fleet Integration

- **Win32 Discovery**: AutoPrint enumerates local physical and network printers using Windows Management Instrumentation (`Win32_Printer`).
- **No Mock Printers**: Real printer status (Online, Default, Driver Name, Port) is displayed in the **Printer Fleet** view.
- **Fail-Safe Spooling**: If a physical printer is disconnected, jobs are safely held in the AutoPrint spooler queue until the hardware is restored.

---

## 5. Firewall Configuration

Only the local customer web port (`7000` by default) needs to receive local network traffic if local Wi-Fi kiosk access is desired. Public access is securely handled via outbound encrypted PageKite tunnel without opening inbound router ports.
