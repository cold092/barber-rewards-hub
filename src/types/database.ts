export type AppRole = 'admin' | 'barber' | 'client';
export type ReferralStatus = 'new' | 'contacted' | 'converted';

export interface Profile {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface ReferralWithProfile extends Referral {
  referrer?: Profile;
}
