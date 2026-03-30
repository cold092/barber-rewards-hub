import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Referral } from '@/types/database';

interface StatusDistributionChartProps {
  referrals: Referral[];
}

const STATUS_CONFIG = [
  { status: 'new', label: 'Novos', color: 'hsl(217, 91%, 60%)', dotClass: 'bg-info' },
  { status: 'contacted', label: 'Contatados', color: 'hsl(40, 85%, 55%)', dotClass: 'bg-warning' },
  { status: 'converted', label: 'Convertidos', color: 'hsl(145, 65%, 50%)', dotClass: 'bg-success' },
] as const;

export default function StatusDistributionChart({ referrals }: StatusDistributionChartProps) {
  const statusData = STATUS_CONFIG
    .map((cfg) => ({
      ...cfg,
      name: cfg.label,
      value: referrals.filter((r) => r.status === cfg.status).length,
    }))
    .filter((item) => item.value > 0);

  const total = statusData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <PieChartIcon className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Distribuição de Status</h3>
        </div>
        <p className="text-muted-foreground text-center py-10 text-sm">
          Nenhuma indicação encontrada
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <PieChartIcon className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Distribuição de Status</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">{total} indicações no período</p>

      <div className="flex items-center gap-6">
        {/* Chart */}
        <div className="w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as { name: string; value: number };
                    const pct = Math.round((data.value / total) * 100);
                    return (
                      <div className="bg-card border border-border/50 rounded-xl p-3 shadow-xl text-xs">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-muted-foreground">{data.value} indicações ({pct}%)</p>
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
        <div className="flex-1 space-y-3">
          {statusData.map((item) => {
            const pct = Math.round((item.value / total) * 100);
            return (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", item.dotClass)} />
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
