import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Globe, Save, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { upsertSetting, getGlobalSetting } from '@/services/settingsService';

interface GeneralPrefs {
  businessName: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  language: string;
}

const DEFAULT_PREFS: GeneralPrefs = {
  businessName: '',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  dateFormat: 'dd/MM/yyyy',
  language: 'pt-BR',
};

export function GeneralTab() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<GeneralPrefs>(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const saved = await getGlobalSetting<GeneralPrefs>('general_prefs' as any);
      if (saved) setPrefs({ ...DEFAULT_PREFS, ...saved });
    })();
  }, [user]);

  const update = (key: keyof GeneralPrefs, value: any) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (user) await upsertSetting(user.id, 'general_prefs' as any, prefs);
    setDirty(false);
    toast.success('Configurações gerais salvas');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Business Info */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Informações do Negócio</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Dados básicos da sua barbearia ou salão.</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome do estabelecimento</label>
            <Input
              value={prefs.businessName}
              onChange={(e) => update('businessName', e.target.value)}
              placeholder="Ex: Barbearia Premium"
              className="h-10 bg-background/40 border-border/30 focus:border-primary/40"
            />
          </div>
        </div>
      </div>

      {/* Regional */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Configurações Regionais</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Idioma, fuso horário, moeda e formato de data.</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Fuso horário</p>
                <p className="text-xs text-muted-foreground">Usado para agendamentos e lembretes</p>
              </div>
            </div>
            <Select value={prefs.timezone} onValueChange={(v) => update('timezone', v)}>
              <SelectTrigger className="w-[180px] h-9 bg-background/40 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                <SelectItem value="America/Bahia">Bahia (GMT-3)</SelectItem>
                <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                <SelectItem value="America/Recife">Recife (GMT-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Moeda</p>
                <p className="text-xs text-muted-foreground">Formato monetário exibido no sistema</p>
              </div>
            </div>
            <Select value={prefs.currency} onValueChange={(v) => update('currency', v)}>
              <SelectTrigger className="w-[110px] h-9 bg-background/40 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">R$ (BRL)</SelectItem>
                <SelectItem value="USD">$ (USD)</SelectItem>
                <SelectItem value="EUR">€ (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Formato de data</p>
                <p className="text-xs text-muted-foreground">Como as datas são exibidas</p>
              </div>
            </div>
            <Select value={prefs.dateFormat} onValueChange={(v) => update('dateFormat', v)}>
              <SelectTrigger className="w-[140px] h-9 bg-background/40 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {dirty && (
          <div className="px-6 py-3.5 border-t border-border/20 bg-secondary/10 flex justify-end">
            <Button className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Salvar configurações
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
