# AutoPrint SystemGuard: Diagnostic, Monitoring & Recovery Guide

**Document Reference**: SDLC-DOC-GUARD  
**Component**: SystemGuard Diagnostic & Self-Healing Suite  
**Location**: `tools/system-guard/`  
**Product**: AutoPrint 2.0  

---

## 1. Executive Summary

**SystemGuard** is the automated guardian daemon and recovery subsystem for the AutoPrint local production environment. It guarantees zero-downtime operations for walk-in print counters by proactively detecting process failures, syntax anomalies, file corruptions, port collisions, and SQLite database deadlocks, automatically applying self-healing remedies.

---

## 2. Command Quick Reference

All commands can be executed directly from the project root:

| Command | Action | Behavior |
|---|---|---|
| `npm run guard:status` | **Live Health Check** | Generates an ANSI terminal dashboard displaying system health score, port status (5000, 7000, 8000), CPU/RAM gauges, and file integrity state. |
| `npm run guard:scan` | **Static & Integrity Scan** | Inspects TypeScript/JavaScript files and JSON configurations for syntax issues and compares SHA-256 hashes against clean baselines. |
| `npm run guard:recover` | **Automated Self-Healing** | Cleans stale SQLite locks, kills port-holding zombie processes, and restores corrupted files from verified `.bak` archives. |
| `npm run guard:baseline` | **Update Baseline Snapshots** | Records current pristine code and config state into `datastore/guard/baselines/manifest.json` and updates `.bak` archives. |
| `npm run guard:report` | **Generate AI Incident Report** | Exports a structured, secret-redacted incident report to `logs/incidents/` containing stack traces and pre-prompted AI diagnosis queries. |
| `npm run guard:watch` | **Continuous Daemon** | Runs a background watchdog process (every 15s) with automated self-healing triggers. |

---

## 3. Baseline & Snapshot Storage Architecture

SystemGuard preserves system resilience via non-destructive **content-addressed baseline snapshots**:

```
datastore/guard/baselines/
├── manifest.json              # Master registry of files, timestamps, and SHA-256 digests
└── files/
    ├── <sha256_hash_1>.bak    # Pristine copy of file 1
    ├── <sha256_hash_2>.bak    # Pristine copy of file 2
    └── ...
```

### Key Principles:
1. **Safety Guarantee**: Baseline snapshots are kept completely separate from customer databases (`autoprint.db`) and uploaded print jobs. Creating or restoring baselines will never overwrite customer print queues or financial records.
2. **Deterministic Rollback**: When a file is modified or corrupted by unexpected hardware failure or manual edits, `integrityScanner` pinpoints the discrepancy and `fileRestorer` pulls the exact clean version from `files/<hash>.bak`.
3. **Updating the Baseline**: When you make intentional code modifications or updates, run `npm run guard:baseline` to establish the new verified baseline state.

---

## 4. Self-Healing Mechanics

When `npm run guard:recover` runs, it executes four recovery phases:

1. **Port Zombie Cleanup**: Inspects local ports `:5000` (Backend), `:7000` (Customer Kiosk), and `:8000` (Merchant POS). Any orphaned or defunct processes occupying these ports are safely terminated.
2. **SQLite Lock Clearance**: Resolves dangling `.db-wal` or `.db-shm` write-ahead logs caused by unexpected machine power-offs, reopening clean read/write connections.
3. **File Integrity Restoration**: Detects modified or missing application files registered in `manifest.json` and restores them from `datastore/guard/baselines/files/*.bak`.
4. **Cache & Temp Purge**: Safely sweeps stale temporary files older than the configured TTL (preserving all pending and active print jobs).

---

## 5. REST API Integration

SystemGuard health and controls are integrated into the AutoPrint Backend API:

- **`GET /api/system/guard/health`**: Real-time status, latency probes for all three services, memory and CPU statistics.
- **`GET /api/system/guard/status`**: Formatted status report for administrative UIs.
- **`POST /api/system/guard/:command`**: Admin-authenticated trigger for `scan`, `recover`, or `report`.
