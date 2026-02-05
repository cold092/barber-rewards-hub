import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      if (referral.status !== 'converted' || !referral.converted_plan_id) {
        return sum;
      }
      const plan = getPlanById(referral.converted_plan_id);
      return sum + (plan?.price || 0);
    }, 0);
  }, [filteredReferrals]);

  const averageTicket = useMemo(() => {
    if (totals.converted === 0) {
      return 0;
    }
    return revenueTotal / totals.converted;
  }, [revenueTotal, totals.converted]);

  const revenueByBarber = useMemo(() => {
    const barberMap = new Map<string, { id: string; name: string; revenue: number; converted: number }>();
    barbers.forEach((barber) => {
      barberMap.set(barber.id, { id: barber.id, name: barber.name, revenue: 0, converted: 0 });
    });

    filteredReferrals.forEach((referral) => {
      if (referral.status !== 'converted' || !referral.converted_plan_id) {
        return;
      }
      const plan = getPlanById(referral.converted_plan_id);
      const entry = barberMap.get(referral.referrer_id);
      if (!entry) {
        return;
      }
      entry.revenue += plan?.price || 0;
      entry.converted += 1;
    });

    return Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [barbers, filteredReferrals]);

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
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold">
            <span className="gold-text">Relatórios</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Analise suas indicações com filtros e gráficos.
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="clients">Clientes</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Período</p>
              <Select value={reportRange} onValueChange={(value) => setReportRange(value as ReportRange)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Barbeiro</p>
              <Select value={reportBarber} onValueChange={(value) => setReportBarber(value as ReportBarber)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{totals.total}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.leads}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.clients}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Convertidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{totals.converted}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrencyBRL(revenueTotal)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrencyBRL(averageTicket)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <StatusDistributionChart referrals={filteredReferrals} />
          <PlanDistributionChart referrals={filteredReferrals} />
        </div>

        <ConversionTrendChart referrals={filteredReferrals} range={reportRange} />

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Receita por barbeiro</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByBarber.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                Nenhum barbeiro encontrado para o filtro atual
              </p>
            ) : (
              <div className="space-y-3">
                {revenueByBarber.map((barber) => (
                  <div
                    key={barber.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{barber.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {barber.converted} vendas convertidas
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrencyBRL(barber.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
