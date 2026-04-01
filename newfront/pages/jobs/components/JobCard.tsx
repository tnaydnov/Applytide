/**
 * JobCard Component
 * Card displaying job information in the grid
 */

import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Clock, ExternalLink, Send, CheckSquare, Square, Archive } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { Job } from '../../../features/jobs/api';

interface JobCardProps {
  job: Job;
  onClick: () => void;
  onApply: () => void;
  delay?: number;
  isRTL?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

const getRemoteTypeBadge = (remoteType: string | undefined, isRTL: boolean) => {
  if (!remoteType) return null;

  const badges: Record<string, { color: string; label: { en: string; he: string } }> = {
    remote: {
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      label: { en: '🏠 Remote', he: '🏠 מרחוק' },
    },
    hybrid: {
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      label: { en: '🔄 Hybrid', he: '🔄 היברידי' },
    },
    onsite: {
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      label: { en: '🏢 On-site', he: '🏢 במשרד' },
    },
  };

  const badge = badges[remoteType.toLowerCase()];
  if (!badge) return null;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
      {isRTL ? badge.label.he : badge.label.en}
    </span>
  );
};

const formatDate = (dateString: string | undefined, isRTL: boolean): string => {
  if (!dateString) return isRTL ? 'לא ידוע' : 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return isRTL ? 'היום' : 'Today';
  if (diffDays === 1) return isRTL ? 'אתמול' : 'Yesterday';
  if (diffDays < 7) return isRTL ? `לפני ${diffDays} ימים` : `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return isRTL ? `לפני ${weeks} שבועות` : `${weeks} weeks ago`;
  }

  const months = Math.floor(diffDays / 30);
  return isRTL ? `לפני ${months} חודשים` : `${months} months ago`;
};

export function JobCard({
  job,
  onClick,
  onApply,
  delay = 0,
  isRTL = false,
  selected = false,
  onToggleSelect,
}: JobCardProps) {
  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApply();
  };

  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.source_url) {
      window.open(job.source_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect?.();
  };

  // Detect if job title is RTL (Hebrew/Arabic)
  const isTextRTL = (text: string) => {
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/;
    return rtlRegex.test(text);
  };

  const jobTitleIsRTL = isTextRTL(job.title);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className="
        bg-white dark:bg-[#383e4e]/50 
        border border-[#b6bac5]/20 
        rounded-xl p-6 
        hover:border-[#9F5F80]/50 
        hover:shadow-xl
        transition-all duration-200
        cursor-pointer group
        relative overflow-hidden
      "
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Hover Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#9F5F80]/0 to-[#383e4e]/0 group-hover:from-[#9F5F80]/5 group-hover:to-[#383e4e]/5 transition-all duration-300 pointer-events-none" />

      {/* Selection Checkbox - positioned based on job title text direction */}
      {onToggleSelect && (
        <button
          onClick={handleSelectClick}
          className={`absolute ${jobTitleIsRTL ? 'left-4' : 'right-4'} top-4 z-20 p-2 rounded-lg hover:bg-[#b6bac5]/20 transition-colors`}
          title={isRTL ? (selected ? 'בטל בחירה' : 'בחר') : (selected ? 'Deselect' : 'Select')}
        >
          {selected ? (
            <CheckSquare className="h-5 w-5 text-[#9F5F80]" />
          ) : (
            <Square className="h-5 w-5 text-[#6c757d]" />
          )}
        </button>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-lg text-[#383e4e] dark:text-white mb-2 group-hover:text-[#9F5F80] transition-colors line-clamp-2">
            {job.title}
          </h3>

          {job.company_name && (
            <p className="text-[#6c757d] dark:text-[#b6bac5] font-medium mb-3">
              {job.company_name}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {job.is_archived && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full text-xs font-medium flex items-center gap-1">
                <Archive className="h-3 w-3" />
                {isRTL ? 'ארכיון' : 'Archived'}
              </span>
            )}
            {getRemoteTypeBadge(job.remote_type, isRTL)}
            {job.job_type && (
              <span className="px-3 py-1 bg-[#b6bac5]/20 text-[#383e4e] dark:text-white rounded-full text-xs font-medium">
                {job.job_type}
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          {job.location && (
            <div className="flex items-center gap-2 text-sm text-[#6c757d] dark:text-[#b6bac5]">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-[#6c757d] dark:text-[#b6bac5]">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>{formatDate(job.created_at, isRTL)}</span>
          </div>
        </div>

        {/* Description Preview */}
        {job.description && (
          <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] line-clamp-3 mb-4">
            {job.description}
          </p>
        )}

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-[#9F5F80]/10 text-[#9F5F80] rounded text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-2 py-1 text-[#6c757d] dark:text-[#b6bac5] text-xs">
                +{job.skills.length - 3} {isRTL ? 'עוד' : 'more'}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-[#b6bac5]/20">
          <Button
            data-tutorial="save-job"
            onClick={handleApplyClick}
            className="flex-1"
            style={{
              background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            {isRTL ? 'הגש מועמדות' : 'Apply'}
          </Button>

          {job.source_url && (
            <Button
              variant="outline"
              onClick={handleSourceClick}
              className="px-4"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default JobCard;