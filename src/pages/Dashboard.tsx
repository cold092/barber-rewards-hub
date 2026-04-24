import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSkeleton } from '@/components/ui/skeleton-card';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  Wallet,
  UserPlus,
  CheckCircle,
  DollarSign,
  LayoutDashboard,
  Crown,
  ArrowUpRight,
} from 'lucide-react';
import { getAllReferrals, getRanking } from '@/services/referralService';
import { getPlanById } from '@/config/plans';
import { formatCurrencyBRL } from '@/utils/currency';
import PlanDistributionChart from '@/components/dashboard/PlanDistributionChart';
import type { Referral, Profile } from '@/types/database';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

function StatCard({ icon: Icon, label, value, sub, color, index }: { icon: typeof Users; label: string; value: string | number; sub: string; color: string; index: number }) {
  const circleClassMap: Record<string, string> = {
    primary: 'icon-circle-primary',
    success: 'icon-circle-success',
    info: 'icon-circle-info',
    warning: 'icon-circle-warning',
  };
  const circleClass = circleClassMap[color] || circleClassMap.primary;

  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show">
      <Card className="bank-card hover-lift group overflow-hidden relative">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={cn(circleClass, "h-14 w-14 transition-transform duration-300 group-hover:scale-110")}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground tracking-wide truncate">{label}</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
              <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { profile: realProfile, isAdmin: realIsAdmin, isBarber: realIsBarber } = useAuth();
  const { effectiveProfile, effectiveRole, isViewingAs } = useViewAs();
  
  const profile = isViewingAs ? effectiveProfile : realProfile;
  const isAdmin = isViewingAs ? (effectiveRole === 'admin' || effectiveRole === 'owner') : realIsAdmin;
  const isBarber = isViewingAs ? effectiveRole === 'barber' : realIsBarber;
  const isViewingAsBarber = isViewingAs && effectiveRole === 'barber';
  const { activeTags, activeStatuses, activeCollaborator } = useGlobalFilter();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [myReferrals, setMyReferrals] = useState<Referral[]>([]);
  const [topBarbers, setTopBarbers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      const [referralsResult, barbersResult] = await Promise.all([
        getAllReferrals(),
        getRanking('barber')
      ]);
      
      const allReferrals = referralsResult.data;
      setReferrals(allReferrals);
      
      if (profile && (isBarber || isViewingAsBarber)) {
        setMyReferrals(allReferrals.filter(r => r.referrer_id === profile.id));
      }
      
      setTopBarbers(barbersResult.data.slice(0, 5));
      setLoading(false);
    }
    
    loadData();
  }, [profile, isBarber, isViewingAs, effectiveProfile]);

  const baseDisplayReferrals = (isBarber || isViewingAsBarber) ? myReferrals : referrals;
  
  // Apply global filters
  const displayReferrals = baseDisplayReferrals.filter(r => {
    if (activeStatuses.length > 0 && !activeStatuses.includes(r.status)) return false;
    if (activeTags.length > 0 && !(r.tags || []).some(t => activeTags.includes(t))) return false;
    if (activeCollaborator && r.referrer_id !== activeCollaborator) return false;
    return true;
  });
  const stats = {
    totalLeads: displayReferrals.length,
    converted: displayReferrals.filter(r => r.status === 'converted').length,
    pending: displayReferrals.filter(r => r.status === 'new' || r.status === 'contacted').length,
    conversionRate: displayReferrals.length > 0 
      ? Math.round((displayReferrals.filter(r => r.status === 'converted').length / displayReferrals.length) * 100)
      : 0
  };
  const convertedReferrals = displayReferrals.filter(
    (referral) => referral.status === 'converted' && referral.converted_plan_id
  );
  const financialTotal = convertedReferrals.reduce((sum, referral) => {
    const plan = getPlanById(referral.converted_plan_id || '');
    return sum + (plan?.price || 0);
  }, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Header — standardized via PageHeader component */}
        <PageHeader
          icon={LayoutDashboard}
          title={`Olá, ${profile?.name?.split(' ')[0] || ''}`}
          gradientTitle
          subtitle={
            isAdmin
              ? 'Gerencie leads e acompanhe a performance da equipe'
              : 'Cadastre indicações e acompanhe seus pontos'
          }
        />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Wallet} label="Meu Saldo" value={`${profile?.wallet_balance || 0} pts`} sub={`Lifetime: ${profile?.lifetime_points || 0} pts`} color="primary" index={0} />
          <StatCard icon={Users} label={isAdmin ? 'Total de Leads' : 'Minhas Indicações'} value={stats.totalLeads} sub={isAdmin ? 'Indicações da equipe' : 'Leads indicados'} color="info" index={1} />
          <StatCard icon={CheckCircle} label="Convertidos" value={stats.converted} sub="Vendas fechadas" color="success" index={2} />
          <StatCard icon={TrendingUp} label="Taxa de Conversão" value={`${stats.conversionRate}%`} sub={`${stats.pending} pendentes`} color="warning" index={3} />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Leads */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <Card className="glass-card rounded-2xl overflow-hidden h-full">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="flex items-center gap-2.5 font-display text-base">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  Leads Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {displayReferrals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    {isAdmin 
                      ? 'Nenhuma indicação registrada ainda' 
                      : 'Você ainda não indicou ninguém. Comece agora!'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {displayReferrals.slice(0, 5).map((referral) => (
                      <div 
                        key={referral.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20 hover:border-border/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{referral.lead_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isAdmin ? `por ${referral.referrer_name}` : referral.lead_phone}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {referral.status === 'new' && (
                            <Badge variant="outline" className="bg-info/15 text-info border-info/25 text-[10px]">Novo</Badge>
                          )}
                          {referral.status === 'contacted' && (
                            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/25 text-[10px]">Contatado</Badge>
                          )}
                          {referral.status === 'converted' && (
                            <Badge variant="outline" className="bg-success/15 text-success border-success/25 text-[10px]">Convertido</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Financial Card */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
            <Card className="glass-card rounded-2xl overflow-hidden h-full">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="flex items-center gap-2.5 font-display text-base">
                  <div className="p-1.5 rounded-lg bg-success/10">
                    <DollarSign className="h-4 w-4 text-success" />
                  </div>
                  Receita Total
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-4xl font-bold lavender-text tracking-tight">
                    {formatCurrencyBRL(financialTotal)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats.converted} vendas convertidas
                  </p>
                  {financialTotal > 0 && (
                    <div className="flex items-center justify-center gap-1 text-success text-xs font-medium mt-2">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Acumulado
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Plan Distribution Chart */}
          <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
            <PlanDistributionChart referrals={displayReferrals} />
          </motion.div>

          {/* Top Barbers */}
          <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show">
            <Card className="glass-card rounded-2xl overflow-hidden h-full">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="flex items-center gap-2.5 font-display text-base">
                  <div className="p-1.5 rounded-lg bg-warning/10">
                    <Trophy className="h-4 w-4 text-warning" />
                  </div>
                  Top Colaboradores
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {topBarbers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    Nenhum colaborador no ranking ainda
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topBarbers.map((barber, index) => (
                      <div 
                        key={barber.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/20 hover:border-border/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                            index === 0 ? "lavender-gradient text-primary-foreground shadow-sm" : 
                            index === 1 ? "bg-muted-foreground/20 text-muted-foreground" :
                            index === 2 ? "bg-warning/15 text-warning" :
                            "bg-secondary text-muted-foreground"
                          )}>
                            {index === 0 ? <Crown className="h-4 w-4" /> : index + 1}
                          </div>
                          <p className="font-medium text-sm">{barber.name}</p>
                        </div>
                        <span className="font-semibold text-sm text-primary">
                          {barber.lifetime_points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
