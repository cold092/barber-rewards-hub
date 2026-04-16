import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  UserCheck,
  TrendingUp,
  Star,
  Download,
  LayoutGrid,
  List,
  Settings2,
  Phone,
  UserPlus,
  Tag,
  Filter,
  MoreVertical,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllReferrals, confirmConversion, updateContactTag, deleteReferral } from '@/services/referralService';
import { addHistoryEvent, logWhatsAppContact } from '@/services/leadHistoryService';
import { getPlanById, getRewardPlans, getBarberReferralSharePoints } from '@/config/plans';
import { generateWhatsAppLink, formatPhoneNumber } from '@/utils/whatsapp';
import { downloadCsv } from '@/utils/export';
import { KanbanBoard } from '@/components/leads/KanbanBoard';
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog';
import { ColumnManager } from '@/components/leads/ColumnManager';
import type { ColumnConfig } from '@/components/leads/ColumnManager';
import { GlobalTagFilter } from '@/components/filters/GlobalTagFilter';
import { useTagFilter } from '@/contexts/TagFilterContext';
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import { useTagConfig } from '@/contexts/TagConfigContext';
import { TagSettingsDialog } from '@/components/settings/TagSettingsDialog';
import type { Referral, ReferralStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getSetting, upsertSetting } from '@/services/settingsService';
import { RegisterClientDialog } from '@/components/clients/RegisterClientDialog';

const CLIENT_VIEW_MODE_KEY = 'clientsViewMode';
const CLIENT_COLUMNS_KEY = 'clientColumns';

const DEFAULT_CLIENT_COLUMNS: ColumnConfig[] = [
  { id: 'clients', title: 'Clientes', color: 'bg-success/10', isDefault: true },
];

