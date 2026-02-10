import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useTagConfig } from '@/contexts/TagConfigContext';
import { getRewardPlans, REWARD_PLANS, PLAN_OVERRIDES_STORAGE_KEY } from '@/config/plans';
import { DEFAULT_LEAD_MESSAGE, DEFAULT_CLIENT_MESSAGE } from '@/utils/whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { ColumnConfig } from '@/components/leads/ColumnManager';

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

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { tags, presetColors, addTag, updateTag, removeTag, resetToDefaults } = useTagConfig();

  // Plans
  const [planDraft, setPlanDraft] = useState<PlanDraft>({});

  // Messages
  const [leadMessageDraft, setLeadMessageDraft] = useState('');
  const [clientMessageDraft, setClientMessageDraft] = useState('');

  // Columns
  const [leadColumns, setLeadColumns] = useState<ColumnConfig[]>([]);
  const [clientColumns, setClientColumns] = useState<ColumnConfig[]>([]);
  const [newLeadColTitle, setNewLeadColTitle] = useState('');
  const [newClientColTitle, setNewClientColTitle] = useState('');

  // New tag
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState(presetColors[0].className);

  useEffect(() => {
    // Load plans
    const plans = getRewardPlans();
    setPlanDraft(
      Object.fromEntries(
        Object.entries(plans).map(([id, p]) => [id, { points: String(p.points), price: String(p.price) }])
      )
    );

    // Load messages
    setLeadMessageDraft(localStorage.getItem(LEAD_MESSAGE_STORAGE_KEY) || DEFAULT_LEAD_MESSAGE);
    setClientMessageDraft(localStorage.getItem(CLIENT_MESSAGE_STORAGE_KEY) || DEFAULT_CLIENT_MESSAGE);

    // Load columns
    const savedLeadCols = localStorage.getItem(LEADS_COLUMNS_KEY);
    setLeadColumns(savedLeadCols ? JSON.parse(savedLeadCols) : DEFAULT_LEAD_COLUMNS);

    const savedClientCols = localStorage.getItem(CLIENT_COLUMNS_KEY);
    setClientColumns(savedClientCols ? JSON.parse(savedClientCols) : DEFAULT_CLIENT_COLUMNS);
  }, []);

  // --- Plans ---
  const handlePlanChange = (planId: string, field: 'points' | 'price', value: string) => {
    setPlanDraft(prev => ({ ...prev, [planId]: { ...prev[planId], [field]: value } }));
  };

  const handleSavePlans = () => {
    const overrides = Object.fromEntries(
      Object.entries(planDraft).map(([id, v]) => {
        const base = REWARD_PLANS[id];
        const points = v.points.trim() === '' ? base.points : Number(v.points);
        const price = v.price.trim() === '' ? base.price : Number(v.price);
        return [id, { points: Number.isFinite(points) ? points : base.points, price: Number.isFinite(price) ? price : base.price }];
      })
    );
    localStorage.setItem(PLAN_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
    toast.success('Planos salvos com sucesso');
  };

  // --- Messages ---
  const handleSaveLeadMessage = () => {
    const msg = leadMessageDraft.trim() || DEFAULT_LEAD_MESSAGE;
    localStorage.setItem(LEAD_MESSAGE_STORAGE_KEY, msg);
    setLeadMessageDraft(msg);
    toast.success('Mensagem para leads salva');
  };

  const handleSaveClientMessage = () => {
    const msg = clientMessageDraft.trim() || DEFAULT_CLIENT_MESSAGE;
    localStorage.setItem(CLIENT_MESSAGE_STORAGE_KEY, msg);
    setClientMessageDraft(msg);
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
  const saveLeadColumns = (cols: ColumnConfig[]) => {
    setLeadColumns(cols);
    localStorage.setItem(LEADS_COLUMNS_KEY, JSON.stringify(cols));
  };

  const saveClientColumns = (cols: ColumnConfig[]) => {
    setClientColumns(cols);
    localStorage.setItem(CLIENT_COLUMNS_KEY, JSON.stringify(cols));
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

  const rewardPlans = getRewardPlans();

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
      <div className="space-y-6 animate-fade-in max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/20">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">
              <span className="lavender-text">Configurações</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie tags, planos, mensagens e colunas do CRM
            </p>
          </div>
        </div>

        <Tabs defaultValue="tags" className="space-y-6">
          <TabsList className="bg-secondary/50 border border-border/50">
            <TabsTrigger value="tags" className="gap-1.5 text-xs sm:text-sm">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-1.5 text-xs sm:text-sm">
              <CreditCard className="h-3.5 w-3.5" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-1.5 text-xs sm:text-sm">
              <Columns3 className="h-3.5 w-3.5" />
              Colunas
            </TabsTrigger>
          </TabsList>

          {/* ===== TAGS ===== */}
          <TabsContent value="tags">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Etiquetas (Tags)</CardTitle>
                <CardDescription>
                  Tags são sincronizadas entre Leads, Clientes e WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tags.map((tag) => (
                  <div key={tag.value} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-secondary/20">
                    <Badge variant="outline" className={cn("text-xs shrink-0", tag.className)}>
                      {tag.label}
                    </Badge>
                    <Input
                      value={tag.label}
                      onChange={(e) => updateTag(tag.value, { label: e.target.value })}
                      className="h-8 flex-1 text-sm"
                    />
                    <Select value={tag.className} onValueChange={(val) => updateTag(tag.value, { className: val })}>
                      <SelectTrigger className="h-8 w-28">
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { removeTag(tag.value); toast.success('Tag removida'); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Add new */}
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border/50 bg-secondary/10">
                  <Input
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    placeholder="Nova tag..."
                    className="h-8 flex-1 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Select value={newTagColor} onValueChange={setNewTagColor}>
                    <SelectTrigger className="h-8 w-28">
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
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleAddTag}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => { resetToDefaults(); toast.success('Tags restauradas'); }}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar padrão
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== PLANOS ===== */}
          <TabsContent value="plans">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Planos de Recompensa</CardTitle>
                <CardDescription>
                  Configure pontos e valores monetários para cada plano de conversão.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(rewardPlans).map(([planId, plan]) => (
                  <div key={planId} className="flex flex-col gap-3 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{plan.label}</p>
                      <p className="text-xs text-muted-foreground uppercase">{plan.tier} • {plan.type}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Pontos</span>
                        <Input
                          type="number"
                          value={planDraft[planId]?.points ?? String(plan.points)}
                          onChange={(e) => handlePlanChange(planId, 'points', e.target.value)}
                          className="h-9 w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          value={planDraft[planId]?.price ?? String(plan.price)}
                          onChange={(e) => handlePlanChange(planId, 'price', e.target.value)}
                          className="h-9 w-28"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button className="gap-1.5" onClick={handleSavePlans}>
                    <Save className="h-4 w-4" />
                    Salvar planos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== MENSAGENS ===== */}
          <TabsContent value="messages">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Templates de Mensagem</CardTitle>
                <CardDescription>
                  Use <span className="font-semibold text-foreground">{'{leadName}'}</span> e{' '}
                  <span className="font-semibold text-foreground">{'{barberName}'}</span> para personalizar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Mensagem para Leads</p>
                  <Textarea
                    value={leadMessageDraft}
                    onChange={(e) => setLeadMessageDraft(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <div className="flex justify-end">
                    <Button variant="outline" className="gap-1.5" onClick={handleSaveLeadMessage}>
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Mensagem para Clientes</p>
                  <Textarea
                    value={clientMessageDraft}
                    onChange={(e) => setClientMessageDraft(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <div className="flex justify-end">
                    <Button variant="outline" className="gap-1.5" onClick={handleSaveClientMessage}>
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== COLUNAS ===== */}
          <TabsContent value="columns">
            <div className="space-y-6">
              {/* Lead Columns */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-display text-base">Colunas do Kanban — Leads</CardTitle>
                  <CardDescription>Gerencie os estágios do funil de leads.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leadColumns.map((col, i) => (
                    <div key={col.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50">
                      <div className={cn("w-3 h-3 rounded-full shrink-0", col.color)} />
                      <Input
                        value={col.title}
                        onChange={(e) => {
                          const updated = [...leadColumns];
                          updated[i] = { ...updated[i], title: e.target.value };
                          saveLeadColumns(updated);
                        }}
                        className="h-8 flex-1 text-sm"
                      />
                      {col.isDefault && (
                        <Badge variant="outline" className="text-[10px] shrink-0">Padrão</Badge>
                      )}
                      {!col.isDefault && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => saveLeadColumns(leadColumns.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newLeadColTitle}
                      onChange={(e) => setNewLeadColTitle(e.target.value)}
                      placeholder="Nova coluna..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addLeadColumn()}
                    />
                    <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={addLeadColumn}>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Client Columns */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-display text-base">Colunas do Kanban — Clientes</CardTitle>
                  <CardDescription>Gerencie os estágios de pós-venda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {clientColumns.map((col, i) => (
                    <div key={col.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50">
                      <div className={cn("w-3 h-3 rounded-full shrink-0", col.color)} />
                      <Input
                        value={col.title}
                        onChange={(e) => {
                          const updated = [...clientColumns];
                          updated[i] = { ...updated[i], title: e.target.value };
                          saveClientColumns(updated);
                        }}
                        className="h-8 flex-1 text-sm"
                      />
                      {col.isDefault && (
                        <Badge variant="outline" className="text-[10px] shrink-0">Padrão</Badge>
                      )}
                      {!col.isDefault && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => saveClientColumns(clientColumns.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newClientColTitle}
                      onChange={(e) => setNewClientColTitle(e.target.value)}
                      placeholder="Nova coluna..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addClientColumn()}
                    />
                    <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={addClientColumn}>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
