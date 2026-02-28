import { supabase } from "@/integrations/supabase/client";
import {
  REWARD_PLANS,
  REFERRAL_BONUS_POINTS,
  getPlanPoints,
  getBarberReferralSharePoints
} from "@/config/plans";
import type { Profile, Referral, ReferralStatus, AppRole } from "@/types/database";

interface LeadData {
  leadName: string;
  leadPhone: string;
}

interface ClientData {
  clientName: string;
  clientPhone: string;
}

interface CreatedByData {
  id: string;
  name: string;
  role: AppRole;
}

const hasMissingCreatedByColumns = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const message = 'message' in error && typeof (error as { message?: unknown }).message === 'string'
    ? ((error as { message: string }).message)
    : '';

  return message.includes("created_by_id") || message.includes("created_by_name") || message.includes("created_by_role");
};

const stripCreatedByFields = <T extends Record<string, unknown>>(payload: T): T => {
  const cloned = { ...payload };
  delete cloned.created_by_id;
  delete cloned.created_by_name;
  delete cloned.created_by_role;
  return cloned;
};

/**
 * Register a new lead/referral
 * Awards REFERRAL_BONUS_POINTS to the referrer immediately
 */
export async function registerLead(
  referrerId: string,
  referrerName: string,
  leadData: LeadData,
  createdBy?: CreatedByData
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  try {
    // Create the referral record
    const insertPayload = {
      referrer_id: referrerId,
      referrer_name: referrerName,
      lead_name: leadData.leadName,
      lead_phone: leadData.leadPhone,
      status: 'new' as ReferralStatus,
      created_by_id: createdBy?.id,
      created_by_name: createdBy?.name,
      created_by_role: createdBy?.role
    };

    let { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert(insertPayload)
      .select()
      .single();

    if (referralError && hasMissingCreatedByColumns(referralError)) {
      ({ data: referral, error: referralError } = await supabase
        .from('referrals')
        .insert(stripCreatedByFields(insertPayload))
        .select()
        .single());
    }

    if (referralError) {
      console.error('Error creating referral:', referralError);
      return { success: false, error: referralError.message };
    }

    // Get current profile balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, lifetime_points')
      .eq('id', referrerId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { success: false, error: profileError.message };
    }

    // Update wallet with bonus points for registering a lead
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        wallet_balance: (profile.wallet_balance || 0) + REFERRAL_BONUS_POINTS,
        lifetime_points: (profile.lifetime_points || 0) + REFERRAL_BONUS_POINTS
      })
      .eq('id', referrerId);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, referralId: referral.id };
  } catch (error) {
    console.error('Error in registerLead:', error);
    return { success: false, error: 'Erro ao registrar indicação' };
  }
}

/**
 * Register a new client (existing customer)
 */
export async function registerClient(
  referrerId: string,
  referrerName: string,
  clientData: ClientData,
  createdBy?: CreatedByData
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  try {
    const insertPayload = {
      referrer_id: referrerId,
      referrer_name: referrerName,
      lead_name: clientData.clientName,
      lead_phone: clientData.clientPhone,
      status: 'client' as ReferralStatus,
      is_client: true,
      client_since: new Date().toISOString(),
      created_by_id: createdBy?.id,
      created_by_name: createdBy?.name,
      created_by_role: createdBy?.role
    };

    let { data: referral, error } = await supabase
      .from('referrals')
      .insert(insertPayload)
      .select()
      .single();
    if (error && hasMissingCreatedByColumns(error)) {
      ({ data: referral, error } = await supabase
        .from('referrals')
        .insert(stripCreatedByFields(insertPayload))
        .select()
        .single());
    }

    if (error) {
      console.error('Error creating client:', error);
      return { success: false, error: error.message };
    }

    return { success: true, referralId: referral.id };
  } catch (error) {
    console.error('Error in registerClient:', error);
    return { success: false, error: 'Erro ao registrar cliente' };
  }
}

