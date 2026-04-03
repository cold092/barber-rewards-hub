import { supabase } from '@/integrations/supabase/client';

export type RedemptionStatus = 'pending' | 'approved' | 'rejected';

export interface Redemption {
  id: string;
  organization_id: string;
  profile_id: string;
  user_id: string;
  description: string;
  points: number;
  status: RedemptionStatus;
  admin_note: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getRedemptions(): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from('redemptions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching redemptions:', error);
    return [];
  }
  return (data || []) as unknown as Redemption[];
}

export async function createRedemption(params: {
  organization_id: string;
  profile_id: string;
  user_id: string;
  description: string;
  points: number;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('redemptions')
    .insert({
      organization_id: params.organization_id,
      profile_id: params.profile_id,
      user_id: params.user_id,
      description: params.description,
      points: params.points,
    } as any);

  if (error) {
    console.error('Error creating redemption:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

async function notifyRedemption(redemptionId: string, status: string) {
  try {
    await supabase.functions.invoke('notify-redemption', {
      body: { redemption_id: redemptionId, status },
    });
  } catch (e) {
    console.error('Error sending redemption notification:', e);
  }
}

export async function approveRedemption(redemptionId: string, adminNote?: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('approve_redemption', {
    _redemption_id: redemptionId,
    _admin_note: adminNote || null,
  } as any);

  if (error) {
    console.error('Error approving redemption:', error);
    return { success: false, error: error.message };
  }

  notifyRedemption(redemptionId, 'approved');
  return { success: true };
}

export async function rejectRedemption(redemptionId: string, adminNote?: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('reject_redemption', {
    _redemption_id: redemptionId,
    _admin_note: adminNote || null,
  } as any);

  if (error) {
    console.error('Error rejecting redemption:', error);
    return { success: false, error: error.message };
  }

  notifyRedemption(redemptionId, 'rejected');
  return { success: true };
}
