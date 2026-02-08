import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { ReferralStatus } from '@/types/database';

interface KanbanColumnProps {
  id: ReferralStatus;
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
        isOver ? "border-primary bg-primary/5" : "border-border/50 bg-secondary/30"
      )}
    >
      <div className={cn("p-4 border-b border-border/50 rounded-t-xl", color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
          <span className="text-xs bg-background/50 px-2 py-1 rounded-full font-medium">
            {count}
          </span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