/**
 * Update lead status to 'contacted'
 */
export async function markAsContacted(
  referralId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'contacted' as ReferralStatus })
      .eq('id', referralId);

    if (error) {
      console.error('Error updating status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markAsContacted:', error);
    return { success: false, error: 'Erro ao atualizar status' };
  }
}

/**
 * Revert lead status from 'contacted' back to 'new'
 */
export async function undoContacted(
  referralId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'new' as ReferralStatus })
      .eq('id', referralId);

    if (error) {
      console.error('Error reverting status:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in undoContacted:', error);
    return { success: false, error: 'Erro ao desfazer contato' };
  }
}

/**
 * Update lead contact tag (SQL, MQL, Frio, Marcou)
 */
export async function updateContactTag(
  referralId: string,
  contactTag: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({ contact_tag: contactTag })
      .eq('id', referralId);

    if (error) {
      console.error('Error updating contact tag:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateContactTag:', error);
    return { success: false, error: 'Erro ao atualizar tag de contato' };
  }
}

/**
 * Update lead tags (multiple tags array)
 */
export async function updateLeadTags(
  referralId: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({ tags } as any)
      .eq('id', referralId);

    if (error) {
      console.error('Error updating tags:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateLeadTags:', error);
    return { success: false, error: 'Erro ao atualizar tags' };
  }
}

/**
 * Confirm a conversion - awards plan points to the referrer
 */
export async function confirmConversion(
  referralId: string,
  planId: string
): Promise<{ success: boolean; pointsAwarded?: number; error?: string }> {
  try {
    const planPoints = getPlanPoints(planId);
    const barberSharePoints = getBarberReferralSharePoints(planId);
    
    if (planPoints === 0) {
      return { success: false, error: 'Plano inválido' };
    }

    // Get the referral to find the referrer
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('referrer_id, status, referred_by_lead_id')
      .eq('id', referralId)
      .single();

    if (referralError || !referral) {
      console.error('Error fetching referral:', referralError);
      return { success: false, error: 'Indicação não encontrada' };
    }

    if (referral.status === 'converted') {
      return { success: false, error: 'Esta indicação já foi convertida' };
    }

    // Update the referral status
    const { error: updateReferralError } = await supabase
      .from('referrals')
      .update({
        status: 'converted' as ReferralStatus,
        converted_plan_id: planId,
        is_client: true,
        client_since: new Date().toISOString()
      })
      .eq('id', referralId);

    if (updateReferralError) {
      console.error('Error updating referral:', updateReferralError);
      return { success: false, error: updateReferralError.message };
    }

    if (referral.referred_by_lead_id) {
      const { data: referringLead, error: leadError } = await supabase
        .from('referrals')
        .select('lead_points')
        .eq('id', referral.referred_by_lead_id)
        .single();

      if (leadError || !referringLead) {
        console.error('Error fetching referring lead:', leadError);
        return { success: false, error: 'Lead indicador não encontrado' };
      }

      const { error: updateLeadError } = await supabase
        .from('referrals')
        .update({
          lead_points: (referringLead.lead_points || 0) + planPoints
        })
        .eq('id', referral.referred_by_lead_id);

      if (updateLeadError) {
        console.error('Error updating lead points:', updateLeadError);
        return { success: false, error: updateLeadError.message };
      }

      if (barberSharePoints > 0) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance, lifetime_points')
          .eq('id', referral.referrer_id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return { success: false, error: profileError.message };
        }

        const { error: updateWalletError } = await supabase
          .from('profiles')
          .update({
            wallet_balance: (profile.wallet_balance || 0) + barberSharePoints,
            lifetime_points: (profile.lifetime_points || 0) + barberSharePoints
          })
          .eq('id', referral.referrer_id);

        if (updateWalletError) {
          console.error('Error updating wallet:', updateWalletError);
          return { success: false, error: updateWalletError.message };
        }
      }
    } else {
      // Get current profile balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance, lifetime_points')
        .eq('id', referral.referrer_id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { success: false, error: profileError.message };
      }

      // Update wallet with plan points
      const { error: updateWalletError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: (profile.wallet_balance || 0) + planPoints,
          lifetime_points: (profile.lifetime_points || 0) + planPoints
        })
        .eq('id', referral.referrer_id);

      if (updateWalletError) {
        console.error('Error updating wallet:', updateWalletError);
        return { success: false, error: updateWalletError.message };
      }
    }

    return { success: true, pointsAwarded: planPoints };
  } catch (error) {
    console.error('Error in confirmConversion:', error);
    return { success: false, error: 'Erro ao confirmar conversão' };
  }
}

