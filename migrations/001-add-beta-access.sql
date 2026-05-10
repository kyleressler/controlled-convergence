-- ============================================================
-- Migration: Add beta access tracking
--
-- Run this in Supabase SQL Editor to add beta testing support.
-- Location: supabase.com → your project → SQL Editor → New Query
-- ============================================================

-- Add beta_access field to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS beta_access BOOLEAN NOT NULL DEFAULT FALSE;

-- Add beta_signup_date to track when they joined beta
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS beta_signup_date TIMESTAMPTZ;

-- Create an index for fast beta user lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_beta_access
ON public.user_profiles (beta_access)
WHERE beta_access = TRUE;

-- ============================================================
-- Done. The user_profiles table now supports beta access tracking.
-- ============================================================
