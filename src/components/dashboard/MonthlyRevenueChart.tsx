import { useMemo, useState } from 'react';
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
import { AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Referral } from '@/types/database';
import { getPlanById } from '@/config/plans';
import { formatCurrencyBRL } from '@/utils/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface MonthlyRevenueChartProps {
  referrals: Referral[];
  from?: Date;
  to?: Date;
}

interface ExcludedItem {
  id: string;
  name: string;
  reason: string;
  date?: string;
}

interface IncludedItem {
  id: string;
  name: string;
  plan: string;
  price: number;
  date?: string;
}

interface MonthBucket {
  key: string;
  label: string;
  revenue: number;
  conversions: number;
  excluded: number;
  included: IncludedItem[];
  excludedItems: ExcludedItem[];
}

const isWithin = (date: Date, from?: Date, to?: Date) => {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

export default function MonthlyRevenueChart({ referrals, from, to }: MonthlyRevenueChartProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const { data, totals } = useMemo(() => {
    const map = new Map<string, MonthBucket>();

    const addBucket = (date: Date) => {
      const start = startOfMonth(date);
      const key = format(start, 'yyyy-MM');
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: format(start, 'MMM/yy', { locale: ptBR }),
          revenue: 0,
          conversions: 0,
          excluded: 0,
          included: [],
          excludedItems: [],
        });
      }
      return map.get(key)!;
    };

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

      const refDate = new Date(r.client_since || r.updated_at || r.created_at);
      if (!isWithin(refDate, from, to)) return;

      const bucket = addBucket(refDate);

      if (noPlan || noClientSince) {
        bucket.excluded += 1;
        bucket.excludedItems.push({
          id: r.id,
          name: r.lead_name,
          reason:
            noClientSince && noPlan
              ? 'Sem data de conversão e sem plano'
              : noClientSince
                ? 'Sem data de conversão (client_since)'
                : 'Sem plano (converted_plan_id)',
          date: r.client_since || r.updated_at || r.created_at,
        });
        return;
      }

      const plan = getPlanById(r.converted_plan_id || '');
      const price = plan?.price || 0;
      bucket.revenue += price;
      bucket.conversions += 1;
      bucket.included.push({
        id: r.id,
        name: r.lead_name,
        plan: plan?.label || r.converted_plan_id || '—',
        price,
        date: r.client_since || undefined,
      });
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
    return { data, totals };
  }, [referrals, from, to]);

  const activeBucket = openKey ? data.find((d) => d.key === openKey) ?? null : null;

  const handleBarClick = (payload: unknown) => {
    if (payload && typeof payload === 'object' && 'key' in payload) {
      setOpenKey((payload as { key: string }).key);
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border/30 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20">
          <DollarSign className="h-4 w-4 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-foreground">Faturamento Mensal</h3>
          <p className="text-[11px] text-muted-foreground">
            Clique em uma barra para ver os convertidos incluídos e excluídos do mês.
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
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  name="Receita"
                  radius={[8, 8, 0, 0]}
                  fill="hsl(var(--success))"
                  cursor="pointer"
                  onClick={handleBarClick}
                />
                <Bar
                  yAxisId="right"
                  dataKey="excluded"
                  name="Convertidos excluídos"
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                  onClick={handleBarClick}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill="hsl(var(--warning))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <Dialog open={!!activeBucket} onOpenChange={(open) => !open && setOpenKey(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display capitalize">
              <DollarSign className="h-4 w-4 text-success" />
              Faturamento — {activeBucket?.label}
            </DialogTitle>
            <DialogDescription>
              Detalhamento dos convertidos do mês dentro do período selecionado.
            </DialogDescription>
          </DialogHeader>

          {activeBucket && (
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Receita</p>
                  <p className="text-base font-bold text-success tabular-nums">
                    {formatCurrencyBRL(activeBucket.revenue)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Incluídos</p>
                  <p className="text-base font-bold text-foreground tabular-nums">{activeBucket.conversions}</p>
                </div>
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-warning">Excluídos</p>
                  <p className="text-base font-bold text-warning tabular-nums">{activeBucket.excluded}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-success">
                    Incluídos no faturamento ({activeBucket.included.length})
                  </p>
                </div>
                {activeBucket.included.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Nenhum convertido válido neste mês.</p>
                ) : (
                  <div className="space-y-2">
                    {activeBucket.included.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-secondary/30 border border-border/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] capitalize bg-primary/10 text-primary border-primary/20">
                              {item.plan}
                            </Badge>
                            {item.date && (
                              <span className="text-[11px] text-muted-foreground">
                                {format(new Date(item.date), 'dd/MM/yy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-success tabular-nums shrink-0">
                          {formatCurrencyBRL(item.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-warning">
                    Excluídos do faturamento ({activeBucket.excludedItems.length})
                  </p>
                </div>
                {activeBucket.excludedItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Nenhum convertido excluído neste mês.</p>
                ) : (
                  <div className="space-y-2">
                    {activeBucket.excludedItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-warning/5 border border-warning/20 px-3 py-2"
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
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
