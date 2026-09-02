# AutoPrint / QRPrint — Windows Production Installer Wizard

A modular, production-safe Command Prompt (CMD) installer suite for Windows environments.

## Features
1. **Interactive Wizard**: Step-by-step guidance with ASCII art banners, colored status indicators, and clear option menus.
2. **System Requirement Checks**: Automatically verifies Windows OS, Node.js ($\ge$ v18), npm, port availability (4100, 3000, 3001), and file write permissions.
3. **Permission Checkpoints**: Prompts for explicit user confirmation before creating folders, building projects, or installing packages.
4. **Dry-Run / Preview Mode**: Inspect all planned actions and folder targets without modifying anything on disk (`install.cmd` $\rightarrow$ `[P]`).
5. **Automated Safety Backups**: Generates timestamped backups in `datastore/backups/` before any upgrade or repair.
6. **Zero Data Loss**: Uninstaller defaults to preserving the database, audit records, and user uploads.

## Installer Scripts
* `install.cmd`: Main installer wizard with 7 operational modes.
* `uninstall.cmd`: Safe uninstallation utility.
* `repair.cmd`: Verifies dependencies and rebuilds all components.
* `backup.cmd`: Creates a standalone timestamped backup of the database and configurations.
* `restore.cmd`: Restores an existing backup from `datastore/backups/`.
* `migrate.cmd`: Checks and ensures datastore directory structure.

## Execution Log
All wizard actions, decisions, and system outputs are recorded with timestamps in:
`installer/logs/installer-YYYY-MM-DD.log`
