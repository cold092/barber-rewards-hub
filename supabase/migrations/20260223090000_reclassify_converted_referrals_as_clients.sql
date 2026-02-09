-- Reclassify legacy referrals that were marked as converted but should be clients.
-- Keeps them as active leads (contacted), marks as client and clears conversion plan linkage.
UPDATE public.referrals
SET
  status = 'contacted'::public.referral_status,
  is_client = true,
  client_since = COALESCE(client_since, NOW()),
  converted_plan_id = NULL
WHERE status = 'converted'::public.referral_status;
