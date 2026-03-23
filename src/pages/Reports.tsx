import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, Users, CheckCircle, DollarSign, TrendingUp, UserPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getAllBarbers, getAllReferrals } from '@/services/referralService';
import PlanDistributionChart from '@/components/dashboard/PlanDistributionChart';
import StatusDistributionChart from '@/components/dashboard/StatusDistributionChart';
import { getPlanById } from '@/config/plans';
import { formatCurrencyBRL } from '@/utils/currency';
import type { Referral } from '@/types/database';
import type { Profile } from '@/types/database';
import ConversionTrendChart from '@/components/dashboard/ConversionTrendChart';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ReportType = 'all' | 'leads' | 'clients' | 'converted';
type ReportRange = 'all' | '7d' | '30d' | 'month';
type ReportBarber = 'all' | string;

const isClientReferral = (referral: Referral) => referral.is_client || referral.status === 'converted';

const isWithinRange = (dateString: string, range: ReportRange) => {
  if (range === 'all') return true;
  const date = new Date(dateString);
  const now = new Date();
  if (range === '7d') {
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 7);
    return date >= cutoff;
  }
  if (range === '30d') {
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 30);
    return date >= cutoff;
  }
  if (range === 'month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return true;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

const STAT_CONFIG = [
  { key: 'total', label: 'Total', icon: BarChart3, color: 'primary' },
  { key: 'leads', label: 'Leads', icon: UserPlus, color: 'info' },
  { key: 'clients', label: 'Clientes', icon: Users, color: 'warning' },
  { key: 'converted', label: 'Convertidos', icon: CheckCircle, color: 'success' },
  { key: 'revenue', label: 'Receita', icon: DollarSign, color: 'primary' },
  { key: 'ticket', label: 'Ticket Médio', icon: TrendingUp, color: 'accent' },
] as const;

const colorMap: Record<string, string> = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  info: 'text-info bg-info/10',
  warning: 'text-warning bg-warning/10',
  accent: 'text-accent bg-accent/10',
};

