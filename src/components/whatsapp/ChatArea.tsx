import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Smile, Check, CheckCheck, Phone, Video, MoreVertical, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TEMPERATURE_OPTIONS } from '@/data/whatsappMockData';
import type { WhatsAppConversation, WhatsAppMessage } from '@/data/whatsappMockData';

interface ChatAreaProps {
  conversation: WhatsAppConversation | null;
  onSendMessage: (conversationId: string, content: string) => void;
  onBack?: () => void;
  onTogglePanel: () => void;
}

function MessageStatus({ status }: { status: WhatsAppMessage['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-info" />;
  }
}

export function ChatArea({ conversation, onSendMessage, onBack, onTogglePanel }: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  const handleSend = () => {
    if (!message.trim() || !conversation) return;
    onSendMessage(conversation.id, message.trim());
    setMessage('');
    inputRef.current?.focus();
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary/20">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto">
            <Send className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg">WhatsApp CRM</h3>
            <p className="text-sm text-muted-foreground">Selecione uma conversa para começar</p>
          </div>
        </div>
      </div>
    );
  }

  const tempOption = TEMPERATURE_OPTIONS.find(t => t.value === conversation.temperature);

  // Group messages by date
  const messagesByDate: Record<string, WhatsAppMessage[]> = {};
  conversation.messages.forEach(msg => {
    const dateKey = format(new Date(msg.timestamp), 'yyyy-MM-dd');
    if (!messagesByDate[dateKey]) messagesByDate[dateKey] = [];
    messagesByDate[dateKey].push(msg);
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/60 backdrop-blur-sm">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        <div className="relative cursor-pointer" onClick={onTogglePanel}>
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
            {conversation.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          {conversation.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onTogglePanel}>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{conversation.contactName}</h3>
            {tempOption && <span className="text-xs">{tempOption.emoji}</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            {conversation.isOnline ? 'online' : 'offline'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onTogglePanel}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.03), transparent 50%), radial-gradient(circle at 80% 50%, hsl(var(--accent) / 0.03), transparent 50%)'
        }}
      >
        {Object.entries(messagesByDate).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <Badge variant="outline" className="bg-secondary/80 text-[10px] font-normal px-3 py-0.5">
                {format(new Date(dateKey), "dd 'de' MMMM", { locale: ptBR })}
              </Badge>
            </div>

            {/* Messages */}
            {msgs.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex mb-1",
                  msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    msg.direction === 'outgoing'
                      ? 'bg-primary/20 rounded-br-sm'
                      : 'bg-secondary rounded-bl-sm'
                  )}
                >
                  <p className="break-words">{msg.content}</p>
                  <div className={cn(
                    "flex items-center gap-1 mt-1",
                    msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                  )}>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </span>
                    {msg.direction === 'outgoing' && <MessageStatus status={msg.status} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
            <Smile className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="h-9 text-sm bg-secondary/50 flex-1"
          />
          {message.trim() ? (
            <Button size="icon" className="h-9 w-9 lavender-gradient shrink-0" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground shrink-0">
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
