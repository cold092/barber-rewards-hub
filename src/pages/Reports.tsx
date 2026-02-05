import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { getAllReferrals } from '@/services/referralService';
import PlanDistributionChart from '@/components/dashboard/PlanDistributionChart';
import StatusDistributionChart from '@/components/dashboard/StatusDistributionChart';
import type { Referral } from '@/types/database';

type ReportType = 'all' | 'leads' | 'clients' | 'converted';
type ReportRange = 'all' | '7d' | '30d' | 'month';

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
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>('all');
  const [reportRange, setReportRange] = useState<ReportRange>('all');

  useEffect(() => {
    async function loadReferrals() {
      setLoading(true);
      const result = await getAllReferrals();
      setReferrals(result.data);
      setLoading(false);
    }

    if (isAdmin) {
      loadReferrals();
    }
  }, [isAdmin]);

  const filteredReferrals = useMemo(() => {
    const rangeFiltered = referrals.filter((referral) => isWithinRange(referral.created_at, reportRange));
    switch (reportType) {
      case 'leads':
        return rangeFiltered.filter((referral) => !isClientReferral(referral));
      case 'clients':
        return rangeFiltered.filter((referral) => isClientReferral(referral));
      case 'converted':
        return rangeFiltered.filter((referral) => referral.status === 'converted');
      default:
        return rangeFiltered;
    }
  }, [referrals, reportRange, reportType]);

  const totals = useMemo(() => {
    return {
      total: filteredReferrals.length,
      converted: filteredReferrals.filter((referral) => referral.status === 'converted').length,
      leads: filteredReferrals.filter((referral) => !isClientReferral(referral)).length,
      clients: filteredReferrals.filter((referral) => isClientReferral(referral)).length
    };
  }, [filteredReferrals]);

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
          <CardContent className="grid gap-4 md:grid-cols-2">
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
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <StatusDistributionChart referrals={filteredReferrals} />
          <PlanDistributionChart referrals={filteredReferrals} />
        </div>
      </div>
    </DashboardLayout>
  );
}
