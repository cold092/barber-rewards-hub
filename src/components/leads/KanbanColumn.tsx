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
        "flex flex-col h-full min-h-[400px] rounded-xl transition-all duration-200 border",
        "shrink-0 w-[85vw] max-w-[320px] snap-start md:w-auto md:max-w-none md:snap-align-none",
        isOver ? "border-primary/30 shadow-[0_0_24px_hsl(262_83%_68%/0.15)]" : "border-border/60",
        isColumnDropTarget && "ring-2 ring-primary/40"
      )}
      style={{
        backgroundColor: `hsl(${color} / 0.06)`,
        borderColor: isOver ? undefined : `hsl(${color} / 0.35)`,
      }}
    >
      {/* Column Header — compact */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-xl",
          columnDragEnabled && "cursor-grab active:cursor-grabbing"
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${color} / 0.28), hsl(${color} / 0.10))`,
          borderBottom: `1px solid hsl(${color} / 0.25)`,
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
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-1 h-4 rounded-full shrink-0"
            style={{ backgroundColor: `hsl(${color})` }}
          />
          <h3 className="font-display font-semibold text-[13px] text-foreground truncate">{title}</h3>
          <span
            className="text-[10px] font-bold tabular-nums px-1.5 py-px rounded-full shrink-0"
            style={{
              backgroundColor: `hsl(${color} / 0.22)`,
              color: `hsl(${color})`,
            }}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
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
