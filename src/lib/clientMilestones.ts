import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ClientMilestone {
  level: number;
  label: string;
  minConverted: number;
  className: string;
}

export const POINTS_VALIDITY_DAYS = 180;

export const CLIENT_MILESTONES: ClientMilestone[] = [
  { level: 1, label: 'Bronze', minConverted: 0, className: 'bg-warning/10 text-warning border-warning/30' },
  { level: 2, label: 'Prata', minConverted: 2, className: 'bg-muted text-muted-foreground border-border/50' },
  { level: 3, label: 'Gold', minConverted: 5, className: 'bg-primary/10 text-primary border-primary/30' },
  { level: 4, label: 'VIP', minConverted: 10, className: 'bg-accent/10 text-accent border-accent/30' },
];

export const getClientMilestone = (convertedCount: number): ClientMilestone => {
  return [...CLIENT_MILESTONES].reverse().find((milestone) => convertedCount >= milestone.minConverted) ?? CLIENT_MILESTONES[0];
};

export const getNextClientMilestone = (convertedCount: number): ClientMilestone | null => {
  return CLIENT_MILESTONES.find((milestone) => milestone.minConverted > convertedCount) ?? null;
};

export const getMilestoneProgress = (convertedCount: number) => {
  const current = getClientMilestone(convertedCount);
  const next = getNextClientMilestone(convertedCount);

  if (!next) {
    return { current, next: null, percentage: 100, remaining: 0 };
  }

  const span = Math.max(next.minConverted - current.minConverted, 1);
  const completed = Math.max(convertedCount - current.minConverted, 0);
  return {
    current,
    next,
    percentage: Math.min(100, Math.round((completed / span) * 100)),
    remaining: Math.max(next.minConverted - convertedCount, 0),
  };
};

export const getPointsValidity = (firstPointDate?: string | null, validityDays = POINTS_VALIDITY_DAYS) => {
  if (!firstPointDate) {
    return { expiresAt: null as Date | null, daysLeft: null as number | null, label: 'Sem pontos ativos' };
  }

  const expiresAt = addDays(new Date(firstPointDate), validityDays);
  const daysLeft = differenceInCalendarDays(expiresAt, new Date());

  return {
    expiresAt,
    daysLeft,
    label: daysLeft >= 0
      ? `Expira em ${format(expiresAt, 'dd/MM/yyyy', { locale: ptBR })}`
      : `Expirou em ${format(expiresAt, 'dd/MM/yyyy', { locale: ptBR })}`,
  };
};
