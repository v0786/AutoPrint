# AutoPrint / QRPrint — Configuration Manual

All system settings are controlled through environment variables configured in `.env` at the root of the project.

## Environment Variables Reference

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `4100` | Port for the Backend REST API Server |
| `MERCHANT_PORT` | Number | `3001` | Port for the Merchant Desktop Web Portal |
| `CUSTOMER_PORT` | Number | `3000` | Port for the Customer Kiosk Web Portal |
| `NODE_ENV` | String | `development` | Runtime mode: `development`, `production`, or `test` |
| `API_PREFIX` | String | `/api` | Base route prefix for all API endpoints |
| `AUTOPRINT_DATA_DIR` | String | `./datastore` | Root persistent storage directory |
| `MAX_DIGITAL_ATTEMPTS`| Number | `3` | Maximum digital/UPI attempts before cash lockout |
| `HMAC_SECRET` | String | *(Must be $\ge 32$ chars)* | Secret key for physical verification watermark HMAC |
| `CORS_ORIGIN` | String | `http://localhost:3000,...` | Comma-separated list of allowed frontend origins |
| `CURRENCY` | String | `INR` | System currency code (`INR` or `USD`) |
| `MAX_FILE_SIZE_MB` | Number | `50` | Maximum file upload size in megabytes |

---

## Datastore Paths

When `AUTOPRINT_DATA_DIR` is set to `./datastore`:
* **Database**: `datastore/backend/database/autoprint.db`
* **Audit Logs**: `datastore/backend/audit/`
* **Server Diagnostics**: `datastore/backend/logs/`
* **Raw Uploads**: `datastore/customer/uploads/`
* **Watermarked PDFs**: `datastore/customer/documents/`
* **Backups**: `datastore/backups/`
