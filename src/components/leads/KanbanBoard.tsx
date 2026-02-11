import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import type { Referral, ReferralStatus } from '@/types/database';
import type { ColumnConfig } from './ColumnManager';

interface KanbanBoardProps {
  referrals: Referral[];
  onStatusChange: (referralId: string, newStatus: ReferralStatus) => Promise<void>;
  onColumnChange?: (referralId: string, columnId: string) => Promise<void>;
  onOpenDetails: (referral: Referral) => void;
  onWhatsApp: (referral: Referral) => void;
  isAdmin: boolean;
  contactTagOptions: Array<{ value: string; label: string; className: string }>;
  customColumns?: ColumnConfig[];
  onColumnsReorder?: (columns: ColumnConfig[]) => void;
}

const DEFAULT_COLUMNS: { id: ReferralStatus; title: string; color: string }[] = [
  { id: 'new', title: 'Novos', color: 'bg-info/10' },
  { id: 'contacted', title: 'Contatados', color: 'bg-warning/10' },
  { id: 'converted', title: 'Convertidos', color: 'bg-success/10' }
];

export function KanbanBoard({
  referrals,
  onStatusChange,
  onColumnChange,
  onOpenDetails,
  onWhatsApp,
  isAdmin,
  contactTagOptions,
  customColumns,
  onColumnsReorder
}: KanbanBoardProps) {
  const [activeReferral, setActiveReferral] = useState<Referral | null>(null);

  const columns = customColumns || DEFAULT_COLUMNS;

  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [columnDropTargetId, setColumnDropTargetId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
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
    const destinationColumnId = over.id as string;
    const referral = referrals.find(r => r.id === referralId);

    if (!referral) return;

    const isStatusColumn = ['new', 'contacted', 'converted'].includes(destinationColumnId);

    if (isStatusColumn) {
      const newStatus = destinationColumnId as ReferralStatus;
      if (referral.status !== newStatus) {
        await onStatusChange(referralId, newStatus);
      }
      return;
    }

    if (onColumnChange) {
      await onColumnChange(referralId, destinationColumnId);
    }
  };


  const handleColumnDragStart = (columnId: string) => {
    setDraggingColumnId(columnId);
  };


  const handleColumnDragOver = (columnId: string) => {
    if (!draggingColumnId || draggingColumnId === columnId) return;
    setColumnDropTargetId(columnId);
  };

  const handleColumnDrop = (destinationColumnId: string) => {
    if (!customColumns || !onColumnsReorder || !draggingColumnId || draggingColumnId === destinationColumnId) {
      setDraggingColumnId(null);
      setColumnDropTargetId(null);
      return;
    }

    const sourceIndex = customColumns.findIndex((column) => column.id === draggingColumnId);
    const destinationIndex = customColumns.findIndex((column) => column.id === destinationColumnId);

    if (sourceIndex === -1 || destinationIndex === -1) {
      setDraggingColumnId(null);
      setColumnDropTargetId(null);
      return;
    }

    const nextColumns = [...customColumns];
    const [moved] = nextColumns.splice(sourceIndex, 1);
    nextColumns.splice(destinationIndex, 0, moved);
    onColumnsReorder(nextColumns);
    setDraggingColumnId(null);
    setColumnDropTargetId(null);
  };

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null);
    setColumnDropTargetId(null);
  };

  const getReferralsByColumn = (columnId: string) => {
    // For default status columns, filter by status
    if (['new', 'contacted', 'converted'].includes(columnId)) {
      return referrals.filter(r => r.status === columnId);
    }

    // Default client bucket: every client without an explicit custom column mapping
    if (columnId === 'clients') {
      const customColumnIds = new Set(columns.map((column) => column.id));
      return referrals.filter((referral) => !referral.contact_tag || !customColumnIds.has(referral.contact_tag));
    }

    // Client-specific columns
    if (columnId === 'vip') {
      return referrals.filter(r => r.contact_tag === 'sql');
    }
    if (columnId === 'inactive') {
      return referrals.filter(r => r.contact_tag === 'cold');
    }
    if (columnId === 'active') {
      // Active = all clients not in VIP or inactive
      return referrals.filter(r => r.contact_tag !== 'sql' && r.contact_tag !== 'cold');
    }

    // Custom tag-based columns: match column id to contact_tag
    return referrals.filter(r => r.contact_tag === columnId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(columns.length, 4)} gap-4`}
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((column) => {
          const columnReferrals = getReferralsByColumn(column.id);
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              count={columnReferrals.length}
              color={column.color}
              columnDragEnabled={Boolean(customColumns && onColumnsReorder)}
              isColumnDragging={draggingColumnId === column.id}
              isColumnDropTarget={columnDropTargetId === column.id}
              onColumnDragStart={() => handleColumnDragStart(column.id)}
              onColumnDragEnd={handleColumnDragEnd}
              onColumnDragOver={() => handleColumnDragOver(column.id)}
              onColumnDrop={() => handleColumnDrop(column.id)}
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
          <div className="p-3 rounded-xl bg-background border-2 border-primary shadow-lg backdrop-blur-sm">
            <p className="font-medium text-sm">{activeReferral.lead_name}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
