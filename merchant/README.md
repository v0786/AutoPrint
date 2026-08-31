# Merchant App

QRPrint Merchant is the local-first desktop dashboard for storefront operators. It runs on the merchant's PC, exposes a local admin dashboard, and connects to the customer-facing interface through a ClaudeFlair tunnel.

## Requirements

- Windows 10/11
- Node.js 20+
- Git
- Administrator privileges for the installer
- Optional local PostgreSQL installation for production data persistence

## Local setup

1. Clone the repository.
2. Open Command Prompt as Administrator.
3. Run:

```cmd
installer.bat
```

The installer performs the following actions:

- validates local prerequisites
- installs merchant dependencies
- creates the local PostgreSQL database if configured
- initializes the app schema
- starts the merchant backend
- prints the localhost access URL in the terminal

## Development

```cmd
cd merchant
npm install
npm run dev
```

The app expects the desktop shell to run on a local port and the customer app to reach it through the ClaudeFlair tunnel URL:

```env
CLAUDEFLAIR_URL=https://your-tunnel.example
MERCHANT_API_BASE_URL=http://localhost:4100
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qrprint_merchant
DB_USER=postgres
DB_PASSWORD=postgres
```

## Production notes

- Use Electron packaging for desktop distribution.
- Keep the merchant backend local-only with a secure tunnel to the customer app.
- Use PostgreSQL as the offline-first local database.
- Maintain a backup/sync strategy for local data restoration.
