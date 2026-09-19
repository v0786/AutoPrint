# AutoPrint — Developer & Engineering Guide

**Target Audience**: Software Engineers, DevOps, System Integrators  

---

## 1. Local Workspace Setup

AutoPrint is structured as a multi-package mono-repo:

```bash
# Clone the repository
git clone https://github.com/v0786/AutoPrint.git
cd AutoPrint

# Install dependencies across all workspaces
npm run install:all
```

---

## 2. Running in Development Mode

Run services in separate terminals:

```bash
# Terminal 1: Backend Engine (Port 5000)
npm run dev:backend

# Terminal 2: Merchant Desktop SPA (Port 8000)
npm run dev:merchant

# Terminal 3: Customer Kiosk SPA (Port 7000)
npm run dev:customer
```

---

## 3. Testing & Code Quality

* **Backend Unit & Contract Tests**:
  ```bash
  npm run test:backend
  ```
* **Frontend TypeScript Checking**:
  ```bash
  npm run lint --prefix app/merchant-desktop
  npm run lint --prefix app/customer-web
  ```
* **Full Test Pipeline**:
  ```bash
  npm run test:all
  ```

---

## 4. Production Build & Release Packaging

Compile the complete application bundle and native C# launcher:

```bash
# Compiles backend, both frontends, and AutoPrint.exe
npm run build:all

# Package Windows Inno Setup installer
powershell -File scripts/build.ps1
```

Generated installer binaries are placed in `release/`:
* `release/AutoPrint-Setup.exe`
* `release/AutoPrint-1.0.0-Setup.exe`
* `release/AutoPrint-1.0.0-Portable.zip`
* `release/checksums.txt`