const parseClientColumns = (savedColumns: string | null): ColumnConfig[] => {
  if (!savedColumns) {
    return DEFAULT_CLIENT_COLUMNS;
  }

  try {
    const parsed = JSON.parse(savedColumns);
    return Array.isArray(parsed) ? parsed : DEFAULT_CLIENT_COLUMNS;
  } catch {
    localStorage.removeItem(CLIENT_COLUMNS_KEY);
    return DEFAULT_CLIENT_COLUMNS;
  }
};

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
  const { isAdmin: realIsAdmin, isBarber: realIsBarber, profile: realProfile, user } = useAuth();
  const { effectiveProfile, effectiveRole, isViewingAs, effectiveUserId } = useViewAs();
  
  // When viewing as someone, use their perspective
  const profile = isViewingAs ? effectiveProfile : realProfile;
  const isAdmin = isViewingAs ? (effectiveRole === 'admin' || effectiveRole === 'owner') : realIsAdmin;
  const isBarber = isViewingAs ? effectiveRole === 'barber' : realIsBarber;
  const isViewingAsBarber = isViewingAs && effectiveRole === 'barber';

  const { activeTags } = useTagFilter();
  const { activeStatuses: globalStatuses, activeTags: globalTags, activeCollaborator: globalCollaborator } = useGlobalFilter();
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
  const [registerClientOpen, setRegisterClientOpen] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ClientViewMode>(() => {
    const saved = localStorage.getItem(CLIENT_VIEW_MODE_KEY);
    return saved === 'list' ? 'list' : 'kanban';
  });
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    ensureClientColumn(parseClientColumns(localStorage.getItem(CLIENT_COLUMNS_KEY)))
  );

  const loadReferrals = async () => {
    setLoading(true);
    const result = await getAllReferrals();
    const data = result.data;
    const filtered = (isBarber || isViewingAsBarber) && profile ? data.filter(item => item.referrer_id === profile.id) : data;
    // Only clients
    const clients = filtered.filter(r => r.is_client || r.status === 'converted');
    setReferrals(clients);
    setLoading(false);
  };

  useEffect(() => { loadReferrals(); }, [isBarber, isViewingAsBarber, profile, isViewingAs, effectiveProfile]);

  const targetUserId = isViewingAs ? effectiveUserId : user?.id;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const localColumns = ensureClientColumn(parseClientColumns(localStorage.getItem(CLIENT_COLUMNS_KEY)));

      if (!targetUserId) {
        if (!cancelled) {
          setColumns(localColumns);
        }
        return;
      }

      const userColumns = await getSetting<ColumnConfig[]>(targetUserId, 'client_columns');
      if (cancelled) {
        return;
      }

      if (Array.isArray(userColumns) && userColumns.length > 0) {
        const normalized = ensureClientColumn(userColumns);
        setColumns(normalized);
        localStorage.setItem(CLIENT_COLUMNS_KEY, JSON.stringify(normalized));
        return;
      }

      setColumns(localColumns);
      if (!isViewingAs) {
        await upsertSetting(targetUserId, 'client_columns', localColumns);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Apply global filters first
  const globalFiltered = referrals.filter(r => {
    if (globalStatuses.length > 0 && !globalStatuses.includes(r.status)) return false;
    if (globalTags.length > 0 && !(r.tags || []).some(t => globalTags.includes(t))) return false;
    if (globalCollaborator && r.referrer_id !== globalCollaborator) return false;
    return true;
  });

  // Then local tag filter
  const tagFiltered = activeTags.length > 0
    ? globalFiltered.filter(r => (r.tags || []).some(t => activeTags.includes(t)))
    : globalFiltered;

  const filteredReferrals = searchQuery.trim()
    ? tagFiltered.filter(r => {
        const q = searchQuery.toLowerCase();
        return r.lead_name.toLowerCase().includes(q) || r.lead_phone.includes(q);
      })
    : tagFiltered;

  const handleViewModeChange = (mode: ClientViewMode) => {
    setViewMode(mode);
    localStorage.setItem(CLIENT_VIEW_MODE_KEY, mode);
  };

  const handleColumnsChange = async (nextColumns: ColumnConfig[]) => {
    const normalizedColumns = ensureClientColumn(nextColumns);
    setColumns(normalizedColumns);
    localStorage.setItem(CLIENT_COLUMNS_KEY, JSON.stringify(normalizedColumns));

    if (!user) {
      return;
    }

    const success = await upsertSetting(user.id, 'client_columns', normalizedColumns);
    if (!success) {
      toast.error('Erro ao salvar colunas no servidor');
    }
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
    const newTags = value ? value.split(',').filter(Boolean) : [];
    const { updateLeadTags } = await import('@/services/referralService');
    const result = await updateLeadTags(referral.id, newTags);
    if (result.success) {
      await addHistoryEvent({
        referralId: referral.id,
        eventType: 'tag_change',
        eventData: { tags: newTags, previous_tags: referral.tags || [] },
        createdById: user?.id,
        createdByName: profile?.name,
      });
      setReferrals(prev => prev.map(item => item.id === referral.id ? { ...item, tags: newTags } : item));
      toast.success('Tags atualizadas');
    } else {
      toast.error(result.error || 'Erro ao atualizar tags');
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
        String(referral.lead_points),
        referral.referrer_name,
        new Date(referral.created_at).toLocaleDateString('pt-BR'),
      ]),
    ];
    downloadCsv(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success('CSV exportado com sucesso');
  };

  if (loading && !registerClientOpen) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
        <RegisterClientDialog
          open={registerClientOpen}
          onOpenChange={setRegisterClientOpen}
          onClientCreated={loadReferrals}
        />
      </DashboardLayout>
    );
  }

  const totalClients = referrals.length;
  const vipCount = referrals.filter(r => r.contact_tag === 'sql').length;
  const avgPoints = totalClients > 0 ? Math.round(referrals.reduce((a, b) => a + b.lead_points, 0) / totalClients) : 0;

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-5"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {/* Header */}
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
          <div className="flex flex-col gap-4">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success/20">
                  <UserCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight">Clientes</h1>
                  <p className="text-xs text-muted-foreground">Base de clientes convertidos</p>
                </div>
              </div>

              {/* Compact Stats Strip */}
              <div className="hidden md:flex items-center gap-1 bg-secondary/40 rounded-xl border border-border/30 px-1 py-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-success">{totalClients}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Total</span>
                </div>
                <div className="w-px h-4 bg-border/40" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-primary">{vipCount}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">SQL/VIP</span>
                </div>
                <div className="w-px h-4 bg-border/40" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-accent">{avgPoints}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Média pts</span>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="gap-1.5 text-xs h-7 gold-gradient gold-glow text-primary-foreground"
                onClick={() => setRegisterClientOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Cadastrar
              </Button>

              {/* View Toggle */}
              <div className="flex items-center rounded-lg border border-border/40 bg-secondary/30 p-0.5">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn("h-7 px-2.5 gap-1 text-xs", viewMode === 'kanban' && "lavender-gradient text-primary-foreground shadow-sm")}
                  onClick={() => handleViewModeChange('kanban')}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className={cn("h-7 px-2.5 gap-1 text-xs", viewMode === 'list' && "lavender-gradient text-primary-foreground shadow-sm")}
                  onClick={() => handleViewModeChange('list')}
                >
                  <List className="h-3.5 w-3.5" />
                  Lista
                </Button>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar nome ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 pl-8 text-xs bg-secondary/30 border-border/40"
                />
              </div>

              {/* Filter Toggle */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showTagFilter || activeTags.length > 0 ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "h-7 gap-1.5 text-xs px-2.5",
                        (showTagFilter || activeTags.length > 0) && "lavender-gradient text-primary-foreground shadow-sm"
                      )}
                      onClick={() => setShowTagFilter(!showTagFilter)}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      Filtros
                      {activeTags.length > 0 && (
                        <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                          {activeTags.length}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Filtrar por tags</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span><ColumnManager columns={columns} onColumnsChange={handleColumnsChange} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Gerenciar colunas</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={handleExport}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Exportar CSV</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs">Configurações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTagSettingsOpen(true)} className="text-xs gap-2">
                      <Tag className="h-3.5 w-3.5" />
                      Configurar Tags
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mobile Stats */}
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="grid grid-cols-3 gap-2 md:hidden">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success/[0.06] border border-success/15">
            <span className="text-lg font-bold text-success">{totalClients}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Total</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/[0.06] border border-primary/15">
            <span className="text-lg font-bold text-primary">{vipCount}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">SQL/VIP</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/[0.06] border border-accent/15">
            <span className="text-lg font-bold text-accent">{avgPoints}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Média pts</span>
          </div>
        </motion.div>

        {/* Global Tag Filter */}
        {(showTagFilter || activeTags.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GlobalTagFilter tagOptions={contactTagOptions} />
          </motion.div>
        )}


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
                          {(referral.tags || []).map(tag => {
                            const opt = contactTagOptions.find(o => o.value === tag);
                            return opt ? (
                              <Badge key={tag} variant="outline" className="bg-primary/15 text-primary border-primary/30">
                                {opt.label}
                              </Badge>
                            ) : null;
                          })}
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
      </motion.div>

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
            {selectedPlan && (() => {
              const isChain = !!convertingReferral?.referred_by_lead_id;
              const displayPoints = isChain
                ? getBarberReferralSharePoints(selectedPlan)
                : (getPlanById(selectedPlan)?.points ?? 0);
              return (
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">{convertingReferral?.referrer_name} receberá:</p>
                  <p className="text-2xl font-bold text-primary">+{displayPoints} pontos</p>
                  {isChain && (
                    <p className="text-xs text-muted-foreground mt-1">
                      (30% de {getPlanById(selectedPlan)?.points} pts — lead indicador recebe o total)
                    </p>
                  )}
                </div>
              );
            })()}
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
      <RegisterClientDialog open={registerClientOpen} onOpenChange={setRegisterClientOpen} onClientCreated={loadReferrals} />
    </DashboardLayout>
  );
}
