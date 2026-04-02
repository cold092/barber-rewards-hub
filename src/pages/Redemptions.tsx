import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Gift,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Coins,
  History,
  Send,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getRedemptions,
  createRedemption,
  approveRedemption,
  rejectRedemption,
  type Redemption,
} from '@/services/redemptionService';

export default function Redemptions() {
  const { user, profile, isAdmin } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin review
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Profile names cache
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    const data = await getRedemptions();
    setRedemptions(data);

    // Load profile names for display
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
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const result = await approveRedemption(id, adminNote.trim() || undefined);
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
    const result = await rejectRedemption(id, adminNote.trim());
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

  const myRedemptions = redemptions.filter(r => r.user_id === user?.id);
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const allSorted = [...redemptions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
                Solicite e acompanhe seus resgates de pontos
              </p>
            </div>
          </div>
          <Button
            className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity"
            onClick={() => setShowNewDialog(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Resgate</span>
          </Button>
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
                    <p className="text-sm text-muted-foreground font-medium">Saldo disponível</p>
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
        <Tabs defaultValue={isAdmin ? 'pending' : 'my'}>
          <TabsList className="glass-card p-1 h-auto gap-1">
            <TabsTrigger value="my" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5">
              <History className="h-4 w-4" />
              Meus Resgates
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

          {/* My Redemptions */}
          <TabsContent value="my" className="mt-4">
            <RedemptionList
              items={myRedemptions}
              statusConfig={statusConfig}
              profileNames={profileNames}
              showUser={false}
            />
          </TabsContent>

          {/* Pending (admin) */}
          {isAdmin && (
            <TabsContent value="pending" className="mt-4">
              <RedemptionList
                items={pendingRedemptions}
                statusConfig={statusConfig}
                profileNames={profileNames}
                showUser
                onReview={(id) => { setReviewingId(id); setAdminNote(''); }}
              />
            </TabsContent>
          )}

          {/* All (admin) */}
          {isAdmin && (
            <TabsContent value="all" className="mt-4">
              <RedemptionList
                items={allSorted}
                statusConfig={statusConfig}
                profileNames={profileNames}
                showUser
              />
            </TabsContent>
          )}
        </Tabs>

        {/* New Redemption Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="glass-card border-border/40 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Solicitar Resgate
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
                <Coins className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm">
                  Saldo disponível: <span className="font-bold text-primary">{profile?.wallet_balance || 0} pts</span>
                </p>
              </div>

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
                  max={profile?.wallet_balance || 0}
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
                Enviar solicitação
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
              return (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-secondary/30 border border-border/30 space-y-2">
                    <p className="text-sm font-semibold">{profileNames[r.profile_id] || 'Usuário'}</p>
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

// Reusable list component
function RedemptionList({
  items,
  statusConfig,
  profileNames,
  showUser,
  onReview,
}: {
  items: Redemption[];
  statusConfig: Record<string, { label: string; icon: any; className: string }>;
  profileNames: Record<string, string>;
  showUser: boolean;
  onReview?: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Card className="glass-card border-border/30">
        <CardContent className="p-8 text-center">
          <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum resgate encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((r, i) => {
          const config = statusConfig[r.status];
          const StatusIcon = config.icon;
          return (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="glass-card rounded-xl p-4 border border-border/30 hover:border-border/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  {showUser && (
                    <p className="text-xs font-semibold text-primary">
                      {profileNames[r.profile_id] || 'Usuário'}
                    </p>
                  )}
                  <p className="text-sm font-medium">{r.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-bold text-primary">{r.points} pts</span>
                    <Badge variant="outline" className={cn('gap-1 text-[10px]', config.className)}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString('pt-BR')}
                    {r.approved_by && ` • ${r.status === 'approved' ? 'Aprovado' : 'Rejeitado'} por ${profileNames[r.approved_by] || 'Admin'}`}
                  </p>
                  {r.admin_note && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-secondary/40 border border-border/20">
                      <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{r.admin_note}</p>
                    </div>
                  )}
                </div>
                {onReview && r.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                    onClick={() => onReview(r.id)}
                  >
                    Avaliar
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
