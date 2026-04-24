import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Crown, ChevronDown, UserPlus, ArrowRightLeft, Star, Gift, Wallet } from 'lucide-react';
import { getClientReferralRanking, getRanking, type ClientRankingEntry } from '@/services/referralService';
import { useViewAs } from '@/contexts/ViewAsContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { getPlanById } from '@/config/plans';
import type { Profile, Referral } from '@/types/database';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const } }),
};

interface PointBreakdownItem {
  label: string;
  points: number;
  type: 'referral' | 'conversion' | 'chain' | 'redemption';
  date: string;
}

export default function Ranking() {
  const { effectiveProfile, isViewingAs } = useViewAs();
  const [barberRanking, setBarberRanking] = useState<Profile[]>([]);
  const [clientRanking, setClientRanking] = useState<ClientRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('barbers');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [breakdowns, setBreakdowns] = useState<Record<string, PointBreakdownItem[]>>({});
  const [loadingBreakdown, setLoadingBreakdown] = useState<string | null>(null);

  // Client ranking expanded state
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientBreakdowns, setClientBreakdowns] = useState<Record<string, PointBreakdownItem[]>>({});
  const [loadingClientBreakdown, setLoadingClientBreakdown] = useState<string | null>(null);

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

  const toggleBreakdown = async (profileId: string) => {
    if (expandedId === profileId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(profileId);

    if (breakdowns[profileId]) return;

    setLoadingBreakdown(profileId);
    try {
      // Find the profile to get actual lifetime_points
      const profile = barberRanking.find(p => p.id === profileId);
      const actualLifetime = profile?.lifetime_points || 0;

      const { data: referrals } = await supabase
        .from('referrals')
        .select('id, lead_name, status, is_client, converted_plan_id, created_at, referred_by_lead_id')
        .eq('referrer_id', profileId)
        .order('created_at', { ascending: false });

      const items: PointBreakdownItem[] = [];

      const directReferrals = (referrals || []).filter(r => !r.referred_by_lead_id);
      const chainReferrals = (referrals || []).filter(r => !!r.referred_by_lead_id);

      // +10 pts for each DIRECT referral (chain referrals don't give +10 to barber)
      directReferrals.forEach((ref) => {
        items.push({
          label: `Indicação direta: ${ref.lead_name}`,
          points: 10,
          type: 'referral',
          date: ref.created_at,
        });
      });

      // Conversion points for all referrals
      (referrals || []).forEach((ref) => {
        if (ref.converted_plan_id && (ref.status === 'converted' || ref.is_client)) {
          const plan = getPlanById(ref.converted_plan_id);
          if (plan) {
            const isChain = !!ref.referred_by_lead_id;
            const pts = isChain ? Math.round(plan.points * 0.3) : plan.points;
            items.push({
              label: `Conversão: ${ref.lead_name} (${plan.label})${isChain ? ' • 30%' : ''}`,
              points: pts,
              type: isChain ? 'chain' : 'conversion',
              date: ref.created_at,
            });
          }
        }
      });

      // Show chain referrals as info (0 pts to barber for registration)
      if (chainReferrals.length > 0) {
        items.push({
          label: `Indicações via cliente (${chainReferrals.length} leads) — sem bônus`,
          points: 0,
          type: 'chain',
          date: chainReferrals[0]?.created_at || new Date().toISOString(),
        });
      }

      // Calculate residual points not accounted for in breakdown
      const calculatedTotal = items.reduce((sum, i) => sum + i.points, 0);
      if (actualLifetime > calculatedTotal) {
        items.push({
          label: 'Outros pontos (ajustes, bônus manuais, etc.)',
          points: actualLifetime - calculatedTotal,
          type: 'referral',
          date: new Date().toISOString(),
        });
      }

      setBreakdowns(prev => ({ ...prev, [profileId]: items }));
    } catch (err) {
      console.error('Error loading breakdown:', err);
    }
    setLoadingBreakdown(null);
  };

  const toggleClientBreakdown = async (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      return;
    }
    setExpandedClientId(clientId);

    if (clientBreakdowns[clientId]) return;

    setLoadingClientBreakdown(clientId);
    try {
      // Get the client's own referral to know their total lead_points
      const { data: clientReferral } = await supabase
        .from('referrals')
        .select('lead_points')
        .eq('id', clientId)
        .single();

      const actualPoints = clientReferral?.lead_points || 0;

      // Get referrals made BY this client AND redemptions in parallel
      const [referralsResult, redemptionsResult] = await Promise.all([
        supabase
          .from('referrals')
          .select('id, lead_name, lead_points, status, is_client, converted_plan_id, created_at')
          .eq('referred_by_lead_id', clientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('redemptions')
          .select('id, description, points, status, created_at')
          .eq('referral_id', clientId)
          .order('created_at', { ascending: false }),
      ]);

      const referrals = referralsResult.data || [];
      const redemptions = redemptionsResult.data || [];

      const items: PointBreakdownItem[] = [];
      let conversionPointsTotal = 0;

      referrals.forEach((ref) => {
        if (ref.converted_plan_id && (ref.status === 'converted' || ref.is_client)) {
          const plan = getPlanById(ref.converted_plan_id);
          if (plan) {
            conversionPointsTotal += plan.points;
            items.push({
              label: `Conversão: ${ref.lead_name} (${plan.label})`,
              points: plan.points,
              type: 'conversion',
              date: ref.created_at,
            });
          }
        }
      });

      // Registration bonus = actual lead_points minus conversion points (+ redeemed points back)
      const approvedRedemptionPoints = redemptions
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.points, 0);
      const registrationBonus = actualPoints - conversionPointsTotal + approvedRedemptionPoints;
      if (registrationBonus > 0) {
        const totalReferrals = referrals.length;
        items.push({
          label: `Bônus de indicações (${totalReferrals} leads indicados)`,
          points: registrationBonus,
          type: 'referral',
          date: referrals[referrals.length - 1]?.created_at || new Date().toISOString(),
        });
      }

      // Add redemption history
      redemptions.forEach((r) => {
        const statusLabel = r.status === 'approved' ? '✓' : r.status === 'rejected' ? '✗' : '⏳';
        items.push({
          label: `${statusLabel} Resgate: ${r.description}`,
          points: -(r.status === 'approved' ? r.points : 0),
          type: 'redemption',
          date: r.created_at,
        });
      });

      setClientBreakdowns(prev => ({ ...prev, [clientId]: items }));
    } catch (err) {
      console.error('Error loading client breakdown:', err);
    }
    setLoadingClientBreakdown(null);
  };

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

  const BreakdownList = ({ items, isLoading }: { items?: PointBreakdownItem[]; isLoading: boolean }) => (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="overflow-hidden"
    >
      <div className="pt-3 mt-3 border-t border-border/30 space-y-1.5">
        {isLoading ? (
          <div className="text-xs text-muted-foreground animate-pulse py-2 text-center">Carregando detalhes...</div>
        ) : !items || items.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2 text-center">Nenhuma movimentação encontrada</div>
        ) : (
          <>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-secondary/40 transition-colors">
                <div className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center shrink-0',
                  item.type === 'referral' ? 'bg-info/15' : item.type === 'chain' ? 'bg-warning/15' : item.type === 'redemption' ? 'bg-destructive/15' : 'bg-success/15'
                )}>
                  {item.type === 'referral' ? (
                    <UserPlus className="h-3 w-3 text-info" />
                  ) : item.type === 'chain' ? (
                    <ArrowRightLeft className="h-3 w-3 text-warning" />
                  ) : item.type === 'redemption' ? (
                    <Gift className="h-3 w-3 text-destructive" />
                  ) : (
                    <Star className="h-3 w-3 text-success" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                    {item.type === 'chain' && ' • 30% comissão'}
                  </p>
                </div>
                <span className={cn(
                  'text-xs font-bold shrink-0',
                  item.points === 0 ? 'text-muted-foreground' :
                  item.type === 'redemption' ? 'text-destructive' :
                  item.type === 'referral' ? 'text-info' : item.type === 'chain' ? 'text-warning' : 'text-success'
                )}>
                  {item.points === 0 ? '—' : item.points < 0 ? `${item.points}` : `+${item.points}`}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/20 px-2">
              <p className="text-xs font-semibold text-muted-foreground">Total</p>
              <span className="text-xs font-bold text-primary">
                {items.reduce((sum, i) => sum + i.points, 0)} pts
              </span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );

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
              'p-4 rounded-xl transition-all cursor-pointer',
              isHighlighted(profile.id)
                ? 'bg-warning/10 border-2 border-warning/40 ring-1 ring-warning/20'
                : index === 0
                  ? 'bg-primary/8 border border-primary/20'
                  : 'bg-secondary/30 border border-border/30',
              expandedId === profile.id && 'border-primary/30'
            )}
            onClick={() => toggleBreakdown(profile.id)}
          >
            <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={cn('text-xl font-bold', index === 0 ? 'gold-text' : 'text-foreground')}>
                    {profile.lifetime_points}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
                </div>
                <ChevronDown className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  expandedId === profile.id && 'rotate-180'
                )} />
              </div>
            </div>

            <AnimatePresence>
              {expandedId === profile.id && (
                <BreakdownList
                  items={breakdowns[profile.id]}
                  isLoading={loadingBreakdown === profile.id}
                />
              )}
            </AnimatePresence>
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
              'p-4 rounded-xl transition-all cursor-pointer',
              index === 0
                ? 'bg-primary/8 border border-primary/20'
                : 'bg-secondary/30 border border-border/30',
              expandedClientId === entry.clientId && 'border-primary/30'
            )}
            onClick={() => toggleClientBreakdown(entry.clientId)}
          >
            <div className="flex items-center justify-between">
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
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{entry.referralCount} indicações</p>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <p className="text-xs text-success flex items-center gap-0.5">
                      <Wallet className="h-3 w-3" />
                      {entry.points} pts resgatáveis
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={cn('text-xl font-bold', index === 0 ? 'gold-text' : 'text-foreground')}>
                    {entry.points}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pontos</p>
                </div>
                <ChevronDown className={cn(
                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                  expandedClientId === entry.clientId && 'rotate-180'
                )} />
              </div>
            </div>

            <AnimatePresence>
              {expandedClientId === entry.clientId && (
                <BreakdownList
                  items={clientBreakdowns[entry.clientId]}
                  isLoading={loadingClientBreakdown === entry.clientId}
                />
              )}
            </AnimatePresence>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={Trophy}
          title="Ranking"
          gradientTitle
          subtitle="Classificação baseada em pontos históricos (lifetime)"
        />

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