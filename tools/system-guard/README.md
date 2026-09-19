# AutoPrint SystemGuard 🛡️

**SystemGuard** is a modular, cross-platform diagnostic, monitoring, automated self-healing, and incident escalation program engineered for the AutoPrint production ecosystem.

It provides zero-downtime protection against process crashes, memory leaks, file corruption, port contention, stale SQLite database locks, and anomalous code regressions.

---

## Table of Contents
1. [Core Features](#core-features)
2. [Quick Start & CLI Usage](#quick-start--cli-usage)
3. [Understanding Baselines & `.bak` Snapshots](#understanding-baselines--bak-snapshots)
4. [Automated Recovery & Self-Healing](#automated-recovery--self-healing)
5. [Watchdog Daemon Mode](#watchdog-daemon-mode)
6. [AI Incident Reports](#ai-incident-reports)
7. [REST API Endpoints](#rest-api-endpoints)
8. [Module Architecture](#module-architecture)

---

## 1. Core Features

- **Process & Daemon Monitoring**: Real-time heartbeat tracking on Backend (`:5000`), Customer Web Kiosk (`:7000`), and Merchant Desktop POS (`:8000`).
- **Resource Leak Detection**: Continuous monitoring of V8 heap memory growth, system RAM limits, CPU spikes, and disk capacity.
- **SHA-256 File Integrity Engine**: Detects tampering, accidental deletions, or byte corruptions against pristine baseline manifests.
- **Code & Syntax Anomaly Scanner**: Static analysis across TypeScript, JavaScript, and JSON configuration files (`package.json`, `tsconfig.json`, `.env`).
- **Automatic Self-Healing**:
  - Restores corrupted or deleted files from verified baseline `.bak` snapshots.
  - Clears stale SQLite `.db-wal` / `.db-shm` locks and checkpoint buffers.
  - Terminates orphaned zombie processes holding critical ports (`5000`, `7000`, `8000`).
  - Purges abandoned temporary files older than TTL while strictly preserving active print jobs.
- **Exponential Backoff & Crash Loop Limiter**: Service restarter with randomized jitter preventing cascading crash loops (max 5 restarts within 60s).
- **AI-Optimized Incident Reporting**: Formats incident telemetry (stack traces, system state, diffs) ready for AI diagnosis without leaking credentials.

---

## 2. Quick Start & CLI Usage

Run commands from the repository root:

```bash
# Display live health dashboard & service status
npm run guard:status

# Run deep static analysis and file integrity scan
npm run guard:scan

# Execute automated self-healing procedures (locks, orphans, file restoration)
npm run guard:recover

# Generate/update clean baseline snapshots after intentional code edits
npm run guard:baseline

# Compile on-demand AI escalation incident report
npm run guard:report

# Run background continuous watchdog daemon (default: 15s interval)
npm run guard:watch
```

---

## 3. Understanding Baselines & `.bak` Snapshots

### How Baselines Work
When you execute `npm run guard:baseline`, SystemGuard:
1. Scans all critical application files (`backend/src`, `config`, migrations, server scripts).
2. Calculates SHA-256 digests for each file.
3. Generates a master manifest at `datastore/guard/baselines/manifest.json`.
4. Saves a pristine compressed backup copy of each file under:
   ```
   datastore/guard/baselines/files/<SHA-256_HASH>.bak
   ```

### Why are files named with long hashes (e.g. `f94da5fe...bak`)?
SystemGuard utilizes **content-addressable storage**. The file name is the exact SHA-256 hash of its verified clean content.

- If an application file is corrupted, truncated, or accidentally deleted, `integrityScanner` detects the checksum mismatch against `manifest.json`.
- `fileRestorer` looks up the expected hash in `datastore/guard/baselines/files/<sha256>.bak` and restores the file to its original path in milliseconds without cloud or external network dependencies.

### When should you update the baseline?
Run `npm run guard:baseline` **after any intentional code or configuration change** that passes tests, so SystemGuard records the new hashes as the approved state.

---

## 4. Automated Recovery & Self-Healing

Run self-healing manually at any time:
```bash
npm run guard:recover
```

SystemGuard automatically:
1. **Audits File Integrity**: Replaces any modified, corrupted, or missing files using clean baseline copies.
2. **Clears SQLite Locks**: Safely unlocks stale SQLite WAL/SHM locks from abnormal daemon terminations.
3. **Terminates Port Zombies**: Identifies dead processes holding port 5000, 7000, or 8000 and kills them.
4. **Cleans Stale Caches**: Removes temporary upload buffers older than 2 hours without touching active customer jobs.
5. **Renders Post-Recovery Health**: Outputs an updated ANSI dashboard verifying all services.

---

## 5. Watchdog Daemon Mode

To run SystemGuard continuously in production:
```bash
npm run guard:watch
```

- Polls system state every 15 seconds (or custom: `node tools/system-guard/dist/bin/guard-cli.js watch 30`).
- If any daemon crashes, port locks, or file corruption occurs, the watchdog executes immediate self-healing and logs audit events.
- If a service fails repeatedly (exceeding 5 restarts in 60 seconds), it trips the crash-loop circuit breaker and generates an AI Incident Report.

---

## 6. AI Incident Reports

When unrecoverable failures occur, SystemGuard generates structured reports:
- Markdown report: `logs/incidents/INCIDENT-<timestamp>.md`
- Machine-readable JSON: `logs/incidents/INCIDENT-<timestamp>.json`

### Key Sections in Reports:
- **Incident Summary**: Severity, failing component, root error message.
- **Environment Snapshot**: Node.js version, platform, OS release, heap usage, system RAM.
- **Service & Resource Telemetry**: Active ports, CPU usage, open database state.
- **Corrupted / Tampered Files**: Exact diffs and changed paths.
- **Sanitized Secrets**: API keys, UPI secrets, and passwords are automatically redacted.
- **Ready-to-Use AI Prompt**: A preformatted prompt prompt ready to paste into Claude, ChatGPT, or Gemini for immediate diagnostic guidance.

---

## 7. REST API Endpoints

SystemGuard is mounted directly in the AutoPrint Backend API:

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/system/guard/health` | `GET` | Public | Returns JSON health score (0-100), daemon reachabilities, latency, and memory stats. |
| `/api/system/guard/status` | `GET` | Public | Returns text-based dashboard report. |
| `/api/system/guard/:command` | `POST` | Admin | Triggers command (`status`, `scan`, `recover`, `report`) remotely from Merchant Dashboard. |

### Example Health Response:
```json
{
  "ok": true,
  "status": "healthy",
  "score": 100,
  "services": [
    { "name": "/health", "port": 5000, "reachable": true, "latencyMs": 12 },
    { "name": "/", "port": 7000, "reachable": true, "latencyMs": 8 },
    { "name": "/", "port": 8000, "reachable": true, "latencyMs": 10 }
  ],
  "resources": {
    "processUptimeSeconds": 1420,
    "rssMb": 85,
    "heapUsedMb": 24,
    "freeMemoryMb": 3410,
    "totalMemoryMb": 16127,
    "datastoreReady": true
  }
}
```

---

## 8. Module Architecture

```
tools/system-guard/
├── bin/
│   └── guard-cli.ts              # Command-line interface driver
├── src/
│   ├── config.ts                 # Port constants, paths, and thresholds
│   ├── types.ts                  # TypeScript schemas and diagnostic interfaces
│   ├── systemGuard.ts            # Master orchestrator
│   ├── monitoring/
│   │   ├── processMonitor.ts     # Daemon port health and crash signal monitor
│   │   ├── resourceLeakDetector.ts # V8 heap and system RAM consumption tracker
│   │   ├── integrityScanner.ts   # SHA-256 file manifest verification
│   │   └── codeAnomaliesScanner.ts # Static parse & syntax anomaly scanner
│   ├── recovery/
│   │   ├── baselineManager.ts    # Snapshot creator and manifest manager
│   │   ├── fileRestorer.ts       # Automatic file reinstatement from .bak archives
│   │   ├── serviceController.ts  # Exponential backoff service restart supervisor
│   │   ├── lockCleaner.ts        # SQLite lock and zombie port cleaner
│   │   └── autoFixer.ts          # Pattern-matching automatic remediation
│   └── reporting/
│       ├── structuredLogger.ts   # Secret-redacting 10MB rotating logger
│       ├── incidentReporter.ts   # Markdown & JSON AI incident generator
│       └── terminalDashboard.ts  # ANSI health dashboard renderer
└── tests/
    └── guard.test.ts             # Comprehensive automated test suite
```
