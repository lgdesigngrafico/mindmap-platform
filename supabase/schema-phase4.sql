-- Phase 4: Add role_in_company column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_in_company TEXT;
