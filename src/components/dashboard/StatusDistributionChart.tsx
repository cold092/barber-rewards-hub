import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon } from 'lucide-react';
import type { Referral } from '@/types/database';

interface StatusDistributionChartProps {
  referrals: Referral[];
}

const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(210, 90%, 60%)',
  contacted: 'hsl(40, 85%, 55%)',
  converted: 'hsl(145, 65%, 50%)'
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Novos',
  contacted: 'Contatados',
  converted: 'Convertidos'
};

export default function StatusDistributionChart({ referrals }: StatusDistributionChartProps) {
  const statusData = (['new', 'contacted', 'converted'] as const)
    .map((status) => ({
      status,
      name: STATUS_LABELS[status],
      value: referrals.filter((referral) => referral.status === status).length,
      color: STATUS_COLORS[status]
    }))
    .filter((item) => item.value > 0);

  const total = statusData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Distribuição de Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhuma indicação encontrada para o filtro atual
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
          Distribuição de Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as { name: string; value: number };
                      return (
                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.value} indicações</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full mt-4 pt-4 border-t border-border/50">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{total}</p>
                <p className="text-xs text-muted-foreground">Total de Indicações</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {statusData.find((item) => item.status === 'converted')?.value ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Convertidos</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