/**
 * Revert a conversion (keeps lead as contacted and clears plan)
 */
export async function undoConversion(
  referralId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({
        status: 'contacted' as ReferralStatus,
        converted_plan_id: null
      })
      .eq('id', referralId);

    if (error) {
      console.error('Error reverting conversion:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in undoConversion:', error);
    return { success: false, error: 'Erro ao desfazer conversão' };
  }
}

/**
 * Get ranking by role (barber or client)
 * Rankings are based on lifetime_points (historical total)
 */
export async function getRanking(
  role: 'barber' | 'client'
): Promise<{ data: Profile[]; error?: string }> {
  try {
    // Get user IDs with the specified role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', role as AppRole);

    if (roleError) {
      console.error('Error fetching roles:', roleError);
      return { data: [], error: roleError.message };
    }

    if (!roleData || roleData.length === 0) {
      return { data: [] };
    }

    const userIds = roleData.map(r => r.user_id);

    // Get profiles for these users, ordered by lifetime_points
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds)
      .order('lifetime_points', { ascending: false });

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return { data: [], error: profileError.message };
    }

    return { data: profiles || [] };
  } catch (error) {
    console.error('Error in getRanking:', error);
    return { data: [], error: 'Erro ao buscar ranking' };
  }
}

export interface LeadRankingEntry {
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadCount: number;
  points: number;
}

export interface ClientRankingEntry {
  clientId: string;
  clientName: string;
  clientPhone: string;
  referralCount: number;
  points: number;
}

/**
 * Get ranking for leads based on how many other leads they referred
 * Leads can refer other leads and earn points too
 */
export async function getLeadRanking(): Promise<{ data: LeadRankingEntry[]; error?: string }> {
  try {
    // Get all referrals with their lead_points
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('id, lead_name, lead_phone, lead_points, referred_by_lead_id')
      .gt('lead_points', 0) // Only leads who have referred someone
      .order('lead_points', { ascending: false });

    if (error) {
      console.error('Error fetching lead ranking:', error);
      return { data: [], error: error.message };
    }

    if (!referrals || referrals.length === 0) {
      return { data: [] };
    }

    // Count how many leads each lead has referred
    const { data: allReferrals, error: countError } = await supabase
      .from('referrals')
      .select('referred_by_lead_id');

    if (countError) {
      console.error('Error counting referrals:', countError);
    }

    const leadCountMap = (allReferrals || []).reduce<Record<string, number>>((acc, ref) => {
      if (ref.referred_by_lead_id) {
        acc[ref.referred_by_lead_id] = (acc[ref.referred_by_lead_id] || 0) + 1;
      }
      return acc;
    }, {});

    const ranking: LeadRankingEntry[] = referrals.map(ref => ({
      leadId: ref.id,
      leadName: ref.lead_name,
      leadPhone: ref.lead_phone,
      leadCount: leadCountMap[ref.id] || 0,
      points: ref.lead_points
    }));

    return { data: ranking };
  } catch (error) {
    console.error('Error in getLeadRanking:', error);
    return { data: [], error: 'Erro ao buscar ranking de leads' };
  }
}

