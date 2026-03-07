import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const PAGE_SIZE = 10;

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  columnDragEnabled?: boolean;
  isColumnDragging?: boolean;
  onColumnDragStart?: () => void;
  onColumnDragEnd?: () => void;
  onColumnDragOver?: () => void;
  onColumnDrop?: () => void;
  isColumnDropTarget?: boolean;
}

export function KanbanColumn({
  id,
  title,
  count,
  color,
  children,
  columnDragEnabled = false,
  isColumnDragging = false,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDrop,
  isColumnDropTarget = false,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const childArray = Array.isArray(children) ? children : children ? [children] : [];
  const totalItems = childArray.length;
  const visibleItems = childArray.slice(0, visibleCount);
  const hasMore = visibleCount < totalItems;
  const remaining = totalItems - visibleCount;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-h-[400px] rounded-xl transition-all duration-200 p-3 border",
        isOver ? "border-primary/30 shadow-[0_0_24px_hsl(262_83%_68%/0.15)]" : "border-border/40",
        isColumnDropTarget && "ring-2 ring-primary/40"
      )}
      style={{
        backgroundColor: `hsl(${color} / 0.06)`,
        borderColor: isOver ? undefined : `hsl(${color} / 0.15)`,
      }}
    >
      {/* Column Header — Ploomes style */}
      <div
        className={cn(
          "flex items-center justify-between px-1 py-3 mb-2",
          columnDragEnabled && "cursor-grab active:cursor-grabbing"
        )}
        draggable={columnDragEnabled}
        onDragStart={onColumnDragStart}
        onDragEnd={onColumnDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          onColumnDragOver?.();
        }}
        onDrop={onColumnDrop}
        title={columnDragEnabled ? 'Clique e arraste a coluna para reordenar' : undefined}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("w-2 h-2 rounded-full shrink-0", color.replace('/10', ''))} />
          <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {count} {count === 1 ? 'lead' : 'leads'}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {visibleItems}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Ver mais {Math.min(remaining, PAGE_SIZE)} de {remaining}
          </Button>
        )}
      </div>
    </div>
  );
}
