# QRPrint — Production Build & Packaging Documentation

This document explains how to build and package **QRPrint** from source code into standalone, offline Windows distribution packages.

---

## 1. Development & Build Prerequisites

To compile the entire QRPrint ecosystem from source, the build host requires:

1. **Operating System**: Windows 10, Windows 11, or Windows Server 2019+
2. **Node.js**: Node.js v20.x LTS or higher
3. **Microsoft .NET Framework SDK / Build Tools**:
   - `csc.exe` (Microsoft Visual C# Compiler version 4.x, included natively in Windows at `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`)
4. **Inno Setup 6**:
   - Inno Setup 6.2+ installed at `C:\Program Files (x86)\Inno Setup 6\ISCC.exe`
5. **Python (Optional for Spec / Automation)**:
   - Python 3.8+ (for executing `scripts/build.py` or PyInstaller wrapper)

---

## 2. Build Pipeline Architecture

The build process transforms source modules into self-contained offline installers:

```
Source Code
  ├── src-launcher/AutoPrintManager.cs ───────► csc.exe ───────► AutoPrint.exe (.NET 4.5.2)
  ├── app/backend (TypeScript) ──────────────► tsc ───────────► app/backend/dist/server.js
  ├── app/customer-web (React/Vite) ──────────► vite build ────► app/customer-web/dist/
  └── app/merchant-desktop (React/Vite) ──────► vite build ────► app/merchant-desktop/dist/
                                                                      │
                                                                      ▼
                                                          dist-installer/payload/
                                                                      │
                                        ┌─────────────────────────────┴─────────────────────────────┐
                                        ▼                                                           ▼
                               Inno Setup 6 (ISCC.exe)                                      Compress-Archive
                               installer/QRPrint.iss                                                │
                                        │                                                           ▼
                                        ▼                                           release/QRPrint-1.0.0-Portable.zip
                        release/QRPrint-1.0.0-Setup.exe
                                        │
                                        ▼
                               Get-FileHash (SHA-256)
                                        │
                                        ▼
                              release/checksums.txt
```

---

## 3. One-Command Build Execution

### Using PowerShell (Recommended):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1
```

### Using Python:
```bash
python scripts/build.py
```

### Build Pipeline Stages:
1. **Clean**: Purges previous intermediate staging directories (`dist-installer/payload/`).
2. **Prerequisites Validation**: Ensures embedded offline installers (`node-v20.18.0-x64.msi` and `NDP452-KB2901907-x86-x64-AllOS-ENU.exe`) are present in `installer/prerequisites/`.
3. **Native Launcher Compilation**: Invokes `csc.exe` targeting .NET Framework 4.5.2 to produce `AutoPrint.exe`.
4. **Workspace Compilation**: Executes `npm run build:all` to compile Backend TypeScript to JavaScript and build minified Vite frontend assets.
5. **Payload Assembly**: Assembles production binaries, pre-installed vendor modules, icons, documentation, and tools into `dist-installer/payload/`.
6. **Inno Setup Single-EXE Compilation**: Executes `ISCC.exe installer/QRPrint.iss` with LZMA2/Ultra64 compression to generate `release/QRPrint-Setup.exe` and `release/QRPrint-1.0.0-Setup.exe`.
7. **Portable Package & Checksums**: Archives the payload into `release/QRPrint-1.0.0-Portable.zip` and calculates cryptographic SHA-256 hashes in `release/checksums.txt`.

---

## 4. PyInstaller Build Specification

For environments requiring Python binary wrapping, the build tree includes [`build/qrprint.spec`](../build/qrprint.spec):
```bash
pyinstaller build/qrprint.spec
```
- Configured with `--windowed` (no console window in production).
- Automatically embeds `assets/`, `config/`, and `tools/`.
- Includes hidden imports for `win32print`, `wmi`, `sqlite3`, and Windows cryptographic APIs.

---

## 5. Artifact Verification

After building, inspect the generated artifacts in `release/`:
```
release/
├── QRPrint-1.0.0-Setup.exe      # Inno Setup single-exe offline installer
├── QRPrint-Setup.exe            # Standard distribution alias
├── QRPrint-1.0.0-Portable.zip   # Zero-installation portable archive
└── checksums.txt                # SHA-256 integrity hashes
```
All binaries and outputs can be tested on a clean Windows machine without internet access.
