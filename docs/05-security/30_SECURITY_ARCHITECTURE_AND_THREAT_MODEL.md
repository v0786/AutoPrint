# AutoPrint — Security Architecture & Threat Model

**Document ID**: 05-30  
**Category**: Security  

---

## 1. Security Principles

AutoPrint is designed to run in untrusted counter environments where customers connect their personal phones to the shop's network. Security adheres to the following principles:

1. **Least Privilege**: Merchant dashboard requires authentication; customer kiosk has zero administrative access.
2. **Timing-Safe Comparison**: All cryptographic tokens and passwords use constant-time comparisons (`crypto.timingSafeEqual`).
3. **No Shell Invocations**: Operating system commands (PowerShell, SumatraPDF, CUPS) use strict argument arrays rather than shell interpolation (`cmd.exe /c`), preventing command injection.
4. **Input Sanitization**: All incoming HTTP payloads are validated against strict Zod schemas before being accepted.
5. **Ephemeral Document Storage**: Customer files are deleted from the disk upon physical collection.

---

## 2. Threat Model Matrix (STRIDE)

| Threat Category | Potential Vector | AutoPrint Defense Implementation |
|---|---|---|
| **Spoofing** | Attacker self-reports payment success | Backend ignores client-reported payment flags; only server-verified gateway signatures or merchant physical cash confirmation authorizes printing. |
| **Tampering** | Parameter tampering of per-page rates | Pricing calculation is strictly executed on the backend using rates stored in SQLite; client calculations are for display only. |
| **Repudiation** | Operator denies refund or print action | Durable audit logs in `audit_logs` table record actor, IP, timestamp, and details for every financial and administrative action. |
| **Information Disclosure** | Diagnostic log export leaking merchant password or PageKite secret | Redaction engine strips all keys matching `password`, `secret`, `token`, `key`, or `bearer` before writing diagnostics to disk. |
| **Denial of Service** | Automated bot brute-forcing 8-digit verification codes | In-memory sliding-window rate limiter blocks IP addresses exceeding 10 lookup attempts per minute. |
| **Elevation of Privilege** | Attacker supplying token via URL query string (`?token=admin`) | Middleware strictly rejects tokens in query strings; Bearer tokens in HTTP Authorization headers are mandatory. |
