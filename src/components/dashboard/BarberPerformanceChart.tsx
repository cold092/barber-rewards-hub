import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';
import type { Referral, Profile } from '@/types/database';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  referrals: Referral[];
  barbers: Profile[];
}

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(262, 83%, 58%)',
  'hsl(190, 90%, 50%)',
  'hsl(330, 81%, 60%)',
  'hsl(45, 93%, 47%)',
];

const isClientReferral = (r: Referral) => r.is_client || r.status === 'converted';

export default function BarberPerformanceChart({ referrals, barbers }: Props) {
  const { data, barberKeys } = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM/yy', { locale: ptBR }) };
    });

    // Only include barbers that have referrals
    const activeBarberIds = new Set(referrals.map(r => r.referrer_id));
    const activeBarbers = barbers.filter(b => activeBarberIds.has(b.id)).slice(0, 8);
    const keys = activeBarbers.map(b => ({ id: b.id, name: b.name }));

    const data = months.map(month => {
      const row: Record<string, string | number> = { month: month.label };
      activeBarbers.forEach(barber => {
        const count = referrals.filter(r =>
          r.referrer_id === barber.id &&
          isWithinInterval(new Date(r.created_at), { start: month.start, end: month.end })
        ).length;
        row[barber.id] = count;
      });
      return row;
    });

    return { data, barberKeys: keys };
  }, [referrals, barbers]);

  if (barberKeys.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border/30 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-info/20 to-info/5 border border-info/20">
          <Users className="h-4 w-4 text-info" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm text-foreground">
            Desempenho Mensal por Colaborador
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Indicações nos últimos 6 meses
          </p>
        </div>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} barGap={2} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border) / 0.5)',
                borderRadius: '12px',
                fontSize: '12px',
                boxShadow: '0 8px 32px hsl(var(--foreground) / 0.1)',
              }}
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
            />
            {barberKeys.map((barber, i) => (
              <Bar
                key={barber.id}
                dataKey={barber.id}
                name={barber.name}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
