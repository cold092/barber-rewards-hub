import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Phone, MessageCircle, GripVertical, FileText, Calendar, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/utils/whatsapp';
import { isPast, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
      <Badge variant="outline" className={cn("text-xs", tagOption.className)}>
        {tagOption.label}
      </Badge>
    );
  };

  const followUpDate = referral.follow_up_date ? new Date(referral.follow_up_date) : null;
  const isOverdue = followUpDate ? isPast(followUpDate) && !isToday(followUpDate) : false;
  const isDueToday = followUpDate ? isToday(followUpDate) : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-3 rounded-xl bg-background/80 border border-border/40 hover:border-primary/30 transition-all cursor-pointer backdrop-blur-sm",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary",
        isOverdue && "border-destructive/40 bg-destructive/5",
        isDueToday && "border-warning/40 bg-warning/5"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex-1 min-w-0" onClick={() => onOpenDetails(referral)}>
          <p className="font-medium truncate text-sm">{referral.lead_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" />
            {formatPhoneNumber(referral.lead_phone)}
          </p>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {(referral.tags || []).map(tag => {
              const badge = getTagBadge(tag);
              return badge ? <span key={tag}>{badge}</span> : null;
            })}
            {referral.is_client && (
              <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
                Cliente
              </Badge>
            )}
            {referral.notes && (
              <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border">
                <FileText className="h-2.5 w-2.5 mr-0.5" />
                Obs
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(referral.created_at).toLocaleDateString('pt-BR')}
            </p>
            {followUpDate && (
              <p className={cn(
                "text-[11px] flex items-center gap-1 font-medium",
                isOverdue ? "text-destructive" : isDueToday ? "text-warning" : "text-muted-foreground"
              )}>
                <Bell className="h-3 w-3" />
                {format(followUpDate, 'dd/MM', { locale: ptBR })}
              </p>
            )}
          </div>
        </div>

        {isAdmin && referral.status !== 'converted' && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(referral);
            }}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
