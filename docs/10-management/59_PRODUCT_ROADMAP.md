# AutoPrint — Product Engineering Roadmap

**Document ID**: 10-59  
**Category**: Management  

---

## 1. Version Milestones

### Version 2.0.0 (Current Production Release)
* Native C# .NET 4.5.2 System Tray Host with watchdog supervision.
* Dual React 19 / Vite / Tailwind v4 / Motion Primitives interfaces (Customer Kiosk :7000 and Merchant Desktop :8000).
* Local SQLite 3 persistence in WAL mode.
* Windows Print Spooler WMI integration and SumatraPDF headless dispatch.
* 8-digit CSPRNG Collection Code generation.
* Touchless cash-at-counter and direct UPI QR workflows.
* Ephemeral document lifecycle with automatic purge upon collection.
* Inno Setup production Windows installer (`AutoPrint-Setup.exe`).

### Version 2.1.0 (Q4 2026 Planned)
* Native Linux CUPS driver packaging (`.deb` / `.rpm`).
* Native ESC/POS thermal receipt printing support for 58mm/80mm counter receipt printers.
* Extended multi-language kiosk support (Tamil, Telugu, Marathi, Bengali).

### Version 2.2.0 (Q1 2027 Planned)
* Touchscreen Kiosk Fullscreen Lock mode (Kiosk Mode / Chromium Kiosk App).
* Coin / Note acceptor hardware serial interface integration for 100% unattended self-service kiosks.
