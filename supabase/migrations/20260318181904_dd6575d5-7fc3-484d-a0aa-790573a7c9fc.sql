
-- Simulate confirmConversion for Fernando with gold_completo
-- 1. Update Fernando's referral to converted
UPDATE public.referrals
SET status = 'converted', converted_plan_id = 'gold_completo', is_client = true, client_since = now()
WHERE id = 'bc50fa6a-9159-4a77-9ee9-9149177534d8';

-- 2. Chain referral: Marcus (referring lead) gets 100% = 120 lead_points
UPDATE public.referrals
SET lead_points = lead_points + 120
WHERE id = '8e979de0-a189-4644-a679-b07a366a3455';

-- 3. Lili (profile/barber) gets 30% = 36 pts
UPDATE public.profiles
SET wallet_balance = wallet_balance + 36, lifetime_points = lifetime_points + 36
WHERE id = 'aee82391-00bc-46c0-89a8-f596a8ecd2f2';
