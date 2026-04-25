import { supabase } from '@/integrations/supabase/client';

export type RedemptionStatus = 'pending' | 'approved' | 'rejected';

export interface Redemption {
  id: string;
  organization_id: string;
  profile_id: string;
  user_id: string;
  referral_id: string | null;
  reward_id: string | null;
  request_type: 'catalog' | 'custom';
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
  reward_id?: string | null;
  custom_description?: string | null;
  custom_points?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('create_redemption_request' as any, {
    _reward_id: params.reward_id || null,
    _custom_description: params.custom_description || null,
    _custom_points: params.custom_points || null,
  });

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

export async function createClientRedemption(params: {
  referral_id: string;
  reward_id?: string | null;
  custom_description?: string | null;
  custom_points?: number | null;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('create_client_redemption_request' as any, {
    _referral_id: params.referral_id,
    _reward_id: params.reward_id || null,
    _custom_description: params.custom_description || null,
    _custom_points: params.custom_points || null,
  });

  if (error) {
    console.error('Error creating client redemption:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function approveClientRedemption(redemptionId: string, adminNote?: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('approve_client_redemption' as any, {
    _redemption_id: redemptionId,
    _admin_note: adminNote || null,
  });

  if (error) {
    console.error('Error approving client redemption:', error);
    return { success: false, error: error.message };
  }

  notifyRedemption(redemptionId, 'approved');
  return { success: true };
}

export async function rejectClientRedemption(redemptionId: string, adminNote?: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('reject_client_redemption' as any, {
    _redemption_id: redemptionId,
    _admin_note: adminNote || null,
  });

  if (error) {
    console.error('Error rejecting client redemption:', error);
    return { success: false, error: error.message };
  }

  notifyRedemption(redemptionId, 'rejected');
  return { success: true };
}
