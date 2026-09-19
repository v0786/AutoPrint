# AutoPrint — Master Test Specification & Quality Assurance Plan

**Document**: MASTER_TEST_SPECIFICATION.md  
**Test Framework**: Node.js Native Test Runner (`node --test`), TypeScript Compiler (`tsc --noEmit`), Vite Build Pipeline  
**Target Coverage**: Unit, Integration, Resilience, Hardware Mocking, Security Verification  

---

## 1. Quality Assurance Strategy

AutoPrint enforces high test standards across all layers to ensure failure-proof operation in demanding Xerox shop environments:

1. **Unit Testing**: Tests domain pricing calculations, 8-digit verification code generation, input sanitization, and timing-safe authentication.
2. **Integration Testing**: Tests SQLite database migrations, job creation, status lifecycle transitions, and document upload validation.
3. **Resilience & Fault Tolerance**: Tests database recovery, corrupted JSON settings normalization, partial print detection, and restart persistence.
4. **Security Audit Remediation Tests**: Tests protection against timing attacks, token query string injections, rate limit enforcement, and PowerShell parameter injection.
5. **UI & Build Verification**: TypeScript type-checking (`tsc --noEmit`), Vite bundle compilation, and native C# compiler checks.

---

## 2. Test Suites Inventory

### 2.1 Suite 1: Print Settings Contract & Resilience (`print_settings_contract.test.ts`)
* **Test 1 — New Job**: Verifies that `printSettings` and `paperFormat` are initialized on job creation.
* **Test 2 — Default Settings**: Verifies job without explicit settings normalizes to safe A4 B&W defaults.
* **Test 3 — Custom Settings**: Verifies selecting A3, Landscape, and Duplex reflects accurately.
* **Test 4 — Payment Flow**: Verifies status transitions (`QUEUED` $\rightarrow$ `PRINTED`) preserve original print settings.
* **Test 5 — Legacy Job Normalization**: Verifies database records with NULL `print_settings_json` normalize safely.
* **Test 6 — Malformed Data Resilience**: Verifies corrupted JSON strings normalize without throwing uncaught exceptions.
* **Test 7 — All Jobs List**: Verifies `getAllJobs()` returns complete, normalized settings on every single job.

### 2.2 Suite 2: Reliability, Support, Feedback & Refund (`reliability_support_refund.test.ts`)
* **Test 1 — Customer Ingress**: Verifies customer name identification and document ingress.
* **Test 2 — Payment Reconciliation**: Verifies flagging of `PAYMENT_REVIEW_REQUIRED`.
* **Test 3 — Feedback Gating**: Verifies feedback is blocked when job handover is `PENDING_PRINT`.
* **Test 4 — Feedback Gating**: Verifies feedback is allowed once `COLLECTED` and prevents duplicate reviews.
* **Test 5 — Customer Support Ticket**: Verifies ticket creation and ID formatting.
* **Test 6 — Merchant Support Ticket**: Verifies diagnostic snapshots and secret redaction.
* **Test 7 — Secret Redaction Engine**: Verifies API keys, passwords, and tokens are scrubbed from exported diagnostics.
* **Test 8 — Refund Lifecycle**: Verifies refund request validation and mandatory operator explanations.

### 2.3 Suite 3: Security Remediation Verification (`security_audit_verification.test.ts`)
* **Test 1 — PageKite Sanitization**: Verifies shell character rejection in subdomain inputs.
* **Test 2 — Timing-Safe Comparison**: Verifies constant-time token comparison preventing side-channel attacks.
* **Test 3 — Query String Token Rejection**: Verifies rejection of tokens supplied via `?token=` parameter.
* **Test 4 — Route Authorization**: Verifies sensitive merchant endpoints reject unauthenticated requests.
* **Test 5 — Fraud Prevention**: Verifies customer cannot self-authorize a job without merchant verification.
* **Test 6 — Rate Limiter**: Verifies sliding-window rate limiting blocks rapid brute-force code guessing.
* **Test 7 — PowerShell Injection**: Verifies printer commands use safe parameter arrays.

---

## 3. Automated Execution & Results Summary

```text
> npm run test:backend
ℹ tests 34
ℹ suites 2
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2306.4693

> npm run lint --prefix app/merchant-desktop
> tsc --noEmit (Passed with 0 errors)

> npm run lint --prefix app/customer-web
> tsc --noEmit (Passed with 0 errors)

> npm run build:all
> Backend TypeScript compiled successfully.
> Merchant Desktop Vite bundle compiled in 2.64s.
> Customer Web Vite bundle compiled in 4.08s.
> Native AutoPrint.exe compiled via csc.exe targeting .NET 4.5.2.
```
