import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { getRewardPlans } from '@/config/plans';
import { formatCurrencyBRL } from '@/utils/currency';
import { cn } from '@/lib/utils';
import type { Referral } from '@/types/database';

interface PlanDistributionChartProps {
  referrals: Referral[];
}

const TIER_COLORS: Record<string, string> = {
  prata: 'hsl(220, 15%, 55%)',
  gold: 'hsl(43, 74%, 49%)',
  vip: 'hsl(38, 92%, 50%)'
};

const TIER_DOT: Record<string, string> = {
  prata: 'bg-muted-foreground',
  gold: 'bg-warning',
  vip: 'bg-orange-400',
};

export default function PlanDistributionChart({ referrals }: PlanDistributionChartProps) {
  const convertedReferrals = referrals.filter(
    (r) => r.status === 'converted' && r.converted_plan_id
  );

  const rewardPlans = getRewardPlans();
  const planData = Object.entries(rewardPlans).map(([planId, plan]) => {
    const count = convertedReferrals.filter((r) => r.converted_plan_id === planId).length;
    return {
      id: planId,
      name: plan.label,
      value: count,
      revenue: count * plan.price,
      tier: plan.tier,
      color: TIER_COLORS[plan.tier]
    };
  }).filter(item => item.value > 0);

  const totalRevenue = planData.reduce((sum, p) => sum + p.revenue, 0);
  const totalSales = planData.reduce((sum, p) => sum + p.value, 0);

  if (totalSales === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Distribuição de Planos</h3>
        </div>
        <p className="text-muted-foreground text-center py-10 text-sm">
          Nenhuma venda convertida ainda
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <PieChartIcon className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Distribuição de Planos</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        {totalSales} vendas • {formatCurrencyBRL(totalRevenue)} em receita
      </p>

      <div className="flex items-center gap-6">
        {/* Chart */}
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={planData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {planData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border/50 rounded-xl p-3 shadow-xl text-xs">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-muted-foreground">{data.value} vendas</p>
                        <p className="text-primary font-medium">{formatCurrencyBRL(data.revenue)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5">
          {planData.map((item) => {
            const pct = Math.round((item.value / totalSales) * 100);
            return (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", TIER_DOT[item.tier] || 'bg-primary')} />
                  <span className="text-sm text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">{item.value}</span>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
