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
  Pencil,
  CalendarDays,
  UserCheck,
  FileText,
  CreditCard,
} from 'lucide-react';
import { EditLeadDialog } from './EditLeadDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LeadTimeline } from './LeadTimeline';
import { FollowUpPicker } from './FollowUpPicker';
import { updateLeadNotes } from '@/services/leadHistoryService';
import { formatPhoneNumber } from '@/utils/whatsapp';
import { getPlanById } from '@/config/plans';
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
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    setLocalTags(referral?.tags || []);
    setNotes(referral?.notes || '');
    setEditingNotes(false);
  }, [referral?.id, referral?.tags, referral?.notes]);

  const handleSaveNotes = async () => {
    if (!referral) return;
    setSaving(true);
    const result = await updateLeadNotes(referral.id, notes, userId, userName);
    setSaving(false);
    if (result.success) {
      toast.success('Observações salvas');
      setEditingNotes(false);
      onUpdate();
    } else {
      toast.error(result.error || 'Erro ao salvar');
    }
  };

  if (!referral) return null;

  const hasSavedNotes = !!(referral.notes && referral.notes.trim());
  const notesChanged = notes !== (referral.notes || '');

  const getStatusBadge = (item: Referral) => {
    if (item.is_client && item.status !== 'converted') {
      return <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[11px]">Cliente</Badge>;
    }
    switch (item.status) {
      case 'new':
        return <Badge variant="outline" className="bg-info/20 text-info border-info/30 text-[11px]">Novo</Badge>;
      case 'contacted':
        return <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-[11px]">Contatado</Badge>;
      case 'client':
        return <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[11px]">Cliente</Badge>;
      case 'converted':
        return <Badge variant="outline" className="bg-success/20 text-success border-success/30 text-[11px]">Convertido</Badge>;
    }
  };

  const getTagBadge = (tag: string) => {
    const tagOption = contactTagOptions.find(option => option.value === tag);
    if (!tagOption) return null;
    return (
      <Badge key={tag} variant="outline" className={cn('text-[11px]', tagOption.className)}>
        {tagOption.label}
      </Badge>
    );
  };

  const plan = referral.converted_plan_id ? getPlanById(referral.converted_plan_id) : null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/30">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="font-display text-lg leading-tight">
                  {referral.lead_name}
                </DialogTitle>
                {getStatusBadge(referral)}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                  onClick={() => setEditDialogOpen(true)}
                  title="Editar lead"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <DialogDescription className="flex items-center gap-1.5 text-xs">
                <Phone className="h-3 w-3" />
                {formatPhoneNumber(referral.lead_phone)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-5 py-4">
            <TabsList className="grid w-full grid-cols-3 bg-secondary/40 h-9">
              <TabsTrigger value="details" className="text-xs">Detalhes</TabsTrigger>
              <TabsTrigger value="followup" className="text-xs">Follow-up</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Info cards */}
              <div className="grid grid-cols-2 gap-2">
                <InfoCard icon={UserCheck} label="Indicado por" value={referral.referrer_name} />
                <InfoCard icon={CalendarDays} label="Entrada" value={new Date(referral.created_at).toLocaleDateString('pt-BR')} />
                {referral.is_client && referral.client_since && (
                  <InfoCard icon={CheckCircle} label="Cliente desde" value={new Date(referral.client_since).toLocaleDateString('pt-BR')} />
                )}
                {plan && (
                  <InfoCard icon={CreditCard} label="Plano" value={plan.label} />
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tags</label>
                <div className="flex flex-wrap gap-1.5">
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
                          "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all duration-150",
                          isSelected
                            ? option.className + " ring-1 ring-primary/30 shadow-sm"
                            : "bg-secondary/30 text-muted-foreground/70 border-border/30 hover:border-border/60 hover:bg-secondary/50"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes section — clear saved vs editing state */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Observações internas
                  </label>
                  {hasSavedNotes && !editingNotes && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => setEditingNotes(true)}
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Button>
                  )}
                </div>

                {/* Show saved notes as readonly when not editing */}
                {hasSavedNotes && !editingNotes ? (
                  <div
                    className="rounded-lg bg-secondary/20 border border-border/30 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setEditingNotes(true)}
                  >
                    {referral.notes}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Adicione observações sobre este lead..."
                      className="min-h-[80px] bg-background/50 resize-none text-sm"
                      autoFocus={editingNotes}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                        onClick={handleSaveNotes}
                        disabled={saving || !notesChanged}
                      >
                        <Save className="h-3 w-3" />
                        {saving ? 'Salvando...' : 'Salvar'}
                      </Button>
                      {editingNotes && hasSavedNotes && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => {
                            setNotes(referral.notes || '');
                            setEditingNotes(false);
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/20">
                {isAdmin && referral.status !== 'converted' && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => onWhatsApp(referral)}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                    <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                  </Button>
                )}
                {!referral.is_client && referral.status === 'new' && (
                  <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs" onClick={() => onContact(referral)}>
                    <Clock className="h-3.5 w-3.5" />
                    Marcar Contatado
                  </Button>
                )}
                {referral.status !== 'converted' && (
                  <Button size="sm" className="gap-1.5 h-8 text-xs lavender-gradient text-primary-foreground font-medium" onClick={() => onConvert(referral)}>
                    <CheckCircle className="h-3.5 w-3.5" />
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
        <DialogFooter className="px-5 py-3 border-t border-border/30 flex-row justify-between bg-secondary/10">
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive/60 hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                onDelete(referral);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          ) : <span />}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5 text-xs px-4">
            <X className="h-3.5 w-3.5" />
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

/** Small info card used in the details tab */
function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/20 border border-border/20 p-2.5 space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
