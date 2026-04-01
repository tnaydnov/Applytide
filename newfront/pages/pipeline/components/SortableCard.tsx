/**
 * SortableCard Component - Wrapper for KanbanCard with drag-and-drop
 * Uses @dnd-kit's useSortable hook
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Application } from '../../../features/applications/api';
import type { PipelineStage } from '../PipelinePage';
import { KanbanCard } from './KanbanCard';

interface SortableCardProps {
  application: Application;
  onClick: () => void;
  onMoveToStage: (stageId: string) => void;
  stages: PipelineStage[];
  isRTL?: boolean;
}

export function SortableCard({
  application,
  onClick,
  onMoveToStage,
  stages,
  isRTL = false,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `app-${application.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCard
        application={application}
        onClick={onClick}
        onMoveToStage={onMoveToStage}
        stages={stages}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        isRTL={isRTL}
      />
    </div>
  );
}

export default SortableCard;
