
-- 1) Remove unused phone column from profiles to prevent harvesting
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

-- 2) Prevent non-admin/owner users from modifying financial fields directly
CREATE OR REPLACE FUNCTION public.protect_profile_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance)
     OR (NEW.lifetime_points IS DISTINCT FROM OLD.lifetime_points) THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
            OR public.has_role(auth.uid(), 'owner'::app_role)) THEN
      RAISE EXCEPTION 'Only admins or owners can modify wallet_balance or lifetime_points';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_financial_fields_trg ON public.profiles;
CREATE TRIGGER protect_profile_financial_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_financial_fields();
