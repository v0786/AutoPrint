# AutoPrint / QRPrint — Project Structure & Organization Guide

## Root Directory Organization

```
E:\Project\AutoPrint\
├── apps\                          # Active Application Source Code
│   ├── backend\                   # Express + TypeScript REST API Engine (Port 4100)
│   ├── customer-web\              # Customer Kiosk React/Vite Application (Port 3000 / 8085)
│   └── merchant-desktop\          # Merchant Desktop Print Manager (Port 3001 / 5000)
│
├── datastore\                     # Dedicated Persistent Runtime Data Directory
│   ├── customer\
│   │   ├── uploads\               # Raw uploaded user files
│   │   └── documents\             # Watermarked, stamped PDF documents ready for handover
│   ├── merchant\
│   │   ├── jobs\                  # Job metadata and batch logs
│   │   ├── transactions\          # Transaction records
│   │   └── cash\                  # Cash collection logs
│   ├── backend\
│   │   ├── database\              # SQLite database (autoprint.db)
│   │   ├── audit\                 # Append-only audit logs
│   │   └── logs\                  # Application diagnostic & error logs
│   ├── connectors\                # Spool queues and connector cache
│   ├── backups\                   # Automated installer and operational backups
│   └── temp\                      # Temporary processing area
│
├── connectors\                    # Modular Hardware and External Gateway Connectors
│   ├── printer\                   # Windows Spooler & thermal ESC/POS adapter
│   ├── payment\                   # UPI 2.0 Intent & dynamic QR generator
│   └── storage\                   # Datastore filesystem & cloud connector
│
├── installer\                     # Production-Safe Windows CMD Installer Wizard
│   ├── install.cmd                # Main interactive installer wizard (7 operational modes)
│   ├── uninstall.cmd              # Safe uninstallation utility
│   ├── repair.cmd                 # Automated repair & rebuild script
│   ├── backup.cmd                 # Standalone datastore backup script
│   ├── restore.cmd                # Datastore backup restoration script
│   ├── migrate.cmd                # Directory validation script
│   ├── lib\                       # Modular CMD routines (checks, logging, common UI)
│   ├── config\                    # Installer defaults (installer-defaults.json)
│   └── logs\                      # Timestamped installer audit logs
│
├── assets\                        # Official Branding Assets
│   ├── app-icon.png               # High-resolution application printer logo
│   └── logo.png                   # Branding header logo
│
├── docs\                          # Comprehensive System Documentation
│   ├── ARCHITECTURE.md            # Architecture diagrams & subsystem design
│   ├── PROJECT_STRUCTURE.md       # Directory layout & file classifications
│   ├── INSTALLATION.md            # Installation & setup instructions
│   ├── CONFIGURATION.md           # Environment variables & port allocations
│   ├── DATASTORE.md               # Datastore layout & lifecycle policies
│   ├── BACKUP_AND_RECOVERY.md     # Disaster recovery & backup procedures
│   ├── TROUBLESHOOTING.md         # Diagnostic & error resolution manual
│   └── CONNECTORS.md              # Printer, payment, and storage connectors
│
├── scripts\                       # Operational Management Scripts
│   ├── start-all.cmd              # Launches backend, merchant, customer services
│   ├── stop-all.cmd               # Gracefully stops background Node processes
│   └── health-check.cmd           # Queries backend /health endpoint
│
├── unused files\                  # Safely Archived Legacy Files (100% Data Retention)
│   ├── old-standalone-repos\      # Standalone customer and merchant web repos
│   ├── old-snapshots\             # Previous development snapshots
│   ├── old-scripts\               # Deprecated batch scripts
│   ├── duplicate-files\           # Redundant shared packages & docs
│   ├── migration-manifest.json    # Machine-readable archive manifest
│   └── README.md
│
├── .env.example                   # Centralized environment template
├── package.json                   # Root workspace package orchestrator
└── README.md
```
