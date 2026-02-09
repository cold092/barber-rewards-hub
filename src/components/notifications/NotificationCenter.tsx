import { useState, useEffect, useCallback } from 'react';
import { Bell, BellDot, Calendar, Clock, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FollowUpNotification {
  id: string;
  lead_name: string;
  lead_phone: string;
  follow_up_date: string;
  follow_up_note: string | null;
  status: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<FollowUpNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissedNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const { isAdmin, isBarber, profile } = useAuth();
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    if (!isAdmin && !isBarber) return;

    const { data, error } = await supabase
      .from('referrals')
      .select('id, lead_name, lead_phone, follow_up_date, follow_up_note, status')
      .not('follow_up_date', 'is', null)
      .neq('status', 'converted')
      .order('follow_up_date', { ascending: true });

    if (!error && data) {
      // Filter based on role
      let filtered = data as unknown as FollowUpNotification[];
      if (isBarber && profile) {
        // For barbers, we'd need referrer_id but we don't have it in this query
        // For now show all that are due/overdue
      }
      
      // Only show overdue + today + tomorrow
      filtered = filtered.filter(n => {
        const d = new Date(n.follow_up_date);
        return isPast(d) || isToday(d) || isTomorrow(d) || differenceInDays(d, new Date()) <= 3;
      });

      setNotifications(filtered);
    }
  }, [isAdmin, isBarber, profile]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem('dismissedNotifications', JSON.stringify([...next]));
  };

  const handleClick = (notification: FollowUpNotification) => {
    setOpen(false);
    navigate(`/leads?view=leads`);
  };

  const activeNotifications = notifications.filter(n => !dismissed.has(n.id));
  const overdueCount = activeNotifications.filter(n => {
    const d = new Date(n.follow_up_date);
    return isPast(d) && !isToday(d);
  }).length;
  const todayCount = activeNotifications.filter(n => isToday(new Date(n.follow_up_date))).length;
  const totalUrgent = overdueCount + todayCount;

  const getStatusInfo = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isPast(d) && !isToday(d)) {
      return { label: 'Atrasado', className: 'bg-destructive/20 text-destructive border-destructive/30', icon: Clock };
    }
    if (isToday(d)) {
      return { label: 'Hoje', className: 'bg-warning/20 text-warning border-warning/30', icon: Bell };
    }
    if (isTomorrow(d)) {
      return { label: 'Amanhã', className: 'bg-info/20 text-info border-info/30', icon: Calendar };
    }
    const days = differenceInDays(d, new Date());
    return { label: `${days}d`, className: 'bg-muted text-muted-foreground border-border', icon: Calendar };
  };

  if (!isAdmin && !isBarber) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          {totalUrgent > 0 ? (
            <>
              <BellDot className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
                {totalUrgent}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-sm">Notificações</h4>
            {activeNotifications.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {activeNotifications.length}
              </Badge>
            )}
          </div>
          {overdueCount > 0 && (
            <p className="text-xs text-destructive mt-1">
              {overdueCount} follow-up{overdueCount > 1 ? 's' : ''} atrasado{overdueCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <ScrollArea className="max-h-80">
          {activeNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {activeNotifications.map((notification) => {
                const statusInfo = getStatusInfo(notification.follow_up_date);
                const StatusIcon = statusInfo.icon;
                return (
                  <div
                    key={notification.id}
                    className="p-3 hover:bg-secondary/50 transition-colors cursor-pointer group"
                    onClick={() => handleClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 p-1.5 rounded-lg", statusInfo.className.split(' ')[0])}>
                        <StatusIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{notification.lead_name}</p>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", statusInfo.className)}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(notification.follow_up_date), "dd 'de' MMM", { locale: ptBR })}
                        </p>
                        {notification.follow_up_note && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                            {notification.follow_up_note}
                          </p>
                        )}
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded"
                        onClick={(e) => handleDismiss(notification.id, e)}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {activeNotifications.length > 0 && (
          <div className="p-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => {
                setOpen(false);
                navigate('/leads');
              }}
            >
              Ver todos os leads
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
