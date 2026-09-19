# AutoPrint

**Touchless Kiosk & Local Print Shop Management System**  
*Cross-Platform Production Release (Windows 7/8/10/11 & Linux CUPS)*

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%207%20|%208%20|%2010%20|%2011%20|%20Linux-green.svg)](#cross-platform-compatibility)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](#system-architecture)

---

## 1. Overview

**AutoPrint** is a high-reliability, offline-first print management application designed specifically for Xerox counters, stationery retailers, copy shops, and university printing hubs.

### The Problem
Traditional walk-in printing is slow and messy:
* Customers wait in disorganised queues to email or WhatsApp files.
* Shopkeepers manually download files, configure printer properties, and calculate custom prices.
* Finished prints get mixed up, leading to privacy breaches, duplicate prints, and disputes.

### The AutoPrint Solution
AutoPrint provides an effortless, touchless self-service workflow:
$$\text{Scan Counter QR} \longrightarrow \text{Enter Name} \longrightarrow \text{Upload} \longrightarrow \text{Configure \& Preview} \longrightarrow \text{Pay (Online / Cash)} \longrightarrow \text{8-Digit Code} \longrightarrow \text{Silent Print} \longrightarrow \text{Collect}$$

---

## 2. Key Product Features

* **Zero-Account Ingress**: Walk-in customers scan the permanent Shop QR and enter only their **Customer Name**. No registration, no passwords, no email required.
* **8-Digit Collection Code**: Human-friendly numeric code (`1234 5678`) issued to the customer for instant counter verification.
* **Touchless Cash Workflow**: Customer selects "Pay Cash at Counter" $\rightarrow$ Job is held in queue $\rightarrow$ Merchant verifies 8-digit code $\rightarrow$ Clicks "Cash Collected" $\rightarrow$ Automatic silent print spooling.
* **Ephemeral Document Retention**: Customer files are permanently purged from the disk upon physical handover. Financial and audit logs remain permanently in SQLite.
* **10-Minute Dashboard Inactivity Lock**: UI locks automatically after 10 minutes of operator inactivity while background printing and customer uploads continue without interruption.
* **Windows & Linux Spooler Integration**: Native Win32 Print Spooler and SumatraPDF CLI integration on Windows; standard CUPS daemon integration on Linux.
* **Dynamic LAN & PageKite Ingress**: Automatic Wi-Fi LAN IPv4 discovery for local in-shop printing; optional PageKite reverse proxy for remote mobile data uploads.
* **Accessible Motion Primitives**: WCAG Level AAA compliant motion components with strict `prefers-reduced-motion` fallbacks.

---

## 3. Quick Links & Documentation Directory

### Master Specifications
* 📖 [**Master Product Specification (PRD)**](MASTER_PRODUCT_SPECIFICATION.md)
* 🏛 [**Master Technical Specification**](MASTER_TECHNICAL_SPECIFICATION.md)
* 📐 [**Master Architecture Specification**](MASTER_ARCHITECTURE.md)
* 🧪 [**Master Test Specification & Quality Plan**](MASTER_TEST_SPECIFICATION.md)
* 🤖 [**AI Context & Directives**](AI_CONTEXT.md)
* 📊 [**Final Build & Execution Report**](FINAL_BUILD_REPORT.md)

### User & Operator Guides
* 🚀 [**Quick Start Guide**](QUICK_START.md)
* 💻 [**First-Time PC Setup Guide (Shop Owners)**](FIRST_TIME_PC_SETUP.md)
* 📦 [**Installation & Deployment Guide**](INSTALLATION.md)
* 👨‍💼 [**Merchant User Guide**](MERCHANT_USER_GUIDE.md)
* 🔧 [**Diagnostic & Troubleshooting Guide**](TROUBLESHOOTING.md)
* 🛠 [**Developer & Engineering Guide**](DEVELOPER_GUIDE.md)
* 🪟 [**Windows Compatibility Matrix**](docs/07-deployment/39_WINDOWS_COMPATIBILITY.md)
* 📋 [**Requirements Traceability Matrix**](docs/10-management/58_TRACEABILITY_MATRIX.md)

---

## 4. Local Portals & Access Points

When AutoPrint is active, portals are accessible locally in any browser:

| Portal | Default URL | Purpose |
|---|---|---|
| **Merchant Desktop** | `http://localhost:8000` | Staff queue management, cash confirmation, printer fleet status, and settings. |
| **Customer Kiosk** | `http://localhost:7000` | Customer mobile upload wizard, print configuration, price estimate, and 8-digit code. |
| **Backend REST API** | `http://localhost:5000/api` | Core print spooler, database, rate limiter, and authentication gateway. |

---

## 5. Development & Build Commands

```bash
# Install dependencies across all packages
npm run install:all

# Run backend automated test suite (34 tests)
npm run test:backend

# Run full test & linting verification
npm run test:all

# Compile all components (Backend, Merchant, Customer, C# Launcher)
npm run build:all

# Build standalone Windows Inno Setup installer
powershell -File scripts/build.ps1
```

---

## 6. License

AutoPrint is released under the [Apache-2.0 License](LICENSE).
