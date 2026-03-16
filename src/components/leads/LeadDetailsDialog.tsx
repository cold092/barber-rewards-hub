import { useState, useEffect } from 'react';
import { 
  Phone, 
  MessageCircle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  Trash2,
  Save,
  X,
  User,
  Pencil
} from 'lucide-react';
import { EditLeadDialog } from './EditLeadDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LeadTimeline } from './LeadTimeline';
import { FollowUpPicker } from './FollowUpPicker';
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
  const [localTags, setLocalTags] = useState<string[]>(referral?.tags || []);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    setLocalTags(referral?.tags || []);
  }, [referral?.id, referral?.tags]);

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

  const getStatusBadge = (item: Referral) => {
    if (item.is_client && item.status !== 'converted') {
      return <Badge variant="outline" className="bg-success/15 text-success border-success/30">Cliente</Badge>;
    }
    switch (item.status) {
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/15 shrink-0 mt-0.5">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display text-xl flex items-center gap-2.5 flex-wrap">
                {referral.lead_name}
                {getStatusBadge(referral)}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Phone className="h-3.5 w-3.5" />
                {formatPhoneNumber(referral.lead_phone)}
              </DialogDescription>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => setEditDialogOpen(true)}
                title="Editar lead"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 py-4">
            <TabsList className="grid w-full grid-cols-3 bg-secondary/40">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="followup">Follow-up</TabsTrigger>
              <TabsTrigger value="timeline">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-5 mt-5">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Indicado por', value: referral.referrer_name },
                  { label: 'Data de entrada', value: new Date(referral.created_at).toLocaleDateString('pt-BR') },
                  ...(referral.is_client && referral.client_since ? [{ label: 'Cliente desde', value: new Date(referral.client_since).toLocaleDateString('pt-BR') }] : []),
                  ...(referral.converted_plan_id ? [{ label: 'Plano convertido', value: getPlanById(referral.converted_plan_id)?.label }] : []),
                ].map((item, i) => (
                  <div key={i} className="rounded-lg bg-secondary/30 border border-border/30 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Tags display */}
              {localTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {localTags.map(tag => {
                    const tagBadge = getTagBadge(tag);
                    return tagBadge ? <span key={tag}>{tagBadge}</span> : null;
                  })}
                  {referral.is_client && (
                    <Badge variant="outline" className="bg-success/15 text-success border-success/30">
                      Cliente
                    </Badge>
                  )}
                </div>
              )}

              {/* Multi-Tag Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {contactTagOptions.map((option) => {
                    const isSelected = localTags.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          const newTags = isSelected
                            ? localTags.filter(t => t !== option.value)
                            : [...localTags, option.value];
                          setLocalTags(newTags);
                          onTagChange(referral, newTags.join(','));
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                          isSelected
                            ? option.className + " ring-2 ring-primary/30 shadow-sm"
                            : "bg-secondary/40 text-muted-foreground border-border/40 hover:border-primary/30 hover:bg-secondary/60"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações internas</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações sobre este lead..."
                  className="min-h-[100px] bg-background/50 resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleSaveNotes}
                  disabled={saving || notes === (referral.notes || '')}
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Salvando...' : 'Salvar observações'}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border/30">
                {isAdmin && referral.status !== 'converted' && (
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => onWhatsApp(referral)}>
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                {!referral.is_client && referral.status === 'new' && (
                  <Button size="sm" variant="secondary" className="gap-2" onClick={() => onContact(referral)}>
                    <Clock className="h-4 w-4" />
                    Marcar Contatado
                  </Button>
                )}
                {referral.status !== 'converted' && (
                  <Button size="sm" className="gap-2 lavender-gradient text-primary-foreground font-medium" onClick={() => onConvert(referral)}>
                    <CheckCircle className="h-4 w-4" />
                    Converter Venda
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="followup" className="mt-4">
              <FollowUpPicker referral={referral} userId={userId} userName={userName} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <LeadTimeline referralId={referral.id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/40 flex-col sm:flex-row gap-2 bg-secondary/20">
          {isAdmin && (
            <Button
              variant="ghost"
              className="gap-2 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete(referral);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir Lead
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6">
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {referral && (
        <EditLeadDialog
          referral={referral}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={() => {
            onUpdate();
            onOpenChange(false);
          }}
          contactTagOptions={contactTagOptions}
          userId={userId}
          userName={userName}
        />
      )}
    </>
  );
}
