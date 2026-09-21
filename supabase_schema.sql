-- ====================================================================
-- SUPABASE SQL SCHEMA FOR CRB STATUS CHECKER & PAYSTACK WEBHOOK
-- ====================================================================

-- 1. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  email TEXT,
  amount NUMERIC NOT NULL DEFAULT 100,
  currency TEXT NOT NULL DEFAULT 'KES',
  reference TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index for faster lookup by reference and phone
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON public.payments(phone);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. Only authenticated users can view payment history. Edge Functions write
-- verified records with the service role and do not depend on client inserts.
CREATE POLICY "Allow public read access to payments" 
  ON public.payments 
  FOR SELECT 
  TO authenticated
  USING (true);

-- ====================================================================
-- PAYSTACK WEBHOOK FUNCTION (SUPABASE EDGE FUNCTION / DATABASE WEBHOOK)
-- ====================================================================
-- When Paystack triggers live webhook for event 'charge.success',
-- it inserts the transaction into the payments table automatically.
--
-- TEST WEBHOOK URL to paste into Paystack Dashboard:
-- https://<PROJECT_REF>.supabase.co/functions/v1/paystack-webhook
-- ====================================================================
