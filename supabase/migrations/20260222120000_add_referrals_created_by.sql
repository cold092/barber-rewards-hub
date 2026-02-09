ALTER TABLE public.referrals
ADD COLUMN created_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN created_by_name text,
ADD COLUMN created_by_role public.app_role;
