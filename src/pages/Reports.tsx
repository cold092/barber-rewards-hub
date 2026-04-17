import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, Users, CheckCircle, DollarSign, TrendingUp, UserPlus, Filter, Trophy, Tag, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import { getAllBarbers, getAllReferrals } from '@/services/referralService';
import PlanDistributionChart from '@/components/dashboard/PlanDistributionChart';
import StatusDistributionChart from '@/components/dashboard/StatusDistributionChart';
import { getPlanById } from '@/config/plans';
import { formatCurrencyBRL } from '@/utils/currency';
import type { Referral } from '@/types/database';
import type { Profile } from '@/types/database';
import ConversionTrendChart from '@/components/dashboard/ConversionTrendChart';
import BarberPerformanceChart from '@/components/dashboard/BarberPerformanceChart';
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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const STAT_CONFIG = [
  { key: 'total', label: 'Total Indicações', icon: BarChart3, circle: 'icon-circle-primary' },
  { key: 'leads', label: 'Leads Ativos', icon: UserPlus, circle: 'icon-circle-info' },
  { key: 'clients', label: 'Clientes', icon: Users, circle: 'icon-circle-warning' },
  { key: 'converted', label: 'Convertidos', icon: CheckCircle, circle: 'icon-circle-success' },
  { key: 'revenue', label: 'Receita Total', icon: DollarSign, circle: 'icon-circle-primary' },
  { key: 'ticket', label: 'Ticket Médio', icon: TrendingUp, circle: 'icon-circle-success' },
] as const;

