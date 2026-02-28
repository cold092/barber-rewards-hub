
-- Add tags array column to referrals (independent from contact_tag which is used for kanban)
ALTER TABLE public.referrals ADD COLUMN tags text[] NOT NULL DEFAULT '{}';
