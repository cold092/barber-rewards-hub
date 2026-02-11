import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  UserCheck,
  TrendingUp,
  Star,
  Download,
  LayoutGrid,
  List,
  Menu,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllReferrals, confirmConversion, updateContactTag, deleteReferral } from '@/services/referralService';
import { addHistoryEvent, logWhatsAppContact } from '@/services/leadHistoryService';
import { getPlanById, getRewardPlans } from '@/config/plans';
import { generateWhatsAppLink, formatPhoneNumber } from '@/utils/whatsapp';
import { downloadCsv } from '@/utils/export';
import { KanbanBoard } from '@/components/leads/KanbanBoard';
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog';
import { ColumnManager } from '@/components/leads/ColumnManager';
import type { ColumnConfig } from '@/components/leads/ColumnManager';
import { GlobalTagFilter } from '@/components/filters/GlobalTagFilter';
import { useTagFilter } from '@/contexts/TagFilterContext';
import { useTagConfig } from '@/contexts/TagConfigContext';
import { TagSettingsDialog } from '@/components/settings/TagSettingsDialog';
import type { Referral, ReferralStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const CLIENT_COLUMNS_KEY = 'clientKanbanColumns';
const CLIENT_VIEW_MODE_KEY = 'clientsViewMode';

const DEFAULT_CLIENT_COLUMNS: ColumnConfig[] = [
  { id: 'clients', title: 'Clientes', color: 'bg-success/10', isDefault: true },
];

const ensureClientColumn = (columns: ColumnConfig[]): ColumnConfig[] => {
  const hasClientsColumn = columns.some((column) => column.id === 'clients');
  if (hasClientsColumn) {
    return columns.map((column) =>
      column.id === 'clients'
        ? { ...column, title: 'Clientes', isDefault: true }
        : column
    );
  }

  return [...DEFAULT_CLIENT_COLUMNS, ...columns];
};

type ClientViewMode = 'kanban' | 'list';

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
  const [viewMode, setViewMode] = useState<ClientViewMode>(() => {
    const saved = localStorage.getItem(CLIENT_VIEW_MODE_KEY);
    return saved === 'list' ? 'list' : 'kanban';
  });
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(CLIENT_COLUMNS_KEY);
    return saved ? ensureClientColumn(JSON.parse(saved)) : DEFAULT_CLIENT_COLUMNS;
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

  // Filter by active tags
  const filteredReferrals = activeTags.length > 0
    ? referrals.filter(r => r.contact_tag && activeTags.includes(r.contact_tag))
    : referrals;

  const handleViewModeChange = (mode: ClientViewMode) => {
    setViewMode(mode);
    localStorage.setItem(CLIENT_VIEW_MODE_KEY, mode);
  };

  const handleColumnsChange = (nextColumns: ColumnConfig[]) => {
    const normalizedColumns = ensureClientColumn(nextColumns);
    setColumns(normalizedColumns);
    localStorage.setItem(CLIENT_COLUMNS_KEY, JSON.stringify(normalizedColumns));
  };

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

  const handleContact = async (_referral: Referral) => {
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

  const handleColumnChange = async (referralId: string, columnId: string) => {
    const referral = referrals.find((item) => item.id === referralId);
    if (!referral) return;

    const nextTag = columnId === 'clients' ? null : columnId;

    if (referral.contact_tag === nextTag) return;

    const result = await updateContactTag(referralId, nextTag);
    if (!result.success) {
      toast.error(result.error || 'Erro ao atualizar coluna do cliente');
      return;
    }

    await addHistoryEvent({
      referralId,
      eventType: 'tag_change',
      eventData: { tag: nextTag || 'none', previous_tag: referral.contact_tag },
      createdById: user?.id,
      createdByName: profile?.name,
    });

    setReferrals((prev) =>
      prev.map((item) =>
        item.id === referralId ? { ...item, contact_tag: nextTag } : item
      )
    );

    toast.success('Cliente movido de coluna');
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

  const handleExport = () => {
    const rows = [
      ['Nome', 'Telefone', 'Status', 'Tag', 'Plano', 'Pontos', 'Indicado por', 'Data de cadastro'],
      ...filteredReferrals.map((referral) => [
        referral.lead_name,
        referral.lead_phone,
        referral.status,
        referral.contact_tag || 'Sem tag',
        referral.converted_plan_id || '-',
        referral.lead_points,
        referral.referrer_name,
        new Date(referral.created_at).toLocaleDateString('pt-BR'),
      ]),
    ];
    downloadCsv(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success('CSV exportado com sucesso');
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/50 bg-secondary/50 p-0.5">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-8 px-3 gap-1.5 text-xs", viewMode === 'kanban' && "lavender-gradient text-primary-foreground shadow-sm")}
                onClick={() => handleViewModeChange('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className={cn("h-8 px-3 gap-1.5 text-xs", viewMode === 'list' && "lavender-gradient text-primary-foreground shadow-sm")}
                onClick={() => handleViewModeChange('list')}
              >
                <List className="h-3.5 w-3.5" />
                Lista
              </Button>
            </div>

            <ColumnManager columns={columns} onColumnsChange={handleColumnsChange} />

            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>

            {isAdmin && (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs">
                      <Menu className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Config</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTagSettingsOpen(true)}>
                      Configurar Tags
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
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

        {viewMode === 'kanban' && (
          <KanbanBoard
            referrals={filteredReferrals}
            onStatusChange={handleStatusChange}
            onColumnChange={handleColumnChange}
            onOpenDetails={openDetailsDialog}
            onWhatsApp={openWhatsApp}
            isAdmin={isAdmin}
            contactTagOptions={contactTagOptions}
            customColumns={columns}
            onColumnsReorder={handleColumnsChange}
          />
        )}

        {viewMode === 'list' && (
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Clientes ({filteredReferrals.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredReferrals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
              ) : (
                <div className="space-y-4">
                  {filteredReferrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="p-4 rounded-lg bg-secondary/50 space-y-3 cursor-pointer hover:bg-secondary/70 transition-colors"
                      onClick={() => openDetailsDialog(referral)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-lg">{referral.lead_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhoneNumber(referral.lead_phone)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Cadastrado em {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                            Cliente
                          </Badge>
                          {referral.contact_tag && (
                            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                              {contactTagOptions.find((option) => option.value === referral.contact_tag)?.label || referral.contact_tag}
                            </Badge>
                          )}
                          {referral.converted_plan_id && (
                            <Badge variant="outline" className="bg-accent/15 text-accent border-accent/30">
                              {getPlanById(referral.converted_plan_id)?.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
