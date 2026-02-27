export type AppRole = 'admin' | 'barber' | 'client' | 'owner';
export type ReferralStatus = 'new' | 'contacted' | 'converted';
export type LeadEventType = 'status_change' | 'tag_change' | 'qualification_change' | 'note_added' | 'whatsapp_contact' | 'conversion' | 'created';

export interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  organization_id: string | null;
  wallet_balance: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referrer_name: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_by_role?: AppRole | null;
  lead_name: string;
  lead_phone: string;
  status: ReferralStatus;
  contact_tag: string | null;
  is_client: boolean;
  client_since: string | null;
  converted_plan_id: string | null;
  referred_by_lead_id: string | null;
  lead_points: number;
  notes: string | null;
  is_qualified: boolean | null;
  follow_up_date: string | null;
  follow_up_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumnConfig {
  id: string;
  user_id: string;
  column_id: string;
  title: string;
  color: string;
  position: number;
  created_at: string;
}

export interface ReferralWithProfile extends Referral {
  referrer?: Profile;
}

export interface LeadHistory {
  id: string;
  referral_id: string;
  event_type: LeadEventType;
  event_data: Record<string, unknown>;
  created_by_id: string | null;
  created_by_name: string | null;
  created_at: string;
}
