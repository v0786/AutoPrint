# AutoPrint Customer Web

Production customer-facing web portal for **AutoPrint**. Allows customers to scan a store QR code, upload documents (PDF, DOCX, images), configure print settings (color, copies, paper format), pay via UPI / Cash, and track their print job in real time.

---

## 🚀 Deploy to Vercel (Recommended — Free `*.vercel.app` Domain)

You do **NOT** need to buy a custom domain. Vercel provides a free `https://<your-project>.vercel.app` domain with automatic SSL and SPA rewrites.

### Quick Setup:

1. **Go to Vercel**:
   - Visit [vercel.com](https://vercel.com) and log in with your GitHub account.

2. **Import Repository**:
   - Click **"Add New..."** -> **"Project"**.
   - Select `v0786/AutoPrint-v2`.

3. **Configure Project Settings**:
   - **Framework Preset**: `Vite` (detected automatically)
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**:
   Add the following variables in the Vercel dashboard (**Settings → Environment Variables**):
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (e.g. `https://your-project.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase **Anon / Public** Key (*never* use the service-role key)

5. **Deploy**:
   - Click **Deploy**.
   - In ~30 seconds, your site will be live at `https://autoprint-v2.vercel.app` (or your chosen name)!

---

## 🌐 Deploy to GitHub Pages (Alternative)

If you prefer GitHub Pages:

1. In GitHub repository settings -> **Pages**:
   - Set Source to **GitHub Actions**.
2. Run build with base path:
   ```bash
   VITE_BASE_PATH=/AutoPrint-v2/ npm run build
   ```
3. Deploy the `dist` directory.
*(Note: Vercel is recommended over GitHub Pages because Vercel supports HTML5 history routing `/store/:merchantId` out of the box with `vercel.json`).*

---

## 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

---

## 🔗 How Customers Access Store Portals

Customers scan the physical store standee QR code, which opens:

- **Path style**: `https://<your-domain>/store/AP-M001`
- **Query style**: `https://<your-domain>/?merchantId=AP-M001`

The customer web portal automatically connects to the merchant's store, loads live pricing, and routes orders directly to the merchant's physical printer queue.
