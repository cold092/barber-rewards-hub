ALTER TABLE public.referrals
ADD COLUMN is_client boolean NOT NULL DEFAULT false,
ADD COLUMN client_since timestamp with time zone;
