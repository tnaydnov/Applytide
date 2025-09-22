import { Card, Button } from '../../../components/ui';
import { parseJobForDisplay } from '../utils/parseJob';

export default function JobCard({
  job,
  index = 0,
  isExpanded = false,
  onToggle,
  onView,
  onApply,
  onDelete,
  toast,
}) {
  const parsed = parseJobForDisplay(job);
  const lines = parsed.cleanDescription.split('\n').filter((l) => l.trim());
  const showReadMore = lines.length > 3;

  return (
    <Card
      className="glass-card group hover:border-white/20 transition-all duration-300 animate-slideIn overflow-hidden"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex justify-between items-start space-x-4 mb-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-2 *:min-w-0">
            <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors leading-tight truncate">
              {job.title}
            </h3>
            <div className="flex items-center space-x-2 ml-4">
              {job.remote_type && (
                <span
                  className={`chip ${
                    job.remote_type === 'Remote' ? 'chip-cyan' : job.remote_type === 'Hybrid' ? 'chip-amber' : 'chip-rose'
                  }`}
                >
                  {job.remote_type}
                </span>
              )}
              <span className="text-xs text-gray-400">{new Date(job.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Company & Location */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300 mb-3">
            {job.company_name && (
              <div className="flex items-center">
                <span className="mr-1">🏢</span>
                <span className="font-medium text-indigo-400">{job.company_name}</span>
              </div>
            )}
            {job.location && (
              <div className="flex items-center">
                <span className="mr-1">📍</span>
                <span>{job.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {parsed.cleanDescription && (
        <div className="mb-4">
          <div className="text-slate-300 text-sm leading-relaxed break-words">
            {(isExpanded ? lines : lines.slice(0, 3)).map((line, idx) => (
              <div key={idx} className={line.startsWith('•') ? 'ml-4 mb-1' : 'mb-2'}>
                {line}
              </div>
            ))}
            {showReadMore && (
              <button
                onClick={() => onToggle?.(job.id)}
                className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-2"
                type="button"
              >
                {isExpanded ? '...read less' : '...read more'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {parsed.skills?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {parsed.skills.slice(0, 5).map((s, i) => (
            <span key={i} className="chip chip-cyan">
              {s}
            </span>
          ))}
          {parsed.skills.length > 5 && (
            <span className="chip text-slate-300 bg-white/10 border border-white/15">+{parsed.skills.length - 5} more</span>
          )}
        </div>
      )}

      {/* Requirements preview (expanded) */}
      {isExpanded && parsed.requirements?.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50/5 border border-white/10 rounded-lg">
          <h4 className="text-sm font-medium text-slate-100 mb-2">Requirements:</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            {parsed.requirements.slice(0, 3).map((req, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-indigo-400 mr-2">•</span>
                <span>{req}</span>
              </li>
            ))}
            {parsed.requirements.length > 3 && (
              <li className="text-gray-400 italic">...and {parsed.requirements.length - 3} more requirements</li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100/10">
        <div className="flex items-center space-x-3">
          {job.source_url && (
            <>
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-indigo-400 inline-flex items-center"
              >
                <span className="mr-1">🔗</span> View Original
              </a>
              <button
                onClick={() => {
                  const url = job.source_url?.trim();
                  if (!url) return;
                  if (navigator.share) {
                    navigator
                      .share({
                        title: `${job.title} at ${job.company_name}`,
                        text: `Check out this job: ${job.title} at ${job.company_name}`,
                        url,
                      })
                      .catch(() => {});
                  } else {
                    const shareText = `${job.title} at ${job.company_name}\n${url}`;
                    navigator.clipboard
                      .writeText(shareText)
                      .then(() => toast?.success?.('Job details copied to clipboard!'))
                      .catch(() => toast?.error?.('Failed to copy to clipboard'));
                  }
                }}
                className="text-sm text-gray-400 hover:text-blue-400"
                type="button"
              >
                <span className="mr-1">📤</span> Share
              </button>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => onView?.(job)} variant="outline" size="sm" className="btn-ghost" type="button">
            <span className="mr-1">👁️</span> View Details
          </Button>
          <Button onClick={() => onApply?.(job)} size="sm" className="btn-orchid" type="button">
            <span className="mr-1">📝</span> Apply Now
          </Button>
          <Button
            onClick={() => onDelete?.(job.id)}
            variant="outline"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-800/50"
            type="button"
          >
            <span className="mr-1">🗑️</span> Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
