# Customer App

This Vercel project powers the customer-facing QR print flow. It is intentionally separate from the merchant desktop experience and interacts with the merchant backend through a ClaudeFlair tunnel.

## Local development

```bash
npm install
npm run dev
```

## Production configuration

Add these environment variables in Vercel:

```env
NEXT_PUBLIC_APP_NAME=QRPrint
NEXT_PUBLIC_TUNNEL_URL=https://your-tunnel.example
MERCHANT_API_BASE_URL=https://your-tunnel.example
NEXT_PUBLIC_PRINT_API_URL=https://your-tunnel.example/api
```

## Deployment

1. Push this folder to a Vercel project.
2. Add the environment variables above.
3. Point the customer app to the ClaudeFlair tunnel URL that forwards requests to the local merchant backend.

## Data flow

Customer request -> Vercel frontend -> ClaudeFlair tunnel -> local merchant backend -> merchant response -> customer UI

## Security notes

- Do not expose the local database directly.
- Restrict tunnel usage to the required API routes.
- Validate merchant/session tokens before print job creation.