/**
 * Get ranking for clients that are marked in referrals
 */
export async function getClientReferralRanking(): Promise<{ data: ClientRankingEntry[]; error?: string }> {
  try {
    const { data: referrals, error } = await supabase
      .from('referrals')
      .select('id, lead_name, lead_phone, lead_points, status, is_client')
      .or('is_client.eq.true,status.eq.converted')
      .order('lead_points', { ascending: false });

    if (error) {
      console.error('Error fetching client referral ranking:', error);
      return { data: [], error: error.message };
    }

    if (!referrals || referrals.length === 0) {
      return { data: [] };
    }

    const { data: allReferrals, error: countError } = await supabase
      .from('referrals')
      .select('referred_by_lead_id');

    if (countError) {
      console.error('Error counting client referrals:', countError);
    }

    const referralCountMap = (allReferrals || []).reduce<Record<string, number>>((acc, ref) => {
      if (ref.referred_by_lead_id) {
        acc[ref.referred_by_lead_id] = (acc[ref.referred_by_lead_id] || 0) + 1;
      }
      return acc;
    }, {});

    const ranking: ClientRankingEntry[] = referrals.map(ref => ({
      clientId: ref.id,
      clientName: ref.lead_name,
      clientPhone: ref.lead_phone,
      referralCount: referralCountMap[ref.id] || 0,
      points: ref.lead_points
    }));

    return { data: ranking };
  } catch (error) {
    console.error('Error in getClientReferralRanking:', error);
    return { data: [], error: 'Erro ao buscar ranking de clientes' };
  }
}

/**
 * Register a lead referred by another lead (not a barber/client)
 */
export async function registerLeadByLead(
  referrerProfileId: string,
  referrerName: string,
  referringLeadId: string,
  leadData: LeadData,
  createdBy?: CreatedByData
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  try {
    // Get the referring lead info
    const { data: referringLead, error: leadError } = await supabase
      .from('referrals')
      .select('id, lead_name, lead_points')
      .eq('id', referringLeadId)
      .single();

    if (leadError || !referringLead) {
      console.error('Error fetching referring lead:', leadError);
      return { success: false, error: 'Lead indicador não encontrado' };
    }

    // Create the new referral linked to the referring lead
    const insertPayload = {
      referrer_id: referrerProfileId,
      referrer_name: referrerName,
      lead_name: leadData.leadName,
      lead_phone: leadData.leadPhone,
      status: 'new' as ReferralStatus,
      referred_by_lead_id: referringLeadId,
      created_by_id: createdBy?.id,
      created_by_name: createdBy?.name,
      created_by_role: createdBy?.role
    };

    let { data: referral, error: referralError } = await supabase
      .from('referrals')
      .insert(insertPayload)
      .select()
      .single();

    if (referralError && hasMissingCreatedByColumns(referralError)) {
      ({ data: referral, error: referralError } = await supabase
        .from('referrals')
        .insert(stripCreatedByFields(insertPayload))
        .select()
        .single());
    }

    if (referralError) {
      console.error('Error creating referral from lead:', referralError);
      return { success: false, error: referralError.message };
    }

    // Award points to the referring lead
    const { error: updateError } = await supabase
      .from('referrals')
      .update({
        lead_points: (referringLead.lead_points || 0) + REFERRAL_BONUS_POINTS
      })
      .eq('id', referringLeadId);

    if (updateError) {
      console.error('Error updating lead points:', updateError);
      // Don't fail the whole operation, the referral was created
    }

    return { success: true, referralId: referral.id };
  } catch (error) {
    console.error('Error in registerLeadByLead:', error);
    return { success: false, error: 'Erro ao registrar indicação' };
  }
}

/**
 * Get all leads that can refer other leads (for selection)
 */
