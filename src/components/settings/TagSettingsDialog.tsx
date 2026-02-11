import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, RotateCcw, Tag } from 'lucide-react';
import { useTagConfig } from '@/contexts/TagConfigContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
      <DialogContent className="glass-card w-[min(96vw,44rem)] max-w-2xl max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="font-display flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Configurar Tags
          </DialogTitle>
          <DialogDescription className="text-sm">
            Gerencie as etiquetas desta área.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {/* Existing tags */}
          <div className="space-y-3">
            {tags.map((tag) => (
              <div key={tag.value} className="rounded-xl border border-border/60 bg-card/50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className={cn("text-xs", tag.className)}>
                    {tag.label}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Coluna em clientes</span>
                    <Switch
                      checked={tag.showInClientColumns !== false}
                      onCheckedChange={(checked) => updateTag(tag.value, { showInClientColumns: checked })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-2 items-center">
                  <Input
                    value={tag.label}
                    onChange={(e) => updateTag(tag.value, { label: e.target.value })}
                    className="h-9 text-sm"
                    placeholder="Nome da tag"
                  />
                  <Select
                    value={tag.className}
                    onValueChange={(val) => updateTag(tag.value, { className: val })}
                  >
                    <SelectTrigger className="h-9 w-full">
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
                    className="h-9 w-9 text-destructive hover:text-destructive justify-self-end"
                    onClick={() => {
                      removeTag(tag.value);
                      toast.success('Tag removida');
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new tag */}
          <div className="rounded-xl border border-dashed border-border/60 bg-secondary/20 p-3 space-y-3">
            <div className="text-xs font-medium text-muted-foreground">Nova tag</div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto_auto] gap-2 items-center">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nome da tag..."
                className="h-9 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Select value={newColor} onValueChange={setNewColor}>
                <SelectTrigger className="h-9 w-full">
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
                <span className="text-xs text-muted-foreground whitespace-nowrap">Criar coluna</span>
                <Switch checked={newShowInClientColumns} onCheckedChange={setNewShowInClientColumns} />
              </div>

              <Button variant="outline" size="icon" className="h-9 w-9 justify-self-end" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50 flex-row justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
