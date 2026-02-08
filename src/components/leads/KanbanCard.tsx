import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Phone, MessageCircle, GripVertical, FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/utils/whatsapp';
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group p-3 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-all cursor-pointer",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
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
          <p className="font-medium truncate">{referral.lead_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" />
            {formatPhoneNumber(referral.lead_phone)}
          </p>
          
          <div className="flex flex-wrap gap-1.5 mt-2">
            {getTagBadge(referral.contact_tag)}
            {referral.is_client && (
              <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">
                Cliente
              </Badge>
            )}
            {referral.notes && (
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                <FileText className="h-3 w-3 mr-1" />
                Obs.
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(referral.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {isAdmin && referral.status !== 'converted' && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(referral);
            }}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
