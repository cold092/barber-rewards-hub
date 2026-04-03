import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type Redemption } from '@/services/redemptionService';

interface RedemptionListProps {
  items: Redemption[];
  statusConfig: Record<string, { label: string; icon: any; className: string }>;
  profileNames: Record<string, string>;
  showUser: boolean;
  onReview?: (id: string) => void;
}

export default function RedemptionList({
  items,
  statusConfig,
  profileNames,
  showUser,
  onReview,
}: RedemptionListProps) {
  if (items.length === 0) {
    return (
      <Card className="glass-card border-border/30">
        <CardContent className="p-8 text-center">
          <Gift className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum resgate encontrado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((r, i) => {
          const config = statusConfig[r.status];
          const StatusIcon = config.icon;
          return (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="glass-card rounded-xl p-4 border border-border/30 hover:border-border/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  {showUser && (
                    <p className="text-xs font-semibold text-primary">
                      {profileNames[r.profile_id] || 'Usuário'}
                    </p>
                  )}
                  <p className="text-sm font-medium">{r.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-lg font-bold text-primary">{r.points} pts</span>
                    <Badge variant="outline" className={cn('gap-1 text-[10px]', config.className)}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString('pt-BR')}
                    {r.approved_by && ` • ${r.status === 'approved' ? 'Aprovado' : 'Rejeitado'} por ${profileNames[r.approved_by] || 'Admin'}`}
                  </p>
                  {r.admin_note && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-secondary/40 border border-border/20">
                      <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{r.admin_note}</p>
                    </div>
                  )}
                </div>
                {onReview && r.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                    onClick={() => onReview(r.id)}
                  >
                    Avaliar
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
