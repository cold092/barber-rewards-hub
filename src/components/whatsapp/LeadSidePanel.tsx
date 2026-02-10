import { X, Phone, MessageCircle, Globe, Instagram, UserPlus, Calendar, Tag, User, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TEMPERATURE_OPTIONS, ORIGIN_OPTIONS, STATUS_OPTIONS, AVAILABLE_TAGS } from '@/data/whatsappMockData';
import type { WhatsAppConversation } from '@/data/whatsappMockData';
import { formatPhoneNumber } from '@/utils/whatsapp';

interface LeadSidePanelProps {
  conversation: WhatsAppConversation;
  onClose: () => void;
  onUpdate: (conversation: WhatsAppConversation) => void;
}

const originIconMap: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  site: Globe,
  instagram: Instagram,
  manual: UserPlus,
};

export function LeadSidePanel({ conversation, onClose, onUpdate }: LeadSidePanelProps) {
  const OriginIcon = originIconMap[conversation.origin] || MessageCircle;
  const tempOption = TEMPERATURE_OPTIONS.find(t => t.value === conversation.temperature);
  const originOption = ORIGIN_OPTIONS.find(o => o.value === conversation.origin);
  const statusInfo = STATUS_OPTIONS[0]; // Default to 'new'

  const handleTemperatureChange = (value: string) => {
    onUpdate({ ...conversation, temperature: value as 'cold' | 'warm' | 'hot' });
  };

  const handleOriginChange = (value: string) => {
    onUpdate({ ...conversation, origin: value as WhatsAppConversation['origin'] });
  };

  const handleToggleTag = (tagId: string) => {
    const next = conversation.tags.includes(tagId)
      ? conversation.tags.filter(t => t !== tagId)
      : [...conversation.tags, tagId];
    onUpdate({ ...conversation, tags: next });
  };

  const handleAssigneeChange = (value: string) => {
    onUpdate({ ...conversation, assignedTo: value === 'none' ? null : value });
  };

  // Timeline events (mock)
  const timelineEvents = [
    { type: 'message', label: 'Última mensagem recebida', time: conversation.lastMessageTime },
    { type: 'tag', label: `Tags: ${conversation.tags.join(', ')}`, time: conversation.lastMessageTime },
    { type: 'origin', label: `Origem: ${originOption?.label}`, time: conversation.messages[0]?.timestamp || conversation.lastMessageTime },
  ];

  return (
    <div className="w-80 border-l border-border/50 flex flex-col bg-card/40 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm">Detalhes do Lead</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Contact Info */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold mx-auto">
              {conversation.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h4 className="font-semibold">{conversation.contactName}</h4>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhoneNumber(conversation.contactPhone)}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {tempOption && (
                <Badge variant="outline" className={cn("text-xs", tempOption.className)}>
                  {tempOption.emoji} {tempOption.label}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                <OriginIcon className="h-3 w-3 mr-1" />
                {originOption?.label}
              </Badge>
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Temperature */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
              <Thermometer className="h-3.5 w-3.5" />
              Temperatura
            </label>
            <Select value={conversation.temperature} onValueChange={handleTemperatureChange}>
              <SelectTrigger className="h-8 text-xs bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPERATURE_OPTIONS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.emoji} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Origin */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
              <Globe className="h-3.5 w-3.5" />
              Origem
            </label>
            <Select value={conversation.origin} onValueChange={handleOriginChange}>
              <SelectTrigger className="h-8 text-xs bg-secondary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORIGIN_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
              <User className="h-3.5 w-3.5" />
              Responsável
            </label>
            <Select value={conversation.assignedTo || 'none'} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="h-8 text-xs bg-secondary/50">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="Carlos">Carlos</SelectItem>
                <SelectItem value="André">André</SelectItem>
                <SelectItem value="Felipe">Felipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border/30" />

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
              <Tag className="h-3.5 w-3.5" />
              Etiquetas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_TAGS.map(tag => {
                const isActive = conversation.tags.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className={cn(
                      "text-[10px] cursor-pointer transition-all",
                      isActive ? tag.color : 'bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50'
                    )}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    {tag.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Mini Timeline */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
              <Calendar className="h-3.5 w-3.5" />
              Atividade recente
            </label>
            <div className="space-y-2">
              {timelineEvents.map((event, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs">{event.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(event.time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
