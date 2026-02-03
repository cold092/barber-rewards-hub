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
  lead_name: string;
  lead_phone: string;
  status: ReferralStatus;
  contact_tag: string | null;
  converted_plan_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralWithProfile extends Referral {
  referrer?: Profile;
}
