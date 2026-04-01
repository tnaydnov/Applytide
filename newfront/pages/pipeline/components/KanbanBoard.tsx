/**
 * KanbanBoard Component - with Drag & Drop using @dnd-kit
 * Responsive grid layout with drag-and-drop support
 */

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { motion } from 'motion/react';
import type { Application } from '../../../features/applications/api';
import type { PipelineStage } from '../PipelinePage';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  applications: Application[];
  stages: PipelineStage[];
  onApplicationClick: (app: Application) => void;
  onStatusChange: (appId: number | string, newStatus: string) => void;
  isRTL?: boolean;
  selectedIds?: (number | string)[];
  onToggleSelect?: (id: number | string) => void;
}

export function KanbanBoard({
  applications,
  stages,
  onApplicationClick,
  onStatusChange,
  isRTL = false,
  selectedIds: _selectedIds = [],
  onToggleSelect: _onToggleSelect,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group applications by status
  const applicationsByStatus = stages.reduce((acc, stage) => {
    acc[stage.id] = applications.filter(
      (app) => app.status.toLowerCase().replace(/\s+/g, '_') === stage.id
    );
    return acc;
  }, {} as Record<string, Application[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeAppId = active.id.toString().replace('app-', '');
    const overId = over.id.toString();

    // Check if dropped on a stage column
    const targetStage = stages.find((s) => overId === `stage-${s.id}`);
    if (targetStage) {
      onStatusChange(activeAppId, targetStage.id);
      setActiveId(null);
      return;
    }

    // Check if dropped on another card
    const targetApp = applications.find(
      (app) => overId === `app-${app.id}`
    );
    if (targetApp) {
      const targetStageId = targetApp.status.toLowerCase().replace(/\s+/g, '_');
      const activeApp = applications.find((app) => String(app.id) === String(activeAppId));
      const activeStageId = activeApp?.status.toLowerCase().replace(/\s+/g, '_');

      // Only update if moving to a different stage
      if (targetStageId !== activeStageId) {
        onStatusChange(activeAppId, targetStageId);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeApp = activeId
    ? applications.find((app) => `app-${app.id}` === activeId)
    : null;

  return (
    <div className="w-full" dir={isRTL ? 'rtl' : 'ltr'} data-tour="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {stages.map((stage, idx) => {
            const stageApps = applicationsByStatus[stage.id] || [];

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="min-h-[400px]"
              >
                <KanbanColumn
                  stage={stage}
                  applications={stageApps}
                  allStages={stages}
                  onApplicationClick={onApplicationClick}
                  onStatusChange={onStatusChange}
                  delay={idx * 0.1}
                  isRTL={isRTL}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeApp ? (
            <div className="opacity-80 rotate-3 scale-105">
              <KanbanCard
                application={activeApp}
                onClick={() => {}}
                onMoveToStage={() => {}}
                stages={stages}
                isDragging={true}
                isRTL={isRTL}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default KanbanBoard;