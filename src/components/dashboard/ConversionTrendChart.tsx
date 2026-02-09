import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return {
      key: format(date, 'yyyy-MM-dd'),
      label: format(date, 'dd/MM'),
      start: date,
      leads: 0,
      converted: 0
    };
  });
};

const buildWeeklyBuckets = (weeks: number) => {
  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: weeks }).map((_, index) => {
    const date = subWeeks(thisWeek, weeks - 1 - index);
    return {
      key: format(date, 'yyyy-MM-dd'),
      label: `Sem ${format(date, 'dd/MM')}`,
      start: date,
      leads: 0,
      converted: 0
    };
  });
};

export default function ConversionTrendChart({ referrals, range }: ConversionTrendChartProps) {
  const buckets = range === '7d' ? buildDailyBuckets(7) : range === '30d' ? buildDailyBuckets(30) : buildWeeklyBuckets(12);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  referrals.forEach((referral) => {
    const createdAt = new Date(referral.created_at);
    const bucketStart =
      range === '7d' || range === '30d'
        ? startOfDay(createdAt)
        : startOfWeek(createdAt, { weekStartsOn: 1 });
    const key = format(bucketStart, 'yyyy-MM-dd');
    const bucket = bucketMap.get(key);
    if (!bucket) {
      return;
    }
    bucket.leads += 1;
    if (referral.status === 'converted') {
      bucket.converted += 1;
    }
  });

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <TrendingUp className="h-5 w-5 text-primary" />
          Tendência de conversões
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const leads = payload.find((item) => item.dataKey === 'leads')?.value ?? 0;
                    const converted = payload.find((item) => item.dataKey === 'converted')?.value ?? 0;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold">{label}</p>
                        <p className="text-sm text-muted-foreground">Leads: {leads}</p>
                        <p className="text-sm text-primary">Convertidos: {converted}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line type="monotone" dataKey="leads" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="converted" stroke="hsl(145, 65%, 50%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
