import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { Referral, ReferralStatus } from '@/types/database';

interface KanbanBoardProps {
  referrals: Referral[];
  onStatusChange: (referralId: string, newStatus: ReferralStatus) => Promise<void>;
  onOpenDetails: (referral: Referral) => void;
  onWhatsApp: (referral: Referral) => void;
  isAdmin: boolean;
  contactTagOptions: Array<{ value: string; label: string; className: string }>;
}

const columns: { id: ReferralStatus; title: string; color: string }[] = [
  { id: 'new', title: 'Novos', color: 'bg-info/10' },
  { id: 'contacted', title: 'Contatados', color: 'bg-warning/10' },
  { id: 'converted', title: 'Convertidos', color: 'bg-success/10' }
];

export function KanbanBoard({
  referrals,
  onStatusChange,
  onOpenDetails,
  onWhatsApp,
  isAdmin,
  contactTagOptions
}: KanbanBoardProps) {
  const [activeReferral, setActiveReferral] = useState<Referral | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const referral = referrals.find(r => r.id === active.id);
    if (referral) {
      setActiveReferral(referral);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveReferral(null);

    if (!over) return;

    const referralId = active.id as string;
    const newStatus = over.id as ReferralStatus;
    const referral = referrals.find(r => r.id === referralId);

    if (referral && referral.status !== newStatus) {
      await onStatusChange(referralId, newStatus);
    }
  };

  const getReferralsByStatus = (status: ReferralStatus) => {
    return referrals.filter(r => r.status === status);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => {
          const columnReferrals = getReferralsByStatus(column.id);
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              count={columnReferrals.length}
              color={column.color}
            >
              {columnReferrals.map((referral) => (
                <KanbanCard
                  key={referral.id}
                  referral={referral}
                  onOpenDetails={onOpenDetails}
                  onWhatsApp={onWhatsApp}
                  isAdmin={isAdmin}
                  contactTagOptions={contactTagOptions}
                />
              ))}
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeReferral && (
          <div className="p-3 rounded-lg bg-background border-2 border-primary shadow-lg">
            <p className="font-medium">{activeReferral.lead_name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
