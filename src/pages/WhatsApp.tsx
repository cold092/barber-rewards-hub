import { useState, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatArea } from '@/components/whatsapp/ChatArea';
import { LeadSidePanel } from '@/components/whatsapp/LeadSidePanel';
import { GlobalTagFilter } from '@/components/filters/GlobalTagFilter';
import { useTagFilter } from '@/contexts/TagFilterContext';
import { MOCK_CONVERSATIONS, AVAILABLE_TAGS } from '@/data/whatsappMockData';
import type { WhatsAppConversation, WhatsAppMessage } from '@/data/whatsappMockData';
import { cn } from '@/lib/utils';

export default function WhatsApp() {
  const { activeTags } = useTagFilter();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Filter by global tags
  const filteredConversations = activeTags.length > 0
    ? conversations.filter(c => c.tags.some(t => activeTags.includes(t)))
    : conversations;

  const selectedConversation = conversations.find(c => c.id === selectedId) || null;

  const handleSelect = useCallback((conversation: WhatsAppConversation) => {
    setSelectedId(conversation.id);
    setMobileView('chat');
    // Mark as read
    setConversations(prev =>
      prev.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c)
    );
  }, []);

  const handleSendMessage = useCallback((conversationId: string, content: string) => {
    const newMessage: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      content,
      timestamp: new Date().toISOString(),
      direction: 'outgoing',
      status: 'sent',
      type: 'text',
    };

    setConversations(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          messages: [...c.messages, newMessage],
          lastMessage: content,
          lastMessageTime: newMessage.timestamp,
        };
      })
    );

    // Simulate status updates
    setTimeout(() => {
      setConversations(prev =>
        prev.map(c => ({
          ...c,
          messages: c.messages.map(m =>
            m.id === newMessage.id ? { ...m, status: 'delivered' as const } : m
          ),
        }))
      );
    }, 1000);

    setTimeout(() => {
      setConversations(prev =>
        prev.map(c => ({
          ...c,
          messages: c.messages.map(m =>
            m.id === newMessage.id ? { ...m, status: 'read' as const } : m
          ),
        }))
      );
    }, 2500);
  }, []);

  const handleUpdateConversation = useCallback((updated: WhatsAppConversation) => {
    setConversations(prev =>
      prev.map(c => c.id === updated.id ? updated : c)
    );
  }, []);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-5rem)] lg:h-[calc(100vh-2rem)] flex flex-col animate-fade-in">
        {/* Title bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-success/20">
            <svg className="h-5 w-5 text-success" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">
              <span className="lavender-text">WhatsApp</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Central de atendimento integrada ao CRM
            </p>
          </div>
        </div>

        {/* Global Tag Filter */}
        <div className="mb-3">
          <GlobalTagFilter
            tagOptions={AVAILABLE_TAGS.slice(0, 6).map(t => ({ value: t.id, label: t.label, className: t.color }))}
          />
        </div>

        {/* Main chat layout */}
        <div className="flex-1 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex min-h-0">
          {/* Conversation List */}
          <div className={cn(
            "w-80 shrink-0",
            mobileView === 'chat' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col flex-1 lg:flex-none'
          )}>
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          {/* Chat Area */}
          <div className={cn(
            "flex-1 flex min-w-0",
            mobileView === 'list' ? 'hidden lg:flex' : 'flex'
          )}>
            <ChatArea
              conversation={selectedConversation}
              onSendMessage={handleSendMessage}
              onBack={() => setMobileView('list')}
              onTogglePanel={() => setShowPanel(!showPanel)}
            />
          </div>

          {/* Lead Side Panel */}
          {showPanel && selectedConversation && (
            <div className="hidden lg:flex">
              <LeadSidePanel
                conversation={selectedConversation}
                onClose={() => setShowPanel(false)}
                onUpdate={handleUpdateConversation}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
