import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings as SettingsIcon,
  Tag,
  CreditCard,
  MessageSquare,
  Columns3,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Sparkles,
  Zap,
  Crown,
  Star,
  GripVertical,
  Info,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTagConfig } from '@/contexts/TagConfigContext';
import { getRewardPlans, REWARD_PLANS, PLAN_OVERRIDES_STORAGE_KEY, setPlanOverridesCache, REFERRAL_BONUS_POINTS, BARBER_REFERRAL_CONVERSION_PERCENT, getTierBadgeClass } from '@/config/plans';
import { DEFAULT_LEAD_MESSAGE, DEFAULT_CLIENT_MESSAGE } from '@/utils/whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { ColumnConfig } from '@/components/leads/ColumnManager';
import { upsertSetting, getGlobalSetting } from '@/services/settingsService';
import { motion, AnimatePresence } from 'framer-motion';

const LEAD_MESSAGE_STORAGE_KEY = 'leadMessageTemplate';
const CLIENT_MESSAGE_STORAGE_KEY = 'clientMessageTemplate';
const LEADS_COLUMNS_KEY = 'leadsKanbanColumns';
const CLIENT_COLUMNS_KEY = 'clientKanbanColumns';

type PlanDraft = Record<string, { points: string; price: string }>;

const DEFAULT_LEAD_COLUMNS: ColumnConfig[] = [
  { id: 'new', title: 'Novos', color: 'bg-info/10', isDefault: true },
  { id: 'contacted', title: 'Contatados', color: 'bg-warning/10', isDefault: true },
  { id: 'converted', title: 'Convertidos', color: 'bg-success/10', isDefault: true },
];

const DEFAULT_CLIENT_COLUMNS: ColumnConfig[] = [
  { id: 'active', title: 'Ativos', color: 'bg-success/10', isDefault: true },
  { id: 'vip', title: 'VIP', color: 'bg-primary/10', isDefault: true },
  { id: 'inactive', title: 'Inativos', color: 'bg-muted', isDefault: true },
];

const tierIcons = { prata: Star, gold: Crown, vip: Zap } as const;
const tierLabels = { prata: 'Prata', gold: 'Gold', vip: 'VIP' } as const;

