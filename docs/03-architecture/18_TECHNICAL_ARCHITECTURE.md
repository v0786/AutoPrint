# AutoPrint — Technical Architecture Specification

**Document ID**: 03-18  
**Category**: Architecture  
**Requirement Mapping**: Section 7 & Section 9 Master Prompt  

---

## 1. System Technology Decisions & Rationales

| Subsystem | Technology Selected | Rationale & Justification |
|---|---|---|
| **Process Host / Tray Supervisor** | C# .NET Framework 4.5.2 | Pre-installed natively on Windows 7 SP1, 8, 10, and 11. Compiles with `csc.exe` with zero external runtime downloads required. Silent system tray operation. |
| **Backend REST Engine** | Node.js v18-v22 / Express / TypeScript | High I/O throughput for multipart file streaming, robust native bindings (`better-sqlite3`), and cross-platform compatibility across Windows and Linux. |
| **Database Engine** | SQLite 3 (WAL Mode) via `better-sqlite3` | Zero-administration relational database. Sub-millisecond synchronous transactions. Zero network ports exposed. In-process durability. |
| **Merchant Desktop UI** | React 19 / Vite / Tailwind v4 / Motion | Single-page application serving local port 8000. Real-time queue reactive updates, accessible motion state transitions. |
| **Customer Kiosk UI** | React 19 / Vite / Tailwind v4 / Motion | Mobile-first web application accessible over local Wi-Fi router (port 7000) or secure PageKite tunnel. |
| **PDF Spooling Engine** | Headless SumatraPDF CLI (Win32) / CUPS (Linux) | Ultra-lightweight (7 MB), high-speed Win32 document rasterization and spooling without requiring Adobe Acrobat. |

---

## 2. Process Boundary Model

```text
┌─────────────────────────────────────────────────────────────┐
│                       AutoPrint.exe                         │
│             (Main Application & Process Watchdog)           │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌──────────────────────────────┐     ┌────────────────────────┐
│     Node.js Backend Engine   │     │   Optional PageKite    │
│  (Port 5000: API, Spooler,   │     │    Tunnel Connector    │
│   DB & Static Bundle Host)   │     │   (Python Subprocess)  │
└──────────────┬───────────────┘     └────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌───────────┐     ┌───────────┐
│ Merchant  │     │ Customer  │
│ UI (:8000)│     │ UI (:7000)│
└───────────┘     └───────────┘
```

---

## 3. Communication Protocols

* **Customer Mobile $\rightarrow$ Customer Kiosk**: HTTP/1.1 or HTTP/2 over local Wi-Fi (`http://192.168.x.x:7000`) or HTTPS via PageKite relay.
* **Customer Kiosk $\rightarrow$ Backend**: Reverse-proxied JSON REST requests and multipart/form-data streaming to `http://localhost:5000/api`.
* **Merchant UI $\rightarrow$ Backend**: Authenticated REST API with Bearer token header over local loopback `http://localhost:5000/api`.
* **Backend $\rightarrow$ Physical Printer**: Native Win32 Print Spooler (`winspool.drv`) via SumatraPDF CLI or Linux CUPS daemon (`lp`).
