/**
 * ApplyModal Component
 * Complete implementation with 3-tab system, source tracking, and all document types
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Upload,
  CheckCircle,
  Loader2,
  File,
  Trash2,
  Filter,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Checkbox } from '../../../components/ui/checkbox';
import { applicationsApi } from '../../../features/applications/api';
import { documentsApi, type Document } from '../../../features/documents/api';
import type { Job } from '../../../features/jobs/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

interface ApplyModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isRTL?: boolean;
}

type TabType = 'my-files' | 'upload' | 'skip';

const DOC_TYPES = [
  'resume',
  'cover_letter',
  'portfolio',
  'certificate',
  'transcript',
  'reference',
  'other',
] as const;

const TYPE_LABELS: Record<string, { en: string; he: string }> = {
  resume: { en: 'Resume', he: 'קורות חיים' },
  cover_letter: { en: 'Cover Letter', he: 'מכתב נלווה' },
  portfolio: { en: 'Portfolio', he: 'תיק עבודות' },
  certificate: { en: 'Certificate', he: 'תעודה' },
  transcript: { en: 'Transcript', he: 'תמליל' },
  reference: { en: 'Reference', he: 'המלצה' },
  other: { en: 'Other', he: 'אחר' },
};

const SOURCE_OPTIONS = [
  { value: 'LinkedIn', label: { en: 'LinkedIn', he: 'LinkedIn' } },
  { value: 'Indeed', label: { en: 'Indeed', he: 'Indeed' } },
  { value: 'Glassdoor', label: { en: 'Glassdoor', he: 'Glassdoor' } },
  { value: 'Company Website', label: { en: 'Company Website', he: 'אתר החברה' } },
  { value: 'Job Board', label: { en: 'Job Board', he: 'לוח משרות' } },
  { value: 'Recruiter', label: { en: 'Recruiter', he: 'מגייס' } },
  { value: 'Referral', label: { en: 'Referral', he: 'המלצה' } },
  { value: 'Job Fair', label: { en: 'Job Fair', he: 'ירידשרות' } },
  { value: 'AngelList', label: { en: 'AngelList/Wellfound', he: 'AngelList' } },
  { value: 'Other', label: { en: 'Other', he: 'אחר' } },
];

interface UploadFile {
  file: File;
  type: string;
  id: string;
}

export function ApplyModal({
  job,
  isOpen,
  onClose,
  onSuccess,
  isRTL = false,
}: ApplyModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('my-files');
  const [source, setSource] = useState('');
  
  // My Files tab state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  
  // Upload tab state
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Load documents when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('my-files');
      setSource('');
      setSelectedDocIds(new Set());
      setUploads([]);
      setFilterType('');
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      const data = await documentsApi.listDocuments({ page: 1, page_size: 200 });
      setDocuments(data.documents || []);
    } catch (error) {
      logger.error('Failed to load documents:', error);
      toast.error(isRTL ? 'שגיאה בטעינת מסמכים' : 'Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newUploads: UploadFile[] = files.map((file) => ({
      file,
      type: 'resume', // Default type
      id: Math.random().toString(36).substr(2, 9),
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  };

  const handleRemoveUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const handleUploadTypeChange = (id: string, type: string) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === id ? { ...u, type } : u))
    );
  };

  const handleToggleDocument = (docId: number) => {
    setSelectedDocIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!job?.id) {
      toast.error(isRTL ? 'לא נבחרה משרה' : 'No job selected');
      return;
    }

    // Validate based on active tab
    if (activeTab === 'my-files' && selectedDocIds.size === 0) {
      toast.error(
        isRTL
          ? 'נא לבחור לפחות מסמך אחד או לעבור ללשונית "דלג"'
          : 'Please select at least one document or switch to "Skip" tab'
      );
      return;
    }

    if (activeTab === 'upload' && uploads.length === 0) {
      toast.error(
        isRTL
          ? 'נא להעלות לפחות קובץ אחד או לעבור ללשונית אחרת'
          : 'Please upload at least one file or switch tabs'
      );
      return;
    }

    try {
      setSubmitting(true);

      // 1. Create application
      const application = await applicationsApi.createApplication({
        job_id: String(job.id),
        status: 'Applied',
        source: source || undefined,
      });

      const appId = application.id;
      if (!appId) throw new Error('Application creation failed');

      // 2. Handle documents based on tab
      const documentIds: (number | string)[] = [];

      if (activeTab === 'my-files') {
        // Use existing documents
        documentIds.push(...Array.from(selectedDocIds));
      } else if (activeTab === 'upload') {
        // Upload new documents first
        for (const upload of uploads) {
          try {
            const uploadedDoc = await documentsApi.uploadDocument(
              upload.file,
              upload.type as import('../../../features/documents/api').DocumentType || 'other',
            );
            if (uploadedDoc.id) {
              documentIds.push(uploadedDoc.id);
            }
          } catch (error) {
            logger.error('Failed to upload document:', error);
          }
        }
      }

      // 3. Attach documents to application
      if (documentIds.length > 0) {
        const attachPromises = documentIds.map((docId) =>
          documentsApi.attachExistingDocument(appId, docId).catch((err: unknown) => {
            logger.error(`Failed to attach document ${docId}:`, err);
            return null;
          })
        );

        await Promise.allSettled(attachPromises);
      }

      toast.success(
        isRTL
          ? documentIds.length > 0
            ? 'הבקשה נוצרה והמסמכים צורפו בהצלחה!'
            : 'הבקשה נוצרה בהצלחה!'
          : documentIds.length > 0
          ? 'Application created and documents attached!'
          : 'Application created successfully!'
      );

      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Failed to submit application:', error);
      const message = error instanceof Error ? error.message : undefined;
      toast.error(
        isRTL
          ? message || 'שגיאה ביצירת הבקשה'
          : message || 'Failed to create application'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredDocuments = () => {
    if (!filterType || filterType === 'all') return documents;
    return documents.filter(
      (doc) => doc.document_type?.toLowerCase() === filterType
    );
  };

  const getDocumentType = (doc: Document) => {
    return (doc.document_type || 'other').toLowerCase();
  };

  const getDocumentName = (doc: Document) => {
    return doc.name || 'Untitled';
  };

  if (!job) return null;

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b border-[#b6bac5]/20 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {isRTL ? `הגש מועמדות ל-${job.title}` : `Apply to ${job.title}`}
                  </h2>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Job Info */}
                <div className="mt-3 flex items-center gap-2 text-sm text-white/80">
                  {job.company_name && <span>{job.company_name}</span>}
                  {job.location && (
                    <>
                      <span>•</span>
                      <span>{job.location}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <div className={`p-6 space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {/* Step 1: Source */}
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse w-full' : ''}`}>
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#9F5F80]/20 text-[#9F5F80] font-semibold flex-shrink-0">
                        1
                      </span>
                      <h3 className="font-semibold text-[#383e4e] dark:text-white">
                        {isRTL ? 'איפה מצאת את המשרה הזו?' : 'Where did you find this job?'}
                      </h3>
                      <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                        ({isRTL ? 'אופציונלי' : 'Optional'})
                      </span>
                    </div>

                    <div className={isRTL ? 'rtl-select-wrapper' : ''}>
                      <Select value={source} onValueChange={setSource}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={isRTL ? 'בחר מקור...' : 'Select source...'}
                          />
                        </SelectTrigger>
                        <SelectContent align={isRTL ? 'end' : 'start'} dir={isRTL ? 'rtl' : 'ltr'}>
                          {SOURCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {isRTL ? option.label.he : option.label.en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Step 2: Documents */}
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse w-full' : ''}`}>
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#9F5F80]/20 text-[#9F5F80] font-semibold flex-shrink-0">
                        2
                      </span>
                      <h3 className="font-semibold text-[#383e4e] dark:text-white">
                        {isRTL ? 'הוסף מסמכים' : 'Add your documents'}
                      </h3>
                    </div>

                    {/* Tab Selection */}
                    <div className="grid grid-cols-3 gap-2 p-1 bg-[#b6bac5]/10 dark:bg-[#383e4e]/50 rounded-lg">
                      <button
                        onClick={() => setActiveTab('my-files')}
                        className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                          activeTab === 'my-files'
                            ? 'bg-[#9F5F80] text-white shadow-lg'
                            : 'text-[#6c757d] dark:text-[#b6bac5] hover:bg-[#b6bac5]/20'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <FileText className="h-5 w-5" />
                          <span>{isRTL ? 'הקבצים שלי' : 'My Files'}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                          activeTab === 'upload'
                            ? 'bg-[#9F5F80] text-white shadow-lg'
                            : 'text-[#6c757d] dark:text-[#b6bac5] hover:bg-[#b6bac5]/20'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-5 w-5" />
                          <span>{isRTL ? 'העלה חדש' : 'Upload New'}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setActiveTab('skip')}
                        className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                          activeTab === 'skip'
                            ? 'bg-[#9F5F80] text-white shadow-lg'
                            : 'text-[#6c757d] dark:text-[#b6bac5] hover:bg-[#b6bac5]/20'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle className="h-5 w-5" />
                          <span>{isRTL ? 'דלג' : 'Skip'}</span>
                        </div>
                      </button>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[320px]">
                      {/* My Files Tab */}
                      {activeTab === 'my-files' && (
                        <div className="space-y-3">
                          <p className={`text-sm text-[#6c757d] dark:text-[#b6bac5] ${isRTL ? 'text-right' : 'text-left'}`}>
                            {isRTL
                              ? 'בחר מסמכים מהספרייה שלך'
                              : 'Choose documents from your library'}
                          </p>

                          {/* Type Filter */}
                          <div className={`flex items-center gap-2 ${isRTL ? 'rtl-select-wrapper' : ''}`}>
                            <Filter className="h-4 w-4 text-[#6c757d]" />
                            <Select value={filterType} onValueChange={setFilterType}>
                              <SelectTrigger className="flex-1">
                                <SelectValue
                                  placeholder={
                                    isRTL ? 'כל המסמכים' : 'All documents'
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                                <SelectItem value="all">
                                  {isRTL ? 'כל המסמכים' : 'All documents'}
                                </SelectItem>
                                {DOC_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {isRTL
                                      ? TYPE_LABELS[type].he
                                      : TYPE_LABELS[type].en}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Document List */}
                          {loadingDocs ? (
                            <div className="flex items-center justify-center h-48">
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-[#9F5F80]" />
                                <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                                  {isRTL ? 'טוען מסמכים...' : 'Loading documents...'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-[#b6bac5]/20 rounded-lg overflow-hidden">
                              <ScrollArea className="h-64">
                                {getFilteredDocuments().length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-48 text-[#6c757d] dark:text-[#b6bac5]">
                                    <FileText className="h-12 w-12 mb-3 opacity-50" />
                                    <p className="text-sm">
                                      {documents.length === 0
                                        ? isRTL
                                          ? 'אין מסמכים עדיין'
                                          : 'No documents yet'
                                        : isRTL
                                        ? 'אין מסמכים מסוג זה'
                                        : 'No documents of this type'}
                                    </p>
                                    {documents.length === 0 && (
                                      <p className="text-xs text-[#6c757d] mt-1">
                                        {isRTL
                                          ? 'נסה את הלשונית "העלה חדש"'
                                          : 'Try "Upload New" tab'}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="divide-y divide-[#b6bac5]/20">
                                    {getFilteredDocuments().map((doc) => {
                                      const isSelected = selectedDocIds.has(
                                        doc.id as number
                                      );
                                      const docType = getDocumentType(doc);

                                      return (
                                        <label
                                          key={doc.id}
                                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                            isSelected
                                              ? `bg-[#9F5F80]/10 ${isRTL ? 'border-r-2 border-r-[#9F5F80]' : 'border-l-2 border-l-[#9F5F80]'}`
                                              : 'hover:bg-[#b6bac5]/10'
                                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() =>
                                              handleToggleDocument(doc.id as number)
                                            }
                                          />
                                          <File className="h-5 w-5 text-[#9F5F80] flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-[#383e4e] dark:text-white truncate">
                                              {getDocumentName(doc)}
                                            </p>
                                            <p className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                                              {isRTL
                                                ? TYPE_LABELS[docType]?.he || docType
                                                : TYPE_LABELS[docType]?.en || docType}
                                            </p>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </ScrollArea>
                            </div>
                          )}

                          {/* Selection count */}
                          {selectedDocIds.size > 0 && (
                            <p className="text-sm text-[#9F5F80] font-medium">
                              {isRTL
                                ? `${selectedDocIds.size} מסמכים נבחרו`
                                : `${selectedDocIds.size} document(s) selected`}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Upload Tab */}
                      {activeTab === 'upload' && (
                        <div className="space-y-3">
                          <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                            {isRTL
                              ? 'העלה מסמכים חדשים למועמדות זו'
                              : 'Upload new documents for this application'}
                          </p>

                          {/* File Input */}
                          <div className="border-2 border-dashed border-[#b6bac5]/30 rounded-lg p-8 text-center">
                            <input
                              type="file"
                              multiple
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload"
                              accept=".pdf,.doc,.docx,.txt,.rtf"
                            />
                            <label
                              htmlFor="file-upload"
                              className="cursor-pointer inline-block"
                            >
                              <Upload className="h-12 w-12 mx-auto mb-3 text-[#9F5F80]" />
                              <p className="font-medium text-[#383e4e] dark:text-white">
                                {isRTL ? 'לחץ להעלאת קבצים' : 'Click to upload files'}
                              </p>
                              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mt-1">
                                {isRTL
                                  ? 'PDF, DOC, DOCX, TXT, RTF'
                                  : 'PDF, DOC, DOCX, TXT, RTF'}
                              </p>
                            </label>
                          </div>

                          {/* Upload List */}
                          {uploads.length > 0 && (
                            <div className="space-y-2">
                              {uploads.map((upload) => (
                                <div
                                  key={upload.id}
                                  className="flex items-center gap-3 p-3 bg-[#b6bac5]/10 dark:bg-[#383e4e]/50 rounded-lg"
                                >
                                  <File className="h-5 w-5 text-[#9F5F80]" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#383e4e] dark:text-white truncate">
                                      {upload.file.name}
                                    </p>
                                    <Select
                                      value={upload.type}
                                      onValueChange={(value) =>
                                        handleUploadTypeChange(upload.id, value)
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-xs mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DOC_TYPES.map((type) => (
                                          <SelectItem key={type} value={type}>
                                            {isRTL
                                              ? TYPE_LABELS[type].he
                                              : TYPE_LABELS[type].en}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveUpload(upload.id)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skip Tab */}
                      {activeTab === 'skip' && (
                        <div className="flex flex-col items-center justify-center h-48 text-center">
                          <CheckCircle className="h-16 w-16 text-[#9F5F80] mb-4" />
                          <h4 className="font-semibold text-[#383e4e] dark:text-white mb-2">
                            {isRTL ? 'המשך ללא מסמכים' : 'Continue without documents'}
                          </h4>
                          <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] max-w-sm">
                            {isRTL
                              ? 'תוכל לצרף מסמכים מאוחר יותר מדף הפייפליין'
                              : 'You can attach documents later from the pipeline page'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-[#383e4e]/50 border-t border-[#b6bac5]/20 flex gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1"
                >
                  {isRTL ? 'ביטול' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1"
                  style={{
                    background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isRTL ? 'שולח...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isRTL ? 'הגש מועמדות' : 'Submit Application'}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ApplyModal;