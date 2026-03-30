import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format, startOfDay, startOfWeek, subDays, subWeeks } from 'date-fns';
import type { Referral } from '@/types/database';

type ReportRange = 'all' | '7d' | '30d' | 'month';

interface ConversionTrendChartProps {
  referrals: Referral[];
  range: ReportRange;
}

const buildDailyBuckets = (days: number) => {
  const today = startOfDay(new Date());
  return Array.from({ length: days }).map((_, index) => {
    const date = subDays(today, days - 1 - index);
    return { key: format(date, 'yyyy-MM-dd'), label: format(date, 'dd/MM'), start: date, leads: 0, converted: 0 };
  });
};

const buildWeeklyBuckets = (weeks: number) => {
  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: weeks }).map((_, index) => {
    const date = subWeeks(thisWeek, weeks - 1 - index);
    return { key: format(date, 'yyyy-MM-dd'), label: `Sem ${format(date, 'dd/MM')}`, start: date, leads: 0, converted: 0 };
  });
};

export default function ConversionTrendChart({ referrals, range }: ConversionTrendChartProps) {
  const buckets = range === '7d' ? buildDailyBuckets(7) : range === '30d' ? buildDailyBuckets(30) : buildWeeklyBuckets(12);
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  referrals.forEach((referral) => {
    const createdAt = new Date(referral.created_at);
    const bucketStart = range === '7d' || range === '30d'
      ? startOfDay(createdAt)
      : startOfWeek(createdAt, { weekStartsOn: 1 });
    const key = format(bucketStart, 'yyyy-MM-dd');
    const bucket = bucketMap.get(key);
    if (!bucket) return;
    bucket.leads += 1;
    if (referral.status === 'converted') bucket.converted += 1;
  });

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Tendência de Conversões</h3>
      </div>
      <div className="flex items-center gap-4 mb-5">
        <p className="text-[11px] text-muted-foreground">
          {range === '7d' ? 'Últimos 7 dias' : range === '30d' ? 'Últimos 30 dias' : 'Últimas 12 semanas'}
        </p>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-info" />
            <span className="text-[10px] text-muted-foreground">Leads</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[10px] text-muted-foreground">Convertidos</span>
          </div>
        </div>
      </div>
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={buckets} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="convertedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(145, 65%, 50%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(145, 65%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const leads = payload.find((i) => i.dataKey === 'leads')?.value ?? 0;
                  const converted = payload.find((i) => i.dataKey === 'converted')?.value ?? 0;
                  return (
                    <div className="bg-card border border-border/50 rounded-xl p-3 shadow-xl text-xs">
                      <p className="font-semibold mb-1">{label}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-info" />
                        <span className="text-muted-foreground">Leads: <strong className="text-foreground">{leads}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-muted-foreground">Convertidos: <strong className="text-foreground">{converted}</strong></span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area type="monotone" dataKey="leads" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#leadsFill)" dot={false} />
            <Area type="monotone" dataKey="converted" stroke="hsl(145, 65%, 50%)" strokeWidth={2} fill="url(#convertedFill)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
