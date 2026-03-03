import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown, GripVertical, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export interface ColumnConfig {
  id: string;
  title: string;
  color: string;
  isDefault?: boolean;
}

interface ColumnManagerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

const COLOR_OPTIONS = [
  { value: 'bg-info/10', label: 'Azul' },
  { value: 'bg-warning/10', label: 'Laranja' },
  { value: 'bg-success/10', label: 'Verde' },
  { value: 'bg-destructive/10', label: 'Vermelho' },
  { value: 'bg-primary/10', label: 'Roxo' },
  { value: 'bg-accent/10', label: 'Lavanda' },
  { value: 'bg-muted', label: 'Cinza' },
];

export function ColumnManager({ columns, onColumnsChange }: ColumnManagerProps) {
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('bg-muted');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editColor, setEditColor] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newTitle.trim()) {
      toast.error('Digite um nome para a coluna');
      return;
    }
    const id = `custom-${Date.now()}`;
    onColumnsChange([...columns, { id, title: newTitle.trim(), color: newColor }]);
    setNewTitle('');
    setNewColor('bg-muted');
    toast.success('Coluna adicionada');
  };

  const handleRemove = (id: string) => {
    const col = columns.find(c => c.id === id);
    if (col?.isDefault) {
      toast.error('Colunas padrão não podem ser removidas');
      return;
    }
    onColumnsChange(columns.filter(c => c.id !== id));
    toast.success('Coluna removida');
  };

  const handleMoveColumn = (id: string, direction: 'up' | 'down') => {
    const index = columns.findIndex((column) => column.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const nextColumns = [...columns];
    const [moved] = nextColumns.splice(index, 1);
    nextColumns.splice(targetIndex, 0, moved);
    onColumnsChange(nextColumns);
    toast.success('Ordem das colunas atualizada');
  };

  const reorderColumns = (sourceId: string, destinationId: string) => {
    if (sourceId === destinationId) return;
    const sourceIndex = columns.findIndex((column) => column.id === sourceId);
    const destinationIndex = columns.findIndex((column) => column.id === destinationId);
    if (sourceIndex === -1 || destinationIndex === -1) return;
    const nextColumns = [...columns];
    const [moved] = nextColumns.splice(sourceIndex, 1);
    nextColumns.splice(destinationIndex, 0, moved);
    onColumnsChange(nextColumns);
  };

  const handleDragStart = (columnId: string) => setDraggingId(columnId);

  const handleDrop = (columnId: string) => {
    if (!draggingId) return;
    reorderColumns(draggingId, columnId);
    setDraggingId(null);
    setDropTargetId(null);
    toast.success('Ordem das colunas atualizada');
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
  };

  const handleStartEdit = (col: ColumnConfig) => {
    if (col.isDefault) {
      toast.error('Colunas padrão não podem ser personalizadas');
      return;
    }
    setEditingId(col.id);
    setEditTitle(col.title);
    setEditColor(col.color);
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    onColumnsChange(columns.map(c =>
      c.id === id ? { ...c, title: editTitle.trim(), color: editColor } : c
    ));
    setEditingId(null);
    toast.success('Coluna atualizada');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Colunas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="font-display flex items-center gap-2.5 text-lg">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <Columns3 className="h-4 w-4 text-primary" />
            </div>
            Gerenciar Colunas
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Arraste para reordenar os estágios do funil.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Existing columns */}
          <AnimatePresence mode="popLayout">
            {columns.map((col, i) => (
              <motion.div
                key={col.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30 border border-border/40 transition-all duration-200",
                  draggingId === col.id && "opacity-50 border-primary/40 scale-[0.98]",
                  dropTargetId === col.id && draggingId !== col.id && "border-primary/60 ring-1 ring-primary/30 bg-primary/[0.03]"
                )}
                draggable={editingId !== col.id}
                onDragStart={() => handleDragStart(col.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(event) => event.preventDefault()}
                onDragEnter={() => setDropTargetId(col.id)}
                onDragLeave={() => setDropTargetId((current) => (current === col.id ? null : current))}
                onDrop={() => handleDrop(col.id)}
              >
                {editingId === col.id ? (
                  <>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-xs flex-1 bg-background/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(col.id)}
                    />
                    <Select value={editColor} onValueChange={setEditColor}>
                      <SelectTrigger className="h-8 w-24 text-xs bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-3 h-3 rounded-full", c.value)} />
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleSaveEdit(col.id)}>
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      draggable
                      onDragStart={() => handleDragStart(col.id)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center rounded-lg border border-border/40 bg-background/30 p-1.5 cursor-grab active:cursor-grabbing hover:border-border/60 transition-colors"
                      title="Arraste para reordenar"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                    <div className={cn("w-3 h-3 rounded-full shrink-0 ring-1 ring-border/20", col.color)} />
                    <span className="text-sm flex-1 truncate font-medium">{col.title}</span>
                    {col.isDefault && (
                      <span className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-md">padrão</span>
                    )}
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => handleMoveColumn(col.id, 'up')}
                        disabled={columns.findIndex((column) => column.id === col.id) === 0}
                      >
                        <ArrowUp className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => handleMoveColumn(col.id, 'down')}
                        disabled={columns.findIndex((column) => column.id === col.id) === columns.length - 1}
                      >
                        <ArrowDown className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      {!col.isDefault && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleStartEdit(col)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                      {!col.isDefault && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-destructive/10" onClick={() => handleRemove(col.id)}>
                          <Trash2 className="h-3 w-3 text-destructive/70" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add new */}
          <div className="flex items-center gap-2 p-3.5 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03]">
            <Input
              placeholder="Nome da coluna"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-xs flex-1 bg-background/50"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="h-8 w-24 text-xs bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-3 h-3 rounded-full", c.value)} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 gap-1 text-xs lavender-gradient font-medium" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
