
-- ============================================================
-- MULTI-TENANT DATA ISOLATION: Organization-based RLS
-- ============================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1. PROFILES: users see own profile + same org teammates
-- ============================================================
DROP POLICY IF EXISTS "Admin Owner Barbers can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can read own org profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id = get_user_organization_id(auth.uid())
  );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 2. REFERRALS: strict org isolation
-- ============================================================
DROP POLICY IF EXISTS "Admin Owner Barbers can read referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admin Owner Barbers can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admin Owner Barbers can update referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admin Owner can delete referrals" ON public.referrals;

CREATE POLICY "Users can read referrals in their org"
  ON public.referrals FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert referrals in their org"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update referrals in their org"
  ON public.referrals FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can delete referrals in their org"
  ON public.referrals FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  );

-- ============================================================
-- 3. CLIENTS: strict org isolation (already had org-based, but refresh)
-- ============================================================
DROP POLICY IF EXISTS "Users can read clients in their org" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their org" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their org" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients in their org" ON public.clients;

CREATE POLICY "Users can read clients in their org"
  ON public.clients FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert clients in their org"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update clients in their org"
  ON public.clients FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can delete clients in their org"
  ON public.clients FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
  );

-- ============================================================
-- 4. LEAD_HISTORY: filter via referral's organization_id
-- ============================================================
DROP POLICY IF EXISTS "Admin Owner Barbers can view lead history" ON public.lead_history;
DROP POLICY IF EXISTS "Admin Owner Barbers can insert lead history" ON public.lead_history;

CREATE POLICY "Users can view lead history in their org"
  ON public.lead_history FOR SELECT TO authenticated
  USING (
    referral_id IN (
      SELECT id FROM public.referrals
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert lead history in their org"
  ON public.lead_history FOR INSERT TO authenticated
  WITH CHECK (
    referral_id IN (
      SELECT id FROM public.referrals
      WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- ============================================================
-- 5. CRM_SETTINGS: org-scoped (use user_id for now since no org_id column)
-- ============================================================
DROP POLICY IF EXISTS "Admin Owner can manage settings" ON public.crm_settings;
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.crm_settings;

CREATE POLICY "Users can manage their own settings"
  ON public.crm_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. KANBAN_COLUMNS: already user_id scoped, keep as is
-- ============================================================
-- (existing policy is fine: user_id = auth.uid())

-- ============================================================
-- 7. USER_ROLES: users read own, admins/owners manage own org
-- ============================================================
DROP POLICY IF EXISTS "Admin Owner can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;

CREATE POLICY "Users can read their own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can manage roles in their org"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
    AND user_id IN (
      SELECT p.user_id FROM public.profiles p
      WHERE p.organization_id = get_user_organization_id(auth.uid())
    )
  );

-- ============================================================
-- 8. ORGANIZATIONS: users can only see their own org
-- ============================================================
DROP POLICY IF EXISTS "Users can read their organization" ON public.organizations;

CREATE POLICY "Users can read their own organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = get_user_organization_id(auth.uid()));

-- ============================================================
-- 9. TRIGGER: auto-set organization_id on referrals insert
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_referral_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := get_user_organization_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_referral_org_id ON public.referrals;
CREATE TRIGGER trg_set_referral_org_id
  BEFORE INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_organization_id();
