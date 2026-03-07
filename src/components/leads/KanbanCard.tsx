import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Phone, MessageCircle, GripVertical, FileText, Calendar, Bell, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/utils/whatsapp';
import { formatCurrencyBRL } from '@/utils/currency';
import { isPast, isToday, format, formatDistanceToNow } from 'date-fns';
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
  isAdmin,
  contactTagOptions
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: referral.id,
    data: { referral }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const getTagBadge = (tag: string | null) => {
    if (!tag) return null;
    const tagOption = contactTagOptions.find(option => option.value === tag);
    if (!tagOption) return null;
    return (
      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", tagOption.className)}>
        {tagOption.label}
      </Badge>
    );
  };

  const followUpDate = referral.follow_up_date ? new Date(referral.follow_up_date) : null;
  const isOverdue = followUpDate ? isPast(followUpDate) && !isToday(followUpDate) : false;
  const isDueToday = followUpDate ? isToday(followUpDate) : false;

  const plan = referral.converted_plan_id ? getPlanById(referral.converted_plan_id) : null;
  const timeAgo = formatDistanceToNow(new Date(referral.created_at), { addSuffix: false, locale: ptBR });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-3 rounded-lg bg-card border border-border/50 hover:border-primary/40 transition-all cursor-pointer shadow-sm",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        isOverdue && "border-destructive/50 bg-destructive/8",
        isDueToday && "border-warning/50 bg-warning/8"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        
        <div className="flex-1 min-w-0" onClick={() => onOpenDetails(referral)}>
          {/* Card title with tags */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-foreground leading-snug">{referral.lead_name}</p>
            {isAdmin && referral.status !== 'converted' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onWhatsApp(referral);
                }}
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(referral.tags || []).map(tag => {
              if (!tag) return null;
              const tagOption = contactTagOptions.find(option => option.value === tag);
              if (!tagOption) return null;
              return (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    "bg-primary/15 text-primary border border-primary/20",
                    tagOption.className
                  )}
                >
                  {tagOption.label}
                </span>
              );
            })}
            {referral.is_client && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Cliente
              </span>
            )}
            {referral.notes && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/40">
                <FileText className="h-2.5 w-2.5" />
                Obs
              </span>
            )}
          </div>

          {/* Footer: avatar, value, time */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/20">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border border-border/40">
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                  {getInitials(referral.referrer_name || 'U')}
                </AvatarFallback>
              </Avatar>
              {plan && (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                  <span className="text-[11px] font-medium text-success">
                    {formatCurrencyBRL(plan.price)}
                  </span>
                </div>
              )}
              {followUpDate && (
                <div className={cn(
                  "flex items-center gap-0.5",
                  isOverdue ? "text-destructive" : isDueToday ? "text-warning" : "text-muted-foreground"
                )}>
                  <Bell className="h-3 w-3" />
                  <span className="text-[10px] font-medium">
                    {format(followUpDate, 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
