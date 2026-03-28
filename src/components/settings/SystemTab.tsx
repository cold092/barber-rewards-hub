import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertTriangle, Wrench, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ReconciliationResult {
  mode: string;
  timestamp: string;
  discrepancies_found: number;
  details: {
    profile_id: string;
    name: string;
    db_lifetime: number;
    expected_lifetime: number;
    diff: number;
    fixed: boolean;
  }[];
}

export function SystemTab() {
  const [reconciling, setReconciling] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const runReconciliation = async (dryRun: boolean) => {
    setReconciling(true);
    setResult(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reconcile-points?dry_run=${dryRun}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Erro ao executar reconciliação');

      const resultData: ReconciliationResult = await response.json();
      setResult(resultData);

      if (resultData.discrepancies_found === 0) {
        toast.success('Todos os saldos estão corretos!');
      } else if (dryRun) {
        toast.info(`${resultData.discrepancies_found} discrepância(s) encontrada(s). Revise antes de aplicar.`);
      } else {
        toast.success(`${resultData.discrepancies_found} saldo(s) corrigido(s) com sucesso!`);
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
      toast.error('Erro ao executar reconciliação');
    }
    setReconciling(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Reconciliation Card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Reconciliação de Pontos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verifica e corrige discrepâncias entre os pontos registrados e os pontos calculados a partir das indicações.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Schedule info */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-success/5 border border-success/15">
            <Clock className="h-4 w-4 text-success shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Execução automática:</span> Todos os dias às 03:00 (UTC)
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2 border-border/40 hover:border-primary/40 hover:bg-primary/5"
              onClick={() => runReconciliation(true)}
              disabled={reconciling}
            >
              <RefreshCw className={cn("h-4 w-4", reconciling && "animate-spin")} />
              Verificar (Dry Run)
            </Button>
            <Button
              className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity"
              onClick={() => runReconciliation(false)}
              disabled={reconciling}
            >
              <RefreshCw className={cn("h-4 w-4", reconciling && "animate-spin")} />
              Verificar e Corrigir
            </Button>
          </div>

          {/* Results */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                {result.discrepancies_found === 0 ? (
                  <Badge className="gap-1.5 bg-success/15 text-success border-success/25">
                    <CheckCircle className="h-3 w-3" />
                    Tudo certo
                  </Badge>
                ) : (
                  <Badge className="gap-1.5 bg-warning/15 text-warning border-warning/25">
                    <AlertTriangle className="h-3 w-3" />
                    {result.discrepancies_found} discrepância(s)
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {result.mode === 'dry_run' ? 'Simulação' : 'Aplicado'} • {new Date(result.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>

              {result.details.length > 0 && (
                <div className="space-y-1.5">
                  {result.details.map((d) => (
                    <div
                      key={d.profile_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/30"
                    >
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Banco: {d.db_lifetime} pts → Esperado: {d.expected_lifetime} pts
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-sm font-bold',
                          d.diff > 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {d.diff > 0 ? '+' : ''}{d.diff}
                        </span>
                        {d.fixed && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
