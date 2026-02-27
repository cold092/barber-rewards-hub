-- Add dedicated status for direct client registrations
ALTER TYPE public.referral_status ADD VALUE IF NOT EXISTS 'client';
