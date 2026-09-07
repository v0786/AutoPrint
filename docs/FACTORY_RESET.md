# AutoPrint — Complete Factory Reset Guide

> [!CAUTION]
> **DEVELOPMENT & ADMINISTRATOR TOOL ONLY**  
> `npm run reset` is a destructive maintenance command. It is **not** intended for daily customer use. Running this command permanently wipes all local data and restores AutoPrint to the state of a brand-new installation.

---

## What Does a Factory Reset Do?

The factory reset command completely resets AutoPrint:

```text
               AutoPrint Factory Reset
                         │
                         ▼
        Safely Terminates Active Processes
      (Backend, Customer Kiosk, Merchant Desk)
                         │
                         ▼
       Permanently Deletes Persistent Data:
       ❌ Merchant Administrator & User Accounts
       ❌ All Saved Sessions & "Remember this PC" Tokens
       ❌ SQLite Database (autoprint.db & WAL logs)
       ❌ Customer Records & Print History
       ❌ Uploaded Documents & PDF Job Files
       ❌ Payment Reconciliation & Cash Audit Logs
       ❌ AutoPrint Installation State (installation.json)
       ❌ AutoPrint Application Config (appsettings.json)
       ❌ PageKite Subdomain & Secret Tokens
                         │
                         ▼
         Recreates Clean Directory Skeletons
                         │
                         ▼
             Pristine Clean State:
   Behaves exactly like a freshly installed application
       that has never been opened or configured!
```

---

## 1. Interactive Reset (Recommended for Testing)

To perform a factory reset with interactive safety confirmation:

1. Open your terminal or command prompt in the AutoPrint project directory.
2. Run:
   ```bash
   npm run reset
   ```
3. A prominent red warning will appear detailing what will be deleted.
4. Type **`RESET`** in uppercase and press Enter:
   ```text
   ⚠️  DANGER: DESTRUCTIVE FACTORY RESET ⚠️
   This operation will PERMANENTLY ERASE all AutoPrint persistent data!
   
   Type 'RESET' in capital letters to confirm: RESET
   ```
5. If anything else is entered, the operation safely aborts without modifying any files.

---

## 2. Non-Interactive / Automated Reset

For automated scripts, test pipelines, or CI environments, you can bypass the interactive confirmation prompt using the `--force` or `--yes` flag:

```bash
npm run reset -- --force
```
or
```bash
npm run reset -- --yes
```

This immediately stops any running AutoPrint microservices, deletes all persistent databases and storage folders, and creates empty directory skeletons.

---

## 3. What Happens After Reset?

When you start AutoPrint after running a reset:

1. Double-click `AutoPrint.exe` or run `npm start`.
2. All services initialize with clean, blank databases.
3. The Merchant Desk opens at `http://localhost:8000`.
4. Because zero users exist in the database, the **First-Run Welcome & Account Creation Wizard** displays immediately:
   - "AUTOPRINT — Welcome to your Print Shop System"
   - You can create a fresh store owner account and configure the system from scratch.

---

## 4. What Is NOT Deleted by Factory Reset?

The factory reset command is strictly scoped to user data and runtime states:
- **Application Binaries are Preserved:** Node runtime files, compiled frontend assets, backend server bundles, and native launcher executables are **never** deleted.
- **Node Modules are Preserved:** `node_modules` are untouched, so you do not need to reinstall dependencies after a reset.
- **Windows Printer Drivers are Preserved:** Your system printers remain configured in Windows.
