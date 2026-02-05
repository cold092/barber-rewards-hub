import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon } from 'lucide-react';
import { getRewardPlans } from '@/config/plans';
import { formatCurrencyBRL } from '@/utils/currency';
import type { Referral } from '@/types/database';

interface PlanDistributionChartProps {
  referrals: Referral[];
}

const TIER_COLORS: Record<string, string> = {
  prata: 'hsl(220, 15%, 55%)',
  gold: 'hsl(43, 74%, 49%)',
  vip: 'hsl(38, 92%, 50%)'
};

export default function PlanDistributionChart({ referrals }: PlanDistributionChartProps) {
  const convertedReferrals = referrals.filter(
    (referral) => referral.status === 'converted' && referral.converted_plan_id
  );

  const rewardPlans = getRewardPlans();
  const planData = Object.entries(rewardPlans).map(([planId, plan]) => {
    const count = convertedReferrals.filter((referral) => referral.converted_plan_id === planId).length;
    return {
      id: planId,
      name: plan.label,
      value: count,
      revenue: count * plan.price,
      tier: plan.tier,
      color: TIER_COLORS[plan.tier]
    };
  }).filter(item => item.value > 0);

  const totalRevenue = planData.reduce((sum, plan) => sum + plan.revenue, 0);
  const totalSales = planData.reduce((sum, plan) => sum + plan.value, 0);

  if (totalSales === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Distribuição de Planos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma venda convertida ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Distribuição de Planos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
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
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.value} vendas</p>
                          <p className="text-sm text-primary font-medium">{formatCurrencyBRL(data.revenue)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom"
                  formatter={(value: string, entry: any) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full mt-4 pt-4 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{totalSales}</p>
                <p className="text-xs text-muted-foreground">Total Vendas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{formatCurrencyBRL(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Receita Total</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
