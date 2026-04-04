
-- Add wallet columns to clients
ALTER TABLE public.clients
ADD COLUMN wallet_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN lifetime_points numeric NOT NULL DEFAULT 0;

-- Add optional client_id to redemptions
ALTER TABLE public.redemptions
ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Update redemptions insert policy to allow barbers/admins to create on behalf of clients
DROP POLICY IF EXISTS "redemptions_insert" ON public.redemptions;
CREATE POLICY "redemptions_insert" ON public.redemptions
FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

-- Approve client redemption RPC
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
BEGIN
  SELECT * INTO _redemption FROM public.redemptions WHERE id = _redemption_id;
  IF _redemption IS NULL THEN RAISE EXCEPTION 'Redemption not found'; END IF;
  IF _redemption.status != 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  IF _redemption.client_id IS NULL THEN RAISE EXCEPTION 'Not a client redemption'; END IF;

  _caller_org := public.get_user_organization_id(auth.uid());
  IF _caller_org IS NULL OR _caller_org != _redemption.organization_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');
  IF NOT _is_admin THEN RAISE EXCEPTION 'Only admins can approve'; END IF;

  IF (SELECT wallet_balance FROM public.clients WHERE id = _redemption.client_id) < _redemption.points THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.clients
  SET wallet_balance = wallet_balance - _redemption.points
  WHERE id = _redemption.client_id;

  UPDATE public.redemptions
  SET status = 'approved', approved_by = auth.uid(),
      admin_note = COALESCE(_admin_note, admin_note), updated_at = now()
  WHERE id = _redemption_id;
END;
$$;

-- Reject client redemption RPC
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
