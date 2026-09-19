# AutoPrint — Testing Strategy & Quality Assurance Plan

**Document ID**: 06-35  
**Category**: Quality  

---

## 1. Testing Pyramid & Verification Levels

AutoPrint employs a multi-tier testing pyramid to ensure zero-downtime operation across varied hardware:

```text
              ▲
             / \
            /   \      End-to-End Workflow Verification
           / E2E \     (Customer Upload -> Payment -> Spooler -> Handover)
          /───────\
         /  Integ  \   Integration & Contract Testing
        /   ration  \  (SQLite WAL Migrations, Printer Discovery, Rate Limiter)
       /─────────────\
      /  Unit Tests   \ Unit Testing
     /                 \(Pricing, Codes, Timing-Safe Auth, Normalization)
    ─────────────────────
```

---

## 2. Test Execution Commands

* **Backend Unit & Integration Tests**:
  ```bash
  npm run test:backend
  ```
  Runs all 34 automated tests in `app/backend/dist/tests/` using Node's native test runner (`node --test`).
* **Frontend Static Type Verification**:
  ```bash
  npm run lint --prefix app/merchant-desktop
  npm run lint --prefix app/customer-web
  ```
  Executes `tsc --noEmit` across all TypeScript modules and JSX components.
* **Full Production Build Verification**:
  ```bash
  npm run build:all
  ```
  Compiles backend TypeScript, builds merchant and customer Vite bundles, and compiles `AutoPrint.exe` via Microsoft Visual C# Compiler (`csc.exe`).
