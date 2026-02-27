-- Add a dedicated status for direct client registrations so they are not counted as converted leads
ALTER TYPE public.referral_status ADD VALUE IF NOT EXISTS 'client';
