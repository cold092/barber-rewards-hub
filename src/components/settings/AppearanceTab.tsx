import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Sun, Moon, Monitor, Type, LayoutGrid, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { upsertSetting, getGlobalSetting } from '@/services/settingsService';
import { cn } from '@/lib/utils';

interface AppearancePrefs {
  compactMode: boolean;
  animationsEnabled: boolean;
  defaultView: 'kanban' | 'table';
  cardsPerRow: string;
}

const DEFAULT_PREFS: AppearancePrefs = {
  compactMode: false,
  animationsEnabled: true,
  defaultView: 'kanban',
  cardsPerRow: 'auto',
};

export function AppearanceTab() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const saved = await getGlobalSetting<AppearancePrefs>('appearance_prefs' as any);
      if (saved) setPrefs({ ...DEFAULT_PREFS, ...saved });
    })();
  }, [user]);

  const update = (key: keyof AppearancePrefs, value: any) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (user) await upsertSetting(user.id, 'appearance_prefs' as any, prefs);
    setDirty(false);
    toast.success('Preferências de aparência salvas');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Theme */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Palette className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Tema</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Escolha entre tema claro ou escuro.</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={cn(
                "relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200",
                theme === 'light'
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border/30 bg-secondary/20 hover:border-border/60"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shadow-inner">
                <Sun className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm font-semibold">Claro</span>
              {theme === 'light' && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary" />
              )}
            </button>

            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={cn(
                "relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200",
                theme === 'dark'
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border/30 bg-secondary/20 hover:border-border/60"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center shadow-inner">
                <Moon className="h-6 w-6 text-indigo-300" />
              </div>
              <span className="text-sm font-semibold">Escuro</span>
              {theme === 'dark' && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Display Preferences */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <LayoutGrid className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Exibição</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Personalize como o conteúdo é exibido.</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <p className="text-sm font-medium">Modo compacto</p>
              <p className="text-xs text-muted-foreground">Reduz o espaçamento para exibir mais conteúdo</p>
            </div>
            <Switch checked={prefs.compactMode} onCheckedChange={(v) => update('compactMode', v)} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <p className="text-sm font-medium">Animações</p>
              <p className="text-xs text-muted-foreground">Transições e efeitos visuais</p>
            </div>
            <Switch checked={prefs.animationsEnabled} onCheckedChange={(v) => update('animationsEnabled', v)} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <p className="text-sm font-medium">Visualização padrão</p>
              <p className="text-xs text-muted-foreground">Como os leads são exibidos por padrão</p>
            </div>
            <Select value={prefs.defaultView} onValueChange={(v) => update('defaultView', v)}>
              <SelectTrigger className="w-[110px] h-9 bg-background/40 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="table">Tabela</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {dirty && (
          <div className="px-6 py-3.5 border-t border-border/20 bg-secondary/10 flex justify-end">
            <Button className="gap-2 lavender-gradient lavender-glow text-primary-foreground hover:opacity-90 transition-opacity" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Salvar preferências
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
