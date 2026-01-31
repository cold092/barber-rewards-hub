import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Trophy, 
  TrendingUp, 
  Wallet,
  UserPlus,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getAllReferrals, getRanking } from '@/services/referralService';
import type { Referral, Profile } from '@/types/database';

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [topBarbers, setTopBarbers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      const [referralsResult, barbersResult] = await Promise.all([
        getAllReferrals(),
        getRanking('barber')
      ]);
      
      setReferrals(referralsResult.data);
      setTopBarbers(barbersResult.data.slice(0, 5));
      setLoading(false);
    }
    
    loadData();
  }, []);

  const stats = {
    totalLeads: referrals.length,
    converted: referrals.filter(r => r.status === 'converted').length,
    pending: referrals.filter(r => r.status === 'new' || r.status === 'contacted').length,
    conversionRate: referrals.length > 0 
      ? Math.round((referrals.filter(r => r.status === 'converted').length / referrals.length) * 100)
      : 0
  };

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">
            Olá, <span className="gold-text">{profile?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas indicações e métricas
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Meu Saldo
              </CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {profile?.wallet_balance || 0} pts
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime: {profile?.lifetime_points || 0} pts
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Indicações registradas
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Convertidos
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.converted}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Vendas fechadas
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conversão
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pending} pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Leads */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <UserPlus className="h-5 w-5 text-primary" />
                Leads Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma indicação registrada ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {referrals.slice(0, 5).map((referral) => (
                    <div 
                      key={referral.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div>
                        <p className="font-medium">{referral.lead_name}</p>
                        <p className="text-xs text-muted-foreground">
                          por {referral.referrer_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {referral.status === 'new' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400">
                            Novo
                          </span>
                        )}
                        {referral.status === 'contacted' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-warning/20 text-warning">
                            Contatado
                          </span>
                        )}
                        {referral.status === 'converted' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-success/20 text-success">
                            Convertido
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Barbers */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Trophy className="h-5 w-5 text-primary" />
                Top Barbeiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topBarbers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum barbeiro no ranking ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {topBarbers.map((barber, index) => (
                    <div 
                      key={barber.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'gold-gradient text-primary-foreground' : 
                            index === 1 ? 'bg-slate-400 text-slate-900' :
                            index === 2 ? 'bg-amber-700 text-amber-100' :
                            'bg-muted text-muted-foreground'}
                        `}>
                          {index + 1}
                        </span>
                        <p className="font-medium">{barber.name}</p>
                      </div>
                      <span className="font-semibold text-primary">
                        {barber.lifetime_points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
