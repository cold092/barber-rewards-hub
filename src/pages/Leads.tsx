import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Phone,
  MessageCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Download,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllReferrals, markAsContacted, confirmConversion, updateContactTag, undoContacted, undoConversion, deleteReferral } from '@/services/referralService';
import { REWARD_PLANS, getPlanById } from '@/config/plans';
import { DEFAULT_LEAD_MESSAGE, generateWhatsAppLink, formatPhoneNumber } from '@/utils/whatsapp';
import { downloadCsv } from '@/utils/export';
import type { Referral } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';

const MESSAGE_STORAGE_KEY = 'leadMessageTemplate';

export default function Leads() {
  const { isAdmin, isBarber, profile } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'converted'>('all');
  const [listType, setListType] = useState<'leads' | 'clients'>('leads');
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_LEAD_MESSAGE);
  const [messageDraft, setMessageDraft] = useState(DEFAULT_LEAD_MESSAGE);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Conversion dialog state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [converting, setConverting] = useState(false);
  const contactTagOptions = [
    { value: 'sql', label: 'SQL', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { value: 'mql', label: 'MQL', className: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    { value: 'cold', label: 'Frio', className: 'bg-slate-500/20 text-slate-200 border-slate-500/30' },
    { value: 'scheduled', label: 'Marcou', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
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
    const stored = localStorage.getItem(MESSAGE_STORAGE_KEY);
    if (stored) {
      setMessageTemplate(stored);
      setMessageDraft(stored);
    }
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
      toast.success('Status atualizado para "Contatado"');
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao atualizar status');
    }
  };

  const handleUndoContact = async (referral: Referral) => {
    const result = await undoContacted(referral.id);

    if (result.success) {
      toast.success('Contato desfeito');
      loadReferrals();
    } else {
      toast.error(result.error || 'Erro ao desfazer contato');
    }
  };

  const openWhatsApp = (referral: Referral) => {
    const link = generateWhatsAppLink(
      referral.lead_name,
      referral.lead_phone,
      referral.referrer_name,
      messageTemplate
    );
    window.open(link, '_blank');
  };

  const openConvertDialog = (referral: Referral) => {
    setSelectedReferral(referral);
    setSelectedPlan('');
    setConvertDialogOpen(true);
  };

  const handleTagChange = async (referral: Referral, value: string) => {
    const nextTag = value === 'none' ? null : value;
    const result = await updateContactTag(referral.id, nextTag);

    if (result.success) {
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
    if (!selectedReferral || !selectedPlan) return;
    
    setConverting(true);
    const result = await confirmConversion(selectedReferral.id, selectedPlan);
    setConverting(false);
    
    if (result.success) {
      const plan = getPlanById(selectedPlan);
      toast.success(
        `Conversão confirmada! ${selectedReferral.referrer_name} ganhou +${result.pointsAwarded} pontos`,
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

  const handleExport = () => {
    if (filteredReferrals.length === 0) {
      toast.error(listType === 'clients' ? 'Nenhum cliente para exportar' : 'Nenhum lead para exportar');
      return;
    }

    const rows = [
      ['Lead', 'Telefone', 'Status', 'Plano', 'Indicado por', 'Tag', 'Cliente', 'Criado em']
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
        new Date(referral.created_at).toLocaleDateString('pt-BR')
      ]);
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`relatorio-leads-${dateStamp}.csv`, rows);
  };

  const handleSaveMessage = () => {
    const nextTemplate = messageDraft.trim() || DEFAULT_LEAD_MESSAGE;
    setMessageTemplate(nextTemplate);
    setMessageDraft(nextTemplate);
    localStorage.setItem(MESSAGE_STORAGE_KEY, nextTemplate);
    toast.success('Mensagem salva');
  };

  const getStatusBadge = (status: Referral['status']) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">Novo</Badge>;
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
      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">
              <span className="gold-text">Leads</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todas as indicações
            </p>
          </div>
          
          {/* Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
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
          </div>
        </div>

        {isAdmin && (
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Mensagem para lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Use <span className="font-semibold text-foreground">{'{leadName}'}</span> e{' '}
                <span className="font-semibold text-foreground">{'{barberName}'}</span> para personalizar.
              </p>
              <Textarea
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                className="min-h-[140px]"
              />
              <div className="flex justify-end">
                <Button onClick={handleSaveMessage}>Salvar mensagem</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="glass-card border-blue-500/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {referrals.filter(r => r.status === 'new').length}
              </p>
              <p className="text-xs text-muted-foreground">Novos</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-warning/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">
                {referrals.filter(r => r.status === 'contacted').length}
              </p>
              <p className="text-xs text-muted-foreground">Contatados</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-success/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">
                {referrals.filter(r => r.status === 'converted').length}
              </p>
              <p className="text-xs text-muted-foreground">Convertidos</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">
                {referrals.filter(isClientReferral).length}
              </p>
              <p className="text-xs text-muted-foreground">Clientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Leads & Clients Lists */}
        <Card className="glass-card border-border/50">
          <CardHeader className="space-y-4">
            <CardTitle className="flex items-center gap-2 font-display">
              <Users className="h-5 w-5 text-primary" />
              {listType === 'clients' ? `Clientes (${filteredReferrals.length})` : `Leads (${filteredReferrals.length})`}
            </CardTitle>
            <Tabs
              value={listType}
              onValueChange={(value) => {
                const nextListType = value as 'leads' | 'clients';
                setListType(nextListType);
                updateSearchParams(
                  nextListType === 'clients' && filter === 'converted' ? 'converted-clients' : nextListType,
                  filter
                );
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="clients">Clientes</TabsTrigger>
              </TabsList>
            </Tabs>
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
                    className="p-4 rounded-lg bg-secondary/50 space-y-3"
                  >
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
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Indicado por <span className="text-foreground">{referral.referrer_name}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                      </span>
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
                    {/* Delete button - admin only */}
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar Conversão</DialogTitle>
            <DialogDescription>
              Selecione o plano vendido para {selectedReferral?.lead_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REWARD_PLANS).map(([id, plan]) => (
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
                  {selectedReferral?.referrer_name} receberá:
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
