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
}

export function KanbanColumn({ id, title, count, color, children }: KanbanColumnProps) {
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
        "flex flex-col h-full min-h-[400px] rounded-xl border transition-all duration-200",
        isOver ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_hsl(262_83%_68%/0.1)]" : "border-border/30 bg-secondary/20"
      )}
    >
      <div className={cn("p-3.5 border-b border-border/30 rounded-t-xl", color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs uppercase tracking-widest text-foreground/80">{title}</h3>
          <span className="text-[11px] bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-full font-semibold tabular-nums">
            {count}
          </span>
        </div>
      </div>
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">
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
