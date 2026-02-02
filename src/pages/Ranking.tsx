import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Crown, Star } from 'lucide-react';
import { getLeadRanking, getRanking, type LeadRankingEntry } from '@/services/referralService';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/database';

export default function Ranking() {
  const { isAdmin } = useAuth();
  const [barberRanking, setBarberRanking] = useState<Profile[]>([]);
  const [clientRanking, setClientRanking] = useState<Profile[]>([]);
  const [leadRanking, setLeadRanking] = useState<LeadRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('barbers');

  useEffect(() => {
    async function loadRankings() {
      setLoading(true);
      
      const [barbersResult, clientsResult, leadsResult] = await Promise.all([
        getRanking('barber'),
        isAdmin ? getRanking('client') : Promise.resolve({ data: [] }),
        isAdmin ? getLeadRanking() : Promise.resolve({ data: [] })
      ]);
      
      setBarberRanking(barbersResult.data);
      setClientRanking(clientsResult.data);
      setLeadRanking(leadsResult.data);
      setLoading(false);
    }
    
    loadRankings();
  }, [isAdmin]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="h-5 w-5 text-primary" />;
      case 1:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <Star className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRankStyle = (position: number) => {
    switch (position) {
      case 0:
        return 'gold-gradient text-primary-foreground';
      case 1:
        return 'bg-slate-400 text-slate-900';
      case 2:
        return 'bg-amber-700 text-amber-100';
      default:
        return 'bg-muted text-muted-foreground';
    }
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

  const RankingList = ({ data }: { data: Profile[] }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum participante no ranking ainda
        </p>
      ) : (
        data.map((profile, index) => (
          <div 
            key={profile.id}
            className={`
              flex items-center justify-between p-4 rounded-lg
              ${index === 0 ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'}
              transition-all hover:scale-[1.01]
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold
                ${getRankStyle(index)}
              `}>
                {index < 3 ? getRankIcon(index) : index + 1}
              </div>
              <div>
                <p className={`font-semibold ${index === 0 ? 'text-primary' : ''}`}>
                  {profile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Saldo atual: {profile.wallet_balance} pts
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${index === 0 ? 'gold-text' : 'text-foreground'}`}>
                {profile.lifetime_points}
              </p>
              <p className="text-xs text-muted-foreground">pontos</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const LeadRankingList = ({ data }: { data: LeadRankingEntry[] }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nenhum lead pontuado ainda
        </p>
      ) : (
        data.map((entry, index) => (
          <div
            key={entry.referrerId}
            className={`
              flex items-center justify-between p-4 rounded-lg
              ${index === 0 ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50'}
              transition-all hover:scale-[1.01]
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold
                ${getRankStyle(index)}
              `}>
                {index < 3 ? getRankIcon(index) : index + 1}
              </div>
              <div>
                <p className={`font-semibold ${index === 0 ? 'text-primary' : ''}`}>
                  {entry.referrerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.leadCount} indicações
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xl font-bold ${index === 0 ? 'gold-text' : 'text-foreground'}`}>
                {entry.points}
              </p>
              <p className="text-xs text-muted-foreground">pontos</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <span className="gold-text">Ranking</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Classificação baseada em pontos históricos (lifetime)
          </p>
        </div>

        {/* Top 3 Podium - Barbers */}
        {barberRanking.length >= 3 && (
          <div className="grid grid-cols-3 gap-4">
            {/* 2nd Place */}
            <Card className="glass-card border-slate-400/30 mt-8">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-400 flex items-center justify-center mb-2">
                  <Medal className="h-6 w-6 text-slate-900" />
                </div>
                <p className="font-semibold truncate">{barberRanking[1]?.name}</p>
                <p className="text-2xl font-bold text-slate-400">
                  {barberRanking[1]?.lifetime_points}
                </p>
                <p className="text-xs text-muted-foreground">pontos</p>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="glass-card border-primary/30 animate-pulse-gold">
              <CardContent className="p-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-full gold-gradient flex items-center justify-center mb-2">
                  <Crown className="h-7 w-7 text-primary-foreground" />
                </div>
                <p className="font-semibold text-primary truncate">{barberRanking[0]?.name}</p>
                <p className="text-3xl font-bold gold-text">
                  {barberRanking[0]?.lifetime_points}
                </p>
                <p className="text-xs text-muted-foreground">pontos</p>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="glass-card border-amber-700/30 mt-12">
              <CardContent className="p-4 text-center">
                <div className="w-11 h-11 mx-auto rounded-full bg-amber-700 flex items-center justify-center mb-2">
                  <Medal className="h-5 w-5 text-amber-100" />
                </div>
                <p className="font-semibold truncate">{barberRanking[2]?.name}</p>
                <p className="text-xl font-bold text-amber-700">
                  {barberRanking[2]?.lifetime_points}
                </p>
                <p className="text-xs text-muted-foreground">pontos</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Rankings */}
        {isAdmin ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="barbers">Barbeiros</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
            </TabsList>
            
            <TabsContent value="barbers">
              <Card className="glass-card border-border/50 mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Trophy className="h-5 w-5 text-primary" />
                    Ranking de Barbeiros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RankingList data={barberRanking} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="clients">
              <Card className="glass-card border-border/50 mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Trophy className="h-5 w-5 text-primary" />
                    Ranking de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RankingList data={clientRanking} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leads">
              <Card className="glass-card border-border/50 mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display">
                    <Trophy className="h-5 w-5 text-primary" />
                    Ranking de Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <LeadRankingList data={leadRanking} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Trophy className="h-5 w-5 text-primary" />
                Ranking de Barbeiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RankingList data={barberRanking} />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