export async function getAllLeadsAsReferrers(): Promise<{ data: { id: string; name: string; phone: string }[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, lead_name, lead_phone')
      .in('status', ['client', 'converted'])
      .order('lead_name');

    if (error) {
      console.error('Error fetching leads as referrers:', error);
      return { data: [], error: error.message };
    }

    return {
      data: (data || []).map(lead => ({
        id: lead.id,
        name: lead.lead_name,
        phone: lead.lead_phone
      }))
    };
  } catch (error) {
    console.error('Error in getAllLeadsAsReferrers:', error);
    return { data: [], error: 'Erro ao buscar leads' };
  }
}

/**
 * Get all referrals (for admin/barber view)
 */
export async function getAllReferrals(): Promise<{ data: Referral[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return { data: [], error: error.message };
    }

    return { data: (data || []) as unknown as Referral[] };
  } catch (error) {
    console.error('Error in getAllReferrals:', error);
    return { data: [], error: 'Erro ao buscar indicações' };
  }
}

/**
 * Get all clients (profiles without admin/barber roles)
 */
export async function getAllClients(): Promise<{ data: Profile[]; error?: string }> {
  try {
    const { data: clientRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'client' as AppRole);

    if (roleError) {
      console.error('Error fetching client roles:', roleError);
      return { data: [], error: roleError.message };
    }

    if (!clientRoles || clientRoles.length === 0) {
      return { data: [] };
    }

    const userIds = clientRoles.map(r => r.user_id);

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds)
      .order('name');

    if (profileError) {
      console.error('Error fetching client profiles:', profileError);
      return { data: [], error: profileError.message };
    }

    return { data: profiles || [] };
  } catch (error) {
    console.error('Error in getAllClients:', error);
    return { data: [], error: 'Erro ao buscar clientes' };
  }
}

/**
 * Get all barbers
 */
export async function getAllBarbers(): Promise<{ data: Profile[]; error?: string }> {
  try {
    const { data: barberRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'barber' as AppRole);

    if (roleError) {
      console.error('Error fetching barber roles:', roleError);
      return { data: [], error: roleError.message };
    }

    if (!barberRoles || barberRoles.length === 0) {
      return { data: [] };
    }

    const userIds = barberRoles.map(r => r.user_id);

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds)
      .order('name');

    if (profileError) {
      console.error('Error fetching barber profiles:', profileError);
      return { data: [], error: profileError.message };
    }

    return { data: profiles || [] };
  } catch (error) {
    console.error('Error in getAllBarbers:', error);
    return { data: [], error: 'Erro ao buscar barbeiros' };
  }
}

/**
 * Delete a referral (admin only)
 */
export async function deleteReferral(
  referralId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .delete()
      .eq('id', referralId);

    if (error) {
      console.error('Error deleting referral:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteReferral:', error);
    return { success: false, error: 'Erro ao excluir indicação' };
  }
}

/**
 * Mark a lead as an existing client
 */
export async function markAsClient(
  referralId: string,
  isClient: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({
        is_client: isClient,
        client_since: isClient ? new Date().toISOString() : null
      })
      .eq('id', referralId);

    if (error) {
      console.error('Error marking as client:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markAsClient:', error);
    return { success: false, error: 'Erro ao marcar como cliente' };
  }
}

/**
 * Get leads/clients belonging to a specific barber (by referrer_id)
 */
export async function getBarberLeadsAsReferrers(
  barberId: string
): Promise<{ data: { id: string; name: string; phone: string }[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('id, lead_name, lead_phone')
      .eq('referrer_id', barberId)
      .eq('is_client', true)
      .order('lead_name');

    if (error) {
      console.error('Error fetching barber leads as referrers:', error);
      return { data: [], error: error.message };
    }

    return {
      data: (data || []).map(lead => ({
        id: lead.id,
        name: lead.lead_name,
        phone: lead.lead_phone
      }))
    };
  } catch (error) {
    console.error('Error in getBarberLeadsAsReferrers:', error);
    return { data: [], error: 'Erro ao buscar clientes do barbeiro' };
  }
}
