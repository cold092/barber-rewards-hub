import { useState, useEffect } from 'react';
import { CalendarIcon, Bell, BellOff, Save, Sunrise, CalendarDays, Calendar as CalendarLucide, Sparkles, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { addHistoryEvent } from '@/services/leadHistoryService';
import { format, isPast, isToday, isTomorrow, differenceInDays, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Referral } from '@/types/database';

interface FollowUpPickerProps {
  referral: Referral;
  userId?: string;
  userName?: string;
  onUpdate: () => void;
}

type Preset = { key: string; label: string; icon: React.ElementType; date: () => Date; tone: string };

const PRESETS: Preset[] = [
  { key: 'tomorrow', label: 'Amanhã', icon: Sunrise, date: () => addDays(startOfDay(new Date()), 1), tone: 'hover:border-info/40 hover:bg-info/10 hover:text-info' },
  { key: '3days', label: 'Em 3 dias', icon: CalendarDays, date: () => addDays(startOfDay(new Date()), 3), tone: 'hover:border-primary/40 hover:bg-primary/10 hover:text-primary' },
  { key: 'week', label: 'Em 1 semana', icon: CalendarLucide, date: () => addDays(startOfDay(new Date()), 7), tone: 'hover:border-warning/40 hover:bg-warning/10 hover:text-warning' },
  { key: '2weeks', label: 'Em 2 semanas', icon: Sparkles, date: () => addDays(startOfDay(new Date()), 14), tone: 'hover:border-accent/40 hover:bg-accent/10 hover:text-accent' },
];

export function FollowUpPicker({ referral, userId, userName, onUpdate }: FollowUpPickerProps) {
  const [date, setDate] = useState<Date | undefined>(
    referral.follow_up_date ? new Date(referral.follow_up_date) : undefined
  );
  const [note, setNote] = useState(referral.follow_up_note || '');
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);

  useEffect(() => {
    setDate(referral.follow_up_date ? new Date(referral.follow_up_date) : undefined);
    setNote(referral.follow_up_note || '');
    setEditingNote(false);
  }, [referral.id, referral.follow_up_date, referral.follow_up_note]);

  const hasFollowUp = !!referral.follow_up_date;
  const followUpDate = referral.follow_up_date ? new Date(referral.follow_up_date) : null;
  const isOverdue = followUpDate ? isPast(followUpDate) && !isToday(followUpDate) : false;
  const isDueToday = followUpDate ? isToday(followUpDate) : false;

  const persist = async (newDate: Date, newNote: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('referrals')
      .update({
        follow_up_date: newDate.toISOString(),
        follow_up_note: newNote || null
      } as Record<string, unknown>)
      .eq('id', referral.id);

    if (error) {
      toast.error('Erro ao salvar lembrete');
      setSaving(false);
      return false;
    }

    await addHistoryEvent({
      referralId: referral.id,
      eventType: 'note_added',
      eventData: { type: 'follow_up_set', follow_up_date: newDate.toISOString(), follow_up_note: newNote },
      createdById: userId,
      createdByName: userName
    });

    toast.success('Lembrete salvo');
    setSaving(false);
    setCalendarOpen(false);
    setEditingNote(false);
    onUpdate();
    return true;
  };

  const handlePreset = async (preset: Preset) => {
    const next = preset.date();
    setDate(next);
    await persist(next, note);
  };

  const handleSaveCustom = async () => {
    if (!date) return;
    await persist(date, note);
  };

  const handleRemove = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('referrals')
      .update({ follow_up_date: null, follow_up_note: null } as Record<string, unknown>)
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

  const getStatusBadge = () => {
    if (!followUpDate) return null;
    if (isOverdue) return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] h-5 font-semibold">Atrasado</Badge>;
    if (isDueToday) return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px] h-5 font-semibold">Hoje</Badge>;
    if (isTomorrow(followUpDate)) return <Badge variant="outline" className="bg-info/10 text-info border-info/30 text-[10px] h-5 font-semibold">Amanhã</Badge>;
    const days = differenceInDays(followUpDate, new Date());
    return <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] h-5 font-semibold">Em {days} dias</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Active follow-up card */}
      {hasFollowUp && (
        <div className={cn(
          "rounded-xl border p-4 transition-colors",
          isOverdue ? "bg-destructive/[0.06] border-destructive/30" :
          isDueToday ? "bg-warning/[0.06] border-warning/30" :
          "bg-primary/[0.05] border-primary/20"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              isOverdue ? "bg-destructive/15 text-destructive" :
              isDueToday ? "bg-warning/15 text-warning" :
              "bg-primary/15 text-primary"
            )}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground">
                  {format(followUpDate!, "EEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                {getStatusBadge()}
              </div>

              {/* Note display / edit */}
              {!editingNote ? (
                <div className="mt-1.5 flex items-start gap-2 group">
                  <p className="text-xs text-muted-foreground flex-1 leading-relaxed">
                    {referral.follow_up_note || <span className="italic opacity-60">Sem nota</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditingNote(true)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                    title="Editar nota"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Adicione uma nota..."
                    className="min-h-[60px] text-xs rounded-md"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 gap-1 text-xs rounded-md"
                      onClick={() => persist(followUpDate!, note)}
                      disabled={saving}
                    >
                      <Save className="h-3 w-3" />
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs rounded-md"
                      onClick={() => {
                        setNote(referral.follow_up_note || '');
                        setEditingNote(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick presets */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {hasFollowUp ? 'Reagendar para' : 'Agendar lembrete'}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handlePreset(preset)}
                disabled={saving}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 bg-card text-xs font-medium text-foreground transition-all",
                  "hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                  preset.tone
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-left">{preset.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                  {format(preset.date(), 'dd/MM', { locale: ptBR })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom date picker */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Data personalizada</p>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 w-full justify-start h-9 rounded-lg border-border/50">
              <CalendarIcon className="h-4 w-4" />
              <span className="text-xs">
                {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Escolher data específica'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              locale={ptBR}
              initialFocus
            />
            <div className="p-3 border-t border-border/50 space-y-2 bg-secondary/30">
              <Textarea
                placeholder="Nota do follow-up (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[60px] text-xs rounded-md"
              />
              <Button
                size="sm"
                className="w-full gap-2 h-8 text-xs rounded-md blue-gradient text-primary-foreground"
                onClick={handleSaveCustom}
                disabled={!date || saving}
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Salvando...' : 'Salvar lembrete'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Remove */}
      {hasFollowUp && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full h-8 text-xs rounded-md"
          onClick={handleRemove}
          disabled={saving}
        >
          <BellOff className="h-3.5 w-3.5" />
          Remover lembrete
        </Button>
      )}
    </div>
  );
}
