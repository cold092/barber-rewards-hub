import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Phone,
  MessageCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Download,
  Trash2,
  Menu,
  LayoutGrid,
  List,
  Bell,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllReferrals, markAsContacted, confirmConversion, updateContactTag, undoContacted, undoConversion, deleteReferral } from '@/services/referralService';
import { addHistoryEvent, logWhatsAppContact } from '@/services/leadHistoryService';
import { getPlanById, getRewardPlans, PLAN_OVERRIDES_STORAGE_KEY, REWARD_PLANS } from '@/config/plans';
import { DEFAULT_CLIENT_MESSAGE, DEFAULT_LEAD_MESSAGE, generateWhatsAppLink, formatPhoneNumber } from '@/utils/whatsapp';
import { downloadCsv } from '@/utils/export';
import { KanbanBoard } from '@/components/leads/KanbanBoard';
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog';
import type { Referral, ReferralStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const LEAD_MESSAGE_STORAGE_KEY = 'leadMessageTemplate';
const CLIENT_MESSAGE_STORAGE_KEY = 'clientMessageTemplate';
const VIEW_MODE_STORAGE_KEY = 'leadsViewMode';

type PlanDraft = Record<string, { points: string; price: string }>;
type ViewMode = 'kanban' | 'list';

export default function Leads() {
  const { isAdmin, isBarber, profile, user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'converted'>('all');
  const [listType, setListType] = useState<'leads' | 'clients'>('leads');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (saved === 'list' || saved === 'kanban') ? saved : 'kanban';
  });
  const [leadMessageTemplate, setLeadMessageTemplate] = useState(DEFAULT_LEAD_MESSAGE);
  const [leadMessageDraft, setLeadMessageDraft] = useState(DEFAULT_LEAD_MESSAGE);
  const [clientMessageTemplate, setClientMessageTemplate] = useState(DEFAULT_CLIENT_MESSAGE);
  const [clientMessageDraft, setClientMessageDraft] = useState(DEFAULT_CLIENT_MESSAGE);
  const [planDraft, setPlanDraft] = useState<PlanDraft>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Details dialog state
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Conversion dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingReferral, setConvertingReferral] = useState<Referral | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [converting, setConverting] = useState(false);

  const contactTagOptions = [
    { value: 'sql', label: 'SQL', className: 'bg-success/20 text-success border-success/30' },
    { value: 'mql', label: 'MQL', className: 'bg-info/20 text-info border-info/30' },
    { value: 'cold', label: 'Frio', className: 'bg-muted text-muted-foreground border-border' },
    { value: 'scheduled', label: 'Marcou', className: 'bg-accent/20 text-accent-foreground border-accent/30' }
  ];

  const loadReferrals = async () => {
    setLoading(true);
    const result = await getAllReferrals();
    const data = result.data;
    const filtered = isBarber && profile ? data.filter((item) => item.referrer_id === profile.id) : data;
    setReferrals(filtered);
    setLoading(false);
  };

  useEffect(() => {
    loadReferrals();
  }, [isBarber, profile]);

  useEffect(() => {
    const storedLeadMessage = localStorage.getItem(LEAD_MESSAGE_STORAGE_KEY);
    if (storedLeadMessage) {
      setLeadMessageTemplate(storedLeadMessage);
      setLeadMessageDraft(storedLeadMessage);
    }

    const storedClientMessage = localStorage.getItem(CLIENT_MESSAGE_STORAGE_KEY);
    if (storedClientMessage) {
      setClientMessageTemplate(storedClientMessage);
      setClientMessageDraft(storedClientMessage);
    }

    const plans = getRewardPlans();
    const initialDraft: PlanDraft = Object.fromEntries(
      Object.entries(plans).map(([planId, plan]) => [
        planId,
        { points: String(plan.points), price: String(plan.price) }
      ])
    );
    setPlanDraft(initialDraft);
  }, []);

  const isClientReferral = (referral: Referral) =>
    referral.is_client || referral.status === 'converted';

  useEffect(() => {
    const viewParam = searchParams.get('view');
    const statusParam = searchParams.get('status');

    if (viewParam === 'clients' || viewParam === 'converted-clients') {
      setListType('clients');
    } else if (viewParam === 'leads') {
      setListType('leads');
    }

    if (statusParam === 'new' || statusParam === 'contacted' || statusParam === 'converted') {
      setFilter(statusParam);
    } else if (viewParam === 'converted-clients') {
      setFilter('converted');
    } else if (!statusParam) {
      setFilter('all');
    }
  }, [searchParams]);

  const updateSearchParams = (nextView?: string, nextStatus?: string) => {
    const params = new URLSearchParams(searchParams);
    if (nextView) {
      params.set('view', nextView);
    } else {
      params.delete('view');
    }
    if (nextStatus && nextStatus !== 'all') {
      params.set('status', nextStatus);
    } else {
      params.delete('status');
    }
    setSearchParams(params);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  };

  const allClientReferrals = referrals.filter(isClientReferral);
  const allLeadReferrals = referrals.filter((referral) => !isClientReferral(referral));
  const baseReferrals = listType === 'clients' ? allClientReferrals : allLeadReferrals;
  const filteredReferrals = baseReferrals.filter((referral) => {
    if (filter === 'all') return true;
    return referral.status === filter;
  });

  const handleContact = async (referral: Referral) => {
    const result = await markAsContacted(referral.id);
    
    if (result.success) {
      // Log to history
      await addHistoryEvent({
        referralId: referral.id,
        eventType: 'status_change',
        eventData: { from_status: referral.status, to_status: 'contacted' },
        createdById: user?.id,
        createdByName: profile?.name
      });
      
      toast.success('Status atualizado para "Contatado"');
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao atualizar status');
    }
  };

  const handleUndoContact = async (referral: Referral) => {
    const result = await undoContacted(referral.id);

    if (result.success) {
      await addHistoryEvent({
        referralId: referral.id,
        eventType: 'status_change',
        eventData: { from_status: 'contacted', to_status: 'new' },
        createdById: user?.id,
        createdByName: profile?.name
      });
      
      toast.success('Contato desfeito');
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao desfazer contato');
    }
  };

  const openWhatsApp = async (referral: Referral) => {
    const template = isClientReferral(referral) ? clientMessageTemplate : leadMessageTemplate;
    const link = generateWhatsAppLink(
      referral.lead_name,
      referral.lead_phone,
      referral.referrer_name,
      template
    );
    
    // Log to history
    await logWhatsAppContact(referral.id, user?.id, profile?.name);
    
    window.open(link, '_blank');
  };

  const openConvertDialog = (referral: Referral) => {
    setConvertingReferral(referral);
    setSelectedPlan('');
    setConvertDialogOpen(true);
    setDetailsDialogOpen(false);
  };

  const openDetailsDialog = (referral: Referral) => {
    setSelectedReferral(referral);
    setDetailsDialogOpen(true);
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
        createdByName: profile?.name
      });

      setReferrals((prev) =>
        prev.map((item) =>
          item.id === referral.id ? { ...item, contact_tag: nextTag } : item
        )
      );
      toast.success('Tag atualizada');
    } else {
      toast.error(result.error || 'Erro ao atualizar tag');
    }
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
        eventData: { 
          plan_id: selectedPlan, 
          plan_label: plan?.label,
          points_awarded: result.pointsAwarded 
        },
        createdById: user?.id,
        createdByName: profile?.name
      });

      toast.success(
        `Conversão confirmada! ${convertingReferral.referrer_name} ganhou +${result.pointsAwarded} pontos`,
        { duration: 5000 }
      );
      setConvertDialogOpen(false);
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao confirmar conversão');
    }
  };

  const handleUndoConversion = async (referral: Referral) => {
    const result = await undoConversion(referral.id);

    if (result.success) {
      toast.success('Conversão desfeita');
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao desfazer conversão');
    }
  };

  const handleDelete = async (referral: Referral) => {
    if (!window.confirm(`Tem certeza que deseja excluir o lead "${referral.lead_name}"?`)) {
      return;
    }

    const result = await deleteReferral(referral.id);

    if (result.success) {
      toast.success('Lead excluído');
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao excluir lead');
    }
  };

  const handleStatusChange = async (referralId: string, newStatus: ReferralStatus) => {
    const referral = referrals.find(r => r.id === referralId);
    if (!referral) return;

    // For converted status, open the dialog instead
    if (newStatus === 'converted') {
      openConvertDialog(referral);
      return;
    }

    const { error } = await supabase
      .from('referrals')
      .update({ status: newStatus })
      .eq('id', referralId);

    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }

    await addHistoryEvent({
      referralId,
      eventType: 'status_change',
      eventData: { from_status: referral.status, to_status: newStatus },
      createdById: user?.id,
      createdByName: profile?.name
    });

    toast.success('Status atualizado');
    loadReferrals();
  };

  const handleExport = () => {
    if (filteredReferrals.length === 0) {
      toast.error(listType === 'clients' ? 'Nenhum cliente para exportar' : 'Nenhum lead para exportar');
      return;
    }

    const rows = [
      ['Lead', 'Telefone', 'Status', 'Plano', 'Indicado por', 'Tag', 'Cliente', 'Observações', 'Criado em']
    ];

    filteredReferrals.forEach((referral) => {
      const referralIsClient = isClientReferral(referral);
      rows.push([
        referral.lead_name,
        formatPhoneNumber(referral.lead_phone),
        referral.status,
        referral.converted_plan_id ? getPlanById(referral.converted_plan_id)?.label ?? '' : '',
        referral.referrer_name,
        referral.contact_tag ?? '',
        referralIsClient ? 'Sim' : 'Não',
        referral.notes ?? '',
        new Date(referral.created_at).toLocaleDateString('pt-BR')
      ]);
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`relatorio-leads-${dateStamp}.csv`, rows);
  };

  const handleSaveLeadMessage = () => {
    const nextTemplate = leadMessageDraft.trim() || DEFAULT_LEAD_MESSAGE;
    setLeadMessageTemplate(nextTemplate);
    setLeadMessageDraft(nextTemplate);
    localStorage.setItem(LEAD_MESSAGE_STORAGE_KEY, nextTemplate);
    toast.success('Mensagem para leads salva');
    setConfigDialogOpen(false);
  };

  const handleSaveClientMessage = () => {
    const nextTemplate = clientMessageDraft.trim() || DEFAULT_CLIENT_MESSAGE;
    setClientMessageTemplate(nextTemplate);
    setClientMessageDraft(nextTemplate);
    localStorage.setItem(CLIENT_MESSAGE_STORAGE_KEY, nextTemplate);
    toast.success('Mensagem para clientes salva');
    setConfigDialogOpen(false);
  };

  const handleSavePlans = () => {
    const nextOverrides = Object.fromEntries(
      Object.entries(planDraft).map(([planId, values]) => {
        const basePlan = REWARD_PLANS[planId];
        const pointsValue = values.points.trim();
        const priceValue = values.price.trim();
        const points = pointsValue === '' ? basePlan.points : Number(pointsValue);
        const price = priceValue === '' ? basePlan.price : Number(priceValue);
        return [
          planId,
          {
            points: Number.isFinite(points) ? points : basePlan.points,
            price: Number.isFinite(price) ? price : basePlan.price
          }
        ];
      })
    );
    localStorage.setItem(PLAN_OVERRIDES_STORAGE_KEY, JSON.stringify(nextOverrides));
    const nextDraft: PlanDraft = Object.fromEntries(
      Object.entries(nextOverrides).map(([planId, values]) => [
        planId,
        { points: String(values.points), price: String(values.price) }
      ])
    );
    setPlanDraft(nextDraft);
    toast.success('Planos atualizados');
    setConfigDialogOpen(false);
  };

  const handlePlanDraftChange = (planId: string, field: 'points' | 'price', value: string) => {
    setPlanDraft((prev) => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
  };

  const rewardPlans = getRewardPlans();

  const getStatusBadge = (status: Referral['status']) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-info/20 text-info border-info/30">Novo</Badge>;
      case 'contacted':
        return <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">Contatado</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-success/20 text-success border-success/30">Convertido</Badge>;
    }
  };

  const getContactTagBadge = (tag: string | null) => {
    if (!tag) return null;
    const tagOption = contactTagOptions.find(option => option.value === tag);
    if (!tagOption) return null;
    return (
      <Badge variant="outline" className={tagOption.className}>
        {tagOption.label}
      </Badge>
    );
  };

  const getClientBadge = (isClient: boolean) => {
    if (!isClient) return null;
    return (
      <Badge variant="outline" className="bg-success/15 text-success border-success/30">
        Cliente
      </Badge>
    );
  };

  const renderReferralCard = (referral: Referral) => (
    <div key={referral.id} className="p-4 rounded-lg bg-secondary/50 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-lg">{referral.lead_name}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {formatPhoneNumber(referral.lead_phone)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {getStatusBadge(referral.status)}
          {getContactTagBadge(referral.contact_tag)}
          {getClientBadge(isClientReferral(referral))}
          {referral.status === 'converted' && referral.converted_plan_id && (
            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
              {getPlanById(referral.converted_plan_id)?.label}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Tag de contato:</span>
            <Select
              value={referral.contact_tag ?? 'none'}
              onValueChange={(value) => handleTagChange(referral, value)}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="Sem tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem tag</SelectItem>
                {contactTagOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {referral.status !== 'converted' && (
        <div className="flex flex-wrap gap-2 pt-2">
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => openWhatsApp(referral)}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}

          {referral.status === 'new' && (
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              onClick={() => handleContact(referral)}
            >
              <Clock className="h-4 w-4" />
              Marcar Contatado
            </Button>
          )}
          {referral.status === 'contacted' && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => handleUndoContact(referral)}
            >
              Desfazer Contato
            </Button>
          )}

          <Button
            size="sm"
            className="gap-2 gold-gradient text-primary-foreground"
            onClick={() => openConvertDialog(referral)}
          >
            <CheckCircle className="h-4 w-4" />
            Converter Venda
          </Button>
        </div>
      )}
      {referral.status === 'converted' && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => handleUndoConversion(referral)}
          >
            Desfazer Conversão
          </Button>
          {isAdmin && isClientReferral(referral) && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => openWhatsApp(referral)}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-end pt-2 border-t border-border/30 mt-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={() => handleDelete(referral)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </div>
      )}
    </div>
  );


  const handleListTypeChange = (nextListType: 'leads' | 'clients') => {
    setListType(nextListType);

    // Clients tab defaults to broad view to avoid stale converted-only URL state.
    const nextStatus = nextListType === 'clients' ? 'all' : filter;
    if (nextListType === 'clients') {
      setFilter('all');
    }

    updateSearchParams(nextListType, nextStatus);
  };

  const clientsByClassification = [
    ...Object.entries(rewardPlans).map(([planId, plan]) => ({
      key: planId,
      title: plan.label,
      items: filteredReferrals.filter(
        (referral) => isClientReferral(referral) && referral.converted_plan_id === planId
      )
    })),
    {
      key: 'no-plan',
      title: 'Sem Plano Definido',
      items: filteredReferrals.filter(
        (referral) =>
          isClientReferral(referral) &&
          (!referral.converted_plan_id || !rewardPlans[referral.converted_plan_id])
      )
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  const emptyListMessage = listType === 'clients' ? 'Nenhum cliente encontrado' : 'Nenhum lead encontrado';

  const clientsColumnsContent = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {clientsByClassification.map((column) => (
        <div key={column.key} className="rounded-lg border border-border/50 bg-background/30 p-3">
          <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{column.title}</h3>
            <Badge variant="outline">{column.items.length}</Badge>
          </div>
          {column.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem clientes</p>
          ) : (
            <div className="space-y-3">{column.items.map((referral) => renderReferralCard(referral))}</div>
          )}
        </div>
      ))}
    </div>
  );

  const leadsListContent = <div className="space-y-4">{filteredReferrals.map((referral) => renderReferralCard(referral))}</div>;


  const listTitle = listType === 'clients' ? `Clientes (${filteredReferrals.length})` : `Leads (${filteredReferrals.length})`;

  const handleListTypeTabChange = (value: string) => {
    if (value === 'leads' || value === 'clients') {
      handleListTypeChange(value);
    }
  };


  const listTypeTabs = (
    <Tabs value={listType} onValueChange={handleListTypeTabChange}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="clients">Clientes</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const mainListContent = filteredReferrals.length === 0 ? (
    <p className="text-muted-foreground text-center py-8">{emptyListMessage}</p>
  ) : listType === 'clients' ? (
    clientsColumnsContent
  ) : (
    leadsListContent
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl lavender-gradient lavender-glow">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">
                  <span className="gold-text">Mini-CRM</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie leads, follow-ups e conversões
                </p>
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
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

            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            {isAdmin && (
              <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
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
                    <DropdownMenuItem onClick={() => setConfigDialogOpen(true)}>
                      Abrir painel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DialogContent className="glass-card w-[min(95vw,48rem)] max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display">Configurações</DialogTitle>
                    <DialogDescription>
                      Ajuste planos e mensagens para leads e clientes.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">Planos (pontuação e valores)</h3>
                        <p className="text-sm text-muted-foreground">
                          Altere os pontos e valores exibidos para conversões.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(rewardPlans).map(([planId, plan]) => (
                          <div
                            key={planId}
                            className="flex flex-col gap-3 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium">{plan.label}</p>
                              <p className="text-xs text-muted-foreground uppercase">
                                {plan.tier} • {plan.type}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Pontos</span>
                                <Input
                                  type="number"
                                  value={planDraft[planId]?.points ?? String(plan.points)}
                                  onChange={(event) =>
                                    handlePlanDraftChange(planId, 'points', event.target.value)
                                  }
                                  className="h-9 w-24"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Valor</span>
                                <Input
                                  type="number"
                                  value={planDraft[planId]?.price ?? String(plan.price)}
                                  onChange={(event) =>
                                    handlePlanDraftChange(planId, 'price', event.target.value)
                                  }
                                  className="h-9 w-28"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleSavePlans}>Salvar planos</Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">Mensagens</h3>
                        <p className="text-sm text-muted-foreground">
                          Use <span className="font-semibold text-foreground">{'{leadName}'}</span> e{' '}
                          <span className="font-semibold text-foreground">{'{barberName}'}</span> para personalizar.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Mensagem para leads</p>
                          <Textarea
                            value={leadMessageDraft}
                            onChange={(event) => setLeadMessageDraft(event.target.value)}
                            className="min-h-[120px]"
                          />
                          <div className="flex justify-end">
                            <Button variant="outline" onClick={handleSaveLeadMessage}>
                              Salvar mensagem de leads
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Mensagem para clientes</p>
                          <Textarea
                            value={clientMessageDraft}
                            onChange={(event) => setClientMessageDraft(event.target.value)}
                            className="min-h-[120px]"
                          />
                          <div className="flex justify-end">
                            <Button variant="outline" onClick={handleSaveClientMessage}>
                              Salvar mensagem de clientes
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {viewMode === 'list' && (
              <Select
                value={filter}
                onValueChange={(v: typeof filter) => {
                  setFilter(v);
                  updateSearchParams(
                    listType === 'clients' && v === 'converted' ? 'converted-clients' : listType,
                    v
                  );
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="new">Novos</SelectItem>
                  <SelectItem value="contacted">Contatados</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="glass-card border-info/20 hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10 group-hover:bg-info/20 transition-colors">
                  <Users className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-info">
                    {referrals.filter(r => r.status === 'new').length}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Novos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-warning/20 hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
                  <MessageCircle className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">
                    {referrals.filter(r => r.status === 'contacted').length}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Contatados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-success/20 hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">
                    {referrals.filter(r => r.status === 'converted').length}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Convertidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/20 hover-lift group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {conversionRate}%
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            "glass-card hover-lift group",
            overdueFollowUps > 0 ? "border-destructive/30" : "border-accent/20"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  overdueFollowUps > 0 ? "bg-destructive/10 group-hover:bg-destructive/20" : "bg-accent/10 group-hover:bg-accent/20"
                )}>
                  <Bell className={cn("h-4 w-4", overdueFollowUps > 0 ? "text-destructive" : "text-accent")} />
                </div>
                <div>
                  <p className={cn("text-2xl font-bold", overdueFollowUps > 0 ? "text-destructive" : "text-accent")}>
                    {followUpCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    {overdueFollowUps > 0 ? `${overdueFollowUps} atrasado${overdueFollowUps > 1 ? 's' : ''}` : 'Follow-ups'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leads & Clients Lists */}
        <Card className="glass-card border-border/50">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 font-display">
              <Users className="h-5 w-5 text-primary" />
              {listTitle}
            </CardTitle>
            {listTypeTabs}
          </CardHeader>
          <CardContent>{mainListContent}</CardContent>
        </Card>

      </div>

      {/* Lead Details Dialog */}
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

      {/* Conversion Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar Conversão</DialogTitle>
            <DialogDescription>
              Selecione o plano vendido para {convertingReferral?.lead_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(rewardPlans).map(([id, plan]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{plan.label}</span>
                      <span className="text-primary font-semibold">+{plan.points} pts</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedPlan && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  {convertingReferral?.referrer_name} receberá:
                </p>
                <p className="text-2xl font-bold text-primary">
                  +{getPlanById(selectedPlan)?.points} pontos
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="gold-gradient text-primary-foreground"
              onClick={handleConvert}
              disabled={!selectedPlan || converting}
            >
              {converting ? 'Confirmando...' : 'Confirmar Venda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
