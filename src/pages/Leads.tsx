import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Users, 
  Phone,
  MessageCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Download,
  Trash2,
  Settings2,
  LayoutGrid,
  List,
  Bell,
  TrendingUp,
  Filter,
  Tag,
  MoreVertical,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllReferrals, markAsContacted, confirmConversion, updateContactTag, undoContacted, undoConversion, deleteReferral } from '@/services/referralService';
import { addHistoryEvent, logWhatsAppContact } from '@/services/leadHistoryService';
import { getPlanById, getRewardPlans, getBarberReferralSharePoints, PLAN_OVERRIDES_STORAGE_KEY, REWARD_PLANS, setPlanOverridesCache } from '@/config/plans';
import { DEFAULT_CLIENT_MESSAGE, DEFAULT_LEAD_MESSAGE, generateWhatsAppLink, formatPhoneNumber } from '@/utils/whatsapp';
import { downloadCsv } from '@/utils/export';
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
import { useViewAs } from '@/contexts/ViewAsContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getGlobalSetting, upsertSetting } from '@/services/settingsService';

const LEAD_MESSAGE_STORAGE_KEY = 'leadMessageTemplate';
const CLIENT_MESSAGE_STORAGE_KEY = 'clientMessageTemplate';
const VIEW_MODE_STORAGE_KEY = 'leadsViewMode';

type PlanDraft = Record<string, { points: string; price: string }>;
type ViewMode = 'kanban' | 'list';

const LEADS_COLUMNS_KEY = 'leadsColumns';

const DEFAULT_LEAD_COLUMNS: ColumnConfig[] = [
  { id: 'new', title: 'Novos', color: 'bg-info/10', isDefault: true },
  { id: 'contacted', title: 'Contatados', color: 'bg-warning/10', isDefault: true },
  { id: 'converted', title: 'Convertidos', color: 'bg-success/10', isDefault: true },
];

const parseLeadColumns = (savedColumns: string | null): ColumnConfig[] => {
  if (!savedColumns) {
    return DEFAULT_LEAD_COLUMNS;
  }

  try {
    const parsed = JSON.parse(savedColumns);
    return Array.isArray(parsed) ? parsed : DEFAULT_LEAD_COLUMNS;
  } catch {
    localStorage.removeItem(LEADS_COLUMNS_KEY);
    return DEFAULT_LEAD_COLUMNS;
  }
};

