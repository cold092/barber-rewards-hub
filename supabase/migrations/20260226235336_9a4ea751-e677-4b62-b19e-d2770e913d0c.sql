
-- 1. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Add organization_id column to profiles
ALTER TABLE public.profiles
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 3. RLS policy for organizations (now column exists)
CREATE POLICY "Users can read their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- 4. Add 'owner' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';

-- 5. Create the RPC function
CREATE OR REPLACE FUNCTION public.create_organization_and_owner(org_name text, owner_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  UPDATE public.profiles
  SET organization_id = new_org_id
  WHERE user_id = owner_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (owner_user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
  WHERE user_id = owner_user_id AND role = 'barber';

  RETURN new_org_id;
END;
$$;
