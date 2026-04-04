
-- Remove unnecessary columns from clients
ALTER TABLE public.clients
DROP COLUMN IF EXISTS wallet_balance,
DROP COLUMN IF EXISTS lifetime_points;

-- Drop client_id FK (we'll use referral_id instead)
ALTER TABLE public.redemptions DROP COLUMN IF EXISTS client_id;

-- Add referral_id for client redemptions
ALTER TABLE public.redemptions
ADD COLUMN referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL;

-- Update approve function for client redemptions
CREATE OR REPLACE FUNCTION public.approve_client_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _redemption RECORD;
  _caller_org uuid;
  _is_admin boolean;
  _current_points integer;
BEGIN
  SELECT * INTO _redemption FROM public.redemptions WHERE id = _redemption_id;
  IF _redemption IS NULL THEN RAISE EXCEPTION 'Redemption not found'; END IF;
  IF _redemption.status != 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  IF _redemption.referral_id IS NULL THEN RAISE EXCEPTION 'Not a client redemption'; END IF;

  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _redemption.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');
  IF NOT _is_admin THEN RAISE EXCEPTION 'Only admins can approve'; END IF;

  SELECT lead_points INTO _current_points FROM public.referrals WHERE id = _redemption.referral_id;
  IF _current_points < _redemption.points THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from referral lead_points
  UPDATE public.referrals
  SET lead_points = lead_points - _redemption.points
  WHERE id = _redemption.referral_id;

  UPDATE public.redemptions
  SET status = 'approved', approved_by = auth.uid(),
      admin_note = COALESCE(_admin_note, admin_note), updated_at = now()
  WHERE id = _redemption_id;
END;
$$;

-- Update reject function
CREATE OR REPLACE FUNCTION public.reject_client_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _redemption RECORD;
  _caller_org uuid;
  _is_admin boolean;
BEGIN
  SELECT * INTO _redemption FROM public.redemptions WHERE id = _redemption_id;
  IF _redemption IS NULL THEN RAISE EXCEPTION 'Redemption not found'; END IF;
  IF _redemption.status != 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _redemption.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');
  IF NOT _is_admin THEN RAISE EXCEPTION 'Only admins can reject'; END IF;

  UPDATE public.redemptions
  SET status = 'rejected', approved_by = auth.uid(),
      admin_note = COALESCE(_admin_note, admin_note), updated_at = now()
  WHERE id = _redemption_id;
END;
$$;
