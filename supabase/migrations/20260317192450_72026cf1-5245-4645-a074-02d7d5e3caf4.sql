
-- Function to update profile wallet points, bypassing RLS
-- Only callable by authenticated users within the same organization
CREATE OR REPLACE FUNCTION public.update_profile_points(
  _profile_id uuid,
  _wallet_delta numeric,
  _lifetime_delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_org uuid;
  _caller_org uuid;
BEGIN
  -- Get target profile's organization
  SELECT organization_id INTO _target_org FROM public.profiles WHERE id = _profile_id;
  IF _target_org IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Get caller's organization
  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _target_org THEN
    RAISE EXCEPTION 'Not authorized to update this profile';
  END IF;

  UPDATE public.profiles
  SET
    wallet_balance = GREATEST(0, wallet_balance + _wallet_delta),
    lifetime_points = GREATEST(0, lifetime_points + _lifetime_delta)
  WHERE id = _profile_id;
END;
$$;

-- Function to update lead_points on referrals, bypassing potential issues
CREATE OR REPLACE FUNCTION public.update_referral_lead_points(
  _referral_id uuid,
  _points_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_org uuid;
  _caller_org uuid;
BEGIN
  SELECT organization_id INTO _target_org FROM public.referrals WHERE id = _referral_id;
  IF _target_org IS NULL THEN
    RAISE EXCEPTION 'Referral not found';
  END IF;

  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _target_org THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.referrals
  SET lead_points = GREATEST(0, lead_points + _points_delta)
  WHERE id = _referral_id;
END;
$$;
