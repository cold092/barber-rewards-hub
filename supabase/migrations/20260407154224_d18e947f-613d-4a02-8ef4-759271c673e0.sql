-- Add client_user_id to referrals for linking authenticated client accounts
ALTER TABLE public.referrals
ADD COLUMN client_user_id uuid DEFAULT NULL;

-- Policy: clients can view their own referral
CREATE POLICY "clients_view_own_referral"
ON public.referrals
FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

-- Policy: clients can view their own redemptions
CREATE POLICY "clients_view_own_redemptions"
ON public.redemptions
FOR SELECT
TO authenticated
USING (referral_id IN (
  SELECT id FROM public.referrals WHERE client_user_id = auth.uid()
));

-- Policy: clients can create their own redemptions
CREATE POLICY "clients_create_own_redemptions"
ON public.redemptions
FOR INSERT
TO authenticated
WITH CHECK (referral_id IN (
  SELECT id FROM public.referrals WHERE client_user_id = auth.uid()
));