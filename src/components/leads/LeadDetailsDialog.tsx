import { useState } from 'react';
import { 
  Phone, 
  MessageCircle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LeadTimeline } from './LeadTimeline';
import { updateLeadNotes } from '@/services/leadHistoryService';
import { formatPhoneNumber } from '@/utils/whatsapp';
import { getPlanById, getRewardPlans } from '@/config/plans';
import type { Referral } from '@/types/database';

interface LeadDetailsDialogProps {
  referral: Referral | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWhatsApp: (referral: Referral) => void;
  onContact: (referral: Referral) => void;
  onConvert: (referral: Referral) => void;
  onTagChange: (referral: Referral, tag: string) => void;
  onDelete: (referral: Referral) => void;
  onUpdate: () => void;
  isAdmin: boolean;
  userId?: string;
  userName?: string;
  contactTagOptions: Array<{ value: string; label: string; className: string }>;
}

export function LeadDetailsDialog({
  referral,
  open,
  onOpenChange,
  onWhatsApp,
  onContact,
  onConvert,
  onTagChange,
  onDelete,
  onUpdate,
  isAdmin,
  userId,
  userName,
  contactTagOptions
}: LeadDetailsDialogProps) {
  const [notes, setNotes] = useState(referral?.notes || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const handleSaveNotes = async () => {
    if (!referral) return;
    
    setSaving(true);
    const result = await updateLeadNotes(referral.id, notes, userId, userName);
    setSaving(false);

    if (result.success) {
      toast.success('Observações salvas');
      onUpdate();
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  if (!referral) return null;

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

  const getTagBadge = (tag: string | null) => {
    if (!tag) return null;
    const tagOption = contactTagOptions.find(option => option.value === tag);
    if (!tagOption) return null;
    return (
      <Badge variant="outline" className={tagOption.className}>
        {tagOption.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-3">
            {referral.lead_name}
            {getStatusBadge(referral.status)}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {formatPhoneNumber(referral.lead_phone)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="timeline">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Lead Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Indicado por</p>
                <p className="font-medium">{referral.referrer_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data de entrada</p>
                <p className="font-medium">{new Date(referral.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              {referral.is_client && referral.client_since && (
                <div>
                  <p className="text-muted-foreground">Cliente desde</p>
                  <p className="font-medium">{new Date(referral.client_since).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              {referral.converted_plan_id && (
                <div>
                  <p className="text-muted-foreground">Plano convertido</p>
                  <p className="font-medium">{getPlanById(referral.converted_plan_id)?.label}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 items-center">
              {getTagBadge(referral.contact_tag)}
              {referral.is_client && (
                <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                  Cliente
                </Badge>
              )}
            </div>

            {/* Tag Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tag de contato</label>
              <Select
                value={referral.contact_tag ?? 'none'}
                onValueChange={(value) => onTagChange(referral, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma tag" />
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

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações internas</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre este lead..."
                className="min-h-[100px]"
              />
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleSaveNotes}
                disabled={saving || notes === (referral.notes || '')}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar observações'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
              {isAdmin && referral.status !== 'converted' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => onWhatsApp(referral)}
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
                  onClick={() => onContact(referral)}
                >
                  <Clock className="h-4 w-4" />
                  Marcar Contatado
                </Button>
              )}

              {referral.status !== 'converted' && (
                <Button
                  size="sm"
                  className="gap-2 gold-gradient text-primary-foreground"
                  onClick={() => onConvert(referral)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Converter Venda
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <LeadTimeline referralId={referral.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          {isAdmin && (
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete(referral);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir Lead
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
