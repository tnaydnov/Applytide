/**
 * Skeleton loader components for smooth loading transitions
 */

export function CardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-700 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-6 bg-slate-700 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-700 rounded w-full"></div>
        <div className="h-3 bg-slate-700 rounded w-5/6"></div>
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-6 bg-slate-700 rounded w-16"></div>
        <div className="h-6 bg-slate-700 rounded w-20"></div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-5 bg-slate-700 rounded w-48"></div>
            <div className="h-4 bg-slate-700 rounded w-20"></div>
          </div>
          <div className="h-4 bg-slate-700 rounded w-32 mb-3"></div>
          <div className="flex gap-2">
            <div className="h-7 bg-slate-700 rounded-full w-24"></div>
            <div className="h-7 bg-slate-700 rounded-full w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColumnSkeleton() {
  return (
    <div className="bg-slate-800/40 rounded-xl p-4 min-w-[320px]">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-slate-700 rounded w-32 animate-pulse"></div>
        <div className="h-5 w-8 bg-slate-700 rounded-full animate-pulse"></div>
      </div>
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6">
      <ColumnSkeleton />
      <ColumnSkeleton />
      <ColumnSkeleton />
      <ColumnSkeleton />
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-24 mb-3"></div>
          <div className="h-8 bg-slate-700 rounded w-16"></div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-slate-800/50 rounded-lg overflow-hidden">
      <div className="border-b border-slate-700/50 p-4">
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-700 rounded w-24 animate-pulse"></div>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-700/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 bg-slate-700 rounded w-32 animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
