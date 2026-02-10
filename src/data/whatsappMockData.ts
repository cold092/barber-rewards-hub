import type { Referral } from '@/types/database';

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  content: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'audio' | 'document';
}

export interface WhatsAppConversation {
  id: string;
  referralId: string | null;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  origin: 'whatsapp' | 'site' | 'instagram' | 'manual';
  temperature: 'cold' | 'warm' | 'hot';
  assignedTo: string | null;
  tags: string[];
  messages: WhatsAppMessage[];
}

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const MOCK_CONVERSATIONS: WhatsAppConversation[] = [
  {
    id: 'conv-1',
    referralId: null,
    contactName: 'Lucas Ferreira',
    contactPhone: '5511987654321',
    lastMessage: 'Boa tarde! Vi no Instagram que vocês fazem degradê. Quanto custa?',
    lastMessageTime: minutesAgo(3),
    unreadCount: 2,
    isOnline: true,
    origin: 'instagram',
    temperature: 'hot',
    assignedTo: 'Carlos',
    tags: ['interessado', 'degradê'],
    messages: [
      { id: 'm1-1', conversationId: 'conv-1', content: 'Boa tarde! Vi no Instagram que vocês fazem degradê. Quanto custa?', timestamp: minutesAgo(5), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm1-2', conversationId: 'conv-1', content: 'Fala Lucas! Tudo bem? O degradê começa em R$45. Quer agendar um horário?', timestamp: minutesAgo(4), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm1-3', conversationId: 'conv-1', content: 'Show! Tem horário pra amanhã de tarde?', timestamp: minutesAgo(3), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm1-4', conversationId: 'conv-1', content: 'Tenho às 15h ou 16h30. Qual prefere?', timestamp: minutesAgo(2), direction: 'outgoing', status: 'delivered', type: 'text' },
    ]
  },
  {
    id: 'conv-2',
    referralId: null,
    contactName: 'Rafael Santos',
    contactPhone: '5511998765432',
    lastMessage: 'Valeu, vou pensar e te aviso',
    lastMessageTime: hoursAgo(1),
    unreadCount: 0,
    isOnline: false,
    origin: 'whatsapp',
    temperature: 'warm',
    assignedTo: 'Carlos',
    tags: ['retorno'],
    messages: [
      { id: 'm2-1', conversationId: 'conv-2', content: 'E aí Rafael, tudo certo? Vi que você se interessou pelo plano mensal. Posso te passar mais detalhes?', timestamp: hoursAgo(3), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm2-2', conversationId: 'conv-2', content: 'Opa! Quanto fica o mensal mesmo?', timestamp: hoursAgo(2.5), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm2-3', conversationId: 'conv-2', content: 'O plano mensal sai R$120 e inclui 4 cortes + barba. Melhor custo-benefício!', timestamp: hoursAgo(2), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm2-4', conversationId: 'conv-2', content: 'Valeu, vou pensar e te aviso', timestamp: hoursAgo(1), direction: 'incoming', status: 'read', type: 'text' },
    ]
  },
  {
    id: 'conv-3',
    referralId: null,
    contactName: 'Marcos Oliveira',
    contactPhone: '5511912345678',
    lastMessage: 'Perfeito, fechado! Amanhã estou aí às 10h',
    lastMessageTime: hoursAgo(4),
    unreadCount: 0,
    isOnline: false,
    origin: 'site',
    temperature: 'hot',
    assignedTo: 'André',
    tags: ['agendado', 'plano-trimestral'],
    messages: [
      { id: 'm3-1', conversationId: 'conv-3', content: 'Olá! Preenchi o formulário no site. Quero saber mais sobre os planos.', timestamp: daysAgo(1), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm3-2', conversationId: 'conv-3', content: 'Marcos, seja bem-vindo! Temos planos mensais, trimestrais e semestrais. O trimestral é o mais popular!', timestamp: daysAgo(1), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm3-3', conversationId: 'conv-3', content: 'Quanto fica o trimestral?', timestamp: hoursAgo(6), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm3-4', conversationId: 'conv-3', content: 'R$300 por 3 meses, inclui 12 cortes + barba + sobrancelha. Quer conhecer a barbearia?', timestamp: hoursAgo(5), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm3-5', conversationId: 'conv-3', content: 'Perfeito, fechado! Amanhã estou aí às 10h', timestamp: hoursAgo(4), direction: 'incoming', status: 'read', type: 'text' },
    ]
  },
  {
    id: 'conv-4',
    referralId: null,
    contactName: 'Pedro Henrique',
    contactPhone: '5511955556666',
    lastMessage: 'Não sei, tá caro...',
    lastMessageTime: daysAgo(2),
    unreadCount: 0,
    isOnline: false,
    origin: 'manual',
    temperature: 'cold',
    assignedTo: null,
    tags: ['frio', 'preço'],
    messages: [
      { id: 'm4-1', conversationId: 'conv-4', content: 'Oi Pedro! Sou da Growth Game Barbearia. O Bruno te indicou e você ganhou 10% de desconto no primeiro corte!', timestamp: daysAgo(3), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm4-2', conversationId: 'conv-4', content: 'Ah legal, quanto fica?', timestamp: daysAgo(3), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm4-3', conversationId: 'conv-4', content: 'Corte + barba por R$50 com o desconto. Horários de segunda a sábado, das 9h às 20h.', timestamp: daysAgo(2.5), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm4-4', conversationId: 'conv-4', content: 'Não sei, tá caro...', timestamp: daysAgo(2), direction: 'incoming', status: 'read', type: 'text' },
    ]
  },
  {
    id: 'conv-5',
    referralId: null,
    contactName: 'Bruno Costa',
    contactPhone: '5511944443333',
    lastMessage: 'Obrigado pelo corte de ontem! Ficou top 🔥',
    lastMessageTime: daysAgo(1),
    unreadCount: 1,
    isOnline: true,
    origin: 'whatsapp',
    temperature: 'hot',
    assignedTo: 'Carlos',
    tags: ['cliente', 'satisfeito'],
    messages: [
      { id: 'm5-1', conversationId: 'conv-5', content: 'E aí Bruno! Pronto pro corte de amanhã?', timestamp: daysAgo(2), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm5-2', conversationId: 'conv-5', content: 'Sim! Horário de sempre, 14h', timestamp: daysAgo(2), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm5-3', conversationId: 'conv-5', content: '✅ Confirmado!', timestamp: daysAgo(2), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm5-4', conversationId: 'conv-5', content: 'Obrigado pelo corte de ontem! Ficou top 🔥', timestamp: daysAgo(1), direction: 'incoming', status: 'read', type: 'text' },
    ]
  },
  {
    id: 'conv-6',
    referralId: null,
    contactName: 'Thiago Almeida',
    contactPhone: '5511977778888',
    lastMessage: 'Pode sim, segunda às 11h tá bom?',
    lastMessageTime: minutesAgo(45),
    unreadCount: 1,
    isOnline: true,
    origin: 'instagram',
    temperature: 'warm',
    assignedTo: 'André',
    tags: ['novo', 'reagendamento'],
    messages: [
      { id: 'm6-1', conversationId: 'conv-6', content: 'Oi, vi os cortes no perfil de vocês. Muito bom!', timestamp: hoursAgo(2), direction: 'incoming', status: 'read', type: 'text' },
      { id: 'm6-2', conversationId: 'conv-6', content: 'Valeu Thiago! Quer agendar um horário?', timestamp: hoursAgo(1.5), direction: 'outgoing', status: 'read', type: 'text' },
      { id: 'm6-3', conversationId: 'conv-6', content: 'Pode sim, segunda às 11h tá bom?', timestamp: minutesAgo(45), direction: 'incoming', status: 'read', type: 'text' },
    ]
  }
];

export const AVAILABLE_TAGS = [
  { id: 'interessado', label: 'Interessado', color: 'bg-info/20 text-info border-info/30' },
  { id: 'agendado', label: 'Agendado', color: 'bg-success/20 text-success border-success/30' },
  { id: 'retorno', label: 'Retorno', color: 'bg-warning/20 text-warning border-warning/30' },
  { id: 'frio', label: 'Frio', color: 'bg-muted text-muted-foreground border-border' },
  { id: 'cliente', label: 'Cliente', color: 'bg-primary/20 text-primary border-primary/30' },
  { id: 'satisfeito', label: 'Satisfeito', color: 'bg-success/20 text-success border-success/30' },
  { id: 'novo', label: 'Novo', color: 'bg-accent/20 text-accent-foreground border-accent/30' },
  { id: 'degradê', label: 'Degradê', color: 'bg-primary/20 text-primary border-primary/30' },
  { id: 'preço', label: 'Preço', color: 'bg-destructive/20 text-destructive border-destructive/30' },
  { id: 'plano-trimestral', label: 'Plano Trimestral', color: 'bg-success/20 text-success border-success/30' },
  { id: 'reagendamento', label: 'Reagendamento', color: 'bg-warning/20 text-warning border-warning/30' },
];

export const TEMPERATURE_OPTIONS = [
  { value: 'cold' as const, label: 'Frio', emoji: '🧊', className: 'bg-info/20 text-info border-info/30' },
  { value: 'warm' as const, label: 'Morno', emoji: '🌤️', className: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'hot' as const, label: 'Quente', emoji: '🔥', className: 'bg-destructive/20 text-destructive border-destructive/30' },
];

export const ORIGIN_OPTIONS = [
  { value: 'whatsapp' as const, label: 'WhatsApp', icon: 'MessageCircle' },
  { value: 'site' as const, label: 'Site', icon: 'Globe' },
  { value: 'instagram' as const, label: 'Instagram', icon: 'Instagram' },
  { value: 'manual' as const, label: 'Manual', icon: 'UserPlus' },
];

export const STATUS_OPTIONS = [
  { value: 'new', label: 'Novo', className: 'bg-info/20 text-info border-info/30' },
  { value: 'attending', label: 'Em atendimento', className: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'qualified', label: 'Qualificado', className: 'bg-primary/20 text-primary border-primary/30' },
  { value: 'client', label: 'Cliente', className: 'bg-success/20 text-success border-success/30' },
  { value: 'lost', label: 'Perdido', className: 'bg-destructive/20 text-destructive border-destructive/30' },
];
