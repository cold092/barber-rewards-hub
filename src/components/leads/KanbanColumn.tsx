import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, count, color, children }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

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
        {children}
      </div>
    </div>
  );
}
