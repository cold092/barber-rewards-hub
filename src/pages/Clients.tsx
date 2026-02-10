import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserCheck,
  Sparkles,
  TrendingUp,
  Calendar,
  Star,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllReferrals, confirmConversion, updateContactTag, undoConversion, deleteReferral } from '@/services/referralService';
import { addHistoryEvent, logWhatsAppContact } from '@/services/leadHistoryService';
import { getPlanById, getRewardPlans } from '@/config/plans';
import { DEFAULT_CLIENT_MESSAGE, generateWhatsAppLink, formatPhoneNumber } from '@/utils/whatsapp';
import { KanbanBoard } from '@/components/leads/KanbanBoard';
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog';
import { ColumnManager, type ColumnConfig } from '@/components/leads/ColumnManager';
import { GlobalTagFilter } from '@/components/filters/GlobalTagFilter';
import { useTagFilter } from '@/contexts/TagFilterContext';
import { useTagConfig } from '@/contexts/TagConfigContext';
import { TagSettingsDialog } from '@/components/settings/TagSettingsDialog';
import type { Referral, ReferralStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const CLIENT_COLUMNS_KEY = 'clientKanbanColumns';

const DEFAULT_CLIENT_COLUMNS: ColumnConfig[] = [
  { id: 'active', title: 'Ativos', color: 'bg-success/10', isDefault: true },
  { id: 'vip', title: 'VIP', color: 'bg-primary/10', isDefault: true },
  { id: 'inactive', title: 'Inativos', color: 'bg-muted', isDefault: true },
];

export default function Clients() {
  const { isAdmin, isBarber, profile, user } = useAuth();
  const { activeTags } = useTagFilter();
  const { tags: contactTagOptions } = useTagConfig();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingReferral, setConvertingReferral] = useState<Referral | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [converting, setConverting] = useState(false);
  const [tagSettingsOpen, setTagSettingsOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(CLIENT_COLUMNS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_CLIENT_COLUMNS;
  });

  const loadReferrals = async () => {
    setLoading(true);
    const result = await getAllReferrals();
    const data = result.data;
    const filtered = isBarber && profile ? data.filter(item => item.referrer_id === profile.id) : data;
    // Only clients
    const clients = filtered.filter(r => r.is_client || r.status === 'converted');
    setReferrals(clients);
    setLoading(false);
  };

  useEffect(() => { loadReferrals(); }, [isBarber, profile]);

  const handleColumnsChange = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    localStorage.setItem(CLIENT_COLUMNS_KEY, JSON.stringify(newColumns));
  };

  // Filter by active tags
  const filteredReferrals = activeTags.length > 0
    ? referrals.filter(r => r.contact_tag && activeTags.includes(r.contact_tag))
    : referrals;

  const openDetailsDialog = (referral: Referral) => {
    setSelectedReferral(referral);
    setDetailsDialogOpen(true);
  };

  const openConvertDialog = (referral: Referral) => {
    setConvertingReferral(referral);
    setSelectedPlan('');
    setConvertDialogOpen(true);
    setDetailsDialogOpen(false);
  };

  const CLIENT_MESSAGE_STORAGE_KEY = 'clientMessageTemplate';
  const clientMessageTemplate = localStorage.getItem(CLIENT_MESSAGE_STORAGE_KEY) || 'Olá {leadName}, tudo bem?';

  const openWhatsApp = async (referral: Referral) => {
    const link = generateWhatsAppLink(referral.lead_name, referral.lead_phone, referral.referrer_name, clientMessageTemplate);
    await logWhatsAppContact(referral.id, user?.id, profile?.name);
    window.open(link, '_blank');
  };

  const handleTagChange = async (referral: Referral, value: string) => {
    const nextTag = value === 'none' ? null : value;
    const result = await updateContactTag(referral.id, nextTag);
    if (result.success) {
      await addHistoryEvent({
        referralId: referral.id,
        eventType: 'tag_change',
        eventData: { tag: nextTag || 'none', previous_tag: referral.contact_tag },
        createdById: user?.id,
        createdByName: profile?.name,
      });
      setReferrals(prev => prev.map(item => item.id === referral.id ? { ...item, contact_tag: nextTag } : item));
      toast.success('Tag atualizada');
    } else {
      toast.error(result.error || 'Erro ao atualizar tag');
    }
  };

  const handleDelete = async (referral: Referral) => {
    if (!window.confirm(`Excluir o cliente "${referral.lead_name}"?`)) return;
    const result = await deleteReferral(referral.id);
    if (result.success) {
      toast.success('Cliente excluído');
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }
  };

  const handleContact = async (referral: Referral) => {
    // no-op for clients already converted
  };

  const handleStatusChange = async (referralId: string, newStatus: ReferralStatus) => {
    // For clients, status changes are visual-only in the kanban
    const { error } = await supabase.from('referrals').update({ status: newStatus }).eq('id', referralId);
    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }
    toast.success('Status atualizado');
    loadReferrals();
  };

  const handleConvert = async () => {
    if (!convertingReferral || !selectedPlan) return;
    setConverting(true);
    const result = await confirmConversion(convertingReferral.id, selectedPlan);
    setConverting(false);
    if (result.success) {
      const plan = getPlanById(selectedPlan);
      await addHistoryEvent({
        referralId: convertingReferral.id,
        eventType: 'conversion',
        eventData: { plan_id: selectedPlan, plan_label: plan?.label, points_awarded: result.pointsAwarded },
        createdById: user?.id,
        createdByName: profile?.name,
      });
      toast.success(`Conversão confirmada! +${result.pointsAwarded} pontos`);
      setConvertDialogOpen(false);
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao confirmar conversão');
    }
  };

  const rewardPlans = getRewardPlans();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalClients = referrals.length;
  const vipCount = referrals.filter(r => r.contact_tag === 'sql').length;
  const avgPoints = totalClients > 0 ? Math.round(referrals.reduce((a, b) => a + b.lead_points, 0) / totalClients) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/20">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">
                  <span className="lavender-text">Clientes</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie sua base de clientes convertidos
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setTagSettingsOpen(true)}>
              Tags
            </Button>
            <ColumnManager columns={columns} onColumnsChange={handleColumnsChange} />
          </div>
        </div>

        {/* Global Tag Filter */}
        <GlobalTagFilter tagOptions={contactTagOptions} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass-card border-success/20 hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
                  <UserCheck className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{totalClients}</p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/20 hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{vipCount}</p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">SQL/VIP</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-accent/20 hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{avgPoints}</p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Média pts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          referrals={filteredReferrals}
          onStatusChange={handleStatusChange}
          onOpenDetails={openDetailsDialog}
          onWhatsApp={openWhatsApp}
          isAdmin={isAdmin}
          contactTagOptions={contactTagOptions}
          customColumns={columns}
        />
      </div>

      {/* Dialogs */}
      <LeadDetailsDialog
        referral={selectedReferral}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onWhatsApp={openWhatsApp}
        onContact={handleContact}
        onConvert={openConvertDialog}
        onTagChange={handleTagChange}
        onDelete={handleDelete}
        onUpdate={loadReferrals}
        isAdmin={isAdmin}
        userId={user?.id}
        userName={profile?.name}
        contactTagOptions={contactTagOptions}
      />

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar Conversão</DialogTitle>
            <DialogDescription>Selecione o plano para {convertingReferral?.lead_name}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(rewardPlans).map(([id, plan]) => (
                  <SelectItem key={id} value={id}>
                    {plan.label} — +{plan.points} pts
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPlan && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">{convertingReferral?.referrer_name} receberá:</p>
                <p className="text-2xl font-bold text-primary">+{getPlanById(selectedPlan)?.points} pontos</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>Cancelar</Button>
            <Button className="lavender-gradient text-primary-foreground" onClick={handleConvert} disabled={!selectedPlan || converting}>
              {converting ? 'Confirmando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TagSettingsDialog open={tagSettingsOpen} onOpenChange={setTagSettingsOpen} />
    </DashboardLayout>
  );
}
