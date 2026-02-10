import { supabase } from '@/integrations/supabase/client';

export type SettingKey = 'tags' | 'plan_overrides' | 'lead_message' | 'client_message' | 'lead_columns' | 'client_columns';

export async function getSetting<T>(userId: string, key: SettingKey): Promise<T | null> {
  const { data, error } = await supabase
    .from('crm_settings')
    .select('setting_value')
    .eq('user_id', userId)
    .eq('setting_key', key)
    .maybeSingle();

  if (error || !data) return null;
  return data.setting_value as T;
}

export async function getGlobalSetting<T>(key: SettingKey): Promise<T | null> {
  // Get the first matching setting (admin-set global config)
  const { data, error } = await supabase
    .from('crm_settings')
    .select('setting_value')
    .eq('setting_key', key)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.setting_value as T;
}

export async function upsertSetting(userId: string, key: SettingKey, value: unknown): Promise<boolean> {
  const { error } = await supabase
    .from('crm_settings')
    .upsert(
      { user_id: userId, setting_key: key, setting_value: value as any },
      { onConflict: 'user_id,setting_key' }
    );

  if (error) {
    console.error('Error saving setting:', key, error);
    return false;
  }
  return true;
}
