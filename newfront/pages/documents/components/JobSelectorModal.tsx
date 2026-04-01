/**
 * JobSelectorModal Component
 * Modal for selecting a job to compare a document against
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Briefcase, MapPin, Building2, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { jobsApi, type Job } from '../../../features/jobs/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

interface JobSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (job: Job) => void;
  isRTL?: boolean;
}

export function JobSelectorModal({
  isOpen,
  onClose,
  onSelect,
  isRTL = false,
}: JobSelectorModalProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadJobs();
    }
  }, [isOpen]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await jobsApi.listJobs({ page: 1, page_size: 50 });
      setJobs(data.items || []);
    } catch (error) {
      logger.error('Failed to load jobs:', error);
      toast.error(isRTL ? 'שגיאה בטעינת משרות' : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title?.toLowerCase().includes(query) ||
      job.company_name?.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query)
    );
  });

  const handleSelect = (job: Job) => {
    onSelect(job);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b border-[#b6bac5]/20"
                style={{
                  background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {isRTL ? 'בחר משרה להשוואה' : 'Select Job to Compare'}
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-[#b6bac5]/20">
                <div className="relative">
                  <Search
                    className={`absolute ${
                      isRTL ? 'right-3' : 'left-3'
                    } top-1/2 -translate-y-1/2 h-5 w-5 text-[#6c757d]`}
                  />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isRTL
                        ? 'חפש לפי תפקיד, חברה או מיקום...'
                        : 'Search by title, company, or location...'
                    }
                    className={`${isRTL ? 'pr-11' : 'pl-11'}`}
                  />
                </div>
              </div>

              {/* Job List */}
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-[#9F5F80]" />
                      <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                        {isRTL ? 'טוען משרות...' : 'Loading jobs...'}
                      </span>
                    </div>
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-[#6c757d] dark:text-[#b6bac5]">
                    <Briefcase className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">
                      {jobs.length === 0
                        ? isRTL
                          ? 'אין משרות זמינות'
                          : 'No jobs available'
                        : isRTL
                        ? 'לא נמצאו משרות'
                        : 'No jobs found'}
                    </p>
                    <p className="text-sm mt-1">
                      {jobs.length === 0
                        ? isRTL
                          ? 'הוסף משרות תחילה'
                          : 'Add some jobs first'
                        : isRTL
                        ? 'נסה חיפוש אחר'
                        : 'Try a different search'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {filteredJobs.map((job) => (
                      <motion.button
                        key={job.id}
                        onClick={() => handleSelect(job)}
                        className="w-full text-left p-4 rounded-lg border border-[#b6bac5]/20 hover:border-[#9F5F80]/30 hover:bg-[#9F5F80]/5 transition-all group"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-[#9F5F80]/10 text-[#9F5F80] group-hover:bg-[#9F5F80]/20 transition-colors">
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#383e4e] dark:text-white group-hover:text-[#9F5F80] transition-colors">
                              {job.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[#6c757d] dark:text-[#b6bac5]">
                              {job.company_name && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  <span>{job.company_name}</span>
                                </div>
                              )}
                              {job.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{job.location}</span>
                                </div>
                              )}
                            </div>
                            {job.description && (
                              <p className="mt-2 text-sm text-[#6c757d] dark:text-[#b6bac5] line-clamp-2">
                                {job.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-[#383e4e]/50 border-t border-[#b6bac5]/20">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full"
                >
                  {isRTL ? 'ביטול' : 'Cancel'}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default JobSelectorModal;
