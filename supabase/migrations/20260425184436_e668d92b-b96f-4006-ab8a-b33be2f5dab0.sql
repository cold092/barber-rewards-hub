ALTER TABLE public.redemptions
ADD COLUMN IF NOT EXISTS reward_id uuid,
ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'custom';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_request_type_check'
  ) THEN
    ALTER TABLE public.redemptions
    ADD CONSTRAINT redemptions_request_type_check
    CHECK (request_type IN ('catalog', 'custom'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_reward_id_fkey'
  ) THEN
    ALTER TABLE public.redemptions
    ADD CONSTRAINT redemptions_reward_id_fkey
    FOREIGN KEY (reward_id) REFERENCES public.reward_catalog(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON public.redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_referral_status ON public.redemptions(referral_id, status);
CREATE INDEX IF NOT EXISTS idx_redemptions_profile_status ON public.redemptions(profile_id, status);

DROP POLICY IF EXISTS clients_create_own_redemptions ON public.redemptions;
DROP POLICY IF EXISTS redemptions_insert ON public.redemptions;

CREATE POLICY "redemptions_no_direct_insert"
ON public.redemptions
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.create_redemption_request(
  _reward_id uuid DEFAULT NULL,
  _custom_description text DEFAULT NULL,
  _custom_points integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _profile public.profiles%ROWTYPE;
  _reward public.reward_catalog%ROWTYPE;
  _description text;
  _points integer;
  _request_type text;
  _redemption_id uuid;
BEGIN
  SELECT * INTO _profile
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF _profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF _reward_id IS NOT NULL THEN
    SELECT * INTO _reward
    FROM public.reward_catalog
    WHERE id = _reward_id
      AND organization_id = _profile.organization_id
      AND active = true;

    IF _reward.id IS NULL THEN
      RAISE EXCEPTION 'Reward not found or inactive';
    END IF;

    _description := _reward.name;
    _points := _reward.points_cost;
    _request_type := 'catalog';
  ELSE
    _description := NULLIF(trim(COALESCE(_custom_description, '')), '');
    _points := _custom_points;
    _request_type := 'custom';

    IF _description IS NULL THEN
      RAISE EXCEPTION 'Description is required';
    END IF;
  END IF;

  IF _points IS NULL OR _points <= 0 THEN
    RAISE EXCEPTION 'Points must be greater than zero';
  END IF;

  IF _profile.wallet_balance < _points THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  INSERT INTO public.redemptions (
    organization_id,
    profile_id,
    user_id,
    referral_id,
    reward_id,
    request_type,
    description,
    points,
    status
  ) VALUES (
    _profile.organization_id,
    _profile.id,
    auth.uid(),
    NULL,
    _reward_id,
    _request_type,
    _description,
    _points,
    'pending'
  )
  RETURNING id INTO _redemption_id;

  RETURN _redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_client_redemption_request(
  _referral_id uuid,
  _reward_id uuid DEFAULT NULL,
  _custom_description text DEFAULT NULL,
  _custom_points integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_org uuid;
  _is_admin boolean;
  _referral public.referrals%ROWTYPE;
  _reward public.reward_catalog%ROWTYPE;
  _description text;
  _points integer;
  _request_type text;
  _redemption_id uuid;
  _profile_id uuid;
BEGIN
  IF _referral_id IS NULL THEN
    RAISE EXCEPTION 'Client is required';
  END IF;

  SELECT * INTO _referral
  FROM public.referrals
  WHERE id = _referral_id
  LIMIT 1;

  IF _referral.id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  IF NOT (_referral.is_client OR _referral.status = 'converted') THEN
    RAISE EXCEPTION 'Referral is not a client';
  END IF;

  _caller_org := public.get_user_organization_id(auth.uid());
  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');

  IF _referral.client_user_id = auth.uid() THEN
    _profile_id := COALESCE((SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), _referral.referrer_id);
  ELSIF _is_admin AND _caller_org = _referral.organization_id THEN
    _profile_id := COALESCE((SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1), _referral.referrer_id);
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _reward_id IS NOT NULL THEN
    SELECT * INTO _reward
    FROM public.reward_catalog
    WHERE id = _reward_id
      AND organization_id = _referral.organization_id
      AND active = true;

    IF _reward.id IS NULL THEN
      RAISE EXCEPTION 'Reward not found or inactive';
    END IF;

    _description := _reward.name;
    _points := _reward.points_cost;
    _request_type := 'catalog';
  ELSE
    _description := NULLIF(trim(COALESCE(_custom_description, '')), '');
    _points := _custom_points;
    _request_type := 'custom';

    IF _description IS NULL THEN
      RAISE EXCEPTION 'Description is required';
    END IF;
  END IF;

  IF _points IS NULL OR _points <= 0 THEN
    RAISE EXCEPTION 'Points must be greater than zero';
  END IF;

  IF _referral.lead_points < _points THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  INSERT INTO public.redemptions (
    organization_id,
    profile_id,
    user_id,
    referral_id,
    reward_id,
    request_type,
    description,
    points,
    status
  ) VALUES (
    _referral.organization_id,
    _profile_id,
    auth.uid(),
    _referral.id,
    _reward_id,
    _request_type,
    _description,
    _points,
    'pending'
  )
  RETURNING id INTO _redemption_id;

  RETURN _redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _redemption public.redemptions%ROWTYPE;
  _caller_org uuid;
  _is_admin boolean;
BEGIN
  SELECT * INTO _redemption FROM public.redemptions WHERE id = _redemption_id;
  IF _redemption.id IS NULL THEN
    RAISE EXCEPTION 'Redemption not found';
  END IF;
  IF _redemption.status != 'pending' THEN
    RAISE EXCEPTION 'Redemption already processed';
  END IF;

  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _redemption.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only admins can approve redemptions';
  END IF;

  IF _redemption.referral_id IS NOT NULL THEN
    IF (SELECT lead_points FROM public.referrals WHERE id = _redemption.referral_id) < _redemption.points THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE public.referrals
    SET lead_points = lead_points - _redemption.points
    WHERE id = _redemption.referral_id;
  ELSE
    IF (SELECT wallet_balance FROM public.profiles WHERE id = _redemption.profile_id) < _redemption.points THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE public.profiles
    SET wallet_balance = wallet_balance - _redemption.points
    WHERE id = _redemption.profile_id;
  END IF;

  UPDATE public.redemptions
  SET status = 'approved',
      approved_by = auth.uid(),
      admin_note = COALESCE(_admin_note, admin_note),
      updated_at = now()
  WHERE id = _redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _redemption public.redemptions%ROWTYPE;
  _caller_org uuid;
  _is_admin boolean;
BEGIN
  SELECT * INTO _redemption FROM public.redemptions WHERE id = _redemption_id;
  IF _redemption.id IS NULL THEN
    RAISE EXCEPTION 'Redemption not found';
  END IF;
  IF _redemption.status != 'pending' THEN
    RAISE EXCEPTION 'Redemption already processed';
  END IF;

  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _redemption.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only admins can reject redemptions';
  END IF;

  UPDATE public.redemptions
  SET status = 'rejected',
      approved_by = auth.uid(),
      admin_note = COALESCE(_admin_note, admin_note),
      updated_at = now()
  WHERE id = _redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_client_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.approve_redemption(_redemption_id, _admin_note);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_client_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.reject_redemption(_redemption_id, _admin_note);
END;
$$;