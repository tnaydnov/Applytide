/**
 * Jobs Page (Job Search) - Premium Redesign
 * Main page for browsing and saving job opportunities
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, Plus, Briefcase, Chrome, Filter, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { jobsApi, type Job, type JobsListParams } from '../../features/jobs/api';
import { PageBackground } from '../../components/background/PageBackground';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { SmartEmptyState } from '../../components/shared/SmartEmptyState';
import { JobsHelp } from '../../components/help/JobsHelp';
import { PageAnnotations } from '../../components/shared/PageAnnotations';
import type { Annotation } from '../../components/shared/PageAnnotations';
import { safeGetItem, safeSetItem } from '../../lib/storage';
import { CHROME_EXTENSION_URL } from '../../constants/urls';
import { logger } from '../../lib/logger';
import { ChromeExtensionBanner } from './components/ChromeExtensionBanner';
import { JobFilters } from './components/JobFilters';
import { JobCard } from './components/JobCard';
import { JobDetailsModal } from './components/JobDetailsModal';
import { ManualJobModal } from './components/ManualJobModal';
import { ApplyModal } from './components/ApplyModal';
import { Pagination } from './components/Pagination';
import { BulkActions } from './components/BulkActions';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';

export function JobsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(12);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [remoteTypeFilter, setRemoteTypeFilter] = useState(searchParams.get('remote_type') || 'all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Modals
  const [showExtensionBanner, setShowExtensionBanner] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showManualJobModal, setShowManualJobModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [jobToApply, setJobToApply] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const [showVisualGuide, setShowVisualGuide] = useState(false);

  // Page annotations for visual guide
  const pageAnnotations: Annotation[] = [
    {
      id: 'menu-button',
      targetSelector: '.header-menu-button',
      title: isRTL ? 'תפריט ראשי' : 'Main Menu',
      description: isRTL
        ? 'פתח את התפריט הראשי לניווט בין עמודי האפליקציה'
        : 'Open main menu to navigate between app pages',
      color: '#6366F1',
      position: 'bottom',
    },
    {
      id: 'logo-button',
      targetSelector: '.header-logo-button',
      title: isRTL ? 'חזרה לעמוד הבית' : 'Back to Home',
      description: isRTL
        ? 'לחץ על הלוגו כדי לחזור לעמוד הבית'
        : 'Click logo to return to home page',
      color: '#8B5CF6',
      position: 'bottom',
    },
    {
      id: 'language-selector',
      targetSelector: '.header-language-selector',
      title: isRTL ? 'בחירת שפה' : 'Language Selector',
      description: isRTL
        ? 'החלף בין עברית לאנגלית'
        : 'Switch between Hebrew and English',
      color: '#EC4899',
      position: 'bottom',
    },
    {
      id: 'user-menu',
      targetSelector: '.header-user-menu',
      title: isRTL ? 'תפריט משתמש' : 'User Menu',
      description: isRTL
        ? 'גישה לפרופיל, הגדרות ויציאה מהמערכת'
        : 'Access profile, settings and sign out',
      color: '#F43F5E',
      position: 'bottom',
    },
    {
      id: 'header',
      targetSelector: '.jobs-page-header',
      title: isRTL ? 'כותרת העמוד' : 'Page Header',
      description: isRTL
        ? 'הכותרת מציגה את שם העמוד ופעולות מהירות'
        : 'Header shows page name and quick actions',
      color: '#9F5F80',
      position: 'bottom',
    },
    // Only show extension banner annotation if banner is visible
    ...(showExtensionBanner
      ? [
          {
            id: 'extension-banner',
            targetSelector: '.chrome-extension-banner',
            title: isRTL ? 'באנר התוסף' : 'Extension Banner',
            description: isRTL
              ? 'התקן את תוסף Chrome烁ירה מהירה של משרות מהדפדפן'
              : 'Install Chrome extension for quick job saving from browser',
            color: '#3B82F6',
            position: 'bottom' as const,
          },
        ]
      : []),
    {
      id: 'add-job',
      targetSelector: '.add-job-button',
      title: isRTL ? 'הוסף משרה' : 'Add Job',
      description: isRTL
        ? 'לחץ כאן כדי להוסיף משרה חדשה ידנית'
        : 'Click here to manually add a new job',
      color: '#10B981',
      position: 'left',
    },
    {
      id: 'chrome-extension',
      targetSelector: '.chrome-extension-button',
      title: isRTL ? 'תוסף Chrome' : 'Chrome Extension',
      description: isRTL
        ? 'התקן את תוסף Chrome烁ירה מהירה של משרות'
        : 'Install Chrome extension for quick job saving',
      color: '#3B82F6',
      position: 'left',
    },
    {
      id: 'search-filters',
      targetSelector: '.job-filters',
      title: isRTL ? 'חיפוש וסינון' : 'Search & Filters',
      description: isRTL
        ? 'חפש לפי כותרת, חברה או מיקום. סנן לפי סוג עבודה'
        : 'Search by title, company or location. Filter by work type',
      color: '#F59E0B',
      position: 'bottom',
    },
    // Only show jobs grid annotation if there are jobs
    ...(jobs.length > 0
      ? [
          {
            id: 'jobs-grid',
            targetSelector: '.jobs-grid',
            title: isRTL ? 'רשת המשרות' : 'Jobs Grid',
            description: isRTL
              ? 'כל המשרות השמורות שלך מוצגות כאן. לחץ על כרטיס לפרטים מלאים'
              : 'All your saved jobs are displayed here. Click a card for full details',
            color: '#A855F7',
            position: 'top' as const,
          },
        ]
      : []),
  ];

  // Load jobs on mount and filter changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadJobs(() => cancelled);
    return () => { cancelled = true; };
  }, [user, currentPage, searchQuery, locationFilter, remoteTypeFilter, showArchived, sortBy]);

  // Check if extension banner was dismissed
  useEffect(() => {
    const dismissed = safeGetItem('extension_banner_dismissed');
    setShowExtensionBanner(dismissed !== 'true');
  }, []);

  const loadJobs = async (isCancelled?: () => boolean) => {
    try {
      setLoading(true);

      const params: JobsListParams = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchQuery) params.search = searchQuery;
      if (locationFilter) params.location = locationFilter;
      if (remoteTypeFilter && remoteTypeFilter !== 'all') params.remote_type = remoteTypeFilter;
      if (showArchived) params.archived = true;
      if (sortBy) params.sort_by = sortBy;

      const data = await jobsApi.listJobs(params);

      if (isCancelled?.()) return;

      setJobs(data.items || []);
      setTotalJobs(data.total || 0);
      setTotalPages(data.pages || 1);

      // Update URL params
      const newParams = new URLSearchParams();
      if (searchQuery) newParams.set('search', searchQuery);
      if (locationFilter) newParams.set('location', locationFilter);
      if (remoteTypeFilter && remoteTypeFilter !== 'all') newParams.set('remote_type', remoteTypeFilter);
      if (currentPage > 1) newParams.set('page', String(currentPage));
      setSearchParams(newParams);
    } catch (error) {
      if (isCancelled?.()) return;
      logger.error('Failed to load jobs:', error);
      toast.error(
        isRTL ? 'שגיאה בטעינת משרות' : 'Failed to load jobs'
      );
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (filters: { location?: string; remoteType?: string }) => {
    if (filters.location !== undefined) setLocationFilter(filters.location);
    if (filters.remoteType !== undefined) setRemoteTypeFilter(filters.remoteType);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setRemoteTypeFilter('all');
    setCurrentPage(1);
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const handleApplyClick = (job: Job) => {
    setJobToApply(job);
    setShowApplyModal(true);
  };

  const handleManualJobCreated = async () => {
    setShowManualJobModal(false);
    setEditingJob(null);
    await loadJobs();
    toast.success(
      isRTL
        ? editingJob
          ? 'משרה עודכנה בהצלחה!'
          : 'משרה נוספה בהצלחה!'
        : editingJob
        ? 'Job updated successfully!'
        : 'Job added successfully!'
    );
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setShowManualJobModal(true);
  };

  const handleToggleJobSelect = (jobId: number) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleBulkActionComplete = async () => {
    setSelectedJobIds([]);
    await loadJobs();
  };

  const handleApplicationCreated = () => {
    setShowApplyModal(false);
    toast.success(
      isRTL ? 'בקשה נוצרה בהצלחה!' : 'Application created successfully!'
    );
  };

  const handleDeleteJob = async (jobId: number) => {
    try {
      await jobsApi.deleteJob(jobId);
      await loadJobs();
      setShowJobDetails(false);
      toast.success(
        isRTL ? 'משרה נמחקה בהצלחה' : 'Job deleted successfully'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה במחיקת משרה' : 'Failed to delete job'
      );
    }
  };

  const handleArchiveJob = async (jobId: number) => {
    try {
      await jobsApi.archiveJob(jobId);
      await loadJobs();
      toast.success(
        isRTL ? 'משרה הועברה לארכיון' : 'Job archived successfully'
      );
    } catch (error) {
      logger.error('Archive error:', error);
      toast.error(
        isRTL ? 'שגיאה בהעברה לארכיון' : 'Failed to archive job'
      );
    }
  };

  const handleUnarchiveJob = async (jobId: number) => {
    try {
      await jobsApi.unarchiveJob(jobId);
      await loadJobs();
      toast.success(
        isRTL ? 'משרה שוחזרה מהארכיון' : 'Job unarchived successfully'
      );
    } catch (error) {
      logger.error('Unarchive error:', error);
      toast.error(
        isRTL ? 'שגיאה בשחזור מהארכיון' : 'Failed to unarchive job'
      );
    }
  };

  const handleDismissExtensionBanner = () => {
    safeSetItem('extension_banner_dismissed', 'true');
    setShowExtensionBanner(false);
  };

  const hasActiveFilters = searchQuery || locationFilter || (remoteTypeFilter && remoteTypeFilter !== 'all');
  const activeFilterCount = [searchQuery, locationFilter, remoteTypeFilter !== 'all'].filter(Boolean).length;

  return (
    <>
      <PageBackground />
      
      {/* Modals */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={showJobDetails}
        onClose={() => setShowJobDetails(false)}
        onApply={(job) => {
          setShowJobDetails(false);
          handleApplyClick(job);
        }}
        onDelete={handleDeleteJob}
        onEdit={handleEditJob}
        onArchive={handleArchiveJob}
        onUnarchive={handleUnarchiveJob}
        isRTL={isRTL}
      />

      <ManualJobModal
        isOpen={showManualJobModal}
        onClose={() => {
          setShowManualJobModal(false);
          setEditingJob(null);
        }}
        onSuccess={handleManualJobCreated}
        editJob={editingJob}
        isRTL={isRTL}
      />

      <ApplyModal
        job={jobToApply}
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={handleApplicationCreated}
        isRTL={isRTL}
      />

      {/* Jobs Help Guide */}
      <JobsHelp 
        isRTL={isRTL}
        onShowVisualGuide={() => setShowVisualGuide(true)}
      />

      {/* Visual Guide Annotations */}
      <PageAnnotations
        isOpen={showVisualGuide}
        onClose={() => setShowVisualGuide(false)}
        annotations={pageAnnotations}
        isRTL={isRTL}
      />

      <div className="relative z-10 min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full min-h-screen p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
          
          {/* Header */}
          <div className="jobs-page-header flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#9F5F80] to-[#8a5472] text-white shadow-lg">
                  <Briefcase className="h-8 w-8" />
                </div>
                <h1 className="text-4xl lg:text-5xl">
                  {isRTL ? 'משרות שמורות' : 'Saved Jobs'}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                {isRTL
                  ? 'ארגן ועקוב אחר הזדמנויות עבודה'
                  : 'Organize and track job opportunities'}
              </p>
            </motion.div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.open(CHROME_EXTENSION_URL, '_blank', 'noopener,noreferrer')}
                className="chrome-extension-button flex-1 lg:flex-none border-2 border-[#9F5F80]/30 hover:border-[#9F5F80]/50 hover:bg-[#9F5F80]/5"
              >
                <Chrome className="h-5 w-5 mr-2 text-[#9F5F80]" />
                <span className="hidden sm:inline">{isRTL ? 'תוסף Chrome' : 'Extension'}</span>
              </Button>
              <Button
                size="lg"
                onClick={() => setShowManualJobModal(true)}
                className="add-job-button flex-1 lg:flex-none bg-gradient-to-r from-[#9F5F80] to-[#8a5472] hover:from-[#8a5472] hover:to-[#7a4a63] shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                {isRTL ? 'הוסף משרה' : 'Add Job'}
              </Button>
            </div>
          </div>

          {/* Chrome Extension Banner */}
          {showExtensionBanner && (
            <div className="mb-6">
              <ChromeExtensionBanner
                onDismiss={handleDismissExtensionBanner}
                isRTL={isRTL}
              />
            </div>
          )}

          {/* Stats & Bulk Actions Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-[#9F5F80]">{totalJobs}</div>
                <div className="text-sm text-muted-foreground">
                  {isRTL ? 'משרות' : 'jobs'}
                </div>
              </div>
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1">
                    <Filter className="h-3 w-3 mr-1" />
                    {activeFilterCount} {isRTL ? 'פילטרים' : 'filters'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Bulk Actions */}
            <BulkActions
              jobs={jobs}
              selectedIds={selectedJobIds}
              onSelectionChange={setSelectedJobIds}
              onComplete={handleBulkActionComplete}
              isRTL={isRTL}
            />
          </div>

          {/* Filters */}
          <div className="job-filters mb-8">
            <JobFilters
              searchQuery={searchQuery}
              locationFilter={locationFilter}
              remoteTypeFilter={remoteTypeFilter}
              showArchived={showArchived}
              sortBy={sortBy}
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              onToggleArchived={() => setShowArchived(!showArchived)}
              onSortChange={setSortBy}
              onClearFilters={handleClearFilters}
              isRTL={isRTL}
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner
                size="lg"
                text={isRTL ? 'טוען משרות...' : 'Loading jobs...'}
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && jobs.length === 0 && (
            <div className="py-12">
              <SmartEmptyState
                icon={hasActiveFilters ? <Search className="h-16 w-16" /> : <Briefcase className="h-16 w-16" />}
                title={
                  hasActiveFilters
                    ? isRTL
                      ? 'לא נמצאו משרות'
                      : 'No jobs found'
                    : isRTL
                    ? '👋 בואו נתחיל!'
                    : '👋 Let\'s Get Started!'
                }
                description={
                  hasActiveFilters
                    ? isRTL
                      ? 'נסה לשנות את הפילטרים או החיפוש'
                      : 'Try adjusting your filters or search'
                    : isRTL
                    ? 'התחל להוסיף משרות כדי לנהל את חיפוש העבודה שלך ביעילות'
                    : 'Start adding jobs to efficiently manage your job search'
                }
                tips={!hasActiveFilters ? [
                  {
                    emoji: '📋',
                    text: isRTL
                      ? 'העתק/הדבק את תיאור המשרה ישירות מאתרי דרושים'
                      : 'Copy/paste job descriptions directly from job sites',
                  },
                  {
                    emoji: '🔖',
                    text: isRTL
                      ? 'השתמש בתוסף Chrome烁ירה מהירה בלחיצה אחת'
                      : 'Use Chrome extension for one-click quick saving',
                  },
                  {
                    emoji: '✏️',
                    text: isRTL
                      ? 'הוסף פרטי משרה ידנית לארגון מלא'
                      : 'Add job details manually for complete organization',
                  },
                ] : undefined}
                primaryAction={{
                  label: hasActiveFilters
                    ? isRTL
                      ? 'נקה פילטרים'
                      : 'Clear filters'
                    : isRTL
                    ? 'הוסף משרה ראשונה'
                    : 'Add First Job',
                  onClick: hasActiveFilters ? handleClearFilters : () => setShowManualJobModal(true),
                  icon: !hasActiveFilters ? <Plus className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} /> : undefined,
                }}
                secondaryAction={
                  !hasActiveFilters
                    ? {
                        label: isRTL ? 'התקן תוסף Chrome' : 'Install Extension',
                        onClick: () =>
                          window.open(CHROME_EXTENSION_URL, '_blank', 'noopener,noreferrer'),
                      }
                    : undefined
                }
                isRTL={isRTL}
              />
            </div>
          )}

          {/* Jobs Grid */}
          {!loading && jobs.length > 0 && (
            <>
              {/* Grid */}
              <div className="jobs-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mb-8">
                {jobs.map((job, idx) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onClick={() => handleJobClick(job)}
                    onApply={() => handleApplyClick(job)}
                    delay={idx * 0.05}
                    isRTL={isRTL}
                    selected={selectedJobIds.includes(job.id as number)}
                    onToggleSelect={() => handleToggleJobSelect(job.id as number)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  isRTL={isRTL}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default JobsPage;