export default function Reports() {
  const { isAdmin } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>('all');
  const [reportRange, setReportRange] = useState<ReportRange>('all');
  const [reportBarber, setReportBarber] = useState<ReportBarber>('all');

  useEffect(() => {
    async function loadReferrals() {
      setLoading(true);
      const [referralsResult, barbersResult] = await Promise.all([
        getAllReferrals(),
        getAllBarbers()
      ]);
      setReferrals(referralsResult.data);
      setBarbers(barbersResult.data);
      setLoading(false);
    }

    if (isAdmin) {
      loadReferrals();
    }
  }, [isAdmin]);

  const filteredReferrals = useMemo(() => {
    const rangeFiltered = referrals.filter((referral) => isWithinRange(referral.created_at, reportRange));
    const barberFiltered =
      reportBarber === 'all'
        ? rangeFiltered
        : rangeFiltered.filter((referral) => referral.referrer_id === reportBarber);
    switch (reportType) {
      case 'leads':
        return barberFiltered.filter((referral) => !isClientReferral(referral));
      case 'clients':
        return barberFiltered.filter((referral) => isClientReferral(referral));
      case 'converted':
        return barberFiltered.filter((referral) => referral.status === 'converted');
      default:
        return barberFiltered;
    }
  }, [referrals, reportBarber, reportRange, reportType]);

  const totals = useMemo(() => {
    return {
      total: filteredReferrals.length,
      converted: filteredReferrals.filter((referral) => referral.status === 'converted').length,
      leads: filteredReferrals.filter((referral) => !isClientReferral(referral)).length,
      clients: filteredReferrals.filter((referral) => isClientReferral(referral)).length
    };
  }, [filteredReferrals]);

  const revenueTotal = useMemo(() => {
    return filteredReferrals.reduce((sum, referral) => {
      if (referral.status !== 'converted' || !referral.converted_plan_id) return sum;
      const plan = getPlanById(referral.converted_plan_id);
      return sum + (plan?.price || 0);
    }, 0);
  }, [filteredReferrals]);

  const averageTicket = useMemo(() => {
    if (totals.converted === 0) return 0;
    return revenueTotal / totals.converted;
  }, [revenueTotal, totals.converted]);

  const revenueByBarber = useMemo(() => {
    const barberMap = new Map<string, { id: string; name: string; revenue: number; converted: number }>();
    barbers.forEach((barber) => {
      barberMap.set(barber.id, { id: barber.id, name: barber.name, revenue: 0, converted: 0 });
    });
    filteredReferrals.forEach((referral) => {
      if (referral.status !== 'converted' || !referral.converted_plan_id) return;
      const plan = getPlanById(referral.converted_plan_id);
      const entry = barberMap.get(referral.referrer_id);
      if (!entry) return;
      entry.revenue += plan?.price || 0;
      entry.converted += 1;
    });
    return Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [barbers, filteredReferrals]);

  const statValues: Record<string, string | number> = {
    total: totals.total,
    leads: totals.leads,
    clients: totals.clients,
    converted: totals.converted,
    revenue: formatCurrencyBRL(revenueTotal),
    ticket: formatCurrencyBRL(averageTicket),
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Acesso restrito aos administradores.</div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-4">
            <div className="lavender-glow p-3 rounded-2xl">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">
                <span className="lavender-gradient bg-clip-text text-transparent">Relatórios</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Analise suas indicações com filtros e gráficos
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <Card className="glass-card border-border/50 overflow-hidden">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/30 bg-secondary/20">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Filtros
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 self-start md:self-auto hover-lift"
                onClick={() => {
                  if (filteredReferrals.length === 0) return;
                  const rows = [
                    ['Nome', 'Telefone', 'Status', 'Plano', 'Barbeiro', 'Cliente', 'Criado em']
                  ];
                  filteredReferrals.forEach((referral) => {
                    rows.push([
                      referral.lead_name,
                      referral.lead_phone,
                      referral.status,
                      referral.converted_plan_id ? getPlanById(referral.converted_plan_id)?.label ?? '' : '',
                      referral.referrer_name,
                      isClientReferral(referral) ? 'Sim' : 'Não',
                      new Date(referral.created_at).toLocaleDateString('pt-BR')
                    ]);
                  });
                  const dateStamp = new Date().toISOString().slice(0, 10);
                  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `relatorio-${dateStamp}.csv`;
                  link.click();
                  URL.revokeObjectURL(link.href);
                }}
                disabled={filteredReferrals.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 pt-6">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</p>
                <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="clients">Clientes</SelectItem>
                    <SelectItem value="converted">Convertidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período</p>
                <Select value={reportRange} onValueChange={(value) => setReportRange(value as ReportRange)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o período</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="month">Este mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Colaborador</p>
                <Select value={reportBarber} onValueChange={(value) => setReportBarber(value as ReportBarber)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {barbers.map((barber) => (
                      <SelectItem key={barber.id} value={barber.id}>{barber.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {STAT_CONFIG.map((stat, i) => {
            const Icon = stat.icon;
            const c = colorMap[stat.color] || colorMap.primary;
            const textColor = c.split(' ')[0];
            return (
              <motion.div key={stat.key} custom={i + 1} variants={fadeUp} initial="hidden" animate="show">
                <Card className="glass-card hover-lift group overflow-hidden relative">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                        <p className={cn("text-2xl font-bold tracking-tight", textColor)}>{statValues[stat.key]}</p>
                      </div>
                      <div className={cn("p-2 rounded-xl", c)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Charts */}
        <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-2">
          <StatusDistributionChart referrals={filteredReferrals} />
          <PlanDistributionChart referrals={filteredReferrals} />
        </motion.div>

        <motion.div custom={8} variants={fadeUp} initial="hidden" animate="show">
          <ConversionTrendChart referrals={filteredReferrals} range={reportRange} />
        </motion.div>

        {/* Revenue by barber */}
        <motion.div custom={9} variants={fadeUp} initial="hidden" animate="show">
          <Card className="glass-card border-border/50 overflow-hidden">
            <CardHeader className="border-b border-border/30 bg-secondary/20">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Receita por colaborador
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {revenueByBarber.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  Nenhum colaborador encontrado para o filtro atual
                </p>
              ) : (
                <div className="space-y-3">
                  {revenueByBarber.map((barber, index) => {
                    const maxRevenue = revenueByBarber[0]?.revenue || 1;
                    const pct = Math.round((barber.revenue / maxRevenue) * 100);
                    return (
                      <div
                        key={barber.id}
                        className="group flex flex-col gap-2 rounded-xl border border-border/30 bg-secondary/20 p-4 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                              index === 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{barber.name}</p>
                              <p className="text-xs text-muted-foreground">{barber.converted} conversões</p>
                            </div>
                          </div>
                          <p className="text-lg font-bold text-primary">{formatCurrencyBRL(barber.revenue)}</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary/60"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3 + index * 0.08, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
