import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Gift, Plus, CheckCircle, XCircle, Clock, Coins,
  History, Send, MessageSquare, ShoppingBag, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getRedemptions, createRedemption, approveRedemption, rejectRedemption,
  createClientRedemption, approveClientRedemption, rejectClientRedemption,
  type Redemption,
} from '@/services/redemptionService';
import { getRewardCatalog, getAllRewardCatalog, type RewardItem } from '@/services/rewardCatalogService';
import RedemptionList from '@/components/redemptions/RedemptionList';
import RewardCatalog from '@/components/redemptions/RewardCatalog';

interface ClientOption {
  id: string;
  name: string;
  wallet_balance: number;
}

export default function Redemptions() {
  const { user, profile, isAdmin } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [catalogItems, setCatalogItems] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redeemMode, setRedeemMode] = useState<'self' | 'client'>('self');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    const [data, catalog] = await Promise.all([
      getRedemptions(),
      isAdmin ? getAllRewardCatalog() : getRewardCatalog(),
    ]);
    setRedemptions(data);
    setCatalogItems(catalog);

    // Load profile names
    const profileIds = [...new Set(data.map(r => r.profile_id))];
    const approverIds = [...new Set(data.filter(r => r.approved_by).map(r => r.approved_by!))];
    const allIds = [...new Set([...profileIds, ...approverIds])];

    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', allIds);
      if (profiles) {
        const names: Record<string, string> = {};
        profiles.forEach(p => { names[p.id] = p.name; });
        setProfileNames(names);
      }
    }

    // Load client names for client redemptions
    const clientIds = [...new Set(data.filter(r => r.referral_id).map(r => r.referral_id!))];
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);
      if (clientsData) {
        const names: Record<string, string> = {};
        clientsData.forEach(c => { names[c.id] = c.name; });
        setClientNames(names);
      }
    }

    // Load all clients for the selector
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, name, wallet_balance')
      .order('name');
    if (allClients) {
      setClients(allClients as unknown as ClientOption[]);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    if (!description.trim() || !points.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    const pts = parseInt(points);
    if (!pts || pts <= 0) {
      toast.error('Pontos devem ser maior que zero');
      return;
    }

    if (redeemMode === 'client') {
      if (!selectedClientId) {
        toast.error('Selecione um cliente');
        return;
      }
      const client = clients.find(c => c.id === selectedClientId);
      if (client && pts > client.wallet_balance) {
        toast.error('Saldo insuficiente do cliente');
        return;
      }
      setSubmitting(true);
      const result = await createClientRedemption({
        organization_id: profile?.organization_id || '',
        client_id: selectedClientId,
        description: description.trim(),
        points: pts,
      });
      if (result.success) {
        toast.success('Resgate do cliente registrado!');
        setShowNewDialog(false);
        setDescription('');
        setPoints('');
        setSelectedClientId('');
        loadData();
      } else {
        toast.error(result.error || 'Erro ao registrar resgate');
      }
      setSubmitting(false);
    } else {
      if (profile && pts > profile.wallet_balance) {
        toast.error('Saldo insuficiente');
        return;
      }
      setSubmitting(true);
      const result = await createRedemption({
        organization_id: profile?.organization_id || '',
        profile_id: profile?.id || '',
        user_id: user?.id || '',
        description: description.trim(),
        points: pts,
      });
      if (result.success) {
        toast.success('Solicitação de resgate enviada!');
        setShowNewDialog(false);
        setDescription('');
        setPoints('');
        loadData();
      } else {
        toast.error(result.error || 'Erro ao solicitar resgate');
      }
      setSubmitting(false);
    }
  };

  const handleCatalogRedeem = (item: RewardItem) => {
    setRedeemMode('self');
    setDescription(item.name);
    setPoints(String(item.points_cost));
    setShowNewDialog(true);
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const redemption = redemptions.find(r => r.id === id);
    const isClientRedemption = !!redemption?.referral_id;
    const fn = isClientRedemption ? approveClientRedemption : approveRedemption;
    const result = await fn(id, adminNote.trim() || undefined);
    if (result.success) {
      toast.success('Resgate aprovado!');
      setReviewingId(null);
      setAdminNote('');
      loadData();
    } else {
      toast.error(result.error || 'Erro ao aprovar');
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!adminNote.trim()) {
      toast.error('Adicione um motivo para a rejeição');
      return;
    }
    setProcessingId(id);
    const redemption = redemptions.find(r => r.id === id);
    const isClientRedemption = !!redemption?.referral_id;
    const fn = isClientRedemption ? rejectClientRedemption : rejectRedemption;
    const result = await fn(id, adminNote.trim());
    if (result.success) {
      toast.success('Resgate rejeitado');
      setReviewingId(null);
      setAdminNote('');
      loadData();
    } else {
      toast.error(result.error || 'Erro ao rejeitar');
    }
    setProcessingId(null);
  };

  const statusConfig = {
    pending: { label: 'Pendente', icon: Clock, className: 'bg-warning/15 text-warning border-warning/25' },
    approved: { label: 'Aprovado', icon: CheckCircle, className: 'bg-success/15 text-success border-success/25' },
    rejected: { label: 'Rejeitado', icon: XCircle, className: 'bg-destructive/15 text-destructive border-destructive/25' },
  };

  const getDisplayName = (r: Redemption) => {
    if (r.referral_id) return clientNames[r.referral_id] || 'Cliente';
    return profileNames[r.profile_id] || 'Usuário';
  };

  const myRedemptions = redemptions.filter(r => r.user_id === user?.id && !r.referral_id);
  const clientRedemptions = redemptions.filter(r => !!r.referral_id);
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const allSorted = [...redemptions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Merge profile + client names for the list component
  const allNames = { ...profileNames, ...Object.fromEntries(
    Object.entries(clientNames).map(([k, v]) => [k, v])
  )};

  const selectedClient = clients.find(c => c.id === selectedClientId);

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
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl lavender-gradient lavender-glow">
              <Gift className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
                <span className="lavender-text">Resgates</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Escolha prêmios do catálogo ou solicite resgates personalizados
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 border-primary/30 hover:bg-primary/10"
              onClick={() => { setRedeemMode('client'); setDescription(''); setPoints(''); setSelectedClientId(''); setShowNewDialog(true); }}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Resgate Cliente</span>
            </Button>
            <Button
              className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity"
              onClick={() => { setRedeemMode('self'); setDescription(''); setPoints(''); setShowNewDialog(true); }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Resgate Livre</span>
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="glass-card border-primary/20 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Coins className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Seu saldo disponível</p>
                    <p className="text-3xl font-bold text-primary">{profile?.wallet_balance || 0} <span className="text-base font-medium text-muted-foreground">pts</span></p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">Pontos totais (lifetime)</p>
                  <p className="text-lg font-semibold text-foreground">{profile?.lifetime_points || 0} pts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="catalog">
          <TabsList className="glass-card p-1 h-auto gap-1 flex-wrap">
            <TabsTrigger value="catalog" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5">
              <ShoppingBag className="h-4 w-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5">
              <History className="h-4 w-4" />
              Meus Resgates
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5">
              <Users className="h-4 w-4" />
              Clientes
              {clientRedemptions.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-warning/20 text-warning border-warning/30">
                  {clientRedemptions.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="pending" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5">
                  <Clock className="h-4 w-4" />
                  Pendentes
                  {pendingRedemptions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-warning/20 text-warning border-warning/30">
                      {pendingRedemptions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5">
                  <History className="h-4 w-4" />
                  Todos
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="catalog" className="mt-4">
            <RewardCatalog
              items={catalogItems}
              walletBalance={profile?.wallet_balance || 0}
              onRedeem={handleCatalogRedeem}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="my" className="mt-4">
            <RedemptionList items={myRedemptions} statusConfig={statusConfig} profileNames={profileNames} clientNames={{}} showUser={false} />
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <RedemptionList
              items={clientRedemptions}
              statusConfig={statusConfig}
              profileNames={profileNames}
              clientNames={clientNames}
              showUser
              onReview={isAdmin ? (id) => { setReviewingId(id); setAdminNote(''); } : undefined}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="pending" className="mt-4">
              <RedemptionList
                items={pendingRedemptions}
                statusConfig={statusConfig}
                profileNames={profileNames}
                clientNames={clientNames}
                showUser
                onReview={(id) => { setReviewingId(id); setAdminNote(''); }}
              />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="all" className="mt-4">
              <RedemptionList items={allSorted} statusConfig={statusConfig} profileNames={profileNames} clientNames={clientNames} showUser />
            </TabsContent>
          )}
        </Tabs>

        {/* New Redemption Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="glass-card border-border/40 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                {redeemMode === 'client' ? <Users className="h-5 w-5 text-primary" /> : <Gift className="h-5 w-5 text-primary" />}
                {redeemMode === 'client' ? 'Resgate para Cliente' : 'Solicitar Resgate'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {redeemMode === 'client' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Selecionar cliente</label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger className="bg-background/40 border-border/30">
                        <SelectValue placeholder="Escolha um cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.wallet_balance} pts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedClient && (
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
                      <Coins className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm">
                        Saldo do cliente: <span className="font-bold text-primary">{selectedClient.wallet_balance} pts</span>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
                  <Coins className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm">
                    Saldo disponível: <span className="font-bold text-primary">{profile?.wallet_balance || 0} pts</span>
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">O que deseja resgatar?</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Desconto de R$50 no próximo corte, produto X..."
                  className="min-h-[80px] bg-background/40 border-border/30 focus:border-primary/40 rounded-xl resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pontos a resgatar</label>
                <Input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Ex: 50"
                  className="h-10 bg-background/40 border-border/30 focus:border-primary/40"
                  min={1}
                  max={redeemMode === 'client' ? selectedClient?.wallet_balance || 0 : profile?.wallet_balance || 0}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)} className="border-border/40">
                Cancelar
              </Button>
              <Button
                className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Send className="h-4 w-4" />
                {redeemMode === 'client' ? 'Registrar resgate' : 'Enviar solicitação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Review Dialog */}
        <Dialog open={!!reviewingId} onOpenChange={() => setReviewingId(null)}>
          <DialogContent className="glass-card border-border/40 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Avaliar Resgate
              </DialogTitle>
            </DialogHeader>
            {reviewingId && (() => {
              const r = redemptions.find(x => x.id === reviewingId);
              if (!r) return null;
              const name = r.referral_id
                ? (clientNames[r.referral_id] || 'Cliente')
                : (profileNames[r.profile_id] || 'Usuário');
              const typeLabel = r.referral_id ? '(Cliente)' : '(Colaborador)';
              return (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
                    <p className="text-sm font-semibold">{name} <span className="text-xs text-muted-foreground font-normal">{typeLabel}</span></p>
                    <p className="text-sm text-muted-foreground">{r.description}</p>
                    <p className="text-lg font-bold text-primary">{r.points} pts</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Nota do admin (obrigatória para rejeição)
                    </label>
                    <Textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Motivo ou observação..."
                      className="min-h-[60px] bg-background/40 border-border/30 focus:border-primary/40 rounded-xl resize-none"
                    />
                  </div>
                </div>
              );
            })()}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => reviewingId && handleReject(reviewingId)}
                disabled={!!processingId}
              >
                <XCircle className="h-4 w-4" />
                Rejeitar
              </Button>
              <Button
                className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90"
                onClick={() => reviewingId && handleApprove(reviewingId)}
                disabled={!!processingId}
              >
                <CheckCircle className="h-4 w-4" />
                Aprovar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}