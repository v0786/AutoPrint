# AutoPrint — Supabase Phase 1 Foundation & Setup Guide

This document explains how to set up, configure, migrate, and test the **Phase 1 Supabase Foundation** for AutoPrint.

---

## 1. Phase 1 Overview & Scope

### What belongs to Phase 1:
* **Centralized Supabase Client**: Type-safe client singleton with session persistence, automatic token refreshes, and guard against `service_role` key exposure.
* **Authentication**: Email & password signup, signin, signout, session persistence, auth state listeners, and human-friendly error mapping.
* **User Profiles**: `public.profiles` table with automatic PostgreSQL trigger on `auth.users` insert.
* **Merchants**: `public.merchants` multi-tenant root accounts created securely via the `create_merchant` PostgreSQL RPC function.
* **Stores**: `public.stores` belonging to merchants with cascade deletion.
* **Merchant Memberships**: `public.merchant_members` with roles (`merchant_owner`, `merchant_staff`) and unique constraints `(merchant_id, user_id)`.
* **Row Level Security (RLS)**: Strictly enforced at the database level on all Phase 1 tables using subqueries `(select auth.uid())` and membership checks to prevent privilege escalation.
* **Backward Compatibility**: AutoPrint V1 offline local printing workflows, SQLite database, and local spooler remain 100% operational when Supabase is not configured or when working offline.

### What is Intentionally Deferred to Phase 2:
* `print_jobs` cloud table and synchronization
* `print_files` metadata and Supabase Storage bucket uploads
* Razorpay & UPI payment webhooks / cloud reconciliation
* Customer web QR print upload workflow via Supabase
* Edge Functions for customer print ordering
* Printer device registration and cloud agent pairing tokens
* Realtime subscriptions for incoming remote print jobs
* Offline-to-cloud bidirectional synchronization engine

---

## 2. Setting Up Your Supabase Project

### Step 1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Choose an organization, enter a project name (e.g. `AutoPrint Production` or `AutoPrint Staging`), and choose a strong database password.
4. Select the region closest to your merchants (e.g., `ap-south-1` Mumbai for India).
5. Click **Create new project** and wait for provisioning to complete.

### Step 2: Retrieve API Credentials
1. In your project dashboard, navigate to **Project Settings** > **API**.
2. Locate the following credentials under **Project API keys**:
   * **Project URL**: `https://<your-project-ref>.supabase.co`
   * **Publishable / Anon Key**: `eyJhbGciOiJIUzI1NiIsIn...`
3. **CRITICAL SECURITY NOTE**: Never place your `service_role` secret in frontend applications (`app/merchant-desktop` or `app/customer-web`). The frontend only needs the `anon` / `publishable` key.

---

## 3. Applying Database Migrations

AutoPrint includes a fully reproducible, idempotent SQL migration for Phase 1:
* Location: `supabase/migrations/001_phase1_foundation.sql` (and `supabase/migrations/20260920000005_phase1_foundation.sql`)

You can apply the migration using either method:

