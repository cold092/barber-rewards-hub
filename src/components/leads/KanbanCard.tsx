import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MessageCircle, GripVertical, FileText, Bell, Pencil, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrencyBRL } from '@/utils/currency';
import { isPast, isToday, format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPlanById } from '@/config/plans';
import type { Referral } from '@/types/database';

interface KanbanCardProps {
  referral: Referral;
  onOpenDetails: (referral: Referral) => void;
  onWhatsApp: (referral: Referral) => void;
  isAdmin: boolean;
  contactTagOptions: Array<{ value: string; label: string; className: string }>;
}

export function KanbanCard({
  referral,
  onOpenDetails,
  onWhatsApp,
  contactTagOptions
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: referral.id,
    data: { referral }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const followUpDate = referral.follow_up_date ? new Date(referral.follow_up_date) : null;
  const isOverdue = followUpDate ? isPast(followUpDate) && !isToday(followUpDate) : false;
  const isDueToday = followUpDate ? isToday(followUpDate) : false;

  const plan = referral.converted_plan_id ? getPlanById(referral.converted_plan_id) : null;
  const timeAgo = formatDistanceToNowStrict(new Date(referral.created_at), { locale: ptBR });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const visibleTags = (referral.tags || []).filter(Boolean).slice(0, 2);
  const extraTagCount = Math.max(0, (referral.tags || []).filter(Boolean).length - visibleTags.length);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpenDetails(referral)}
      className={cn(
        "group relative px-2.5 py-2 rounded-md bg-card border border-border/60 touch-manipulation select-none",
        "hover:border-primary/50 hover:shadow-sm hover:-translate-y-px transition-all cursor-pointer",
        isDragging && "opacity-50 shadow-md ring-2 ring-primary",
        isOverdue && "border-l-2 border-l-destructive",
        isDueToday && "border-l-2 border-l-warning"
      )}
    >
      {/* Drag handle — visual affordance for desktop, hidden on touch */}
      <div
        className="absolute left-0 top-0 bottom-0 w-3 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none"
        aria-hidden
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Row 1: name + quick actions */}
      <div className="flex items-center justify-between gap-1.5">
        <p className="font-semibold text-[13px] text-foreground leading-tight truncate flex-1">
          {referral.lead_name}
        </p>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {referral.status !== 'converted' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-success hover:bg-success/10"
              onClick={(e) => { e.stopPropagation(); onWhatsApp(referral); }}
              title="Abrir WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); onOpenDetails(referral); }}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2: tags + indicators (compact, single line) */}
      {(visibleTags.length > 0 || referral.is_client || referral.notes || followUpDate || plan) && (
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {visibleTags.map(tag => {
            const tagOption = contactTagOptions.find(o => o.value === tag);
            if (!tagOption) return null;
            return (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center text-[9px] font-medium px-1.5 py-px rounded",
                  "bg-primary/10 text-primary",
                  tagOption.className
                )}
              >
                {tagOption.label}
              </span>
            );
          })}
          {extraTagCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-px rounded bg-muted text-muted-foreground">
              <MoreHorizontal className="h-2.5 w-2.5" />
              {extraTagCount}
            </span>
          )}
          {referral.is_client && (
            <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-px rounded bg-success/12 text-success">
              Cliente
            </span>
          )}
          {plan && (
            <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-px rounded bg-success/10 text-success tabular-nums">
              {formatCurrencyBRL(plan.price)}
            </span>
          )}
          {referral.notes && (
            <FileText className="h-3 w-3 text-muted-foreground/70" aria-label="Tem observações" />
          )}
          {followUpDate && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-px rounded tabular-nums",
              isOverdue ? "bg-destructive/10 text-destructive" : isDueToday ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
            )}>
              <Bell className="h-2.5 w-2.5" />
              {format(followUpDate, 'dd/MM', { locale: ptBR })}
            </span>
          )}
        </div>
      )}

      {/* Row 3: tiny footer — referrer + time */}
      <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-muted-foreground/80">
        <div className="flex items-center gap-1 min-w-0">
          <Avatar className="h-4 w-4">
            <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">
              {getInitials(referral.referrer_name || 'U')}
            </AvatarFallback>
          </Avatar>
          <span className="truncate" title={`Indicado por ${referral.referrer_name}`}>
            {referral.referrer_name}
          </span>
        </div>
        <span className="tabular-nums shrink-0">{timeAgo}</span>
      </div>
    </div>
  );
}
