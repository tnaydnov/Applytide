import { Card, Button } from '../../../components/ui';

export default function Pagination({ pagination, loading = false, onGo }) {
  if (!pagination?.pages || pagination.pages <= 1) return null;

  const currentPage = pagination.page;
  const totalPages = pagination.pages;

  const pages = [];
  if (currentPage > 3) {
    pages.push(1);
    if (currentPage > 4) pages.push('…');
  }
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) {
    if (currentPage < totalPages - 3) pages.push('…');
    pages.push(totalPages);
  }

  return (
    <Card className="mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <div className="text-sm text-slate-300">
          Showing {((pagination.page - 1) * pagination.page_size) + 1} to {Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total} jobs
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => onGo?.(pagination.page - 1)}
            disabled={!pagination.has_prev || loading}
            variant="outline"
            size="sm"
            className="flex items-center"
            type="button"
          >
            <span className="mr-1">←</span>
            Previous
          </Button>

          <div className="flex items-center space-x-1">
            {pages.map((p, i) => (
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1 text-gray-400">…</span>
              ) : (
                <Button
                  key={p}
                  onClick={() => onGo?.(p)}
                  disabled={loading}
                  variant={p === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className="min-w-[2.5rem] h-8"
                  type="button"
                >
                  {p}
                </Button>
              )
            ))}
          </div>

          <Button
            onClick={() => onGo?.(pagination.page + 1)}
            disabled={!pagination.has_next || loading}
            variant="outline"
            size="sm"
            className="flex items-center"
            type="button"
          >
            Next
            <span className="ml-1">→</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
