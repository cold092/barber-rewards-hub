import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card p-5 space-y-3 animate-pulse", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20 bg-muted/50 rounded" />
          <Skeleton className="h-8 w-28 bg-muted/40 rounded" />
          <Skeleton className="h-2.5 w-24 bg-muted/30 rounded" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl overflow-hidden", className)}>
      <div className="p-4 border-b border-border/20">
        <Skeleton className="h-5 w-36 bg-muted/50 rounded" />
      </div>
      <div className="p-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 bg-muted/40 rounded" />
              <Skeleton className="h-3 w-20 bg-muted/30 rounded" />
            </div>
            <Skeleton className="h-5 w-16 bg-muted/30 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-2xl bg-muted/40" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 bg-muted/50 rounded" />
          <Skeleton className="h-4 w-64 bg-muted/30 rounded" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonList rows={4} />
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}
