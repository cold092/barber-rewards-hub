import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, 
  Phone,
  MessageCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllReferrals, markAsContacted, confirmConversion, updateContactTag } from '@/services/referralService';
import { REWARD_PLANS, getPlanById } from '@/config/plans';
import { generateWhatsAppLink, formatPhoneNumber } from '@/utils/whatsapp';
import type { Referral } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

export default function Leads() {
  const { isAdmin } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'converted'>('all');
  
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
    setReferrals(result.data);
    setLoading(false);
  };

  useEffect(() => {
    loadReferrals();
  }, []);

  const filteredReferrals = referrals.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
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

  const openWhatsApp = (referral: Referral) => {
    const link = generateWhatsAppLink(
      referral.lead_name,
      referral.lead_phone,
      referral.referrer_name
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
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
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
        </div>

        {/* Leads List */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Users className="h-5 w-5 text-primary" />
              Lista de Leads ({filteredReferrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReferrals.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum lead encontrado
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
