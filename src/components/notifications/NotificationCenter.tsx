import { useState } from 'react';
import { Bell, BellDot, BellRing, Calendar, Clock, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFollowUpNotifications, getUrgency, type FollowUpNotification } from '@/hooks/use-follow-up-notifications';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { toast } from 'sonner';

const urgencyConfig = {
  overdue: { label: 'Atrasado', className: 'bg-destructive/20 text-destructive border-destructive/30', icon: Clock },
  today: { label: 'Hoje', className: 'bg-warning/20 text-warning border-warning/30', icon: Bell },
  tomorrow: { label: 'Amanhã', className: 'bg-info/20 text-info border-info/30', icon: Calendar },
  upcoming: { label: 'Em breve', className: 'bg-muted text-muted-foreground border-border', icon: Calendar },
} as const;

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, overdueCount, totalUrgent, dismiss, canShow } = useFollowUpNotifications();

  if (!canShow) return null;

  const handleClick = (_notification: FollowUpNotification) => {
    setOpen(false);
    navigate('/leads?view=leads');
  };

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
            {notifications.length > 0 && (
              <Badge variant="outline" className="text-xs">{notifications.length}</Badge>
            )}
          </div>
          {overdueCount > 0 && (
            <p className="text-xs text-destructive mt-1">
              {overdueCount} follow-up{overdueCount > 1 ? 's' : ''} atrasado{overdueCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notification) => {
                const urgency = getUrgency(notification.follow_up_date);
                const config = urgencyConfig[urgency];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={notification.id}
                    className="p-3 hover:bg-secondary/50 transition-colors cursor-pointer group"
                    onClick={() => handleClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("mt-0.5 p-1.5 rounded-lg", config.className.split(' ')[0])}>
                        <StatusIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{notification.lead_name}</p>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", config.className)}>
                            {config.label}
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
                        onClick={(e) => { e.stopPropagation(); dismiss(notification.id); }}
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

        {notifications.length > 0 && (
          <div className="p-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => { setOpen(false); navigate('/leads'); }}
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
