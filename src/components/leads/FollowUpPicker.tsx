import { useState } from 'react';
import { CalendarIcon, Bell, BellOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { addHistoryEvent } from '@/services/leadHistoryService';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Referral } from '@/types/database';

interface FollowUpPickerProps {
  referral: Referral;
  userId?: string;
  userName?: string;
  onUpdate: () => void;
}

export function FollowUpPicker({ referral, userId, userName, onUpdate }: FollowUpPickerProps) {
  const [date, setDate] = useState<Date | undefined>(
    referral.follow_up_date ? new Date(referral.follow_up_date) : undefined
  );
  const [note, setNote] = useState(referral.follow_up_note || '');
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const hasFollowUp = !!referral.follow_up_date;
  const followUpDate = referral.follow_up_date ? new Date(referral.follow_up_date) : null;
  const isOverdue = followUpDate ? isPast(followUpDate) && !isToday(followUpDate) : false;
  const isDueToday = followUpDate ? isToday(followUpDate) : false;
  const isDueTomorrow = followUpDate ? isTomorrow(followUpDate) : false;

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);

    const { error } = await supabase
      .from('referrals')
      .update({
        follow_up_date: date.toISOString(),
        follow_up_note: note || null
      } as Record<string, unknown>)
      .eq('id', referral.id);

    if (error) {
      toast.error('Erro ao salvar lembrete');
      setSaving(false);
      return;
    }

    await addHistoryEvent({
      referralId: referral.id,
      eventType: 'note_added',
      eventData: {
        type: 'follow_up_set',
        follow_up_date: date.toISOString(),
        follow_up_note: note
      },
      createdById: userId,
      createdByName: userName
    });

    toast.success('Lembrete de follow-up salvo');
    setSaving(false);
    setCalendarOpen(false);
    onUpdate();
  };

  const handleRemove = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('referrals')
      .update({
        follow_up_date: null,
        follow_up_note: null
      } as Record<string, unknown>)
      .eq('id', referral.id);

    if (error) {
      toast.error('Erro ao remover lembrete');
      setSaving(false);
      return;
    }

    toast.success('Lembrete removido');
    setDate(undefined);
    setNote('');
    setSaving(false);
    onUpdate();
  };

  const getStatusLabel = () => {
    if (!followUpDate) return null;
    if (isOverdue) return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 text-xs">Atrasado</Badge>;
    if (isDueToday) return <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">Hoje</Badge>;
    if (isDueTomorrow) return <Badge variant="outline" className="bg-info/20 text-info border-info/30 text-xs">Amanhã</Badge>;
    const days = differenceInDays(followUpDate, new Date());
    return <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Em {days} dias</Badge>;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Follow-up / Lembrete
        </label>
        {getStatusLabel()}
      </div>

      {hasFollowUp && (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1">
          <p className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            {format(followUpDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          {referral.follow_up_note && (
            <p className="text-xs text-muted-foreground">{referral.follow_up_note}</p>
          )}
        </div>
      )}

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 w-full">
            <CalendarIcon className="h-4 w-4" />
            {hasFollowUp ? 'Alterar data' : 'Definir follow-up'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            locale={ptBR}
          />
          <div className="p-3 border-t space-y-3">
            <Textarea
              placeholder="Nota do follow-up (opcional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            <Button size="sm" className="w-full gap-2" onClick={handleSave} disabled={!date || saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {hasFollowUp && (
        <Button variant="ghost" size="sm" className="gap-2 text-destructive/70 hover:text-destructive w-full" onClick={handleRemove} disabled={saving}>
          <BellOff className="h-4 w-4" />
          Remover lembrete
        </Button>
      )}
    </div>
  );
}
