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
      <DialogContent className="glass-card w-[min(95vw,32rem)] max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Configurar Tags
          </DialogTitle>
          <DialogDescription>
            Gerencie as etiquetas usadas em Leads, Clientes e WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing tags */}
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.value} className="flex items-center gap-2 p-2 rounded-lg border border-border/50">
                <Badge variant="outline" className={cn("text-xs", tag.className)}>
                  {tag.label}
                </Badge>
                <Input
                  value={tag.label}
                  onChange={(e) => updateTag(tag.value, { label: e.target.value })}
                  className="h-8 flex-1 text-sm"
                />
                <Select
                  value={tag.className}
                  onValueChange={(val) => updateTag(tag.value, { className: val })}
                >
                  <SelectTrigger className="h-8 w-28">
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
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">Coluna em clientes</span>
                  <Switch
                    checked={tag.showInClientColumns !== false}
                    onCheckedChange={(checked) => updateTag(tag.value, { showInClientColumns: checked })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    removeTag(tag.value);
                    toast.success('Tag removida');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new tag */}
          <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border/50 bg-secondary/20">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nome da tag..."
              className="h-8 flex-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="h-8 w-28">
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
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">Criar coluna</span>
              <Switch checked={newShowInClientColumns} onCheckedChange={setNewShowInClientColumns} />
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between">
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
