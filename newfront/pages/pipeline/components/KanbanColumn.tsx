/**
 * KanbanColumn Component - with @dnd-kit support
 * Displays a single stage column with droppable area
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Application } from '../../../features/applications/api';
import type { PipelineStage } from '../PipelinePage';
import { SortableCard } from './SortableCard';

interface KanbanColumnProps {
  stage: PipelineStage;
  applications: Application[];
  allStages: PipelineStage[];
  onApplicationClick: (app: Application) => void;
  onStatusChange: (appId: number | string, newStatus: string) => void;
  delay?: number;
  isRTL?: boolean;
}

export function KanbanColumn({
  stage,
  applications,
  allStages,
  onApplicationClick,
  onStatusChange,
  delay: _delay = 0,
  isRTL = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
  });

  const appIds = applications.map((app) => `app-${app.id}`);

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded-full shadow-sm"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-bold text-lg text-[#383e4e] dark:text-white">
            {stage.name}
          </h3>
          <span className="text-sm font-semibold text-[#6c757d] dark:text-[#b6bac5] bg-white dark:bg-[#383e4e] rounded-full px-2.5 py-0.5 border border-[#b6bac5]/20">
            {applications.length}
          </span>
        </div>
        <div
          className="h-1 rounded-full"
          style={{ backgroundColor: `${stage.color}30` }}
        />
      </div>

      {/* Droppable Column */}
      <SortableContext items={appIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`
            space-y-3 p-3 rounded-xl min-h-[300px] transition-all duration-200 flex-1
            ${
              isOver
                ? 'bg-[#9F5F80]/5 dark:bg-[#9F5F80]/10 ring-2 ring-[#9F5F80]/40 scale-[1.01]'
                : 'bg-gray-50/50 dark:bg-[#383e4e]/20'
            }
          `}
        >
          {applications.map((app) => (
            <SortableCard
              key={app.id}
              application={app}
              onClick={() => onApplicationClick(app)}
              onMoveToStage={(stageId) => onStatusChange(app.id, stageId)}
              stages={allStages}
              isRTL={isRTL}
            />
          ))}

          {/* Empty State */}
          {applications.length === 0 && (
            <div className="text-center py-8 text-[#6c757d] dark:text-[#b6bac5]">
              <div
                className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${stage.color}20` }}
              >
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
              </div>
              <p className="text-sm">
                {isRTL ? 'אין בקשות בשלב זה' : 'No applications'}
              </p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default KanbanColumn;
