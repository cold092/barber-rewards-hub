import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

export interface FollowUpNotification {
  id: string;
  lead_name: string;
  lead_phone: string;
  follow_up_date: string;
  follow_up_note: string | null;
  status: string;
}

export type NotificationUrgency = 'overdue' | 'today' | 'tomorrow' | 'upcoming';

export function getUrgency(dateStr: string): NotificationUrgency {
  const d = new Date(dateStr);
  if (isPast(d) && !isToday(d)) return 'overdue';
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  return 'upcoming';
}

export function getDaysLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const days = differenceInDays(d, new Date());
  if (days <= 0) return '';
  return `${days}d`;
}

export function useFollowUpNotifications() {
  const [notifications, setNotifications] = useState<FollowUpNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissedNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const { isAdmin, isBarber, profile } = useAuth();
  const notifiedRef = useRef<Set<string>>(new Set());
  const permissionRef = useRef<NotificationPermission>('default');

  // Request browser notification permission on mount
  useEffect(() => {
    if (!('Notification' in window)) return;
    permissionRef.current = Notification.permission;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        permissionRef.current = p;
      });
    }
  }, []);

  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return;
    if (permissionRef.current !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        tag: 'follow-up',
      });
    } catch {
      // Silent fail for environments that don't support notifications
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!isAdmin && !isBarber) return;

    let query = supabase
      .from('referrals')
      .select('id, lead_name, lead_phone, follow_up_date, follow_up_note, status, referrer_id')
      .not('follow_up_date', 'is', null)
      .neq('status', 'converted')
      .order('follow_up_date', { ascending: true });

    // Barbers only see their own referrals
    if (isBarber && profile) {
      query = query.eq('referrer_id', profile.user_id);
    }

    const { data, error } = await query;

    if (error || !data) return;

    // Only show overdue + today + tomorrow + up to 3 days
    const filtered = (data as unknown as (FollowUpNotification & { referrer_id: string })[]).filter(n => {
      const d = new Date(n.follow_up_date);
      return isPast(d) || isToday(d) || isTomorrow(d) || differenceInDays(d, new Date()) <= 3;
    });

    setNotifications(filtered);

    // Send browser notifications for new overdue/today items
    filtered.forEach(n => {
      const urgency = getUrgency(n.follow_up_date);
      if ((urgency === 'overdue' || urgency === 'today') && !notifiedRef.current.has(n.id)) {
        notifiedRef.current.add(n.id);
        const label = urgency === 'overdue' ? '⚠️ Follow-up atrasado' : '🔔 Follow-up para hoje';
        sendBrowserNotification(label, `${n.lead_name} precisa de atenção`);
      }
    });
  }, [isAdmin, isBarber, profile, sendBrowserNotification]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('dismissedNotifications', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const activeNotifications = notifications.filter(n => !dismissed.has(n.id));
  const overdueCount = activeNotifications.filter(n => getUrgency(n.follow_up_date) === 'overdue').length;
  const todayCount = activeNotifications.filter(n => getUrgency(n.follow_up_date) === 'today').length;
  const totalUrgent = overdueCount + todayCount;

  return {
    notifications: activeNotifications,
    overdueCount,
    todayCount,
    totalUrgent,
    dismiss,
    reload: loadNotifications,
    canShow: isAdmin || isBarber,
  };
}
