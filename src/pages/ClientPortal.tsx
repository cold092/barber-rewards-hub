import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Wallet, Gift, Users, LogOut, Trophy, Clock, CheckCircle2,
  XCircle, Star, UserPlus, Loader2, Phone, User, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getPlanById } from '@/config/plans';
import { registerLeadByLead } from '@/services/referralService';
import { isValidPhone } from '@/utils/whatsapp';
import { REFERRAL_BONUS_POINTS } from '@/config/plans';
import type { Redemption } from '@/services/redemptionService';

interface ClientReferral {
  id: string;
  lead_name: string;
  lead_phone: string;
  lead_points: number;
  status: string;
  is_client: boolean;
}

interface RewardItem {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  image_url: string | null;
}

export default function ClientPortal() {
  const { user, signOut, role } = useAuth();
  const [referral, setReferral] = useState<any>(null);
  const [myReferrals, setMyReferrals] = useState<ClientReferral[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendPhone, setNewFriendPhone] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);
  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get my linked referral
      const { data: myRef } = await supabase
        .from('referrals')
        .select('*')
        .eq('client_user_id', user!.id)
        .maybeSingle();

      setReferral(myRef);

      if (myRef) {
        // Load referrals I made, my redemptions, and available rewards in parallel
        const [refResult, redResult, rewardResult] = await Promise.all([
          supabase
            .from('referrals')
            .select('id, lead_name, lead_phone, lead_points, status, is_client')
            .eq('referred_by_lead_id', myRef.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('redemptions')
            .select('*')
            .eq('referral_id', myRef.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('reward_catalog')
            .select('id, name, description, points_cost, image_url')
            .eq('active', true)
            .order('points_cost', { ascending: true }),
        ]);

        setMyReferrals((refResult.data || []) as ClientReferral[]);
        setRedemptions((redResult.data || []) as unknown as Redemption[]);
        setRewards((rewardResult.data || []) as RewardItem[]);
      }
    } catch (err) {
      console.error('Error loading client data:', err);
    }
    setLoading(false);
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (!referral || !user) return;
    if (referral.lead_points < reward.points_cost) {
      toast.error('Saldo insuficiente para este prêmio');
      return;
    }

    setRedeeming(true);
    try {
      const { error } = await supabase.from('redemptions').insert({
        organization_id: referral.organization_id,
        profile_id: referral.referrer_id,
        user_id: user.id,
        referral_id: referral.id,
        description: reward.name,
        points: reward.points_cost,
      } as any);

      if (error) throw error;
      toast.success('Solicitação de resgate enviada! Aguarde aprovação.');
      loadData();
    } catch (err) {
      console.error('Redeem error:', err);
      toast.error('Erro ao solicitar resgate');
    }
    setRedeeming(false);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/cliente';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Cadastro não vinculado</h2>
            <p className="text-sm text-muted-foreground">
              Sua conta não está vinculada a nenhum cadastro de cliente. Fale com sua barbearia para resolver.
            </p>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const balance = referral.lead_points;
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const historyRedemptions = redemptions.filter(r => r.status !== 'pending');

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]"><XCircle className="h-3 w-3 mr-1" />Recusado</Badge>;
      default:
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-success/15">
              <Trophy className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold text-sm">{referral.lead_name}</p>
              <p className="text-[10px] text-muted-foreground">Portal do Cliente</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs">
            <LogOut className="h-4 w-4 mr-1.5" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-success/10 via-card to-card border-success/20 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Saldo disponível</p>
                  <p className="text-4xl font-bold text-success mt-1">{balance}</p>
                  <p className="text-xs text-muted-foreground mt-1">pontos resgatáveis</p>
                </div>
                <div className="p-4 rounded-2xl bg-success/15">
                  <Wallet className="h-8 w-8 text-success" />
                </div>
              </div>
              {pendingRedemptions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-success/20">
                  <p className="text-xs text-warning flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {pendingRedemptions.length} resgate(s) pendente(s) de aprovação
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
            <TabsTrigger value="rewards" className="text-xs py-2">
              <Gift className="h-3.5 w-3.5 mr-1.5" /> Prêmios
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs py-2">
              <Clock className="h-3.5 w-3.5 mr-1.5" /> Resgates
            </TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs py-2">
              <Users className="h-3.5 w-3.5 mr-1.5" /> Indicações
            </TabsTrigger>
          </TabsList>

          {/* Rewards Catalog */}
          <TabsContent value="rewards" className="mt-4">
            <div className="space-y-3">
              {rewards.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum prêmio disponível no momento</p>
              ) : (
                rewards.map((reward) => (
                  <Card key={reward.id} className="border-border/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Gift className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{reward.name}</p>
                          {reward.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{reward.description}</p>
                          )}
                          <p className="text-xs font-bold text-primary mt-1">{reward.points_cost} pts</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={balance < reward.points_cost || redeeming}
                        onClick={() => handleRedeem(reward)}
                        className={cn(
                          'text-xs',
                          balance >= reward.points_cost
                            ? 'bg-success hover:bg-success/90 text-success-foreground'
                            : ''
                        )}
                      >
                        Resgatar
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Redemption History */}
          <TabsContent value="history" className="mt-4">
            <div className="space-y-3">
              {redemptions.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">Nenhum resgate realizado ainda</p>
              ) : (
                redemptions.map((r) => (
                  <Card key={r.id} className="border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{r.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(r.created_at).toLocaleDateString('pt-BR')}
                          </p>
                          {r.admin_note && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{r.admin_note}"</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-bold">{r.points} pts</p>
                          {statusBadge(r.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* My Referrals */}
          <TabsContent value="referrals" className="mt-4">
            <div className="space-y-3">
              {myReferrals.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Você ainda não fez nenhuma indicação</p>
                  <p className="text-xs text-muted-foreground mt-1">Indique amigos e ganhe pontos!</p>
                </div>
              ) : (
                myReferrals.map((ref) => (
                  <Card key={ref.id} className="border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg',
                            ref.is_client ? 'bg-success/10' : 'bg-info/10'
                          )}>
                            {ref.is_client ? (
                              <Star className="h-4 w-4 text-success" />
                            ) : (
                              <UserPlus className="h-4 w-4 text-info" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{ref.lead_name}</p>
                            <Badge variant="outline" className={cn(
                              'text-[10px] mt-1',
                              ref.is_client
                                ? 'bg-success/10 text-success border-success/30'
                                : 'bg-info/10 text-info border-info/30'
                            )}>
                              {ref.is_client ? 'Convertido' : ref.status === 'contacted' ? 'Em contato' : 'Novo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
