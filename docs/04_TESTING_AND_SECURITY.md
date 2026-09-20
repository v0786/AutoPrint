# AutoPrint — SDLC Phase 4: Quality Assurance & Security Verification

**Document Reference**: SDLC-DOC-04  
**Phase**: 4 — Verification, Validation, Test Automation & Threat Modeling  
**Product**: AutoPrint  
**Version**: 2.0.0 (Production Release)  

---

## 1. Testing Strategy & Quality Pyramid

AutoPrint utilizes a multi-tier testing strategy ensuring failure-proof operation across varied hardware:

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

## 2. Test Suites Inventory & Verification Results

### 2.1 Suite 1: Print Settings Contract & Resilience (`print_settings_contract.test.ts`)
* **Test 1 — New Job**: Verifies `printSettings` and `paperFormat` are initialized on job creation.
* **Test 2 — Default Settings**: Verifies job without explicit settings normalizes to safe A4 B&W defaults.
* **Test 3 — Custom Settings**: Verifies selecting A3, Landscape, and Duplex reflects accurately.
* **Test 4 — Payment Flow**: Verifies status transitions (`QUEUED` $\rightarrow$ `PRINTED`) preserve original print settings.
* **Test 5 — Legacy Job Normalization**: Verifies database records with NULL `print_settings_json` normalize safely.
* **Test 6 — Malformed Data Resilience**: Verifies corrupted JSON strings normalize without crashing.
* **Test 7 — All Jobs List**: Verifies `getAllJobs()` returns complete, normalized settings on every single job.

### 2.2 Suite 2: Reliability, Support, Feedback & Refund (`reliability_support_refund.test.ts`)
* **Test 1 — Customer Ingress**: Verifies customer name identification and document ingress.
* **Test 2 — Payment Reconciliation**: Verifies flagging of `PAYMENT_REVIEW_REQUIRED`.
* **Test 3 — Feedback Gating**: Verifies feedback is blocked when job handover is `PENDING_PRINT`.
* **Test 4 — Feedback Gating**: Verifies feedback is allowed once `COLLECTED` and duplicate reviews are prevented.
* **Test 5 — Customer Support Ticket**: Verifies ticket creation and ID formatting.
* **Test 6 — Merchant Support Ticket**: Verifies diagnostic snapshots and secret redaction.
* **Test 7 — Secret Redaction Engine**: Verifies API keys, passwords, and tokens are scrubbed from exported diagnostics.
* **Test 8 — Refund Lifecycle**: Verifies refund request validation and mandatory operator explanations.

### 2.3 Suite 3: Security Remediation Verification (`security_audit_verification.test.ts`)
* **Test 1 — Public URL Safety**: Verifies hosted-store and LAN URLs are generated without secret material.
* **Test 2 — Timing-Safe Comparison**: Verifies constant-time token comparison preventing side-channel attacks.
* **Test 3 — Query String Token Rejection**: Verifies rejection of tokens supplied via `?token=` parameter.
* **Test 4 — Route Authorization**: Verifies sensitive merchant endpoints reject unauthenticated requests.
* **Test 5 — Fraud Prevention**: Verifies customer cannot self-authorize a job without merchant verification.
* **Test 6 — Rate Limiter**: Verifies sliding-window rate limiting blocks rapid brute-force code guessing.
* **Test 7 — PowerShell Injection**: Verifies printer commands use safe parameter arrays.

### 2.4 Execution Summary
```text
> autoprint-backend@1.0.0 test
> tsc && node --test dist/tests/*.test.js

ℹ tests 34 | suites 2 | pass 34 | fail 0 | cancelled 0 | skipped 0
ℹ duration_ms 2368.1736
```

---

## 3. Threat Model & Security Controls (STRIDE Matrix)

| Threat Category | Potential Vector | AutoPrint Defense Implementation |
|---|---|---|
| **Spoofing** | Attacker self-reports payment success | Backend ignores client-reported payment flags; only server-verified gateway signatures or physical cash confirmation authorizes printing. |
| **Tampering** | Parameter tampering of per-page rates | Pricing calculation is strictly executed on the backend using rates stored in SQLite; client calculations are for display only. |
| **Repudiation** | Operator denies refund or print action | Durable audit logs in `audit_logs` table record actor, IP, timestamp, and details for every financial and administrative action. |
| **Information Disclosure** | Diagnostic log export leaking merchant password or access token | Redaction engine strips all keys matching `password`, `secret`, `token`, `key`, or `bearer` before writing diagnostics to disk. |
| **Denial of Service** | Automated bot brute-forcing 8-digit verification codes | In-memory sliding-window rate limiter blocks IP addresses exceeding 10 lookup attempts per minute. |
| **Elevation of Privilege** | Attacker supplying token via URL query string (`?token=admin`) | Middleware strictly rejects tokens in query strings; Bearer tokens in HTTP Authorization headers are mandatory. |

---

## 4. Multi-Platform CI/CD Validation Strategy

AutoPrint enforces a cross-platform GitHub Actions matrix workflow verifying builds and tests across operating systems:

```yaml
name: Cross-Platform Build & Verification
on: [push, pull_request]

jobs:
  matrix-test:
    name: Test on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, ubuntu-latest]
        node-version: [20.x]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install Dependencies
        run: npm run install:all

      - name: Run Backend Tests
        run: npm run test:backend

      - name: Run Frontend Typechecks
        run: npm run test:all

      - name: Compile Windows Launcher (.NET)
        if: runner.os == 'Windows'
        run: cmd /c src-launcher\build-launcher.cmd
```
