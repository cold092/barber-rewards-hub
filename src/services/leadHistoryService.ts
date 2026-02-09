import { supabase } from "@/integrations/supabase/client";
import type { LeadHistory, LeadEventType } from "@/types/database";

interface AddHistoryEventParams {
  referralId: string;
  eventType: LeadEventType;
  eventData?: Record<string, unknown>;
  createdById?: string;
  createdByName?: string;
}

export async function addHistoryEvent({
  referralId,
  eventType,
  eventData = {},
  createdById,
  createdByName
}: AddHistoryEventParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Using raw SQL query via Supabase's postgrest-js workaround
    // The types will be updated automatically after migration
    const client = supabase as unknown as {
      from: (table: string) => {
        insert: (data: Record<string, unknown>) => {
          select: () => Promise<{ data: unknown; error: { message: string } | null }>
        }
      }
    };
    
    const { error } = await client
      .from('lead_history')
      .insert({
        referral_id: referralId,
        event_type: eventType,
        event_data: eventData,
        created_by_id: createdById,
        created_by_name: createdByName
      })
      .select();

    if (error) {
      console.error('Error adding history event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addHistoryEvent:', error);
    return { success: false, error: 'Erro ao registrar evento' };
  }
}

export async function getLeadHistory(
  referralId: string
): Promise<{ data: LeadHistory[]; error?: string }> {
  try {
    // Using raw SQL query via Supabase's postgrest-js workaround
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => 
              Promise<{ data: unknown[] | null; error: { message: string } | null }>
          }
        }
      }
    };

    const { data, error } = await client
      .from('lead_history')
      .select('*')
      .eq('referral_id', referralId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead history:', error);
      return { data: [], error: error.message };
    }

    // Type cast to match our interface
    const typedData: LeadHistory[] = ((data as unknown[]) || []).map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        id: row.id as string,
        referral_id: row.referral_id as string,
        event_type: row.event_type as LeadEventType,
        event_data: (row.event_data as Record<string, unknown>) || {},
        created_by_id: row.created_by_id as string | null,
        created_by_name: row.created_by_name as string | null,
        created_at: row.created_at as string
      };
    });

    return { data: typedData };
  } catch (error) {
    console.error('Error in getLeadHistory:', error);
    return { data: [], error: 'Erro ao buscar histórico' };
  }
}

export async function updateLeadNotes(
  referralId: string,
  notes: string,
  userId?: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: updateError } = await supabase
      .from('referrals')
      .update({ notes } as Record<string, unknown>)
      .eq('id', referralId);

    if (updateError) {
      console.error('Error updating notes:', updateError);
      return { success: false, error: updateError.message };
    }

    // Add to history
    await addHistoryEvent({
      referralId,
      eventType: 'note_added',
      eventData: { notes },
      createdById: userId,
      createdByName: userName
    });

    return { success: true };
  } catch (error) {
    console.error('Error in updateLeadNotes:', error);
    return { success: false, error: 'Erro ao atualizar observações' };
  }
}

export async function logWhatsAppContact(
  referralId: string,
  userId?: string,
  userName?: string
): Promise<{ success: boolean; error?: string }> {
  return addHistoryEvent({
    referralId,
    eventType: 'whatsapp_contact',
    eventData: { timestamp: new Date().toISOString() },
    createdById: userId,
    createdByName: userName
  });
}
