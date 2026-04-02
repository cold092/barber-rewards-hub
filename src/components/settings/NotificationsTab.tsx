import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Smartphone, Mail, Save, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { upsertSetting, getGlobalSetting } from '@/services/settingsService';

interface NotificationPrefs {
  followUpReminder: boolean;
  reminderTiming: string; // hours before
  pushEnabled: boolean;
  dailyDigest: boolean;
  digestTime: string;
  newLeadAlert: boolean;
  conversionAlert: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  followUpReminder: true,
  reminderTiming: '2',
  pushEnabled: true,
  dailyDigest: false,
  digestTime: '08:00',
  newLeadAlert: true,
  conversionAlert: true,
};

export function NotificationsTab() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const saved = await getGlobalSetting<NotificationPrefs>('notification_prefs' as any);
      if (saved) setPrefs({ ...DEFAULT_PREFS, ...saved });
    })();
  }, [user]);

  const update = (key: keyof NotificationPrefs, value: any) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (user) await upsertSetting(user.id, 'notification_prefs' as any, prefs);
    setDirty(false);
    toast.success('Preferências de notificação salvas');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Follow-up Reminders */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <BellRing className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Lembretes de Follow-up</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Configure quando e como receber lembretes de acompanhamento.</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Lembrete de follow-up</p>
                <p className="text-xs text-muted-foreground">Notificar quando um follow-up estiver próximo</p>
              </div>
            </div>
            <Switch checked={prefs.followUpReminder} onCheckedChange={(v) => update('followUpReminder', v)} />
          </div>

          {prefs.followUpReminder && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Antecedência do lembrete</p>
                  <p className="text-xs text-muted-foreground">Horas antes do horário agendado</p>
                </div>
              </div>
              <Select value={prefs.reminderTiming} onValueChange={(v) => update('reminderTiming', v)}>
                <SelectTrigger className="w-[100px] h-9 bg-background/40 border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hora</SelectItem>
                  <SelectItem value="2">2 horas</SelectItem>
                  <SelectItem value="4">4 horas</SelectItem>
                  <SelectItem value="12">12 horas</SelectItem>
                  <SelectItem value="24">1 dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Alert Types */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3 pb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground">Tipos de Alerta</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Escolha quais eventos geram notificações.</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <p className="text-sm font-medium">Novo lead registrado</p>
              <p className="text-xs text-muted-foreground">Alerta quando um novo lead é cadastrado</p>
            </div>
            <Switch checked={prefs.newLeadAlert} onCheckedChange={(v) => update('newLeadAlert', v)} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <p className="text-sm font-medium">Conversão de lead</p>
              <p className="text-xs text-muted-foreground">Alerta quando um lead é convertido em cliente</p>
            </div>
            <Switch checked={prefs.conversionAlert} onCheckedChange={(v) => update('conversionAlert', v)} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <p className="text-sm font-medium">Notificações push</p>
              <p className="text-xs text-muted-foreground">Receber notificações mesmo com o app fechado</p>
            </div>
            <Switch checked={prefs.pushEnabled} onCheckedChange={(v) => update('pushEnabled', v)} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/30">
            <div>
              <p className="text-sm font-medium">Resumo diário</p>
              <p className="text-xs text-muted-foreground">Receber um resumo das atividades do dia</p>
            </div>
            <div className="flex items-center gap-3">
              {prefs.dailyDigest && (
                <Select value={prefs.digestTime} onValueChange={(v) => update('digestTime', v)}>
                  <SelectTrigger className="w-[90px] h-8 text-xs bg-background/40 border-border/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="07:00">07:00</SelectItem>
                    <SelectItem value="08:00">08:00</SelectItem>
                    <SelectItem value="09:00">09:00</SelectItem>
                    <SelectItem value="18:00">18:00</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Switch checked={prefs.dailyDigest} onCheckedChange={(v) => update('dailyDigest', v)} />
            </div>
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
