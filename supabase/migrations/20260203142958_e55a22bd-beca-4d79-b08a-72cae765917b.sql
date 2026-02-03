-- Add a self-referencing column to track which lead referred another lead
-- This allows leads to participate in the referral chain without needing a login

ALTER TABLE public.referrals 
ADD COLUMN referred_by_lead_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL;

-- Add points tracking for leads (since they don't have profiles)
ALTER TABLE public.referrals 
ADD COLUMN lead_points integer NOT NULL DEFAULT 0;

-- Add a comment explaining the referral chain logic
COMMENT ON COLUMN public.referrals.referred_by_lead_id IS 'If this lead was referred by another lead (not a barber), this points to the referring lead record';
COMMENT ON COLUMN public.referrals.lead_points IS 'Points accumulated by this lead for referring other leads';