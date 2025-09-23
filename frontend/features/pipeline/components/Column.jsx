import { useMemo, useState, useCallback } from 'react';
import { Badge } from '../../../components/ui';
import ApplicationCard from './ApplicationCard';
import { getStatusConfig } from '../utils/status';

/**
 * A single kanban column that supports drag & drop and expansion.
 *
 * Props:
 * - status: string (column name)
 * - items: Application[] (array; can be empty/undefined)
 * - onMove: (id: string|number, newStatus: string) => void|Promise<void>
 * - onDelete: (id: string|number) => void|Promise<void>
 * - onUpdate: () => void|Promise<void>           // reload callback
 * - availableStatuses: string[]                   // list of all statuses for move menus
 * - draggedItem: Application|null                 // current dragged app (if any)
 * - onDragStart: (application) => void
 * - onDragEnd: () => void
 * - stageNumber: number                           // ordinal to display in chip
 */
export default function Column({
  status,
  items,
  onMove,
  onDelete,
  onUpdate,
  availableStatuses = [],
  draggedItem = null,
  onDragStart,
  onDragEnd,
  stageNumber = 1,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDropAllowed, setIsDropAllowed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const config = getStatusConfig(status);
  const safeItems = Array.isArray(items) ? items : [];

  // Newest first (robust to bad/missing dates)
  const sortedItems = useMemo(() => {
    return [...safeItems].sort((a, b) => {
      const aT = new Date(a?.created_at || 0).getTime();
      const bT = new Date(b?.created_at || 0).getTime();
      return bT - aT;
    });
  }, [safeItems]);

  const INITIAL_SHOW_COUNT = 5;
  const shouldShowExpansion = sortedItems.length > INITIAL_SHOW_COUNT;
  const visibleItems = showAll ? sortedItems : sortedItems.slice(0, INITIAL_SHOW_COUNT);
  const hiddenCount = Math.max(sortedItems.length - INITIAL_SHOW_COUNT, 0);

  const allowDropFor = useCallback(
    (data) => {
      if (!data) return false;
      // Do not allow dropping into the same column
      if (data.currentStatus === status) return false;
      // Optional: block drop if app already has this status (defensive)
      return true;
    },
    [status]
  );

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
    // Best-effort: check incoming payload
    try {
      const payload = e.dataTransfer?.getData?.('text/plain');
      const parsed = payload ? JSON.parse(payload) : null;
      setIsDropAllowed(allowDropFor(parsed));
    } catch {
      setIsDropAllowed(false);
    }
  }, [allowDropFor]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    setIsDropAllowed(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    // Only reset if cursor actually leaves the element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setIsDropAllowed(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      setIsDropAllowed(false);
      try {
        const text = e.dataTransfer?.getData?.('text/plain');
        const data = text ? JSON.parse(text) : null;
        if (!data || !data.id) return;
        if (allowDropFor(data)) {
          onMove?.(data.id, status);
        }
      } catch {
        // swallow parse errors
      }
    },
    [allowDropFor, onMove, status]
  );

  return (
    <div className="w-full h-full">
      <div
        className={`glass-card rounded-2xl border transition-all duration-300 overflow-hidden h-full flex flex-col backdrop-blur-md ${
          isDragOver
            ? isDropAllowed
              ? 'border-green-400/60 shadow-lg shadow-green-500/20 scale-[1.02] bg-green-500/10'
              : 'border-red-400/60 shadow-lg shadow-red-500/20 bg-red-500/10'
            : 'border-white/20 hover:border-indigo-400/30 shadow-xl'
        }`}
        style={{ minHeight: '500px', maxHeight: '75vh' }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div
          className={`p-4 border-b border-white/10 flex-shrink-0 bg-gradient-to-br ${config.gradient} text-white`}
          data-stage-anchor
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/30 shadow-lg flex-shrink-0 ${
                  config.bgColor || 'bg-gray-500'
                }`}
                aria-label={`Stage ${stageNumber}`}
                title={`Stage ${stageNumber}`}
              >
                {stageNumber}
              </div>
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">{config.icon}</span>
                <h3 className="font-bold text-white text-sm truncate">{status || 'Unknown'}</h3>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Badge
                variant="default"
                size="sm"
                className="px-2 py-1 text-xs bg-white/20 text-white border-white/30 font-semibold shadow-sm"
                aria-label={`${safeItems.length} applications`}
              >
                {safeItems.length}
              </Badge>

              {shouldShowExpansion && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="p-1.5 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  title={showAll ? 'Show less' : `Show ${hiddenCount} more`}
                  type="button"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dropzone hint */}
        {isDragOver && (
          <div
            className={`p-2 text-center border-2 border-dashed ${
              isDropAllowed
                ? 'border-emerald-400 bg-emerald-400/20 text-emerald-100'
                : 'border-red-400 bg-red-400/20 text-red-100'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="text-xl mb-1">{isDropAllowed ? '⬇️' : '❌'}</div>
            <p className="text-xs font-medium">{isDropAllowed ? `Move to ${status}` : 'Cannot drop'}</p>
          </div>
        )}

        {/* Content */}
        <div className="glass-card rounded-xl border border-white/20 p-4 md:p-5 space-y-4 flex-1 overflow-y-auto backdrop-blur-xl bg-gradient-to-b from-white/5 to-white/10 shadow-lg">
          {safeItems.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <div className="text-3xl mb-3">{config.icon}</div>
              <p className="text-sm font-medium text-white/80">No applications</p>
              <p className="text-xs text-white/50 mt-1">Drag here</p>
            </div>
          ) : (
            <>
              {visibleItems.map((app, index) => (
                <div
                  key={app?.id ?? `${status}-row-${index}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="transform transition-all duration-300 hover:scale-[1.02]"
                >
                  <ApplicationCard
                    application={app}
                    onMove={onMove}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    statuses={availableStatuses}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    viewMode="board"
                  />
                </div>
              ))}

              {!showAll && shouldShowExpansion && (
                <div className="p-3 text-center border-t border-white/10 bg-white/5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="text-sm text-indigo-300 hover:text-indigo-200 font-medium transition-colors hover:bg-indigo-500/20 px-3 py-1 rounded-lg"
                  >
                    + Show {hiddenCount} more application{hiddenCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}

              {showAll && shouldShowExpansion && (
                <div className="p-3 text-center border-t border-white/10 bg-white/5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    className="text-sm text-white/60 hover:text-white/80 font-medium transition-colors hover:bg-white/10 px-3 py-1 rounded-lg"
                  >
                    ↑ Show less
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
