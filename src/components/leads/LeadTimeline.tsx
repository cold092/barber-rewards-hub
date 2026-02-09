import { useEffect, useState } from 'react';
import { 
  MessageCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Tag, 
  User,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeadHistory } from '@/services/leadHistoryService';
import type { LeadHistory, LeadEventType } from '@/types/database';

interface LeadTimelineProps {
  referralId: string;
}

const eventConfig: Record<LeadEventType, { 
  icon: React.ElementType; 
  color: string; 
  label: string;
  getDescription: (data: Record<string, unknown>) => string;
}> = {
  created: {
    icon: Sparkles,
    color: 'text-primary bg-primary/20',
    label: 'Lead criado',
    getDescription: () => 'Lead foi adicionado ao sistema'
  },
  status_change: {
    icon: ArrowRight,
    color: 'text-info bg-info/20',
    label: 'Status alterado',
    getDescription: (data) => {
      const from = data.from_status || 'novo';
      const to = data.to_status || 'desconhecido';
      const statusLabels: Record<string, string> = {
        new: 'Novo',
        contacted: 'Contatado',
        converted: 'Convertido'
      };
      return `Status alterado de "${statusLabels[from as string] || from}" para "${statusLabels[to as string] || to}"`;
    }
  },
  tag_change: {
    icon: Tag,
    color: 'text-accent bg-accent/20',
    label: 'Tag alterada',
    getDescription: (data) => {
      const tag = data.tag || 'nenhuma';
      const tagLabels: Record<string, string> = {
        sql: 'SQL',
        mql: 'MQL',
        cold: 'Frio',
        scheduled: 'Marcou',
        none: 'Nenhuma'
      };
      return `Tag alterada para "${tagLabels[tag as string] || tag}"`;
    }
  },
  qualification_change: {
    icon: CheckCircle,
    color: 'text-success bg-success/20',
    label: 'Qualificação',
    getDescription: (data) => {
      const qualified = data.is_qualified;
      return qualified ? 'Lead marcado como qualificado' : 'Lead marcado como não qualificado';
    }
  },
  note_added: {
    icon: FileText,
    color: 'text-muted-foreground bg-muted',
    label: 'Observação',
    getDescription: (data) => {
      const notes = (data.notes as string) || '';
      return notes.length > 100 ? `${notes.substring(0, 100)}...` : notes || 'Observação adicionada';
    }
  },
  whatsapp_contact: {
    icon: MessageCircle,
    color: 'text-success bg-success/20',
    label: 'WhatsApp',
    getDescription: () => 'Contato via WhatsApp realizado'
  },
  conversion: {
    icon: CheckCircle,
    color: 'text-warning bg-warning/20',
    label: 'Conversão',
    getDescription: (data) => {
      const plan = data.plan_label || data.plan_id || 'plano desconhecido';
      return `Lead convertido - ${plan}`;
    }
  }
};

export function LeadTimeline({ referralId }: LeadTimelineProps) {
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const result = await getLeadHistory(referralId);
      setHistory(result.data);
      setLoading(false);
    }
    loadHistory();
  }, [referralId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando histórico...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma interação registrada ainda
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {history.map((event) => {
          const config = eventConfig[event.event_type];
          const Icon = config.icon;
          
          return (
            <div key={event.id} className="relative flex gap-4 pl-0">
              <div className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                config.color
              )}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{config.label}</span>
                  {event.created_by_name && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {event.created_by_name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {config.getDescription(event.event_data)}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(event.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
