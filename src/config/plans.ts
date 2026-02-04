export interface RewardPlan {
  label: string;
  points: number;
  price: number;
  tier: 'prata' | 'gold' | 'vip';
  type: 'corte' | 'completo';
}

export const REWARD_PLANS: Record<string, RewardPlan> = {
  // Prata (Entrada)
  'prata_corte': { label: 'Prata - Corte', points: 30, price: 45, tier: 'prata', type: 'corte' },
  'prata_completo': { label: 'Prata - Completo', points: 50, price: 70, tier: 'prata', type: 'completo' },
  // Gold (Intermediário)
  'gold_corte': { label: 'Gold - Corte', points: 80, price: 110, tier: 'gold', type: 'corte' },
  'gold_completo': { label: 'Gold - Completo', points: 120, price: 160, tier: 'gold', type: 'completo' },
  // VIP (Premium)
  'vip_corte': { label: 'VIP - Corte', points: 200, price: 220, tier: 'vip', type: 'corte' },
  'vip_completo': { label: 'VIP - Completo', points: 400, price: 320, tier: 'vip', type: 'completo' } // Jackpot
};

// Points awarded just for registering a lead
export const REFERRAL_BONUS_POINTS = 10;

export const getPlanById = (planId: string): RewardPlan | undefined => {
  return REWARD_PLANS[planId];
};

export const getPlanPoints = (planId: string): number => {
  return REWARD_PLANS[planId]?.points ?? 0;
};

export const getTierColor = (tier: 'prata' | 'gold' | 'vip'): string => {
  switch (tier) {
    case 'prata':
      return 'text-slate-400';
    case 'gold':
      return 'text-primary';
    case 'vip':
      return 'text-accent';
    default:
      return 'text-muted-foreground';
  }
};

export const getTierBadgeClass = (tier: 'prata' | 'gold' | 'vip'): string => {
  switch (tier) {
    case 'prata':
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    case 'gold':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'vip':
      return 'bg-accent/20 text-accent border-accent/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
