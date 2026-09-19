# AutoPrint — Requirements Traceability Matrix (RTM)

**Document ID**: 10-58  
**Category**: Management  
**Requirement Mapping**: Section 68 Master Prompt  

---

| Requirement ID | Requirement Description | Design Component | Code Implementation | Verification Test Suite | Acceptance Criteria |
|---|---|---|---|---|---|
| **REQ-01** | Zero-Account Customer Ingress with Name Entry | `01_PRODUCT_VISION.md` | `app/customer-web/src/App.tsx`, `autoprintController.ts` | `reliability_support_refund.test.ts` (Test 1) | Customer uploads without password; name required. |
| **REQ-02** | Multi-Format Document Ingress (PDF, DOCX, Img) | `05_PRODUCT_REQUIREMENTS.md` | `documentProcessor.ts`, Multer `uploads/` | `reliability_support_refund.test.ts` (Test 1) | Files parsed, size limits enforced ($\le 50$ MB). |
| **REQ-03** | 8-Digit Numeric Collection Code Generation | `MASTER_PRODUCT_SPEC.md` | `autoprintService.ts` (`generateVerificationCode`) | `print_settings_contract.test.ts` (Test 1) | Exactly 8 digits, unique, collision-free CSPRNG. |
| **REQ-04** | Windows Spooler & SumatraPDF Silent Dispatch | `19_PRINTING_SUBSYSTEM.md`| `printerService.ts`, `tools/sumatrapdf` | `print_settings_contract.test.ts` (Test 4) | Direct spooling without popup dialogs. |
| **REQ-05** | Cash Counter Confirmation Workflow | `11_WORKFLOWS.md` | `autoprintController.ts` (`cashCollected`) | `reliability_support_refund.test.ts` (Test 2) | Job held in `CASH_HELD` until merchant clicks collected. |
| **REQ-06** | Ephemeral File Deletion upon Collection | `MASTER_ARCHITECTURE.md` | `autoprintService.ts` (`markJobCollected`) | `reliability_support_refund.test.ts` (Test 4) | Disk file unlinked; DB transaction record kept. |
| **REQ-07** | Windows 7, 8, 10, 11 Native Execution | `39_WINDOWS_COMPATIBILITY.md`| `src-launcher/Program.cs` (.NET 4.5.2) | C# `csc.exe` & Windows installer test | Native system tray launcher runs on Win 7+. |
| **REQ-08** | Inactivity Lock Screen (10 min) | `11_WORKFLOWS.md` | `merchant-desktop/src/App.tsx`, `auth.ts` | `security_audit_verification.test.ts` (Test 4) | UI locks after 10m; background spooling continues. |
| **REQ-09** | Rate Limiting on Code Search (Anti-Brute Force) | `30_SECURITY_ARCHITECTURE.md`| `middleware/rateLimiter.ts` | `security_audit_verification.test.ts` (Test 6) | Max 10 requests/min per IP on search route. |
| **REQ-10** | Dynamic LAN & PageKite QR Code Generation | `25_PAGEKITE_INGRESS.md` | `tunnelService.ts`, `qrCodeService.ts` | `security_audit_verification.test.ts` (Test 1) | High-contrast QR generated for counter standee. |
| **REQ-11** | Duplicate Print Prevention on Retry | `19_PRINTING_SUBSYSTEM.md`| `merchant-desktop/src/components/JobDetailModal.tsx` | Manual & Resilience Test Suite | Requires operator confirmation "NO PRINT RECEIVED". |
| **REQ-12** | Accessible Motion Primitives (`prefers-reduced-motion`) | `docs/MOTION-GUIDELINES.md` | `components/motion-primitives/*` | Vite build & `tsc --noEmit` | Spring animations disabled when reduced motion set. |
