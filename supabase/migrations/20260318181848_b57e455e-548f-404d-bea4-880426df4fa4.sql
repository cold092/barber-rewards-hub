
-- Fix Lili's inflated points: 86 → 50 (subtract 36 = 30% of Gold Completo 120 pts)
UPDATE public.profiles
SET wallet_balance = 50, lifetime_points = 50
WHERE id = 'aee82391-00bc-46c0-89a8-f596a8ecd2f2';

-- Fix Marcus's inflated lead_points: 130 → 10 (subtract 120 = Gold Completo plan points)
UPDATE public.referrals
SET lead_points = 10
WHERE id = '8e979de0-a189-4644-a679-b07a366a3455';
