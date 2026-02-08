export interface RewardPlan {
  label: string;
  points: number;
  price: number;
  tier: 'prata' | 'gold' | 'vip';
  type: 'corte' | 'completo';
}

export type RewardPlanOverrides = Record<string, Pick<RewardPlan, 'points' | 'price'>>;

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
export const BARBER_REFERRAL_CONVERSION_PERCENT = 30;

export const PLAN_OVERRIDES_STORAGE_KEY = 'rewardPlanOverrides';

const loadPlanOverrides = (): RewardPlanOverrides => {
  if (typeof window === 'undefined') {
    return {};
  }

  const stored = window.localStorage.getItem(PLAN_OVERRIDES_STORAGE_KEY);
  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored) as RewardPlanOverrides;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const applyOverrides = (planId: string, plan: RewardPlan): RewardPlan => {
  const overrides = loadPlanOverrides();
  const override = overrides[planId];
  if (!override) {
    return plan;
  }
  return {
    ...plan,
    points: Number.isFinite(override.points) ? override.points : plan.points,
    price: Number.isFinite(override.price) ? override.price : plan.price
  };
};

export const getRewardPlans = (): Record<string, RewardPlan> => {
  return Object.fromEntries(
    Object.entries(REWARD_PLANS).map(([planId, plan]) => [
      planId,
      applyOverrides(planId, plan)
    ])
  );
};

export const getPlanById = (planId: string): RewardPlan | undefined => {
  const plan = REWARD_PLANS[planId];
  if (!plan) {
    return undefined;
  }
  return applyOverrides(planId, plan);
};

export const getPlanPoints = (planId: string): number => {
  return getPlanById(planId)?.points ?? 0;
};

export const getBarberReferralSharePoints = (planId: string): number => {
  const planPoints = getPlanPoints(planId);
  const share = (planPoints * BARBER_REFERRAL_CONVERSION_PERCENT) / 100;
  return Math.round(share);
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
