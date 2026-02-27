
-- 1. Create a helper function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 2. Add organization_id to referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 3. Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text,
  contact_tag text,
  wallet_balance integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  referrer_id uuid REFERENCES public.profiles(id),
  referrer_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access clients in their organization
CREATE POLICY "Users can read clients in their org"
  ON public.clients FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert clients in their org"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update clients in their org"
  ON public.clients FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can delete clients in their org"
  ON public.clients FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  );

-- Trigger for updated_at on clients
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Replace handle_new_user to handle org creation from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_name text;
  new_org_id uuid;
  user_name text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  org_name := NEW.raw_user_meta_data->>'organization_name';

  IF org_name IS NOT NULL AND org_name != '' THEN
    -- Owner signup: create organization
    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    -- Create profile with org
    INSERT INTO public.profiles (user_id, name, organization_id)
    VALUES (NEW.id, user_name, new_org_id);

    -- Set role to owner
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'owner');
  ELSE
    -- Barber/invited user: profile without org (will be set later via invite)
    INSERT INTO public.profiles (user_id, name)
    VALUES (NEW.id, user_name);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'barber');
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Make handle_new_user_role a safe no-op (since handle_new_user now handles roles)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Role is now managed by handle_new_user; this is a no-op guard
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'barber');
  END IF;
  RETURN NEW;
END;
$$;
