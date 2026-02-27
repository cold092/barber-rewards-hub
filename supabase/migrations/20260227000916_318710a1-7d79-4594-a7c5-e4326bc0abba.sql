
-- Fix RLS policies to include 'owner' role alongside 'admin'

-- referrals: SELECT
DROP POLICY IF EXISTS "Admin and Barbers can read all referrals" ON public.referrals;
CREATE POLICY "Admin Owner Barbers can read referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'barber'::app_role)
  );

-- referrals: INSERT
DROP POLICY IF EXISTS "Admin and Barbers can insert referrals" ON public.referrals;
CREATE POLICY "Admin Owner Barbers can insert referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'barber'::app_role)
  );

-- referrals: UPDATE
DROP POLICY IF EXISTS "Admin and Barbers can update referrals" ON public.referrals;
CREATE POLICY "Admin Owner Barbers can update referrals"
  ON public.referrals FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'barber'::app_role)
  );

-- referrals: DELETE
DROP POLICY IF EXISTS "Admin can delete referrals" ON public.referrals;
CREATE POLICY "Admin Owner can delete referrals"
  ON public.referrals FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
  );

-- lead_history: SELECT
DROP POLICY IF EXISTS "Admin and Barbers can view lead history" ON public.lead_history;
CREATE POLICY "Admin Owner Barbers can view lead history"
  ON public.lead_history FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'barber'::app_role)
  );

-- lead_history: INSERT
DROP POLICY IF EXISTS "Admin and Barbers can insert lead history" ON public.lead_history;
CREATE POLICY "Admin Owner Barbers can insert lead history"
  ON public.lead_history FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'barber'::app_role)
  );

-- profiles: SELECT
DROP POLICY IF EXISTS "Admin and Barbers can read all profiles" ON public.profiles;
CREATE POLICY "Admin Owner Barbers can read profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'barber'::app_role)
  );

-- crm_settings: ALL
DROP POLICY IF EXISTS "Admins can manage all settings" ON public.crm_settings;
CREATE POLICY "Admin Owner can manage settings"
  ON public.crm_settings FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
  );

-- crm_settings: SELECT
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.crm_settings;
CREATE POLICY "Authenticated users can read settings"
  ON public.crm_settings FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role) 
    OR has_role(auth.uid(), 'barber'::app_role)
  );

-- user_roles: ALL for admin
DROP POLICY IF EXISTS "Admin can manage all roles" ON public.user_roles;
CREATE POLICY "Admin Owner can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'owner'::app_role)
  );

-- Clean orphaned organization
DELETE FROM public.organizations WHERE id = '8e288e48-b3fe-4fc8-9902-139019d57ab4';