function SectionHeader({ icon: Icon, title, description }: { icon: typeof Tag; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 pb-1">
      <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="font-display font-semibold text-base text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { isAdmin, user } = useAuth();
  const { tags, presetColors, addTag, updateTag, removeTag, resetToDefaults } = useTagConfig();

  const [planDraft, setPlanDraft] = useState<PlanDraft>({});
  const [leadMessageDraft, setLeadMessageDraft] = useState('');
  const [clientMessageDraft, setClientMessageDraft] = useState('');
  const [leadColumns, setLeadColumns] = useState<ColumnConfig[]>([]);
  const [clientColumns, setClientColumns] = useState<ColumnConfig[]>([]);
  const [newLeadColTitle, setNewLeadColTitle] = useState('');
  const [newClientColTitle, setNewClientColTitle] = useState('');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState(presetColors[0].className);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const dbPlans = await getGlobalSetting<Record<string, { points: number; price: number }>>('plan_overrides');
      const plans = dbPlans || getRewardPlans();
      const entries = dbPlans
        ? Object.entries(REWARD_PLANS).map(([id]) => [id, { points: String(dbPlans[id]?.points ?? REWARD_PLANS[id].points), price: String(dbPlans[id]?.price ?? REWARD_PLANS[id].price) }])
        : Object.entries(plans).map(([id, p]) => [id, { points: String(p.points), price: String(p.price) }]);
      if (!cancelled) setPlanDraft(Object.fromEntries(entries));

      const dbLeadMsg = await getGlobalSetting<string>('lead_message');
      if (!cancelled) setLeadMessageDraft(dbLeadMsg || localStorage.getItem(LEAD_MESSAGE_STORAGE_KEY) || DEFAULT_LEAD_MESSAGE);

      const dbClientMsg = await getGlobalSetting<string>('client_message');
      if (!cancelled) setClientMessageDraft(dbClientMsg || localStorage.getItem(CLIENT_MESSAGE_STORAGE_KEY) || DEFAULT_CLIENT_MESSAGE);

      const dbLeadCols = await getGlobalSetting<ColumnConfig[]>('lead_columns');
      if (!cancelled) setLeadColumns(dbLeadCols || JSON.parse(localStorage.getItem(LEADS_COLUMNS_KEY) || 'null') || DEFAULT_LEAD_COLUMNS);

      const dbClientCols = await getGlobalSetting<ColumnConfig[]>('client_columns');
      if (!cancelled) setClientColumns(dbClientCols || JSON.parse(localStorage.getItem(CLIENT_COLUMNS_KEY) || 'null') || DEFAULT_CLIENT_COLUMNS);
    })();

    return () => { cancelled = true; };
  }, [user]);

  // --- Plans ---
  const handlePlanChange = (planId: string, field: 'points' | 'price', value: string) => {
    setPlanDraft(prev => ({ ...prev, [planId]: { ...prev[planId], [field]: value } }));
  };

  const handleSavePlans = async () => {
    const overrides = Object.fromEntries(
      Object.entries(planDraft).map(([id, v]) => {
        const base = REWARD_PLANS[id];
        const points = v.points.trim() === '' ? base.points : Number(v.points);
        const price = v.price.trim() === '' ? base.price : Number(v.price);
        return [id, { points: Number.isFinite(points) ? points : base.points, price: Number.isFinite(price) ? price : base.price }];
      })
    );
    setPlanOverridesCache(overrides);
    localStorage.setItem(PLAN_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    if (user) await upsertSetting(user.id, 'plan_overrides', overrides);
    toast.success('Planos salvos com sucesso');
  };

  // --- Messages ---
  const handleSaveLeadMessage = async () => {
    const msg = leadMessageDraft.trim() || DEFAULT_LEAD_MESSAGE;
    localStorage.setItem(LEAD_MESSAGE_STORAGE_KEY, msg);
    setLeadMessageDraft(msg);
    if (user) await upsertSetting(user.id, 'lead_message', msg);
    toast.success('Mensagem para leads salva');
  };

  const handleSaveClientMessage = async () => {
    const msg = clientMessageDraft.trim() || DEFAULT_CLIENT_MESSAGE;
    localStorage.setItem(CLIENT_MESSAGE_STORAGE_KEY, msg);
    setClientMessageDraft(msg);
    if (user) await upsertSetting(user.id, 'client_message', msg);
    toast.success('Mensagem para clientes salva');
  };

  // --- Tags ---
  const handleAddTag = () => {
    const label = newTagLabel.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (tags.some(t => t.value === value)) {
      toast.error('Tag já existe');
      return;
    }
    addTag({ value, label, className: newTagColor });
    setNewTagLabel('');
    toast.success('Tag adicionada');
  };

  // --- Columns ---
  const saveLeadColumns = async (cols: ColumnConfig[]) => {
    setLeadColumns(cols);
    localStorage.setItem(LEADS_COLUMNS_KEY, JSON.stringify(cols));
    if (user) await upsertSetting(user.id, 'lead_columns', cols);
  };

  const saveClientColumns = async (cols: ColumnConfig[]) => {
    setClientColumns(cols);
    localStorage.setItem(CLIENT_COLUMNS_KEY, JSON.stringify(cols));
    if (user) await upsertSetting(user.id, 'client_columns', cols);
  };

  const addLeadColumn = () => {
    const title = newLeadColTitle.trim();
    if (!title) return;
    const id = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    saveLeadColumns([...leadColumns, { id, title, color: 'bg-muted', isDefault: false }]);
    setNewLeadColTitle('');
    toast.success('Coluna adicionada');
  };

  const addClientColumn = () => {
    const title = newClientColTitle.trim();
    if (!title) return;
    const id = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    saveClientColumns([...clientColumns, { id, title, color: 'bg-muted', isDefault: false }]);
    setNewClientColTitle('');
    toast.success('Coluna adicionada');
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl lavender-gradient lavender-glow">
            <SettingsIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              <span className="lavender-text">Configurações</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tags, planos, mensagens e colunas do CRM
            </p>
          </div>
        </div>

        <Tabs defaultValue="tags" className="space-y-6" onValueChange={() => {}}>
          <TabsList className="glass-card p-1 h-auto gap-1">
            <TabsTrigger value="tags" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5 transition-all">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Etiquetas</span>
              <span className="sm:hidden">Tags</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5 transition-all">
              <CreditCard className="h-4 w-4" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5 transition-all">
              <MessageSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-2 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg px-4 py-2.5 transition-all">
              <Columns3 className="h-4 w-4" />
              Colunas
            </TabsTrigger>
          </TabsList>

          {/* ===== TAGS ===== */}
          <TabsContent value="tags" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass-card rounded-2xl overflow-hidden"
            >
              <div className="px-6 pt-6 pb-4">
                <SectionHeader icon={Tag} title="Etiquetas (Tags)" description="Tags usadas para classificar Leads e conversas do WhatsApp." />
              </div>

              <div className="px-6 pb-6 space-y-2">
                <AnimatePresence mode="popLayout">
                  {tags.map((tag, i) => (
                    <motion.div
                      key={tag.value}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: i * 0.02 }}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30 hover:border-border/60 transition-all duration-200"
                    >
                      <Badge variant="outline" className={cn("text-xs font-medium shrink-0 min-w-[56px] justify-center", tag.className)}>
                        {tag.label}
                      </Badge>
                      <Input
                        value={tag.label}
                        onChange={(e) => updateTag(tag.value, { label: e.target.value })}
                        className="h-9 flex-1 text-sm bg-background/40 border-border/30 focus:border-primary/40"
                      />
                      <Select value={tag.className} onValueChange={(val) => updateTag(tag.value, { className: val })}>
                        <SelectTrigger className="h-9 w-[120px] bg-background/40 border-border/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {presetColors.map((c) => (
                            <SelectItem key={c.className} value={c.className}>
                              <Badge variant="outline" className={cn("text-[10px]", c.className)}>
                                {c.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                        onClick={() => { removeTag(tag.value); toast.success('Tag removida'); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add new */}
                <motion.div layout className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] mt-3">
                  <Sparkles className="h-4 w-4 text-primary/40 shrink-0" />
                  <Input
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    placeholder="Nova tag..."
                    className="h-9 flex-1 text-sm bg-background/40 border-border/30 focus:border-primary/40"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Select value={newTagColor} onValueChange={setNewTagColor}>
                    <SelectTrigger className="h-9 w-[120px] bg-background/40 border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {presetColors.map((c) => (
                        <SelectItem key={c.className} value={c.className}>
                          <Badge variant="outline" className={cn("text-[10px]", c.className)}>
                            {c.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors rounded-lg"
                    onClick={handleAddTag}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>

              <div className="px-6 py-3.5 border-t border-border/20 bg-secondary/10 flex justify-end">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => { resetToDefaults(); toast.success('Tags restauradas'); }}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar padrão
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* ===== PLANOS ===== */}
          <TabsContent value="plans" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <SectionHeader icon={CreditCard} title="Planos de Recompensa" description="Configure pontos e valores. Alterações são aplicadas globalmente para toda a equipe." />
              </div>

              <div className="px-6 pb-6 space-y-6">
                {/* Info banner */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p>
                      <span className="font-semibold text-foreground">Bônus por indicação:</span> {REFERRAL_BONUS_POINTS} pts (automático ao registrar lead)
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Comissão do colaborador:</span> {BARBER_REFERRAL_CONVERSION_PERCENT}% dos pontos do plano em indicações em cadeia
                    </p>
                  </div>
                </div>

                {/* Plans grouped by tier */}
                {(['prata', 'gold', 'vip'] as const).map((tier) => {
                  const tierPlans = Object.entries(REWARD_PLANS).filter(([, p]) => p.tier === tier);
                  const TierIcon = tierIcons[tier];
                  return (
                    <div key={tier} className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <TierIcon className={cn(
                          "h-4 w-4",
                          tier === 'prata' ? 'text-muted-foreground' : tier === 'gold' ? 'text-amber-400' : 'text-primary'
                        )} />
                        <Badge variant="outline" className={cn('text-xs font-semibold px-3 py-0.5', getTierBadgeClass(tier))}>
                          {tierLabels[tier]}
                        </Badge>
                        <div className="flex-1 h-px bg-gradient-to-r from-border/40 to-transparent" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {tierPlans.map(([planId, plan]) => {
                          const draft = planDraft[planId];
                          const currentPoints = draft?.points ? Number(draft.points) : plan.points;
                          const barberShare = Math.round((currentPoints * BARBER_REFERRAL_CONVERSION_PERCENT) / 100);
                          return (
                            <div key={planId} className="rounded-xl border border-border/30 bg-secondary/20 p-4 space-y-3 hover:border-border/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">{plan.type === 'corte' ? '✂️ Corte' : '💇 Completo'}</p>
                                <span className="text-[10px] font-medium text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                                  Comissão: {barberShare} pts
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 space-y-1.5">
                                  <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pontos</label>
                                  <Input
                                    type="number"
                                    value={draft?.points ?? String(plan.points)}
                                    onChange={(e) => handlePlanChange(planId, 'points', e.target.value)}
                                    className="h-9 text-sm bg-background/40 border-border/30 focus:border-primary/40"
                                  />
                                </div>
                                <div className="flex-1 space-y-1.5">
                                  <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Valor R$</label>
                                  <Input
                                    type="number"
                                    value={draft?.price ?? String(plan.price)}
                                    onChange={(e) => handlePlanChange(planId, 'price', e.target.value)}
                                    className="h-9 text-sm bg-background/40 border-border/30 focus:border-primary/40"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 py-4 border-t border-border/20 bg-secondary/10 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground/60">
                  Salvo globalmente para toda a organização
                </p>
                <Button className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity" onClick={handleSavePlans}>
                  <Save className="h-4 w-4" />
                  Salvar planos
                </Button>
              </div>
            </motion.div>
          </TabsContent>
          <TabsContent value="messages" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <SectionHeader icon={MessageSquare} title="Templates de Mensagem" description="Personalize com {leadName} e {barberName}." />
              </div>

              <div className="px-6 pb-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-info" />
                    <p className="text-sm font-semibold text-foreground">Mensagem para Leads</p>
                  </div>
                  <Textarea
                    value={leadMessageDraft}
                    onChange={(e) => setLeadMessageDraft(e.target.value)}
                    className="min-h-[130px] bg-background/40 border-border/30 focus:border-primary/40 rounded-xl resize-none"
                  />
                  <div className="flex justify-end">
                    <Button variant="outline" className="gap-2 text-sm border-border/40 hover:border-primary/40 hover:bg-primary/5" onClick={handleSaveLeadMessage}>
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </Button>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <p className="text-sm font-semibold text-foreground">Mensagem para Clientes</p>
                  </div>
                  <Textarea
                    value={clientMessageDraft}
                    onChange={(e) => setClientMessageDraft(e.target.value)}
                    className="min-h-[130px] bg-background/40 border-border/30 focus:border-primary/40 rounded-xl resize-none"
                  />
                  <div className="flex justify-end">
                    <Button variant="outline" className="gap-2 text-sm border-border/40 hover:border-primary/40 hover:bg-primary/5" onClick={handleSaveClientMessage}>
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>
          <TabsContent value="columns" className="mt-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="space-y-6">
              {/* Lead Columns */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <SectionHeader icon={Columns3} title="Colunas — Leads" description="Gerencie os estágios do funil de leads." />
                </div>
                <div className="px-6 pb-6 space-y-2">
                  {leadColumns.map((col, i) => (
                    <div key={col.id} className="group flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30 hover:border-border/60 transition-colors">
                      <div className={cn("w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background", col.color, "ring-border/20")} />
                      <Input
                        value={col.title}
                        onChange={(e) => {
                          const updated = [...leadColumns];
                          updated[i] = { ...updated[i], title: e.target.value };
                          saveLeadColumns(updated);
                        }}
                        className="h-9 flex-1 text-sm bg-background/40 border-border/30"
                      />
                      {col.isDefault ? (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-border/30 text-muted-foreground/60">Padrão</Badge>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all rounded-lg" onClick={() => saveLeadColumns(leadColumns.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] mt-2">
                    <Plus className="h-4 w-4 text-primary/40 shrink-0" />
                    <Input
                      value={newLeadColTitle}
                      onChange={(e) => setNewLeadColTitle(e.target.value)}
                      placeholder="Nova coluna..."
                      className="h-9 text-sm bg-background/40 border-border/30"
                      onKeyDown={(e) => e.key === 'Enter' && addLeadColumn()}
                    />
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0 border-primary/30 hover:bg-primary/10 hover:border-primary/50" onClick={addLeadColumn}>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Client Columns */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <SectionHeader icon={Columns3} title="Colunas — Clientes" description="Gerencie os estágios de pós-venda." />
                </div>
                <div className="px-6 pb-6 space-y-2">
                  {clientColumns.map((col, i) => (
                    <div key={col.id} className="group flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/30 hover:border-border/60 transition-colors">
                      <div className={cn("w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background", col.color, "ring-border/20")} />
                      <Input
                        value={col.title}
                        onChange={(e) => {
                          const updated = [...clientColumns];
                          updated[i] = { ...updated[i], title: e.target.value };
                          saveClientColumns(updated);
                        }}
                        className="h-9 flex-1 text-sm bg-background/40 border-border/30"
                      />
                      {col.isDefault ? (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-border/30 text-muted-foreground/60">Padrão</Badge>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all rounded-lg" onClick={() => saveClientColumns(clientColumns.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] mt-2">
                    <Plus className="h-4 w-4 text-primary/40 shrink-0" />
                    <Input
                      value={newClientColTitle}
                      onChange={(e) => setNewClientColTitle(e.target.value)}
                      placeholder="Nova coluna..."
                      className="h-9 text-sm bg-background/40 border-border/30"
                      onKeyDown={(e) => e.key === 'Enter' && addClientColumn()}
                    />
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0 border-primary/30 hover:bg-primary/10 hover:border-primary/50" onClick={addClientColumn}>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