export default function Reports() {
  const { isAdmin } = useAuth();
  const { activeStatuses: globalStatuses, activeTags: globalTags, activeCollaborator: globalCollaborator } = useGlobalFilter();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>('all');
  const [reportRange, setReportRange] = useState<ReportRange>('all');
  const [reportBarber, setReportBarber] = useState<ReportBarber>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    referrals.forEach(r => r.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [referrals]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

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
    let filtered = referrals.filter((referral) => isWithinRange(referral.created_at, reportRange));
    // Apply global filters
    if (globalStatuses.length > 0) {
      filtered = filtered.filter(r => globalStatuses.includes(r.status));
    }
    if (globalTags.length > 0) {
      filtered = filtered.filter(r => (r.tags || []).some(t => globalTags.includes(t)));
    }
    if (globalCollaborator) {
      filtered = filtered.filter(r => r.referrer_id === globalCollaborator);
    }
    if (reportBarber !== 'all') {
      filtered = filtered.filter((referral) => referral.referrer_id === reportBarber);
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter((referral) =>
        selectedTags.some(tag => referral.tags?.includes(tag))
      );
    }
    switch (reportType) {
      case 'leads':
        return filtered.filter((referral) => !isClientReferral(referral));
      case 'clients':
        return filtered.filter((referral) => isClientReferral(referral));
      case 'converted':
        return filtered.filter((referral) => referral.status === 'converted');
      default:
        return filtered;
    }
  }, [referrals, reportBarber, reportRange, reportType, selectedTags, globalStatuses, globalTags, globalCollaborator]);

  const totals = useMemo(() => ({
    total: filteredReferrals.length,
    converted: filteredReferrals.filter((r) => r.status === 'converted').length,
    leads: filteredReferrals.filter((r) => !isClientReferral(r)).length,
    clients: filteredReferrals.filter((r) => isClientReferral(r)).length
  }), [filteredReferrals]);

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
    const barberMap = new Map<string, { id: string; name: string; revenue: number; converted: number; total: number }>();
    barbers.forEach((barber) => {
      barberMap.set(barber.id, { id: barber.id, name: barber.name, revenue: 0, converted: 0, total: 0 });
    });
    filteredReferrals.forEach((referral) => {
      const entry = barberMap.get(referral.referrer_id);
      if (!entry) return;
      entry.total += 1;
      if (referral.status === 'converted' && referral.converted_plan_id) {
        const plan = getPlanById(referral.converted_plan_id);
        entry.revenue += plan?.price || 0;
        entry.converted += 1;
      }
    });
    return Array.from(barberMap.values())
      .filter(b => b.total > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [barbers, filteredReferrals]);

  const conversionRate = useMemo(() => {
    if (totals.total === 0) return 0;
    return Math.round((totals.converted / totals.total) * 100);
  }, [totals]);

  const statValues: Record<string, string | number> = {
    total: totals.total,
    leads: totals.leads,
    clients: totals.clients,
    converted: totals.converted,
    revenue: formatCurrencyBRL(revenueTotal),
    ticket: formatCurrencyBRL(averageTicket),
  };

  const handleExportCSV = () => {
    if (filteredReferrals.length === 0) return;
    const rows = [
      ['Nome', 'Telefone', 'Status', 'Plano', 'Colaborador', 'Cliente', 'Criado em']
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
      <motion.div
        className="space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Header + Actions */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Relatórios</h1>
              <p className="text-sm text-muted-foreground">Analise o desempenho das indicações</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start border-border/40 hover:border-primary/40 hover:bg-primary/5"
            onClick={handleExportCSV}
            disabled={filteredReferrals.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </motion.div>

        {/* Filters Strip */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="h-9 text-sm bg-secondary/30 border-border/30">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="clients">Clientes</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reportRange} onValueChange={(v) => setReportRange(v as ReportRange)}>
                <SelectTrigger className="h-9 text-sm bg-secondary/30 border-border/30">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reportBarber} onValueChange={(v) => setReportBarber(v as ReportBarber)}>
                <SelectTrigger className="h-9 text-sm bg-secondary/30 border-border/30">
                  <SelectValue placeholder="Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {allTags.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Etiquetas</span>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map(tag => {
                    const isActive = selectedTags.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={cn(
                          "text-[11px] cursor-pointer transition-all capitalize",
                          isActive
                            ? "bg-primary/15 text-primary border-primary/30 shadow-sm"
                            : "bg-secondary/30 text-muted-foreground border-border/40 hover:bg-secondary/50"
                        )}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Strip */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAT_CONFIG.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.key}
                  className="bank-card hover-lift group p-4 flex items-center gap-3"
                >
                  <div className={cn(stat.circle, "h-11 w-11 shrink-0 transition-transform duration-300 group-hover:scale-110")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight truncate">
                      {stat.label}
                    </span>
                    <p className="text-lg font-bold tracking-tight text-foreground truncate">
                      {statValues[stat.key]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Conversion Rate Banner */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-success">{conversionRate}%</span>
                <span className="text-sm text-muted-foreground">Taxa de conversão</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-success/80 to-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${conversionRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                />
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-center pl-4 border-l border-border/30">
              <div>
                <p className="text-lg font-bold text-foreground">{totals.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Indicações</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">{totals.converted}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Convertidos</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <motion.div variants={fadeUp} className="grid gap-5 lg:grid-cols-2">
          <StatusDistributionChart referrals={filteredReferrals} />
          <PlanDistributionChart referrals={filteredReferrals} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <ConversionTrendChart referrals={filteredReferrals} range={reportRange} />
        </motion.div>

        <motion.div variants={fadeUp}>
          <BarberPerformanceChart referrals={referrals} barbers={barbers} />
        </motion.div>

        {/* Revenue by Barber */}
        <motion.div variants={fadeUp}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-border/30 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm text-foreground">Receita por Colaborador</h3>
                <p className="text-[11px] text-muted-foreground">Ranking de faturamento gerado por indicações</p>
              </div>
            </div>
            <div className="p-5">
              {revenueByBarber.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  Nenhum colaborador encontrado para o filtro atual
                </p>
              ) : (
                <div className="space-y-2.5">
                  {revenueByBarber.map((barber, index) => {
                    const maxRevenue = revenueByBarber[0]?.revenue || 1;
                    const pct = maxRevenue > 0 ? Math.round((barber.revenue / maxRevenue) * 100) : 0;
                    const isTop = index === 0 && barber.revenue > 0;
                    return (
                      <div
                        key={barber.id}
                        className={cn(
                          "group rounded-xl border p-4 transition-all duration-200",
                          isTop
                            ? "border-primary/30 bg-gradient-to-r from-primary/5 to-transparent"
                            : "border-border/30 bg-secondary/20 hover:border-border/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                              isTop
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{barber.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {barber.total} indicações • {barber.converted} conversões
                              </p>
                            </div>
                          </div>
                          <p className={cn(
                            "text-base font-bold tabular-nums",
                            isTop ? "text-primary" : "text-foreground"
                          )}>
                            {formatCurrencyBRL(barber.revenue)}
                          </p>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                          <motion.div
                            className={cn(
                              "h-full rounded-full",
                              isTop ? "bg-primary/70" : "bg-muted-foreground/30"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3 + index * 0.06, duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
