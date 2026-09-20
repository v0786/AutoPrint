-- AutoPrint V2 Public Store Profiles & Pricing RLS
-- Allows customers on the central Vercel customer website to discover and inspect
-- active merchant stores and their live rate cards without requiring direct LAN access.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS rates JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_printer TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS kiosk_number TEXT;

CREATE INDEX IF NOT EXISTS idx_merchants_merchant_id_status
  ON public.merchants (merchant_id, status);

-- Allow public and authenticated customers to read active store profiles
GRANT SELECT ON public.merchants TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view active merchants" ON public.merchants;
CREATE POLICY "Anyone can view active merchants"
  ON public.merchants FOR SELECT
  TO anon, authenticated
  USING (status = 'ACTIVE');

-- Allow authenticated devices to manage/sync their own merchant profile
DROP POLICY IF EXISTS "Merchant devices can update own merchant record" ON public.merchants;
CREATE POLICY "Merchant devices can update own merchant record"
  ON public.merchants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.merchant_devices d
      WHERE d.auth_user_id = (select auth.uid())
        AND d.merchant_id = merchants.merchant_id
        AND d.status = 'ACTIVE'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.merchant_devices d
      WHERE d.auth_user_id = (select auth.uid())
        AND d.merchant_id = merchants.merchant_id
        AND d.status = 'ACTIVE'
    )
  );
