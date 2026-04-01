/**
 * JobDetailsModal Component - Premium Redesign
 * Full details view of a job with apply and delete actions
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MapPin,
  Briefcase,
  Clock,
  ExternalLink,
  Send,
  Trash2,
  Building2,
  Edit,
  CheckCircle2,
  Sparkles,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Badge } from '../../../components/ui/badge';
import type { Job } from '../../../features/jobs/api';

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: Job) => void;
  onDelete: (jobId: number) => void;
  onEdit?: (job: Job) => void;
  onArchive?: (jobId: number) => void;
  onUnarchive?: (jobId: number) => void;
  isRTL?: boolean;
}

const getRemoteTypeBadge = (remoteType: string | undefined, isRTL: boolean) => {
  if (!remoteType) return null;

  const badges: Record<string, { color: string; bg: string; label: { en: string; he: string } }> = {
    remote: {
      color: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      label: { en: '🏠 Remote', he: '🏠 מרחוק' },
    },
    hybrid: {
      color: 'text-blue-700 dark:text-blue-300',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      label: { en: '🔄 Hybrid', he: '🔄 היברידי' },
    },
    onsite: {
      color: 'text-purple-700 dark:text-purple-300',
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      label: { en: '🏢 On-site', he: '🏢 במשרד' },
    },
  };

  const badge = badges[remoteType.toLowerCase()];
  if (!badge) return null;

  return (
    <Badge className={`${badge.bg} ${badge.color} border-0 px-4 py-1.5 text-sm font-medium`}>
      {isRTL ? badge.label.he : badge.label.en}
    </Badge>
  );
};

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onApply,
  onDelete,
  onEdit,
  onArchive,
  onUnarchive,
  isRTL = false,
}: JobDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  if (!job) return null;

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return isRTL ? 'לא ידוע' : 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDelete = () => {
    onDelete(job.id as number);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60]"
              onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="bg-white dark:bg-[#2a2f3d] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#b6bac5]/10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Premium Header */}
                <div
                  className="relative bg-gradient-to-br from-[#9F5F80] via-[#8a5472] to-[#383e4e] p-8 text-white flex-shrink-0"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
                  
                  <button
                    onClick={onClose}
                    className={`absolute ${isRTL ? 'left-6' : 'right-6'} top-6 text-white/70 hover:text-white transition-all hover:rotate-90 duration-300 z-20`}
                  >
                    <X className="h-6 w-6" />
                  </button>

                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-4 pr-8">{job.title}</h2>

                    <div className="flex flex-wrap items-center gap-4">
                      {job.company_name && (
                        <div className="flex items-center gap-2 text-white/95">
                          <Building2 className="h-5 w-5" />
                          <span className="font-semibold text-lg">{job.company_name}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {job.is_archived && (
                          <Badge className="bg-amber-500/90 text-white border-0 px-4 py-1.5 text-sm font-medium backdrop-blur-sm flex items-center gap-1.5">
                            <Archive className="h-4 w-4" />
                            {isRTL ? 'ארכיון' : 'Archived'}
                          </Badge>
                        )}
                        {getRemoteTypeBadge(job.remote_type, isRTL)}
                        {job.job_type && (
                          <Badge className="bg-white/20 text-white border-0 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
                            {job.job_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-8 space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
                    {/* Quick Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {job.location && (
                        <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-[#9F5F80]/5 to-[#9F5F80]/10 rounded-2xl border border-[#9F5F80]/20">
                          <div className="p-3 rounded-xl bg-[#9F5F80]/20">
                            <MapPin className="h-5 w-5 text-[#9F5F80]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mb-1 uppercase font-semibold">
                              {isRTL ? 'מיקום' : 'Location'}
                            </p>
                            <p className="font-semibold text-[#383e4e] dark:text-white">
                              {job.location}
                            </p>
                          </div>
                        </div>
                      )}

                      {job.remote_type && (
                        <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-2xl border border-blue-500/20">
                          <div className="p-3 rounded-xl bg-blue-500/20">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mb-1 uppercase font-semibold">
                              {isRTL ? 'סוג עבודה' : 'Work Type'}
                            </p>
                            <p className="font-semibold text-[#383e4e] dark:text-white capitalize">
                              {job.remote_type}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <div className="p-3 rounded-xl bg-emerald-500/20">
                          <Clock className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mb-1 uppercase font-semibold">
                            {isRTL ? 'נוסף' : 'Added'}
                          </p>
                          <p className="font-semibold text-[#383e4e] dark:text-white">
                            {formatDate(job.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {job.description && (
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-3 text-2xl font-bold text-[#383e4e] dark:text-white">
                          <Sparkles className="h-6 w-6 text-[#9F5F80]" />
                          {isRTL ? 'תיאור המשה' : 'Job Description'}
                        </h3>
                        <div className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-[#383e4e]/30 dark:to-[#2a2f3d] rounded-2xl border-2 border-[#b6bac5]/10">
                          <p className="text-[#6c757d] dark:text-[#b6bac5] leading-relaxed text-base whitespace-pre-wrap">
                            {job.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Requirements */}
                    {job.requirements && Array.isArray(job.requirements) && job.requirements.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="flex items-center gap-3 text-2xl font-bold text-[#383e4e] dark:text-white">
                          <CheckCircle2 className="h-6 w-6 text-[#9F5F80]" />
                          {isRTL ? 'דרישות המשרה' : 'Requirements'}
                        </h3>
                        <div className="space-y-1.5">
                          {job.requirements.map((req, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-start gap-2.5 p-2 bg-white dark:bg-[#383e4e] rounded-lg border border-[#b6bac5]/10"
                            >
                              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#9F5F80]/20 flex items-center justify-center mt-0.5">
                                <CheckCircle2 className="h-3 w-3 text-[#9F5F80]" />
                              </div>
                              <p className="text-[#6c757d] dark:text-[#b6bac5] text-sm leading-relaxed">{req}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {job.skills && Array.isArray(job.skills) && job.skills.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-3 text-2xl font-bold text-[#383e4e] dark:text-white">
                          <Briefcase className="h-6 w-6 text-[#9F5F80]" />
                          {isRTL ? 'כישורים נדרשים' : 'Required Skills'}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {job.skills.map((skill, idx) => (
                            <motion.span
                              key={idx}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.03 }}
                              className="px-5 py-2.5 bg-gradient-to-r from-[#9F5F80] to-[#8a5472] text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-shadow"
                            >
                              {skill}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source URL */}
                    {job.source_url && (
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-700">
                        <a
                          href={job.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group"
                        >
                          <div className="p-3 rounded-xl bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                            <ExternalLink className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <span className="font-semibold text-base block">
                              {isRTL ? 'צפה במקור' : 'View Original Posting'}
                            </span>
                            <span className="text-sm text-blue-500 dark:text-blue-400 truncate block max-w-md">
                              {job.source_url}
                            </span>
                          </div>
                          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div
                  className="p-6 bg-gradient-to-r from-gray-50 to-white dark:from-[#383e4e]/30 dark:to-[#2a2f3d] border-t-2 border-[#b6bac5]/10 flex gap-4"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <Button
                    onClick={() => onApply(job)}
                    className="flex-1 h-12 text-base bg-gradient-to-r from-[#9F5F80] to-[#8a5472] hover:from-[#8a5472] hover:to-[#7a4a63] shadow-lg hover:shadow-xl transition-all"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    {isRTL ? 'הגש מועמדות' : 'Apply to Job'}
                  </Button>

                  {onEdit && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onEdit(job);
                        onClose();
                      }}
                      className="h-12 px-6 text-base border-2 hover:border-[#9F5F80] hover:bg-[#9F5F80]/5"
                    >
                      <Edit className="h-5 w-5 mr-2" />
                      {isRTL ? 'ערוך' : 'Edit'}
                    </Button>
                  )}

                  {/* Archive/Unarchive Button */}
                  {job.is_archived ? (
                    onUnarchive && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onUnarchive(job.id as number);
                          onClose();
                        }}
                        className="h-12 px-6 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-2 border-amber-200 hover:border-amber-300"
                      >
                        <ArchiveRestore className="h-5 w-5" />
                      </Button>
                    )
                  ) : (
                    onArchive && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onArchive(job.id as number);
                          onClose();
                        }}
                        className="h-12 px-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-2 border-blue-200 hover:border-blue-300"
                      >
                        <Archive className="h-5 w-5" />
                      </Button>
                    )
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-12 px-6 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-2 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              {isRTL ? 'מחיקת משרה' : 'Delete Job'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {isRTL
                ? 'האם אתה בטוח שברצונך למחוק משרה זו? פעולה זו לא ניתנת לביטול.'
                : 'Are you sure you want to delete this job? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 h-11"
            >
              {isRTL ? 'מחק' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default JobDetailsModal;