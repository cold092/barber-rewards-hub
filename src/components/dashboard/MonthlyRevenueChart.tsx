import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Referral } from '@/types/database';
import { getPlanById } from '@/config/plans';
import { formatCurrencyBRL } from '@/utils/currency';

interface MonthlyRevenueChartProps {
  referrals: Referral[];
  from?: Date;
  to?: Date;
}

interface MonthBucket {
  key: string;
  label: string;
  revenue: number;
  conversions: number;
  excluded: number;
  excludedReasons: { noClientSince: number; noPlan: number };
}

const isWithin = (date: Date, from?: Date, to?: Date) => {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

export default function MonthlyRevenueChart({ referrals, from, to }: MonthlyRevenueChartProps) {
  const { data, totals, excludedList } = useMemo(() => {
    const map = new Map<string, MonthBucket>();
    const excludedList: Array<{ id: string; name: string; reason: string; date?: string }> = [];

    const addBucket = (date: Date) => {
      const start = startOfMonth(date);
      const key = format(start, 'yyyy-MM');
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: format(start, "MMM/yy", { locale: ptBR }),
          revenue: 0,
          conversions: 0,
          excluded: 0,
          excludedReasons: { noClientSince: 0, noPlan: 0 },
        });
      }
      return map.get(key)!;
    };

    // Seed buckets for from/to range so the axis stays continuous.
    if (from && to) {
      const cursor = startOfMonth(from);
      const end = startOfMonth(to);
      while (cursor <= end) {
        addBucket(new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    referrals.forEach((r) => {
      if (r.status !== 'converted') return;
      const noPlan = !r.converted_plan_id;
      const noClientSince = !r.client_since;

      // Reference date: prefer client_since; fall back to updated_at/created_at to bucket excluded items.
      const refDate = new Date(r.client_since || r.updated_at || r.created_at);
      if (!isWithin(refDate, from, to)) return;

      const bucket = addBucket(refDate);

      if (noPlan || noClientSince) {
        bucket.excluded += 1;
        if (noClientSince) bucket.excludedReasons.noClientSince += 1;
        if (noPlan) bucket.excludedReasons.noPlan += 1;
        excludedList.push({
          id: r.id,
          name: r.lead_name,
          reason: noClientSince && noPlan
            ? 'Sem data de conversão e sem plano'
            : noClientSince
              ? 'Sem data de conversão (client_since)'
              : 'Sem plano (converted_plan_id)',
          date: r.client_since || r.updated_at || r.created_at,
        });
        return;
      }

      const plan = getPlanById(r.converted_plan_id || '');
      bucket.revenue += plan?.price || 0;
      bucket.conversions += 1;
    });

    const data = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    const totals = data.reduce(
      (acc, b) => ({
        revenue: acc.revenue + b.revenue,
        conversions: acc.conversions + b.conversions,
        excluded: acc.excluded + b.excluded,
      }),
      { revenue: 0, conversions: 0, excluded: 0 },
    );
    return { data, totals, excludedList };
  }, [referrals, from, to]);

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border/30 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20">
          <DollarSign className="h-4 w-4 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-foreground">Faturamento Mensal</h3>
          <p className="text-[11px] text-muted-foreground">
            Receita por mês de conversão. Barras em âmbar marcam convertidos excluídos por falta de
            <span className="font-medium"> client_since </span>
            ou
            <span className="font-medium"> converted_plan_id</span>.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-sm font-bold text-success tabular-nums">{formatCurrencyBRL(totals.revenue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversões</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{totals.conversions}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Excluídos</p>
            <p className="text-sm font-bold text-warning tabular-nums">{totals.excluded}</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            Sem dados de faturamento no período selecionado.
          </p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrencyBRL(Number(v)).replace('R$', '').trim()}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Receita') return [formatCurrencyBRL(value), name];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="revenue" name="Receita" radius={[8, 8, 0, 0]} fill="hsl(var(--success))" />
                <Bar yAxisId="right" dataKey="excluded" name="Convertidos excluídos" radius={[8, 8, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill="hsl(var(--warning))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {excludedList.length > 0 && (
          <div className="mt-5 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-xs font-semibold text-warning uppercase tracking-wider">
                {excludedList.length} convertido{excludedList.length > 1 ? 's' : ''} fora do faturamento
              </p>
            </div>
            <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
              {excludedList.slice(0, 30).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-background/60 border border-border/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.reason}</p>
                  </div>
                  {item.date && (
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {format(new Date(item.date), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                  )}
                </div>
              ))}
              {excludedList.length > 30 && (
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  +{excludedList.length - 30} outros itens
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
