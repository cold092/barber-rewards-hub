-- Allow all authenticated users to read crm_settings (for shared plan overrides, columns, etc.)
DROP POLICY IF EXISTS "settings_select_all" ON public.crm_settings;
CREATE POLICY "settings_select_all"
ON public.crm_settings
FOR SELECT
TO authenticated
USING (true);
