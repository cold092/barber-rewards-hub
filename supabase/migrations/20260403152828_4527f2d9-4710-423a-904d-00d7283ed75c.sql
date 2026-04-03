
CREATE TABLE public.reward_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_select" ON public.reward_catalog
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "catalog_insert" ON public.reward_catalog
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
  );

CREATE POLICY "catalog_update" ON public.reward_catalog
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
  );

CREATE POLICY "catalog_delete" ON public.reward_catalog
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner'))
  );

CREATE TRIGGER update_reward_catalog_updated_at
  BEFORE UPDATE ON public.reward_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
