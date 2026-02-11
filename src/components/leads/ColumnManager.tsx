import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  const handleDragStart = (columnId: string) => {
    setDraggingId(columnId);
  };

  const handleDrop = (columnId: string) => {
    if (!draggingId) return;

    reorderColumns(draggingId, columnId);
    setDraggingId(null);
    toast.success('Ordem das colunas atualizada');
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleStartEdit = (col: ColumnConfig) => {
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
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Gerenciar Colunas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing columns */}
          <div className="space-y-2">
            {columns.map((col) => (
              <div
                key={col.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg bg-secondary/50 border border-border/30",
                  draggingId === col.id && "opacity-60 border-primary/40"
                )}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(col.id)}
              >
                {editingId === col.id ? (
                  <>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(col.id)}
                    />
                    <Select value={editColor} onValueChange={setEditColor}>
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-3 h-3 rounded", c.value)} />
                              {c.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveEdit(col.id)}>
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      draggable
                      onDragStart={() => handleDragStart(col.id)}
                      onDragEnd={handleDragEnd}
                      className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-2 py-1 cursor-grab active:cursor-grabbing"
                      title="Arraste para reordenar"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Arrastar</span>
                    </div>
                    <div className={cn("w-3 h-3 rounded shrink-0", col.color)} />
                    <span className="text-sm flex-1 truncate">{col.title}</span>
                    {col.isDefault && (
                      <span className="text-[10px] text-muted-foreground">padrão</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMoveColumn(col.id, 'up')}
                      disabled={columns.findIndex((column) => column.id === col.id) === 0}
                    >
                      <ArrowUp className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleMoveColumn(col.id, 'down')}
                      disabled={columns.findIndex((column) => column.id === col.id) === columns.length - 1}
                    >
                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(col)}>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    {!col.isDefault && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(col.id)}>
                        <Trash2 className="h-3 w-3 text-destructive/70" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border/50">
            <Input
              placeholder="Nome da coluna"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="h-8 text-xs flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Select value={newColor} onValueChange={setNewColor}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-3 h-3 rounded", c.value)} />
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 gap-1 text-xs lavender-gradient" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
