-- Add contact_tag column to track lead status (SQL, MQL, Frio, Marcou)
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS contact_tag text;

-- Add is_client flag to distinguish clients from leads
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS is_client boolean NOT NULL DEFAULT false;

-- Add client_since column to track when they became a client
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS client_since timestamp with time zone;