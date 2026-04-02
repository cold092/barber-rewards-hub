
-- Create redemption status enum
CREATE TYPE public.redemption_status AS ENUM ('pending', 'approved', 'rejected');

-- Create redemptions table
CREATE TABLE public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  profile_id uuid NOT NULL,
  user_id uuid NOT NULL,
  description text NOT NULL,
  points integer NOT NULL CHECK (points > 0),
  status redemption_status NOT NULL DEFAULT 'pending',
  admin_note text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Users in same org can view redemptions
CREATE POLICY "redemptions_select" ON public.redemptions
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));

-- Users can create redemptions for themselves
CREATE POLICY "redemptions_insert" ON public.redemptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = get_user_organization_id(auth.uid())
  );

-- Admins/owners can update (approve/reject)
CREATE POLICY "redemptions_update" ON public.redemptions
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_redemptions_updated_at
  BEFORE UPDATE ON public.redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to approve redemption and deduct points atomically
CREATE OR REPLACE FUNCTION public.approve_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _redemption RECORD;
  _caller_org uuid;
  _target_org uuid;
  _is_admin boolean;
BEGIN
  -- Get redemption
  SELECT * INTO _redemption FROM public.redemptions WHERE id = _redemption_id;
  IF _redemption IS NULL THEN
    RAISE EXCEPTION 'Redemption not found';
  END IF;
  IF _redemption.status != 'pending' THEN
    RAISE EXCEPTION 'Redemption already processed';
  END IF;

  -- Auth checks
  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _redemption.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');
  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Only admins can approve redemptions';
  END IF;

  -- Check balance
  IF (SELECT wallet_balance FROM public.profiles WHERE id = _redemption.profile_id) < _redemption.points THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct points
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - _redemption.points
  WHERE id = _redemption.profile_id;

  -- Update redemption
  UPDATE public.redemptions
  SET status = 'approved',
      approved_by = auth.uid(),
      admin_note = COALESCE(_admin_note, admin_note),
      updated_at = now()
  WHERE id = _redemption_id;
END;
$$;

-- Function to reject redemption
CREATE OR REPLACE FUNCTION public.reject_redemption(_redemption_id uuid, _admin_note text DEFAULT NULL)
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
  IF _redemption IS NULL THEN
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
