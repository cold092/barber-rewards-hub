import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Crown, Star } from 'lucide-react';
import { getClientReferralRanking, getRanking, type ClientRankingEntry } from '@/services/referralService';
import { useViewAs } from '@/contexts/ViewAsContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { Profile } from '@/types/database';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

export default function Ranking() {
  const { effectiveProfile, isViewingAs } = useViewAs();
  const [barberRanking, setBarberRanking] = useState<Profile[]>([]);
  const [clientRanking, setClientRanking] = useState<ClientRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('barbers');

  useEffect(() => {
    async function loadRankings() {
      setLoading(true);
      const [barbersResult, clientsResult] = await Promise.all([
        getRanking('barber'),
        getClientReferralRanking()
      ]);
      setBarberRanking(barbersResult.data);
      setClientRanking(clientsResult.data);
      setLoading(false);
    }
    loadRankings();
  }, []);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0: return <Crown className="h-5 w-5 text-primary-foreground" />;
      case 1: return <Medal className="h-5 w-5 text-slate-900" />;
      case 2: return <Medal className="h-5 w-5 text-amber-100" />;
      default: return <span className="text-sm font-bold">{position + 1}</span>;
    }
  };

  const getRankBg = (position: number) => {
    switch (position) {
      case 0: return 'gold-gradient';
      case 1: return 'bg-slate-400';
      case 2: return 'bg-amber-700';
      default: return 'bg-muted';
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

  const isHighlighted = (profileId: string) =>
    isViewingAs && effectiveProfile?.id === profileId;

  const RankingList = ({ data }: { data: Profile[] }) => (
    <div className="space-y-2">
      {data.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum participante no ranking ainda</p>
      ) : (
        data.map((profile, index) => (
          <motion.div
            key={profile.id}
            custom={index}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={cn(
              'flex items-center justify-between p-4 rounded-xl transition-all hover:border-primary/30',
              isHighlighted(profile.id)
                ? 'bg-warning/10 border-2 border-warning/40 ring-1 ring-warning/20'
                : index === 0
                  ? 'bg-primary/8 border border-primary/20'
                  : 'bg-secondary/30 border border-border/30'
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm',
                getRankBg(index),
                index < 3 ? '' : 'text-muted-foreground'
              )}>
                {getRankIcon(index)}
              </div>
              <div>
                <p className={cn('font-semibold text-sm', index === 0 && 'text-primary', isHighlighted(profile.id) && 'text-warning')}>
                  {profile.name}
                  {isHighlighted(profile.id) && (
                    <span className="ml-2 text-[10px] font-medium text-warning/80 uppercase tracking-wider">← visualizando</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Saldo: {profile.wallet_balance} pts</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn('text-xl font-bold', index === 0 ? 'gold-text' : 'text-foreground')}>
                {profile.lifetime_points}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  const ClientRankingList = ({ data }: { data: ClientRankingEntry[] }) => (
    <div className="space-y-2">
      {data.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum cliente no ranking ainda</p>
      ) : (
        data.map((entry, index) => (
          <motion.div
            key={entry.clientId}
            custom={index}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={cn(
              'flex items-center justify-between p-4 rounded-xl transition-all hover:border-primary/30',
              index === 0
                ? 'bg-primary/8 border border-primary/20'
                : 'bg-secondary/30 border border-border/30'
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm',
                getRankBg(index),
                index < 3 ? '' : 'text-muted-foreground'
              )}>
                {getRankIcon(index)}
              </div>
              <div>
                <p className={cn('font-semibold text-sm', index === 0 && 'text-primary')}>
                  {entry.clientName}
                </p>
                <p className="text-xs text-muted-foreground">{entry.referralCount} indicações</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn('text-xl font-bold', index === 0 ? 'gold-text' : 'text-foreground')}>
                {entry.points}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-4">
            <div className="lavender-glow p-3 rounded-2xl">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">
                <span className="lavender-gradient bg-clip-text text-transparent">Ranking</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Classificação baseada em pontos históricos (lifetime)
              </p>
            </div>
          </div>
        </motion.div>

        {/* Podium */}
        {barberRanking.length >= 3 && (
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
            {/* 2nd */}
            <Card className="glass-card border-border/30 mt-8 hover-lift">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-400 flex items-center justify-center mb-3">
                  <Medal className="h-6 w-6 text-slate-900" />
                </div>
                <p className="font-semibold text-sm truncate">{barberRanking[1]?.name}</p>
                <p className="text-2xl font-bold text-slate-400 mt-1">{barberRanking[1]?.lifetime_points}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
              </CardContent>
            </Card>

            {/* 1st */}
            <Card className="glass-card border-primary/30 animate-pulse-gold hover-lift">
              <CardContent className="p-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-xl gold-gradient flex items-center justify-center mb-3">
                  <Crown className="h-7 w-7 text-primary-foreground" />
                </div>
                <p className="font-semibold text-primary text-sm truncate">{barberRanking[0]?.name}</p>
                <p className="text-3xl font-bold gold-text mt-1">{barberRanking[0]?.lifetime_points}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
              </CardContent>
            </Card>

            {/* 3rd */}
            <Card className="glass-card border-border/30 mt-12 hover-lift">
              <CardContent className="p-4 text-center">
                <div className="w-11 h-11 mx-auto rounded-xl bg-amber-700 flex items-center justify-center mb-3">
                  <Medal className="h-5 w-5 text-amber-100" />
                </div>
                <p className="font-semibold text-sm truncate">{barberRanking[2]?.name}</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{barberRanking[2]?.lifetime_points}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="glass-card p-1 h-auto gap-1 max-w-md w-full grid grid-cols-2">
              <TabsTrigger
                value="barbers"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg text-sm"
              >
                Colaboradores
              </TabsTrigger>
              <TabsTrigger
                value="clients"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg text-sm"
              >
                Clientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="barbers">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-card border-border/50 mt-4 overflow-hidden">
                  <CardHeader className="border-b border-border/30 bg-secondary/20">
                    <CardTitle className="flex items-center gap-2 font-display text-base">
                      <Trophy className="h-5 w-5 text-primary" />
                      Ranking de Colaboradores
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <RankingList data={barberRanking} />
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="clients">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-card border-border/50 mt-4 overflow-hidden">
                  <CardHeader className="border-b border-border/30 bg-secondary/20">
                    <CardTitle className="flex items-center gap-2 font-display text-base">
                      <Trophy className="h-5 w-5 text-primary" />
                      Ranking de Indicações (Clientes)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ClientRankingList data={clientRanking} />
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
