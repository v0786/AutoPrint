# AutoPrint / QRPrint — Connectors

This directory houses modular hardware and service connectors used across the AutoPrint ecosystem.

## Connector Modules

### 1. `printer/` — Windows Spooler & Thermal ESC/POS Connector
* Enumerate system hardware printers.
* Dispatch raw and PDF documents to Windows print queue.
* Fallback to virtual spooler tray if hardware is offline.

### 2. `payment/` — UPI Deep Link & Dynamic QR Intent Connector
* Generates standard NPCI-compliant UPI 2.0 URLs.
* Computes dynamic QR parameters with order notes and amounts.

### 3. `storage/` — Datastore Local & Cloud Storage Connector
* Provides path-traversal-guarded operations for reading, writing, and streaming customer documents in the `datastore/` directory.