### Option A: Supabase Web Dashboard SQL Editor (Quickest)
1. Go to **SQL Editor** in your Supabase Dashboard.
2. Click **New Query**.
3. Open [`supabase/migrations/001_phase1_foundation.sql`](file:///d:/AutoPrint/supabase/migrations/001_phase1_foundation.sql) in your editor and copy the entire file contents.
4. Paste into the SQL Editor and click **Run**.
5. Verify that all 4 tables (`profiles`, `merchants`, `stores`, `merchant_members`), the trigger `on_auth_user_created`, and function `create_merchant` are created successfully.

### Option B: Supabase CLI
```bash
# Log in to Supabase CLI
supabase login

# Link your local repo to your remote project
supabase link --project-ref <your-project-ref>

# Push the migration
supabase db push
```

---

## 4. Configuring Supabase Authentication

1. In the Supabase Dashboard, navigate to **Authentication** > **Providers** > **Email**.
2. Ensure **Email provider** is **Enabled**.
3. For development/testing:
   * You can temporarily disable **Confirm email** if you wish to allow instant sign-ins without email verification during local testing.
   * For production, keep **Confirm email** enabled so users verify their business email address.
4. Under **Authentication** > **URL Configuration**:
   * Add your local development URLs to **Redirect URLs**:
     * `http://localhost:8000/**`
     * `http://localhost:5173/**`

---

## 5. Configuring Local Environment Variables

In `app/merchant-desktop`:

1. Copy `.env.example` to `.env`:
   ```bash
   cp app/merchant-desktop/.env.example app/merchant-desktop/.env
   ```
2. Set the Supabase variables:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-or-publishable-key>
   ```

> **Note**: If `VITE_SUPABASE_URL` is omitted or left empty, AutoPrint automatically operates in **V1 Local Offline Mode**, using the local SQLite store and offline print spooler.

---

## 6. How Authentication & Multi-Tenancy Works

### Architecture:
```text
┌─────────────────────────────────────────────────────────────┐
│                    Merchant Desktop UI                      │
│             (Vite + React + Tailwind + Lucide)              │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    isCloudAuthEnabled = true     isCloudAuthEnabled = false
                │                             │
                ▼                             ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     Supabase Auth & RLS       │ │   Local SQLite Engine     │
│   (JWT Session in Storage)    │ │ (/api/merchant/auth/*)    │
└───────────────┬───────────────┘ └───────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database Engine                 │
│                                                             │
│  1. auth.users ──(Trigger)──> public.profiles               │
│  2. create_merchant RPC ───> public.merchants (owner_id)   │
│                          └──> public.merchant_members       │
│                          └──> public.stores                 │
│  3. RLS Policies enforced via (SELECT auth.uid())           │
└─────────────────────────────────────────────────────────────┘
```

1. **Sign Up**:
   * The user fills in Email, Password, Full Name, Phone, and Business Name.
   * `supabaseAuthService.signUp()` registers the user via Supabase Auth.
   * The database trigger `handle_new_user()` instantly creates a row in `public.profiles` using `new.id` and metadata `raw_user_meta_data`.
   * After authentication, `supabaseAuthService.createMerchant()` calls the secure PostgreSQL RPC `create_merchant(business_name, store_name, store_address)`.
2. **Session Persistence**:
   * Supabase automatically stores session JWT tokens in browser `localStorage`.
   * `AuthProvider` initializes on app start, fetching the session before rendering any view. This completely eliminates any "flash of logged-out UI".
3. **Sign Out**:
   * Invoking `auth.signOut()` invalidates the Supabase session, clears local memory, and resets the UI to the authentication modal.

---

## 7. Row Level Security (RLS) Policies

All tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

* **`profiles`**:
  * `select`: Allowed only if `id = (select auth.uid())`.
  * `update`: Allowed only if `id = (select auth.uid())`.
  * `insert`: Handled automatically by the `security definer` trigger `handle_new_user()`.
* **`merchants`**:
  * `select`: Allowed for `owner_id = (select auth.uid())` OR users who are members in `merchant_members`.
  * `update`: Allowed only for the `owner_id` or members with role `merchant_owner`.
* **`stores`**:
  * `select`: Allowed for members belonging to the parent merchant.
  * `insert`/`update`/`delete`: Allowed only for merchant owners (`role = 'merchant_owner'`).
* **`merchant_members`**:
  * `select`: Allowed for members belonging to the same merchant.
  * `insert`/`update`/`delete`: Restricted strictly to owners of that merchant, preventing regular staff from granting themselves owner privileges or modifying memberships.

---

## 8. Running the Application Locally

```bash
# 1. Install dependencies across the workspace
npm run install:all

# 2. Run backend (Port 5000)
npm run dev --prefix app/backend

# 3. In another terminal, run Merchant Desktop (Port 8000)
npm run dev --prefix app/merchant-desktop

# 4. In another terminal, run Customer Web (Port 7000)
npm run dev --prefix app/customer-web
```

---

## 9. Verification & Automated Tests

To run the unified test suite:
```bash
npm run test:all
```

To run the backend test suite (including Supabase foundation verification):
```bash
npm test --prefix app/backend
```

To run typechecking:
```bash
npm run lint --prefix app/merchant-desktop
npm run lint --prefix app/customer-web
```