export default function Leads() {
  const { isAdmin: realIsAdmin, isBarber: realIsBarber, profile: realProfile, user } = useAuth();
  const { effectiveProfile, effectiveRole, effectiveUserId, isViewingAs } = useViewAs();
  
  // When viewing as someone, use their perspective
  const profile = isViewingAs ? effectiveProfile : realProfile;
  const isAdmin = isViewingAs ? (effectiveRole === 'admin' || effectiveRole === 'owner') : realIsAdmin;
  const isBarber = isViewingAs ? effectiveRole === 'barber' : realIsBarber;
  const { activeTags } = useTagFilter();
  const { tags: contactTagOptions } = useTagConfig();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'converted' | 'client'>('all');
  const [listType, setListType] = useState<'leads' | 'clients'>('leads');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (saved === 'list' || saved === 'kanban') ? saved : 'kanban';
  });
  const [leadColumns, setLeadColumns] = useState<ColumnConfig[]>(DEFAULT_LEAD_COLUMNS);
  const [leadMessageTemplate, setLeadMessageTemplate] = useState(DEFAULT_LEAD_MESSAGE);
  const [leadMessageDraft, setLeadMessageDraft] = useState(DEFAULT_LEAD_MESSAGE);
  const [clientMessageTemplate, setClientMessageTemplate] = useState(DEFAULT_CLIENT_MESSAGE);
  const [clientMessageDraft, setClientMessageDraft] = useState(DEFAULT_CLIENT_MESSAGE);
  const [planDraft, setPlanDraft] = useState<PlanDraft>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [tagSettingsOpen, setTagSettingsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Details dialog state
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Conversion dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingReferral, setConvertingReferral] = useState<Referral | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [converting, setConverting] = useState(false);

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
  }, [isBarber, profile, isViewingAs, effectiveProfile]);

  // Load kanban columns - use effective user when viewing as someone
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const targetUserId = isViewingAs ? effectiveUserId : user?.id;
      if (!targetUserId) return;
      const { getSetting } = await import('@/services/settingsService');
      const dbLeadColumns = await getSetting<ColumnConfig[]>(targetUserId, 'lead_columns');
      if (cancelled || !Array.isArray(dbLeadColumns)) {
        return;
      }
      setLeadColumns(dbLeadColumns);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isViewingAs, effectiveUserId]);

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

    if (statusParam === 'new' || statusParam === 'contacted' || statusParam === 'converted' || statusParam === 'client') {
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
  // Converted leads appear in BOTH views: leads kanban (Convertidos column) and clients
  const allLeadReferrals = referrals.filter((referral) => !isClientReferral(referral) || referral.status === 'converted');
  const baseReferrals = listType === 'clients' ? allClientReferrals : allLeadReferrals;
  
  // Apply tag filter
  const tagFilteredReferrals = activeTags.length > 0
    ? baseReferrals.filter(r => (r.tags || []).some(t => activeTags.includes(t)))
    : baseReferrals;

  const searchFilteredReferrals = searchQuery.trim()
    ? tagFilteredReferrals.filter(r => {
        const q = searchQuery.toLowerCase();
        return r.lead_name.toLowerCase().includes(q) || r.lead_phone.includes(q);
      })
    : tagFilteredReferrals;
  
  const filteredReferrals = searchFilteredReferrals.filter((referral) => {
    if (filter === 'all') return true;
    return referral.status === filter;
  });

  const handleColumnsChange = async (newColumns: ColumnConfig[]) => {
    setLeadColumns(newColumns);

    if (!user) {
      return;
    }

    const success = await upsertSetting(user.id, 'lead_columns', newColumns);
    if (!success) {
      toast.error('Erro ao salvar colunas no servidor');
    }
  };

  const handleContact = async (referral: Referral) => {
    const result = await markAsContacted(referral.id);
    
    if (result.success) {
      await addHistoryEvent({
        referralId: referral.id,
        eventType: 'status_change',
        eventData: { from_status: referral.status, to_status: 'contacted' },
        createdById: user?.id,
        createdByName: profile?.name
      });
      
      setReferrals((prev) =>
        prev.map((r) => r.id === referral.id ? { ...r, status: 'contacted' as ReferralStatus } : r)
      );
      toast.success('Status atualizado para "Contatado"');
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
      
      setReferrals((prev) =>
        prev.map((r) => r.id === referral.id ? { ...r, status: 'new' as ReferralStatus } : r)
      );
      toast.success('Contato desfeito');
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
    const newTags = value ? value.split(',').filter(Boolean) : [];
    const { updateLeadTags } = await import('@/services/referralService');
    const result = await updateLeadTags(referral.id, newTags);

    if (result.success) {
      await addHistoryEvent({
        referralId: referral.id,
        eventType: 'tag_change',
        eventData: { tags: newTags, previous_tags: referral.tags || [] },
        createdById: user?.id,
        createdByName: profile?.name
      });

      setReferrals((prev) =>
        prev.map((item) =>
          item.id === referral.id ? { ...item, tags: newTags } : item
        )
      );
      toast.success('Tags atualizadas');
    } else {
      toast.error(result.error || 'Erro ao atualizar tags');
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
      setReferrals((prev) =>
        prev.map((r) => r.id === convertingReferral.id
          ? { 
              ...r, 
              status: 'converted' as ReferralStatus, 
              converted_plan_id: selectedPlan, 
              is_client: true,
              tags: r.tags.includes('Convertido') ? r.tags : [...r.tags, 'Convertido']
            }
          : r)
      );
      setConvertDialogOpen(false);
    } else {
      toast.error(result.error || 'Erro ao confirmar conversão');
    }
  };

  const handleUndoConversion = async (referral: Referral) => {
    const result = await undoConversion(referral.id);

    if (result.success) {
      setReferrals((prev) =>
        prev.map((r) => r.id === referral.id
          ? { ...r, status: 'contacted' as ReferralStatus, converted_plan_id: null, is_client: false }
          : r)
      );
      toast.success('Conversão desfeita');
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
      setReferrals((prev) => prev.filter((r) => r.id !== referral.id));
      toast.success('Lead excluído');
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

    // Optimistic UI update
    const previousStatus = referral.status;
    setReferrals((prev) =>
      prev.map((r) => r.id === referralId ? { ...r, status: newStatus } : r)
    );

    const { error } = await supabase
      .from('referrals')
      .update({ status: newStatus })
      .eq('id', referralId);

    if (error) {
      // Revert on failure
      setReferrals((prev) =>
        prev.map((r) => r.id === referralId ? { ...r, status: previousStatus } : r)
      );
      toast.error('Erro ao atualizar status');
      return;
    }

    await addHistoryEvent({
      referralId,
      eventType: 'status_change',
      eventData: { from_status: previousStatus, to_status: newStatus },
      createdById: user?.id,
      createdByName: profile?.name
    });

    toast.success('Status atualizado');
  };

  const handleColumnChange = async (referralId: string, columnId: string) => {
    const referral = referrals.find(r => r.id === referralId);
    if (!referral) return;

    const previousTag = referral.contact_tag;
    const newTag = columnId || null;

    // Optimistic UI
    setReferrals((prev) =>
      prev.map((r) => r.id === referralId ? { ...r, contact_tag: newTag } : r)
    );

    const { error } = await supabase
      .from('referrals')
      .update({ contact_tag: newTag })
      .eq('id', referralId);

    if (error) {
      // Revert
      setReferrals((prev) =>
        prev.map((r) => r.id === referralId ? { ...r, contact_tag: previousTag } : r)
      );
      toast.error('Erro ao mover lead');
      return;
    }

    toast.success('Lead movido');
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

  const handleSavePlans = async () => {
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
    setPlanOverridesCache(nextOverrides);
    localStorage.setItem(PLAN_OVERRIDES_STORAGE_KEY, JSON.stringify(nextOverrides));
    if (user) await upsertSetting(user.id, 'plan_overrides', nextOverrides);
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

  const getStatusBadge = (referral: Referral) => {
    if (referral.is_client && referral.status !== 'converted') {
      return <Badge variant="outline" className="bg-success/15 text-success border-success/30">Cliente</Badge>;
    }

    switch (referral.status) {
      case 'new':
        return <Badge variant="outline" className="bg-info/20 text-info border-info/30">Novo</Badge>;
      case 'contacted':
        return <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">Contatado</Badge>;
      case 'client':
        return <Badge variant="outline" className="bg-success/15 text-success border-success/30">Cliente</Badge>;
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  const followUpCount = referrals.filter(r => r.follow_up_date && r.status !== 'converted').length;
  const overdueFollowUps = referrals.filter(r => {
    if (!r.follow_up_date || r.status === 'converted') return false;
    const d = new Date(r.follow_up_date);
    return d < new Date() && d.toDateString() !== new Date().toDateString();
  }).length;
  const conversionRate = referrals.length > 0 
    ? Math.round((referrals.filter(r => r.status === 'converted').length / referrals.length) * 100) 
    : 0;

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
                <div className="p-2.5 rounded-xl lavender-gradient lavender-glow">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight">Leads</h1>
                  <p className="text-xs text-muted-foreground">Funil de vendas e conversões</p>
                </div>
              </div>

              {/* Compact Stats Strip */}
              <div className="hidden md:flex items-center gap-1 bg-secondary/40 rounded-xl border border-border/30 px-1 py-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-info">{referrals.filter(r => r.status === 'new').length}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Novos</span>
                </div>
                <div className="w-px h-4 bg-border/40" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-warning">{referrals.filter(r => r.status === 'contacted').length}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Contatados</span>
                </div>
                <div className="w-px h-4 bg-border/40" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-success">{referrals.filter(r => r.status === 'converted').length}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Convertidos</span>
                </div>
                <div className="w-px h-4 bg-border/40" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-primary">{conversionRate}%</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Conv.</span>
                </div>
                {followUpCount > 0 && (
                  <>
                    <div className="w-px h-4 bg-border/40" />
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
                      overdueFollowUps > 0 && "bg-destructive/10"
                    )}>
                      <Bell className={cn("h-3 w-3", overdueFollowUps > 0 ? "text-destructive" : "text-muted-foreground")} />
                      <span className={cn("text-sm font-bold", overdueFollowUps > 0 ? "text-destructive" : "text-foreground")}>{followUpCount}</span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase">
                        {overdueFollowUps > 0 ? `${overdueFollowUps} atr.` : 'Follow-ups'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
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
                  <SelectTrigger className="w-36 h-7 text-xs">
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="new">Novos</SelectItem>
                    <SelectItem value="contacted">Contatados</SelectItem>
                    <SelectItem value="converted">Convertidos</SelectItem>
                    {listType === 'clients' && <SelectItem value="client">Clientes Diretos</SelectItem>}
                  </SelectContent>
                </Select>
              )}

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
                    <span><ColumnManager columns={leadColumns} onColumnsChange={handleColumnsChange} /></span>
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
                <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs">Configurações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setConfigDialogOpen(true)} className="text-xs gap-2">
                        <Settings2 className="h-3.5 w-3.5" />
                        Planos e Mensagens
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTagSettingsOpen(true)} className="text-xs gap-2">
                        <Tag className="h-3.5 w-3.5" />
                        Configurar Tags
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
            </div>
          </div>
        </motion.div>

        {/* Mobile Stats */}
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="grid grid-cols-3 gap-2 md:hidden">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-info/[0.06] border border-info/15">
            <span className="text-lg font-bold text-info">{referrals.filter(r => r.status === 'new').length}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Novos</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-warning/[0.06] border border-warning/15">
            <span className="text-lg font-bold text-warning">{referrals.filter(r => r.status === 'contacted').length}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Contatados</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success/[0.06] border border-success/15">
            <span className="text-lg font-bold text-success">{referrals.filter(r => r.status === 'converted').length}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">Conv.</span>
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

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <KanbanBoard
            referrals={searchFilteredReferrals.filter(r => !isClientReferral(r))}
            onStatusChange={handleStatusChange}
            onColumnChange={handleColumnChange}
            onOpenDetails={openDetailsDialog}
            onWhatsApp={openWhatsApp}
            isAdmin={isAdmin}
            contactTagOptions={contactTagOptions}
            customColumns={leadColumns}
            onColumnsReorder={handleColumnsChange}
          />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Card className="glass-card rounded-2xl overflow-hidden">
            <CardHeader className="space-y-4 border-b border-border/20 pb-4">
              <CardTitle className="flex items-center gap-2.5 font-display text-base">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                Leads ({filteredReferrals.filter(r => !isClientReferral(r)).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredReferrals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {listType === 'clients' ? 'Nenhum cliente encontrado' : 'Nenhum lead encontrado'}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredReferrals.map((referral) => (
                    <div 
                      key={referral.id}
                      className="p-4 rounded-xl bg-secondary/30 border border-border/20 space-y-3 cursor-pointer hover:border-border/50 transition-colors"
                      onClick={() => openDetailsDialog(referral)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-lg">{referral.lead_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhoneNumber(referral.lead_phone)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Adicionado em {new Date(referral.created_at).toLocaleString('pt-BR')}
                            {referral.created_by_name && (
                              <>
                                {' '}por{' '}
                                <span className="font-medium text-foreground">
                                  {referral.created_by_name}
                                </span>
                                {referral.created_by_role && (
                                  <span className="text-muted-foreground">
                                    {' '}({referral.created_by_role === 'admin' ? 'Admin' : referral.created_by_role === 'barber' ? 'Barbeiro' : 'Cliente'})
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {getStatusBadge(referral)}
                          {(referral.tags || []).map(tag => (
                            <span key={tag}>{getContactTagBadge(tag)}</span>
                          ))}
                          {getClientBadge(isClientReferral(referral))}
                          {referral.status === 'converted' && referral.converted_plan_id && (
                            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                              {getPlanById(referral.converted_plan_id)?.label}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                          <span className="text-muted-foreground">Tags:</span>
                          <div className="flex flex-wrap gap-1">
                            {contactTagOptions.map((option) => {
                              const isSelected = (referral.tags || []).includes(option.value);
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    const currentTags = referral.tags || [];
                                    const newTags = isSelected
                                      ? currentTags.filter(t => t !== option.value)
                                      : [...currentTags, option.value];
                                    handleTagChange(referral, newTags.join(','));
                                  }}
                                  className={cn(
                                    "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all",
                                    isSelected
                                      ? option.className + " ring-1 ring-primary/30"
                                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/30"
                                  )}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                        {referral.status !== 'converted' && (
                          <div className="flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
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
                            
                            {!referral.is_client && referral.status === 'new' && (
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
                            {!referral.is_client && referral.status === 'contacted' && (
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
                          <div className="flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
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
                        {/* Delete button - admin only */}
                        {isAdmin && (
                          <div className="flex justify-end pt-2 border-t border-border/30 mt-2" onClick={(e) => e.stopPropagation()}>
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
      </motion.div>

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
            
            {selectedPlan && (() => {
              const isChain = !!convertingReferral?.referred_by_lead_id;
              const displayPoints = isChain
                ? getBarberReferralSharePoints(selectedPlan)
                : (getPlanById(selectedPlan)?.points ?? 0);
              return (
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    {convertingReferral?.referrer_name} receberá:
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    +{displayPoints} pontos
                  </p>
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

      <TagSettingsDialog open={tagSettingsOpen} onOpenChange={setTagSettingsOpen} />
    </DashboardLayout>
  );
}
