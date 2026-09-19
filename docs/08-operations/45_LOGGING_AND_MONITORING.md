# AutoPrint — Logging, Telemetry & Monitoring Architecture

**Document ID**: 08-45  
**Category**: Operations  
**Requirement Mapping**: Section 39, 40, 41 Master Prompt  

---

## 1. Logging Strategy & Standards

AutoPrint implements comprehensive, structured logging across all system operations to allow rapid troubleshooting in retail environments:

* **Log Levels**: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `CRITICAL`.
* **Format**: Dual format — human-readable timestamped console output and structured JSON log streams for automated analysis.
* **Storage Location**: `C:\ProgramData\AutoPrint\logs\` (Windows) or `/var/log/autoprint/` (Linux).
* **Sanitization Guarantee**: Secrets, passwords, API keys, and payment tokens are scrubbed by a pre-write regex redaction filter.

---

## 2. Dedicated Log Channels

Logs are segregated into rotating domain log files:

| File Name | Purpose | Retained Events |
|---|---|---|
| `application.log` | General lifecycle & API | Process startup, shutdowns, HTTP requests, port bindings. |
| `printer.log` | Hardware spooling events | WMI discovery, printer status changes, SumatraPDF dispatch, paper jams. |
| `jobs.log` | Print job lifecycle | Job creation, file uploads, page count extraction, state transitions. |
| `payment.log` | Financial records | UPI intent creation, payment verification, cash confirmation at counter. |
| `security.log` | Auth & security events | Login attempts, password resets, rate-limiting triggers, token validations. |
| `pagekite.log` | Ingress tunnel status | Tunnel connection attempts, reconnects, socket errors. |
| `database.log` | SQLite engine events | Connection initialization, WAL checkpointing, schema migrations. |
| `audit.log` | Permanent compliance trail | Merchant actions (cash collected, document downloaded, price modified). |

---

## 3. Log Rotation & Disk Retention

* **Maximum File Size**: 10 MB per file.
* **Rotation Policy**: Rotates up to 5 historical archived segments (`application.log.1`, etc.).
* **Automatic Purge**: Rotated archives older than 30 days are automatically pruned during daily maintenance sweeps to prevent disk space saturation.
