-- Ensure crm_settings supports ON CONFLICT (user_id, setting_key)
WITH ranked_settings AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, setting_key
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.crm_settings
)
DELETE FROM public.crm_settings cs
USING ranked_settings rs
WHERE cs.id = rs.id
  AND rs.rn > 1;

ALTER TABLE public.crm_settings
  DROP CONSTRAINT IF EXISTS crm_settings_user_id_setting_key_key;

ALTER TABLE public.crm_settings
  ADD CONSTRAINT crm_settings_user_id_setting_key_key UNIQUE (user_id, setting_key);
