import { useState, useEffect } from 'react';
import {
  Phone,
  MessageCircle,
  CheckCircle,
  Clock,
  Trash2,
  Save,
  User,
  Pencil,
  CalendarDays,
  UserCheck,
  FileText,
  CreditCard,
  Sparkles,
  Info,
  Bell,
  History,
  Copy,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EditLeadDialog } from './EditLeadDialog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LeadTimeline } from './LeadTimeline';
import { FollowUpPicker } from './FollowUpPicker';
import { updateLeadNotes } from '@/services/leadHistoryService';
import { formatPhoneNumber } from '@/utils/whatsapp';
import { getPlanById } from '@/config/plans';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

type TabKey = 'details' | 'followup' | 'timeline';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'details', label: 'Detalhes', icon: Info },
  { key: 'followup', label: 'Follow-up', icon: Bell },
  { key: 'timeline', label: 'Histórico', icon: History },
];

const tabVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
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
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [localTags, setLocalTags] = useState<string[]>(referral?.tags || []);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [referringClientName, setReferringClientName] = useState<string | null>(null);
  const [phoneCopied, setPhoneCopied] = useState(false);

  useEffect(() => {
    setLocalTags(referral?.tags || []);
    setNotes(referral?.notes || '');
    setEditingNotes(false);
    setActiveTab('details');
  }, [referral?.id, referral?.tags, referral?.notes]);

  useEffect(() => {
    if (!referral?.referred_by_lead_id) {
      setReferringClientName(null);
      return;
    }
    supabase
      .from('referrals')
      .select('lead_name')
      .eq('id', referral.referred_by_lead_id)
      .single()
      .then(({ data }) => {
        setReferringClientName(data?.lead_name || null);
      });
  }, [referral?.referred_by_lead_id]);

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

  const handleCopyPhone = async () => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.lead_phone);
      setPhoneCopied(true);
      toast.success('Telefone copiado');
      setTimeout(() => setPhoneCopied(false), 1600);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  if (!referral) return null;

  const hasSavedNotes = !!(referral.notes && referral.notes.trim());
  const notesChanged = notes !== (referral.notes || '');

  const getStatusConfig = (item: Referral) => {
    if (item.is_client && item.status !== 'converted') {
      return { label: 'Cliente', color: 'bg-success/15 text-success border-success/30', dot: 'bg-success' };
    }
    switch (item.status) {
      case 'new': return { label: 'Novo', color: 'bg-info/15 text-info border-info/30', dot: 'bg-info' };
      case 'contacted': return { label: 'Contatado', color: 'bg-warning/15 text-warning border-warning/30', dot: 'bg-warning' };
      case 'client': return { label: 'Cliente', color: 'bg-success/15 text-success border-success/30', dot: 'bg-success' };
      case 'converted': return { label: 'Convertido', color: 'bg-success/15 text-success border-success/30', dot: 'bg-success' };
      default: return { label: item.status, color: '', dot: 'bg-muted-foreground' };
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

  const followUpDate = referral.follow_up_date ? new Date(referral.follow_up_date) : null;
  const followUpOverdue = followUpDate ? isPast(followUpDate) && !isToday(followUpDate) : false;
  const followUpToday = followUpDate ? isToday(followUpDate) : false;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden p-0 gap-0 border-border/40">
          {/* ── HEADER ── */}
          <div className="relative px-6 pt-5 pb-4 border-b border-border/40 bg-gradient-to-br from-primary/[0.05] via-transparent to-accent/[0.04]">
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl blue-gradient flex items-center justify-center text-primary-foreground font-display font-bold text-lg shadow-blue">
                  {initials}
                </div>
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card",
                  statusConfig.dot
                )} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="font-display text-xl leading-tight truncate">
                    {referral.lead_name}
                  </DialogTitle>
                  <Badge variant="outline" className={cn('text-[10px] font-semibold h-5', statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <DialogDescription className="sr-only">Detalhes do lead</DialogDescription>

                {/* Quick contact line */}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="inline-flex items-center gap-1.5 hover:text-primary transition-colors group"
                    title="Copiar telefone"
                  >
                    <Phone className="h-3 w-3" />
                    <span className="font-medium">{formatPhoneNumber(referral.lead_phone)}</span>
                    {phoneCopied
                      ? <Check className="h-3 w-3 text-success" />
                      : <Copy className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    }
                  </button>
                  <span className="text-border">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck className="h-3 w-3" />
                    {referral.referrer_name}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setEditDialogOpen(true)}
                title="Editar dados do lead"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Primary action bar */}
            <div className="flex items-center gap-1.5 mt-4">
              {referral.status !== 'converted' && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs rounded-lg bg-success text-success-foreground hover:bg-success/90 shadow-sm"
                  onClick={() => onWhatsApp(referral)}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </Button>
              )}
              {!referral.is_client && referral.status === 'new' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs rounded-lg border-warning/30 text-warning hover:bg-warning/10 hover:text-warning"
                  onClick={() => onContact(referral)}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Marcar Contatado
                </Button>
              )}
              {referral.status !== 'converted' && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs rounded-lg blue-gradient text-primary-foreground font-medium blue-glow"
                  onClick={() => onConvert(referral)}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Converter Venda
                </Button>
              )}
              {followUpDate && (
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-auto h-7 gap-1 text-[10px] font-medium px-2",
                    followUpOverdue ? "bg-destructive/10 text-destructive border-destructive/30" :
                    followUpToday ? "bg-warning/10 text-warning border-warning/30" :
                    "bg-muted text-muted-foreground border-border/40"
                  )}
                >
                  <Bell className="h-3 w-3" />
                  Follow-up {format(followUpDate, 'dd/MM', { locale: ptBR })}
                </Badge>
              )}
            </div>
          </div>

          {/* ── BODY: 2-column layout (sidebar stats + main content) ── */}
          <div className="flex flex-col md:flex-row overflow-hidden" style={{ maxHeight: 'calc(92vh - 220px)' }}>
            {/* Sidebar stats */}
            <aside className="md:w-[200px] shrink-0 border-b md:border-b-0 md:border-r border-border/40 bg-secondary/20 p-4 space-y-2.5 overflow-y-auto">
              <StatRow icon={Sparkles} label="Pontos" value={String(referral.lead_points)} accent />
              <StatRow icon={CalendarDays} label="Entrada" value={new Date(referral.created_at).toLocaleDateString('pt-BR')} />
              {referral.is_client && referral.client_since && (
                <StatRow icon={CheckCircle} label="Cliente desde" value={new Date(referral.client_since).toLocaleDateString('pt-BR')} success />
              )}
              {plan && (
                <StatRow icon={CreditCard} label="Plano" value={plan.label} success />
              )}
              {referringClientName && (
                <div className="rounded-lg p-2.5 bg-success/[0.07] border border-success/20">
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-bold text-success/80">
                    <User className="h-2.5 w-2.5" />
                    Indicado pelo cliente
                  </div>
                  <p className="text-[12px] font-semibold text-foreground mt-1 truncate">{referringClientName}</p>
                </div>
              )}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Custom tabs */}
              <div className="flex items-center gap-1 px-4 pt-3 border-b border-border/30">
                {TABS.map(({ key, label, icon: Icon }) => {
                  const active = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        "relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                      {active && (
                        <motion.span
                          layoutId="lead-tab-indicator"
                          className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                  {activeTab === 'details' && (
                    <motion.div key="details" variants={tabVariants} initial="hidden" animate="visible" exit="exit" className="space-y-5">
                      {/* Tags */}
                      <section className="space-y-2">
                        <SectionLabel>Etiquetas</SectionLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {contactTagOptions.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Nenhuma etiqueta configurada</p>
                          )}
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
                                  "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all",
                                  isSelected
                                    ? option.className + " ring-1 ring-primary/20 shadow-sm"
                                    : "bg-secondary/30 text-muted-foreground border-border/40 hover:border-primary/30 hover:text-foreground"
                                )}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      {/* Notes */}
                      <section className="space-y-2">
                        <div className="flex items-center justify-between">
                          <SectionLabel icon={FileText}>Observações</SectionLabel>
                          {hasSavedNotes && !editingNotes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary gap-1 rounded-md"
                              onClick={() => setEditingNotes(true)}
                            >
                              <Pencil className="h-3 w-3" />
                              Editar
                            </Button>
                          )}
                        </div>

                        {hasSavedNotes && !editingNotes ? (
                          <div
                            className="rounded-lg bg-secondary/30 border border-border/40 p-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed cursor-text hover:border-primary/30 transition-colors"
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
                              className="min-h-[88px] bg-card border-border/50 resize-none text-sm rounded-lg focus:border-primary/40"
                              autoFocus={editingNotes}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="gap-1.5 h-7 text-xs rounded-md blue-gradient text-primary-foreground"
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
                                  className="h-7 text-xs text-muted-foreground rounded-md"
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
                      </section>
                    </motion.div>
                  )}

                  {activeTab === 'followup' && (
                    <motion.div key="followup" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                      <FollowUpPicker referral={referral} userId={userId} userName={userName} onUpdate={onUpdate} />
                    </motion.div>
                  )}

                  {activeTab === 'timeline' && (
                    <motion.div key="timeline" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                      <LeadTimeline referralId={referral.id} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="px-6 py-3 border-t border-border/40 flex items-center justify-between bg-card/60">
            {isAdmin ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                onClick={() => {
                  onDelete(referral);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            ) : <span />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs px-5 rounded-md border-border/50"
            >
              Fechar
            </Button>
          </div>
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

function SectionLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ElementType }) {
  return (
    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </p>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
  accent,
  success,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
  success?: boolean;
}) {
  const tone = success
    ? 'bg-success/10 text-success'
    : accent
      ? 'bg-primary/10 text-primary'
      : 'bg-muted text-muted-foreground';
  return (
    <div className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-card/60 transition-colors">
      <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", tone)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70">{label}</p>
        <p className="text-[13px] font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
