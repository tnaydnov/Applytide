/**
 * Pipeline Page (My Applications) - Premium Redesign
 * Kanban board and cards view for managing applications
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutGrid, Columns, Settings, Search, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { applicationsApi, type Application, type ApplicationStatus } from '../../features/applications/api';
import { apiFetch, clearCache } from '../../lib/api/core';
import { getStatusName, getStatusColor } from './constants/statuses';
import { PageBackground } from '../../components/background/PageBackground';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { PipelineHelp } from '../../components/help/PipelineHelp';
import { KanbanBoard } from './components/KanbanBoard';
import { CardsView } from './components/CardsView';
import { logger } from '../../lib/logger';
import { ApplicationDrawer } from './components/ApplicationDrawer';
import { PipelineCustomizer } from './components/PipelineCustomizer';
import { PipelineFilters, type SortOption } from './components/PipelineFilters';
import { PipelineAnalytics } from './components/PipelineAnalytics';
import { ExportApplications } from './components/ExportApplications';
import { BatchUpdate } from './components/BatchUpdate';
import { AdvancedFilters, type AdvancedFilterOptions } from './components/AdvancedFilters';
import { toast } from 'sonner';
import { PipelineAnnotations } from './components/PipelineAnnotations';

export type ViewMode = 'kanban' | 'cards';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export function PipelinePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'kanban'
  );
  
  // Default stages derived from centralized status config
  const getDefaultStages = (): PipelineStage[] => {
    const defaultIds = ['applied', 'phone_screen', 'interviewing', 'offer', 'rejected'];
    return defaultIds.map((id, order) => ({
      id,
      name: getStatusName(id, isRTL),
      color: getStatusColor(id),
      order,
    }));
  };
  
  const [stages, setStages] = useState<PipelineStage[]>(getDefaultStages());
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterOptions>({});
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  // Modals
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Batch selection
  const [selectedAppIds, setSelectedAppIds] = useState<(number | string)[]>([]);

  // Page Tour
  const [showPageTour, setShowPageTour] = useState(false);

  // Load applications
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await applicationsApi.getApplicationsWithStages();
      setApplications(data || []);
    } catch (error) {
      logger.error('Failed to load applications:', error);
      toast.error(
        isRTL ? 'שגיאה בטעינת בקשות' : 'Failed to load applications'
      );
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  // Load custom pipeline stages from user preferences
  const loadStages = useCallback(async () => {
    try {
      const res = await apiFetch('/preferences/pipeline_stages');
      if (res.ok) {
        const data = await res.json();
        const saved = data?.preference_value?.stages;
        if (Array.isArray(saved) && saved.length > 0) {
          setStages(saved);
          return;
        }
      }
    } catch {
      // Fallback to defaults
    }
    setStages(getDefaultStages());
  }, [language]);

  // Initial data load with cancellation guard
  useEffect(() => {
    let cancelled = false;
    if (user) {
      loadData().then(() => {
        if (cancelled) return;
      });
      loadStages();
    }
    return () => { cancelled = true; };
  }, [user, loadData, loadStages]);

  // Re-apply default stage labels when language changes
  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', mode);
    setSearchParams(newParams);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const newParams = new URLSearchParams(searchParams);
    if (query) {
      newParams.set('search', query);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleStatusFilter = (statuses: string[]) => {
    setSelectedStatuses(statuses);
  };

  const handleApplicationClick = (app: Application) => {
    setSelectedApp(app);
    setShowDrawer(true);
  };

  const handleStatusChange = async (appId: number | string, newStatus: string) => {
    try {
      await applicationsApi.updateApplication(appId, { status: newStatus as ApplicationStatus });
      clearCache(); // Purge cached stages data so timeline loads fresh
      await loadData();
      toast.success(
        isRTL ? 'סטטוס עודכן בהצלחה' : 'Status updated successfully'
      );
    } catch (error) {
      logger.error('Failed to update status:', error);
      toast.error(
        isRTL ? 'שגיאה בעדכון סטטוס' : 'Failed to update status'
      );
    }
  };

  const handleApplicationUpdate = async () => {
    await loadData();
    setShowDrawer(false);
  };

  const handleApplicationDelete = async (appId: number | string) => {
    try {
      await applicationsApi.deleteApplication(appId);
      await loadData();
      setShowDrawer(false);
      toast.success(
        isRTL ? 'בקשה נמחקה בהצלחה' : 'Application deleted successfully'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה במחיקת בקשה' : 'Failed to delete application'
      );
    }
  };

  const handleStagesUpdate = async (newStages: PipelineStage[]) => {
    setStages(newStages);
    try {
      await apiFetch('/preferences', {
        method: 'POST',
        body: JSON.stringify({
          preference_key: 'pipeline_stages',
          preference_value: { stages: newStages },
        }),
      });
      toast.success(
        isRTL ? 'שלבים עודכנו בהצלחה' : 'Stages updated successfully'
      );
    } catch {
      toast.error(
        isRTL ? 'שגיאה בשמירת שלבים' : 'Failed to save stages'
      );
    }
  };

  const handleApplicationArchive = async (appId: number | string) => {
    try {
      const result = await applicationsApi.toggleArchive(appId);
      const isNowArchived = result.is_archived ?? result.archived ?? true;
      clearCache(); // Ensure stale list cache is purged before reload
      await loadData();
      toast.success(
        isRTL
          ? (isNowArchived ? 'בקשה הועברה לארכיון' : 'בקשה שוחזרה מהארכיון')
          : (isNowArchived ? 'Application archived' : 'Application unarchived')
      );
    } catch (error) {
      logger.error('Failed to archive/unarchive application:', error);
      toast.error(
        isRTL ? 'שגיאה בארכוב בקשה' : 'Failed to update archive status'
      );
    }
  };

  const handleToggleAppSelect = (appId: number | string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleBatchActionComplete = async () => {
    setSelectedAppIds([]);
    await loadData();
  };

  // Get unique companies for filter
  const availableCompanies = Array.from(
    new Set(applications.map((app) => app.company_name).filter(Boolean) as string[])
  ).sort();

  // Filter and sort applications
  const filteredApplications = applications
    .filter((app) => {
      // Archived filter
      const isArchived = app.archived === true;
      if (showArchived && !isArchived) return false;
      if (!showArchived && isArchived) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          app.job_title?.toLowerCase().includes(query) ||
          app.company_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(app.status)) return false;
      }

      // Advanced filters
      if (advancedFilters.dateRange?.from || advancedFilters.dateRange?.to) {
        const appDate = new Date(app.created_at || '');
        if (advancedFilters.dateRange.from && appDate < advancedFilters.dateRange.from) {
          return false;
        }
        if (advancedFilters.dateRange.to) {
          const toDate = new Date(advancedFilters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (appDate > toDate) return false;
        }
      }

      if (advancedFilters.hasResume && !app.resume_id) return false;
      if (advancedFilters.hasNotes && !app.notes) return false;
      
      if (advancedFilters.companies && advancedFilters.companies.length > 0) {
        if (!advancedFilters.companies.includes(app.company_name || '')) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at || b.applied_date || '').getTime() - 
                 new Date(a.created_at || a.applied_date || '').getTime();
        case 'date-asc':
          return new Date(a.created_at || a.applied_date || '').getTime() - 
                 new Date(b.created_at || b.applied_date || '').getTime();
        case 'company':
          return (a.company_name || '').localeCompare(b.company_name || '');
        case 'title':
          return (a.job_title || '').localeCompare(b.job_title || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

  return (
    <>
      <PageBackground />

      {/* Modals */}
      <ApplicationDrawer
        application={selectedApp}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onUpdate={handleApplicationUpdate}
        onDelete={handleApplicationDelete}
        onArchive={handleApplicationArchive}
        isRTL={isRTL}
      />

      <PipelineCustomizer
        stages={stages}
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        onSave={handleStagesUpdate}
        isRTL={isRTL}
      />

      {/* Pipeline Help Guide */}
      <PipelineHelp 
        isRTL={isRTL}
        onShowVisualGuide={() => setShowPageTour(true)}
      />

      {/* Page Tour - Interactive Hover Guide */}
      <PipelineAnnotations
        isActive={showPageTour}
        onClose={() => setShowPageTour(false)}
        isRTL={isRTL}
        viewMode={viewMode}
      />

      <div className="relative z-10 min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              data-tour="page-title"
            >
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#9F5F80] to-[#8a5472] text-white shadow-lg">
                  <Columns className="h-8 w-8" />
                </div>
                <h1 className="text-4xl lg:text-5xl">
                  {isRTL ? 'מועמדויות ומעקב' : 'My Pipeline'}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground">
                {isRTL
                  ? 'עקבו אחר כל שלב בתהליך הגיוס'
                  : 'Track and manage your job applications'}
              </p>
            </motion.div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto" data-tour="action-buttons">
              {/* Advanced Filters */}
              <AdvancedFilters
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
                availableCompanies={availableCompanies}
                isRTL={isRTL}
              />

              {/* Export Button */}
              <ExportApplications applications={applications} isRTL={isRTL} />

              {/* View Toggle */}
              <div className="flex gap-1 bg-white/80 dark:bg-[#383e4e]/50 backdrop-blur-sm border border-[#b6bac5]/20 rounded-lg p-1" data-tour="view-toggle">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('kanban')}
                  className={viewMode === 'kanban' ? 'bg-[#9F5F80] hover:bg-[#8a5472]' : ''}
                >
                  <Columns className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('cards')}
                  className={viewMode === 'cards' ? 'bg-[#9F5F80] hover:bg-[#8a5472]' : ''}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              {/* Customize Button */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowCustomizer(true)}
                className="border-2 border-[#9F5F80]/30 hover:border-[#9F5F80]/50 hover:bg-[#9F5F80]/5"
                data-tour="customize-btn"
              >
                <Settings className="h-5 w-5 mr-2" />
                {isRTL ? 'התאם אישית' : 'Customize'}
              </Button>

              {/* Add Application */}
              <Button
                size="lg"
                onClick={() => navigate('/job-search')}
                className="bg-gradient-to-r from-[#9F5F80] to-[#8a5472] hover:from-[#8a5472] hover:to-[#7a4a63] shadow-lg"
                data-tour="add-application-btn"
              >
                <Plus className="h-5 w-5 mr-2" />
                {isRTL ? 'הוסף בקשה' : 'Add Application'}
              </Button>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <PipelineAnalytics applications={filteredApplications} isRTL={isRTL} />

          {/* Batch Update */}
          <BatchUpdate
            applications={filteredApplications}
            selectedIds={selectedAppIds}
            onSelectionChange={setSelectedAppIds}
            onComplete={handleBatchActionComplete}
            stages={stages}
            isRTL={isRTL}
          />

          {/* Filters */}
          <PipelineFilters
            searchQuery={searchQuery}
            selectedStatuses={selectedStatuses}
            stages={stages}
            showArchived={showArchived}
            sortBy={sortBy}
            onSearch={handleSearch}
            onStatusFilter={handleStatusFilter}
            onToggleArchived={setShowArchived}
            onSortChange={setSortBy}
            isRTL={isRTL}
          />

          {/* Loading State */}
          {loading && (
            <LoadingSpinner
              size="lg"
              text={isRTL ? 'טוען בקשות...' : 'Loading applications...'}
            />
          )}

          {/* Empty State */}
          {!loading && applications.length === 0 && (
            <EmptyState
              icon={<Columns className="h-16 w-16" />}
              title={isRTL ? 'אין בקשות עדיין' : 'No applications yet'}
              description={
                isRTL
                  ? 'התחל להגיש מועמדות למשרות כדי לעקוב אחריהן כאן'
                  : 'Start applying to jobs to track them here'
              }
              action={{
                label: isRTL ? 'חפש משרות' : 'Find Jobs',
                onClick: () => navigate('/job-search'),
              }}
            />
          )}

          {/* No Results */}
          {!loading && applications.length > 0 && filteredApplications.length === 0 && (
            <EmptyState
              icon={<Search className="h-16 w-16" />}
              title={isRTL ? 'לא נמצאו תוצאות' : 'No results found'}
              description={
                isRTL
                  ? 'נסה לשנות את הפילטרים או החיפוש'
                  : 'Try adjusting your filters or search'
              }
              action={{
                label: isRTL ? 'נקה פילטרים' : 'Clear filters',
                onClick: () => {
                  setSearchQuery('');
                  setSelectedStatuses([]);
                  setSearchParams(new URLSearchParams());
                },
              }}
            />
          )}

          {/* Views */}
          {!loading && filteredApplications.length > 0 && (
            <div>
              {viewMode === 'kanban' ? (
                <KanbanBoard
                  applications={filteredApplications}
                  stages={stages}
                  onApplicationClick={handleApplicationClick}
                  onStatusChange={handleStatusChange}
                  isRTL={isRTL}
                  selectedIds={selectedAppIds}
                  onToggleSelect={handleToggleAppSelect}
                />
              ) : (
                <CardsView
                  applications={filteredApplications}
                  stages={stages}
                  onApplicationClick={handleApplicationClick}
                  isRTL={isRTL}
                  selectedIds={selectedAppIds}
                  onToggleSelect={handleToggleAppSelect}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default PipelinePage;