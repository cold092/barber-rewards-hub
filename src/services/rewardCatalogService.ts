import { supabase } from '@/integrations/supabase/client';

export interface RewardItem {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getRewardCatalog(): Promise<RewardItem[]> {
  const { data, error } = await supabase
    .from('reward_catalog' as any)
    .select('*')
    .eq('active', true)
    .order('points_cost', { ascending: true });

  if (error) {
    console.error('Error fetching reward catalog:', error);
    return [];
  }
  return (data || []) as unknown as RewardItem[];
}

export async function getAllRewardCatalog(): Promise<RewardItem[]> {
  const { data, error } = await supabase
    .from('reward_catalog' as any)
    .select('*')
    .order('points_cost', { ascending: true });

  if (error) {
    console.error('Error fetching reward catalog:', error);
    return [];
  }
  return (data || []) as unknown as RewardItem[];
}

export async function createRewardItem(params: {
  organization_id: string;
  name: string;
  description?: string;
  points_cost: number;
  image_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('reward_catalog' as any)
    .insert({
      organization_id: params.organization_id,
      name: params.name,
      description: params.description || null,
      points_cost: params.points_cost,
      image_url: params.image_url || null,
    } as any);

  if (error) {
    console.error('Error creating reward item:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateRewardItem(id: string, params: {
  name?: string;
  description?: string;
  points_cost?: number;
  image_url?: string;
  active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('reward_catalog' as any)
    .update(params as any)
    .eq('id', id);

  if (error) {
    console.error('Error updating reward item:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteRewardItem(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('reward_catalog' as any)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting reward item:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
