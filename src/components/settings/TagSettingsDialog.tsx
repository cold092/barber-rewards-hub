import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, RotateCcw, Tag, Sparkles } from 'lucide-react';
import { useTagConfig } from '@/contexts/TagConfigContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TagSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagSettingsDialog({ open, onOpenChange }: TagSettingsDialogProps) {
  const { tags, presetColors, addTag, updateTag, removeTag, resetToDefaults } = useTagConfig();
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState(presetColors[0].className);
  const [newShowInClientColumns, setNewShowInClientColumns] = useState(true);

  const handleAdd = () => {
    const label = newLabel.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (tags.some(t => t.value === value)) {
      toast.error('Tag já existe');
      return;
    }
    addTag({ value, label, className: newColor, showInClientColumns: newShowInClientColumns });
    setNewLabel('');
    setNewShowInClientColumns(true);
    toast.success('Tag adicionada');
  };

  const handleReset = () => {
    resetToDefaults();
    toast.success('Tags restauradas ao padrão');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,44rem)] max-w-2xl max-h-[88vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="font-display flex items-center gap-2.5 text-lg">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <Tag className="h-4 w-4 text-primary" />
            </div>
            Configurar Tags
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Gerencie as etiquetas desta área.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(88vh-180px)] px-6 py-5 space-y-4">
          {/* Existing tags */}
          <AnimatePresence mode="popLayout">
            {tags.map((tag, i) => (
              <motion.div
                key={tag.value}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="rounded-xl border border-border/40 bg-secondary/30 p-3.5 space-y-3 hover:border-border/60 transition-colors duration-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className={cn("text-xs font-medium", tag.className)}>
                    {tag.label}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Coluna em clientes</span>
                    <Switch
                      checked={tag.showInClientColumns !== false}
                      onCheckedChange={(checked) => updateTag(tag.value, { showInClientColumns: checked })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2.5 items-center">
                  <Input
                    value={tag.label}
                    onChange={(e) => updateTag(tag.value, { label: e.target.value })}
                    className="h-9 text-sm bg-background/50"
                    placeholder="Nome da tag"
                  />
                  <Select
                    value={tag.className}
                    onValueChange={(val) => updateTag(tag.value, { className: val })}
                  >
                    <SelectTrigger className="h-9 w-full bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {presetColors.map((color) => (
                        <SelectItem key={color.className} value={color.className}>
                          <Badge variant="outline" className={cn("text-[10px]", color.className)}>
                            {color.label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 justify-self-end rounded-lg transition-colors"
                    onClick={() => {
                      removeTag(tag.value);
                      toast.success('Tag removida');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add new tag */}
          <motion.div
            layout
            className="rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary/60" />
              Nova tag
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto_auto] gap-2.5 items-center">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nome da tag..."
                className="h-9 text-sm bg-background/50"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger className="h-9 w-full bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presetColors.map((color) => (
                    <SelectItem key={color.className} value={color.className}>
                      <Badge variant="outline" className={cn("text-[10px]", color.className)}>
                        {color.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 px-1 justify-self-start md:justify-self-center">
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">Criar coluna</span>
                <Switch checked={newShowInClientColumns} onCheckedChange={setNewShowInClientColumns} />
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 justify-self-end border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/40 flex-row justify-between bg-secondary/20">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
