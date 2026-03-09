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
        backgroundColor: `hsl(${color} / 0.12)`,
        borderColor: isOver ? undefined : `hsl(${color} / 0.25)`,
      }}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-3 mb-3 rounded-lg border",
          columnDragEnabled && "cursor-grab active:cursor-grabbing"
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${color} / 0.14), hsl(${color} / 0.06))`,
          borderColor: `hsl(${color} / 0.3)`,
        }}
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
          <div
            className="w-3 h-3 rounded-full shrink-0 ring-2"
            style={{
              backgroundColor: `hsl(${color})`,
              ringColor: `hsl(${color} / 0.3)`,
              boxShadow: `0 0 8px hsl(${color} / 0.4)`,
            }}
          />
          <h3 className="font-display font-semibold text-sm text-foreground">{title}</h3>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-md"
          style={{
            backgroundColor: `hsl(${color} / 0.2)`,
            color: `hsl(${color})`,
            border: `1px solid hsl(${color} / 0.25)`,
          }}
        >
          {count}
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
