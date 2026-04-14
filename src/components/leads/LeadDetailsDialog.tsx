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
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const tabVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

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

  const getStatusConfig = (item: Referral) => {
    if (item.is_client && item.status !== 'converted') {
      return { label: 'Cliente', color: 'bg-success/15 text-success border-success/30' };
    }
    switch (item.status) {
      case 'new': return { label: 'Novo', color: 'bg-info/20 text-info border-info/30' };
      case 'contacted': return { label: 'Contatado', color: 'bg-warning/20 text-warning border-warning/30' };
      case 'client': return { label: 'Cliente', color: 'bg-success/15 text-success border-success/30' };
      case 'converted': return { label: 'Convertido', color: 'bg-success/20 text-success border-success/30' };
      default: return { label: item.status, color: '' };
    }
  };

  const statusConfig = getStatusConfig(referral);
  const plan = referral.converted_plan_id ? getPlanById(referral.converted_plan_id) : null;

  const initials = referral.lead_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden p-0 gap-0">
        {/* Header with avatar */}
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/20 bg-gradient-to-b from-primary/[0.04] to-transparent">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl lavender-gradient flex items-center justify-center text-primary-foreground font-display font-semibold text-base shadow-lg shadow-primary/20">
                {initials}
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                referral.status === 'converted' || referral.is_client ? 'bg-success' :
                referral.status === 'contacted' ? 'bg-warning' : 'bg-info'
              )} />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogTitle className="font-display text-lg leading-tight">
                  {referral.lead_name}
                </DialogTitle>
                <Badge variant="outline" className={cn('text-[10px] font-semibold', statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
              </div>
              <DialogDescription className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {formatPhoneNumber(referral.lead_phone)}
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <UserCheck className="h-3 w-3" />
                  {referral.referrer_name}
                </span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 py-4">
            <TabsList className="grid w-full grid-cols-3 bg-secondary/30 h-9 p-0.5 rounded-xl">
              <TabsTrigger value="details" className="text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-sm">Detalhes</TabsTrigger>
              <TabsTrigger value="followup" className="text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-sm">Follow-up</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-sm">Histórico</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              <TabsContent value="details" className="mt-4" asChild forceMount={activeTab === 'details' ? true : undefined}>
                {activeTab === 'details' ? (
                  <motion.div key="details" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                    {/* Referrer card */}
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/[0.06] border border-primary/15">
                      <div className="w-9 h-9 rounded-lg lavender-gradient flex items-center justify-center shadow-sm shadow-primary/20 shrink-0">
                        <UserCheck className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Indicado por</p>
                        <p className="font-semibold text-sm truncate">{referral.referrer_name}</p>
                      </div>
                    </div>

                    {/* Info cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <InfoCard icon={CalendarDays} label="Entrada" value={new Date(referral.created_at).toLocaleDateString('pt-BR')} />
                      {referral.is_client && referral.client_since && (
                        <InfoCard icon={CheckCircle} label="Cliente desde" value={new Date(referral.client_since).toLocaleDateString('pt-BR')} accent />
                      )}
                      {plan && (
                        <InfoCard icon={CreditCard} label="Plano" value={plan.label} accent />
                      )}
                      <InfoCard icon={Sparkles} label="Pontos" value={String(referral.lead_points)} />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Etiquetas</label>
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
                                "px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-200",
                                isSelected
                                  ? option.className + " ring-1 ring-primary/20 shadow-sm scale-[1.02]"
                                  : "bg-secondary/20 text-muted-foreground/60 border-border/20 hover:border-primary/30 hover:bg-secondary/40 hover:text-muted-foreground"
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
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <FileText className="h-3 w-3" />
                          Observações
                        </label>
                        {hasSavedNotes && !editingNotes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2.5 text-[11px] text-muted-foreground hover:text-primary gap-1 rounded-lg"
                            onClick={() => setEditingNotes(true)}
                          >
                            <Pencil className="h-3 w-3" />
                            Editar
                          </Button>
                        )}
                      </div>

                      {hasSavedNotes && !editingNotes ? (
                        <div
                          className="rounded-xl bg-secondary/15 border border-border/15 p-3.5 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed cursor-pointer hover:bg-secondary/25 transition-all duration-200"
                          onClick={() => setEditingNotes(true)}
                        >
                          {referral.notes}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Adicione observações sobre este lead..."
                            className="min-h-[80px] bg-secondary/10 border-border/20 resize-none text-sm rounded-xl focus:border-primary/40"
                            autoFocus={editingNotes}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="gap-1.5 h-7 text-xs rounded-lg lavender-gradient text-primary-foreground"
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
                                className="h-7 text-xs text-muted-foreground rounded-lg"
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
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border/15">
                      {isAdmin && referral.status !== 'converted' && (
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-lg border-border/30 hover:border-success/40 hover:bg-success/10 hover:text-success" onClick={() => onWhatsApp(referral)}>
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                          <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                        </Button>
                      )}
                      {!referral.is_client && referral.status === 'new' && (
                        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-lg border-border/30 hover:border-warning/40 hover:bg-warning/10 hover:text-warning" onClick={() => onContact(referral)}>
                          <Clock className="h-3.5 w-3.5" />
                          Marcar Contatado
                        </Button>
                      )}
                      {referral.status !== 'converted' && (
                        <Button size="sm" className="gap-1.5 h-8 text-xs rounded-lg lavender-gradient text-primary-foreground font-medium shadow-md shadow-primary/20" onClick={() => onConvert(referral)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Converter Venda
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </TabsContent>

              <TabsContent value="followup" className="mt-4" asChild forceMount={activeTab === 'followup' ? true : undefined}>
                {activeTab === 'followup' ? (
                  <motion.div key="followup" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                    <FollowUpPicker referral={referral} userId={userId} userName={userName} onUpdate={onUpdate} />
                  </motion.div>
                ) : null}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4" asChild forceMount={activeTab === 'timeline' ? true : undefined}>
                {activeTab === 'timeline' ? (
                  <motion.div key="timeline" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                    <LeadTimeline referralId={referral.id} />
                  </motion.div>
                ) : null}
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-border/15 flex-row justify-between bg-card/50">
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={() => {
                onDelete(referral);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          ) : <span />}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="gap-1.5 text-xs px-5 rounded-lg border-border/30">
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

function InfoCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-1 transition-colors",
      accent
        ? "bg-primary/[0.06] border-primary/15"
        : "bg-secondary/15 border-border/15"
    )}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
        <Icon className={cn("h-3 w-3", accent && "text-primary")} />
        {label}
      </p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  );
}
