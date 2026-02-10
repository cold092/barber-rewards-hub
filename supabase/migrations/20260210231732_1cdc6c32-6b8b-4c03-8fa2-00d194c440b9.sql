
-- Settings table for CRM configuration (tags, plans, messages)
CREATE TABLE public.crm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, setting_key)
);

ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all settings
CREATE POLICY "Admins can manage all settings"
  ON public.crm_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can read settings (needed for tags/plans visibility)
CREATE POLICY "Authenticated users can read settings"
  ON public.crm_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'barber'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_crm_settings_updated_at
  BEFORE UPDATE ON public.crm_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
