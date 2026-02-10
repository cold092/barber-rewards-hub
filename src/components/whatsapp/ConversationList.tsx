import { useState } from 'react';
import { Search, Filter, MessageCircle, Globe, Instagram, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WhatsAppConversation } from '@/data/whatsappMockData';
import { TEMPERATURE_OPTIONS } from '@/data/whatsappMockData';

interface ConversationListProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversation: WhatsAppConversation) => void;
}

const originIcons: Record<string, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  site: Globe,
  instagram: Instagram,
  manual: UserPlus,
};

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterTemp, setFilterTemp] = useState<string>('all');

  const filtered = conversations.filter(c => {
    const matchesSearch = !search || 
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPhone.includes(search) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase());
    const matchesOrigin = filterOrigin === 'all' || c.origin === filterOrigin;
    const matchesTemp = filterTemp === 'all' || c.temperature === filterTemp;
    return matchesSearch && matchesOrigin && matchesTemp;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
  });

  return (
    <div className="flex flex-col h-full border-r border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg">Conversas</h2>
          <Badge variant="outline" className="text-xs">
            {conversations.length}
          </Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-secondary/50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterOrigin} onValueChange={setFilterOrigin}>
            <SelectTrigger className="h-8 text-xs flex-1 bg-secondary/50">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="site">Site</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTemp} onValueChange={setFilterTemp}>
            <SelectTrigger className="h-8 text-xs flex-1 bg-secondary/50">
              <SelectValue placeholder="Temp." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas temp.</SelectItem>
              <SelectItem value="hot">🔥 Quente</SelectItem>
              <SelectItem value="warm">🌤️ Morno</SelectItem>
              <SelectItem value="cold">🧊 Frio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/20">
          {sorted.map((conversation) => {
            const OriginIcon = originIcons[conversation.origin] || MessageCircle;
            const tempOption = TEMPERATURE_OPTIONS.find(t => t.value === conversation.temperature);
            const isSelected = selectedId === conversation.id;

            return (
              <div
                key={conversation.id}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:bg-secondary/50",
                  isSelected && "bg-primary/10 border-l-2 border-l-primary",
                  !isSelected && "border-l-2 border-l-transparent"
                )}
                onClick={() => onSelect(conversation)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                      {conversation.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-sm truncate">{conversation.contactName}</span>
                        {tempOption && (
                          <span className="text-xs shrink-0">{tempOption.emoji}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: false, locale: ptBR })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {conversation.unreadCount > 0 && (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <OriginIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      {conversation.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1.5 bg-secondary/50">
                          {tag}
                        </Badge>
                      ))}
                      {conversation.tags.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{conversation.tags.length - 2}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="p-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
