import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Gift, Plus, Coins, ShoppingCart, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  type RewardItem,
  createRewardItem,
  updateRewardItem,
  deleteRewardItem,
} from '@/services/rewardCatalogService';

interface RewardCatalogProps {
  items: RewardItem[];
  walletBalance: number;
  onRedeem: (item: RewardItem) => void;
  onRefresh: () => void;
}

export default function RewardCatalog({ items, walletBalance, onRedeem, onRefresh }: RewardCatalogProps) {
  const { profile, isAdmin } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setPointsCost('');
    setShowForm(true);
  };

  const openEdit = (item: RewardItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setPointsCost(String(item.points_cost));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !pointsCost.trim()) {
      toast.error('Preencha nome e pontos');
      return;
    }
    const pts = parseInt(pointsCost);
    if (!pts || pts <= 0) {
      toast.error('Pontos devem ser maior que zero');
      return;
    }

    setSubmitting(true);
    if (editingItem) {
      const result = await updateRewardItem(editingItem.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        points_cost: pts,
      });
      if (result.success) {
        toast.success('Prêmio atualizado!');
        setShowForm(false);
        onRefresh();
      } else {
        toast.error(result.error || 'Erro ao atualizar');
      }
    } else {
      const result = await createRewardItem({
        organization_id: profile?.organization_id || '',
        name: name.trim(),
        description: description.trim() || undefined,
        points_cost: pts,
      });
      if (result.success) {
        toast.success('Prêmio criado!');
        setShowForm(false);
        onRefresh();
      } else {
        toast.error(result.error || 'Erro ao criar');
      }
    }
    setSubmitting(false);
  };

  const handleToggle = async (item: RewardItem) => {
    const result = await updateRewardItem(item.id, { active: !item.active });
    if (result.success) {
      toast.success(item.active ? 'Prêmio desativado' : 'Prêmio ativado');
      onRefresh();
    }
  };

  const handleDelete = async (item: RewardItem) => {
    const result = await deleteRewardItem(item.id);
    if (result.success) {
      toast.success('Prêmio removido');
      onRefresh();
    }
  };

  const activeItems = items.filter(i => i.active);
  const displayItems = isAdmin ? items : activeItems;

  if (displayItems.length === 0 && !isAdmin) {
    return (
      <Card className="glass-card border-border/30">
        <CardContent className="p-8 text-center">
          <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum prêmio disponível no momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-primary/30 hover:bg-primary/10"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Adicionar Prêmio
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {displayItems.map((item, i) => {
            const canAfford = walletBalance >= item.points_cost;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                <Card className={cn(
                  'bank-card hover-lift border-border/60 hover:border-primary/30 transition-all group overflow-hidden',
                  !item.active && 'opacity-50'
                )}>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="icon-circle-primary h-10 w-10 shrink-0">
                          <Gift className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                          )}
                        </div>
                      </div>
                      {!item.active && (
                        <Badge variant="outline" className="text-[10px] shrink-0 bg-muted/30 text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold text-primary">{item.points_cost}</span>
                        <span className="text-xs text-muted-foreground">pts</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggle(item)}
                            >
                              {item.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {item.active && (
                          <Button
                            size="sm"
                            className={cn(
                              'gap-1.5 text-xs h-8',
                              canAfford
                                ? 'btn-bank'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            )}
                            disabled={!canAfford}
                            onClick={() => onRedeem(item)}
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Resgatar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="glass-card border-border/40 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {editingItem ? 'Editar Prêmio' : 'Novo Prêmio'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do prêmio</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Corte grátis, Produto X..."
                className="h-10 bg-background/40 border-border/30 focus:border-primary/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Descrição (opcional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes sobre o prêmio..."
                className="min-h-[60px] bg-background/40 border-border/30 focus:border-primary/40 rounded-xl resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo em pontos</label>
              <Input
                type="number"
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                placeholder="Ex: 100"
                className="h-10 bg-background/40 border-border/30 focus:border-primary/40"
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-border/40">
              Cancelar
            </Button>
            <Button
              className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90"
              onClick={handleSave}
              disabled={submitting}
            >
              {editingItem ? 'Salvar' : 'Criar Prêmio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
