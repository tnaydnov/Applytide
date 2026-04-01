/**
 * Documents Page - Complete Redesign
 * Premium document management with AI-powered tools
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  LayoutGrid, 
  List, 
  Search,
  TrendingUp,
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../lib/logger';
import { useLanguage } from '../../contexts/LanguageContext';
import { documentsApi, type Document, type DocumentType, type DocumentStatus } from '../../features/documents/api';
import { clearCache } from '../../lib/api/core';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { EmptyState } from '../../components/shared/EmptyState';
import { DocumentCard } from './components/DocumentCard';
import { UploadModal } from './components/UploadModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { AnalysisModal } from './components/AnalysisModal';
import { CoverLetterGeneratorModal } from './components/CoverLetterGeneratorModal';
import { DocumentFilters, type SortOption } from './components/DocumentFilters';
import { JobSelectorModal } from './components/JobSelectorModal';
import { DocumentsHelp } from '../../components/help/DocumentsHelp';
import { DocumentsAnnotations } from './components/DocumentsAnnotations';
import type { Job } from '../../features/jobs/api';
import { toast } from 'sonner';

export type ViewMode = 'grid' | 'list';

export function DocumentsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // State
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('active');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [documentToCompare, setDocumentToCompare] = useState<Document | null>(null);
  const [showPageTour, setShowPageTour] = useState(false);

  // Load documents
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsApi.listDocuments();
      const docs = data.documents || [];
      setDocuments(docs);
    } catch (error) {
      logger.error('Failed to load documents:', error);
      toast.error(
        isRTL ? 'שגיאה בטעינת מסמכים' : 'Failed to load documents'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = async () => {
    setShowUploadModal(false);
    await loadDocuments();
  };

  const handlePreview = (doc: Document) => {
    setSelectedDocument(doc);
    setShowPreviewModal(true);
  };

  const handleAnalyze = (doc: Document) => {
    setSelectedDocument(doc);
    setShowAnalysisModal(true);
  };

  const handleCompareToJob = (doc: Document) => {
    setDocumentToCompare(doc);
    setShowJobSelector(true);
  };

  const handleJobSelected = (job: Job) => {
    if (documentToCompare) {
      setSelectedDocument(documentToCompare);
      setShowAnalysisModal(true);
      setShowJobSelector(false);
      toast.success(
        isRTL
          ? `משווה קורות חיים ל-${job.title}`
          : `Comparing resume to ${job.title}`
      );
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await documentsApi.downloadDocument(doc.id!);
      toast.success(
        isRTL ? 'מסמך הורד בהצלחה' : 'Document downloaded'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בהורדת מסמך' : 'Failed to download document'
      );
    }
  };

  const handleDelete = async (docId: number | string) => {
    try {
      await documentsApi.deleteDocument(docId);
      await loadDocuments();
      toast.success(
        isRTL ? 'מסמך נמחק בהצלחה' : 'Document deleted successfully'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה במחיקת מסמך' : 'Failed to delete document'
      );
    }
  };

  const handleStatusChange = async (doc: Document, newStatus: DocumentStatus) => {
    try {
      await documentsApi.setDocumentStatus(doc.id!, newStatus);
      clearCache();
      await loadDocuments();
      toast.success(
        isRTL ? 'סטטוס עודכן בהצלחה' : 'Status updated successfully'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בעדכון סטטוס' : 'Failed to update status'
      );
    }
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = documents
    .filter((doc) => {
      if (typeFilter !== 'all' && doc.document_type !== typeFilter) return false;
      
      if (statusFilter === 'all') {
        return doc.status !== 'archived';
      } else if (statusFilter === 'active') {
        // Treat undefined/null status as active
        return doc.status === 'active' || doc.status === undefined || doc.status === null;
      } else if (doc.status !== statusFilter) {
        return false;
      }
      
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'date-desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'size-asc':
          return (a.file_size || 0) - (b.file_size || 0);
        case 'size-desc':
          return (b.file_size || 0) - (a.file_size || 0);
        default:
          return 0;
      }
    });

  // Count documents by type and status
  const counts = {
    all: documents.filter(d => d.status !== 'archived').length,
    resume: documents.filter(d => d.document_type === 'resume').length,
    cover_letter: documents.filter(d => d.document_type === 'cover_letter').length,
    portfolio: documents.filter(d => d.document_type === 'portfolio').length,
    transcript: documents.filter(d => d.document_type === 'transcript').length,
    certificate: documents.filter(d => d.document_type === 'certificate').length,
    reference_letter: documents.filter(d => d.document_type === 'reference_letter').length,
    other: documents.filter(d => d.document_type === 'other').length,
    active: documents.filter(d => d.status === 'active' || d.status === undefined || d.status === null).length,
    archived: documents.filter(d => d.status === 'archived').length,
    draft: documents.filter(d => d.status === 'draft').length,
  };

  return (
    <>
      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
        isRTL={isRTL}
      />

      <DocumentPreviewModal
        document={selectedDocument}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        isRTL={isRTL}
      />

      <AnalysisModal
        document={selectedDocument}
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        isRTL={isRTL}
      />

      <CoverLetterGeneratorModal
        isOpen={showCoverLetterModal}
        onClose={() => setShowCoverLetterModal(false)}
        onSuccess={handleUploadSuccess}
        isRTL={isRTL}
      />

      <JobSelectorModal
        isOpen={showJobSelector}
        onClose={() => {
          setShowJobSelector(false);
          setDocumentToCompare(null);
        }}
        onSelect={handleJobSelected}
        isRTL={isRTL}
      />

      <DocumentsHelp 
        isRTL={isRTL}
        onShowVisualGuide={() => setShowPageTour(true)}
      />

      {/* Page Tour - Interactive Hover Guide */}
      <DocumentsAnnotations
        isActive={showPageTour}
        onClose={() => setShowPageTour(false)}
        isRTL={isRTL}
        viewMode={viewMode}
      />

      <PageContainer size="full" showHelp={false}>
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Title Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4" data-tour="page-header">
            <div className={isRTL ? 'text-right' : ''}>
              <div className={`flex items-center gap-3 sm:gap-4 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-[#9F5F80]/20 to-[#383e4e]/20 rounded-xl sm:rounded-2xl border border-[#9F5F80]/30">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-[#9F5F80]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#383e4e] to-[#9F5F80] bg-clip-text text-transparent dark:from-white dark:to-[#b6bac5]">
                    {isRTL ? 'מסמכים' : 'Documents'}
                  </h1>
                  <p className="text-[#6c757d] dark:text-[#b6bac5] mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">
                    {isRTL
                      ? 'נהל את כל המסמכים שלך במקום אחד'
                      : 'Manage all your documents in one place'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
              <Button
                onClick={() => setShowCoverLetterModal(true)}
                className="bg-gradient-to-r from-[#9F5F80] to-[#383e4e] hover:from-[#8a4e6b] hover:to-[#2d3240] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
                data-tour="ai-cover-letter-btn"
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                <span className="hidden sm:inline">{isRTL ? 'יצירת מסמך נלווה ב-AI' : 'Generate AI Cover Letter'}</span>
                <span className="sm:hidden">{isRTL ? 'AI מכתב' : 'AI Letter'}</span>
              </Button>
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-[#383e4e] hover:bg-[#2d3240] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
                data-tour="upload-btn"
              >
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                {isRTL ? 'העלאת מסמך' : 'Upload Document'}
              </Button>
            </div>
          </div>

          {/* Premium Stats Cards */}
          {!loading && documents.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6" data-tour="stats-cards">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-[#383e4e] dark:to-[#2d3240] rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-[#b6bac5]/20 shadow-md hover:shadow-xl transition-all duration-300 group"
                data-tour="stat-total"
              >
                <div className="absolute top-0 right-0 w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-[#6c757d] dark:text-[#b6bac5] mb-0.5 sm:mb-1 font-medium">
                      {isRTL ? 'סה"כ פעילים' : 'Total Active'}
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#383e4e] dark:text-white">
                      {counts.all}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 md:p-3 bg-blue-500/10 rounded-lg sm:rounded-xl">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-[#383e4e] dark:to-[#2d3240] rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-[#b6bac5]/20 shadow-md hover:shadow-xl transition-all duration-300 group"
                data-tour="stat-active"
              >
                <div className="absolute top-0 right-0 w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 bg-green-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-[#6c757d] dark:text-[#b6bac5] mb-0.5 sm:mb-1 font-medium">
                      {isRTL ? 'פעילים' : 'Active'}
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#383e4e] dark:text-white">
                      {counts.active}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 md:p-3 bg-green-500/10 rounded-lg sm:rounded-xl">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-[#383e4e] dark:to-[#2d3240] rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-[#b6bac5]/20 shadow-md hover:shadow-xl transition-all duration-300 group"
                data-tour="stat-draft"
              >
                <div className="absolute top-0 right-0 w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-[#6c757d] dark:text-[#b6bac5] mb-0.5 sm:mb-1 font-medium">
                      {isRTL ? 'טיוטות' : 'Drafts'}
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#383e4e] dark:text-white">
                      {counts.draft}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 md:p-3 bg-amber-500/10 rounded-lg sm:rounded-xl">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
                className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-[#383e4e] dark:to-[#2d3240] rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-[#b6bac5]/20 shadow-md hover:shadow-xl transition-all duration-300 group"
                data-tour="stat-archived"
              >
                <div className="absolute top-0 right-0 w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 bg-gray-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-[#6c757d] dark:text-[#b6bac5] mb-0.5 sm:mb-1 font-medium">
                      {isRTL ? 'בארכיון' : 'Archived'}
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#383e4e] dark:text-white">
                      {counts.archived}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 md:p-3 bg-gray-500/10 rounded-lg sm:rounded-xl">
                    <Archive className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Premium Filters Bar */}
          <DocumentFilters
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            sortBy={sortBy}
            searchQuery={searchQuery}
            onTypeChange={setTypeFilter}
            onStatusChange={setStatusFilter}
            onSortChange={setSortBy}
            onSearchChange={setSearchQuery}
            counts={counts}
            isRTL={isRTL}
          />

          {/* View Mode Toggle */}
          <div className="flex items-center justify-end mt-4 gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-[#383e4e]/50 rounded-lg p-1 border border-[#b6bac5]/20 shadow-sm" data-tour="view-mode">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-[#9F5F80] to-[#383e4e] text-white shadow-md'
                    : 'text-[#6c757d] hover:bg-gray-100 dark:hover:bg-[#2d3240]'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-[#9F5F80] to-[#383e4e] text-white shadow-md'
                    : 'text-[#6c757d] hover:bg-gray-100 dark:hover:bg-[#2d3240]'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" text={isRTL ? 'טוען מסמכים...' : 'Loading documents...'} />
          </div>
        )}

        {/* Empty State */}
        {!loading && documents.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EmptyState
              icon={<FileText className="h-16 w-16" />}
              title={isRTL ? 'אין מסמכים עדיין' : 'No documents yet'}
              description={
                isRTL
                  ? 'התחל להעלות מסמכים כדי לנהל את החיפוש שלך'
                  : 'Start uploading documents to manage your job search'
              }
              action={{
                label: isRTL ? 'העלה מסמך' : 'Upload Document',
                onClick: () => setShowUploadModal(true),
              }}
              secondaryAction={{
                label: isRTL ? 'צור מכתב AI' : 'Generate AI Cover Letter',
                onClick: () => setShowCoverLetterModal(true),
              }}
            />
          </motion.div>
        )}

        {/* No Results */}
        {!loading && documents.length > 0 && filteredAndSortedDocuments.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EmptyState
              icon={<Search className="h-16 w-16" />}
              title={isRTL ? 'לא נמצאו מסמכים' : 'No documents found'}
              description={
                isRTL
                  ? 'נסה לשנות את הסינון או החיפוש'
                  : 'Try changing your filters or search query'
              }
              action={{
                label: isRTL ? 'נקה סינון' : 'Clear Filters',
                onClick: () => {
                  setTypeFilter('all');
                  setStatusFilter('active');
                  setSearchQuery('');
                },
              }}
            />
          </motion.div>
        )}

        {/* Documents Grid/List */}
        {!loading && filteredAndSortedDocuments.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`
              ${
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }
            `}
            data-tour={viewMode === 'grid' ? 'documents-grid' : 'documents-list'}
          >
            {filteredAndSortedDocuments.map((doc, idx) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                viewMode={viewMode}
                onPreview={() => handlePreview(doc)}
                onAnalyze={() => handleAnalyze(doc)}
                onDownload={() => handleDownload(doc)}
                onDelete={() => handleDelete(doc.id as number)}
                onStatusChange={(status) => handleStatusChange(doc, status)}
                onCompareToJob={doc.document_type === 'resume' ? () => handleCompareToJob(doc) : undefined}
                delay={idx * 0.05}
                isRTL={isRTL}
              />
            ))}
          </motion.div>
        )}
      </PageContainer>
    </>
  );
}

export default DocumentsPage;