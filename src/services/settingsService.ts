import { supabase } from '@/integrations/supabase/client';

export type SettingKey = 'tags' | 'client_tags' | 'plan_overrides' | 'lead_message' | 'client_message' | 'lead_columns' | 'client_columns';

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
  const payload = { user_id: userId, setting_key: key, setting_value: value as any };

  const { error: upsertError } = await supabase
    .from('crm_settings')
    .upsert(payload, { onConflict: 'user_id,setting_key' });

  if (!upsertError) {
    return true;
  }

  const { data: existing, error: existingError } = await supabase
    .from('crm_settings')
    .select('id')
    .eq('user_id', userId)
    .eq('setting_key', key)
    .maybeSingle();

  if (existingError) {
    console.error('Error loading existing setting:', key, existingError);
    return false;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('crm_settings')
      .update({ setting_value: value as any })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Error updating setting:', key, updateError);
      return false;
    }

    return true;
  }

  const { error: insertError } = await supabase
    .from('crm_settings')
    .insert(payload);

  if (insertError) {
    console.error('Error inserting setting:', key, insertError);
    return false;
  }

  return true;
}
