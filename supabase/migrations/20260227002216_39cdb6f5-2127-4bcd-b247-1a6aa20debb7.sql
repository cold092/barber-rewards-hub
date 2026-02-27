
-- ============================================================
-- FULL MULTI-TENANT SaaS SCHEMA (rebuild from scratch)
-- ============================================================

-- 1. DROP tables first (CASCADE removes dependent triggers/constraints)
DROP TABLE IF EXISTS public.lead_history CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.kanban_columns CASCADE;
DROP TABLE IF EXISTS public.crm_settings CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- Drop trigger on auth.users (must be explicit)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_organization_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.create_organization_and_owner(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_referral_organization_id() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop enums
DROP TYPE IF EXISTS public.lead_event_type CASCADE;
DROP TYPE IF EXISTS public.referral_status CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 2. ENUMS
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'barber', 'client');
CREATE TYPE public.referral_status AS ENUM ('new', 'contacted', 'converted');
CREATE TYPE public.lead_event_type AS ENUM (
  'status_change', 'tag_change', 'qualification_change',
  'note_added', 'whatsapp_contact', 'conversion', 'created'
);

-- 3. TABLES

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  phone text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  wallet_balance numeric NOT NULL DEFAULT 0,
  lifetime_points numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'new',
  source text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  plan_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  referrer_name text NOT NULL DEFAULT '',
  created_by_id uuid,
  created_by_name text,
  created_by_role public.app_role,
  lead_name text NOT NULL DEFAULT '',
  lead_phone text NOT NULL DEFAULT '',
  status public.referral_status NOT NULL DEFAULT 'new',
  contact_tag text,
  is_client boolean NOT NULL DEFAULT false,
  client_since timestamptz,
  converted_plan_id text,
  referred_by_lead_id uuid,
  lead_points integer NOT NULL DEFAULT 0,
  notes text,
  is_qualified boolean DEFAULT false,
  follow_up_date timestamptz,
  follow_up_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  event_type public.lead_event_type NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_by_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  column_id text NOT NULL,
  title text NOT NULL,
  color text NOT NULL DEFAULT 'bg-muted',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 5. ENABLE RLS

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "leads_delete" ON public.leads FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "referrals_select" ON public.referrals FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "referrals_insert" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "referrals_update" ON public.referrals FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));
CREATE POLICY "referrals_delete" ON public.referrals FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "history_select" ON public.lead_history FOR SELECT TO authenticated
  USING (referral_id IN (SELECT id FROM public.referrals WHERE organization_id = public.get_user_organization_id(auth.uid())));
CREATE POLICY "history_insert" ON public.lead_history FOR INSERT TO authenticated
  WITH CHECK (referral_id IN (SELECT id FROM public.referrals WHERE organization_id = public.get_user_organization_id(auth.uid())));

CREATE POLICY "kanban_all" ON public.kanban_columns FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "settings_all" ON public.crm_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. TRIGGERS

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_settings_updated_at BEFORE UPDATE ON public.crm_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. AUTO-SET organization_id on referrals

CREATE OR REPLACE FUNCTION public.set_referral_organization_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization_id(auth.uid());
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_set_referral_org_id BEFORE INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_organization_id();

-- 9. HANDLE NEW USER (auth trigger)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_name text;
  _org_id uuid;
  _user_name text;
BEGIN
  _org_name := NEW.raw_user_meta_data->>'organization_name';
  _user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');

  IF _org_name IS NOT NULL AND _org_name <> '' THEN
    INSERT INTO public.organizations (name) VALUES (_org_name) RETURNING id INTO _org_id;
    INSERT INTO public.profiles (user_id, name, organization_id) VALUES (NEW.id, _user_name, _org_id);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.profiles (user_id, name) VALUES (NEW.id, _user_name);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'barber');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
