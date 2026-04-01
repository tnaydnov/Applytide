/**
 * DocumentsManager Component
 * Full documents management for an application:
 * - Shows attached documents (from application_attachments table)
 * - Shows linked resume/cover letter (from application record)
 * - Allows attaching from document library or uploading new files
 * - Supports document type selection, download, delete
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Paperclip,
  Trash2,
  Plus,
  Loader2,
  File,
  Download,
  Upload,
  Library,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { apiFetch, clearCache } from '../../../lib/api/core';
import { applicationsApi, type Attachment } from '../../../features/applications/api';
import type { Application } from '../../../features/applications/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';
// Types
// ============================================================================

interface LibraryDocument {
  id: string;
  name: string;
  document_type: string;
  content_type?: string;
  file_size?: number;
  created_at: string;
}

interface DocumentsManagerProps {
  application: Application;
  onUpdate: () => void;
  isRTL?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume', labelHe: 'קורות חיים', color: 'blue' },
  { value: 'cover_letter', label: 'Cover Letter', labelHe: 'מכתב נלווה', color: 'purple' },
  { value: 'portfolio', label: 'Portfolio', labelHe: 'תיק עבודות', color: 'green' },
  { value: 'certificate', label: 'Certificate', labelHe: 'תעודה', color: 'amber' },
  { value: 'reference', label: 'Reference', labelHe: 'המלצה', color: 'pink' },
  { value: 'other', label: 'Other', labelHe: 'אחר', color: 'gray' },
];

function getDocTypeInfo(type: string | null | undefined) {
  return DOCUMENT_TYPES.find((dt) => dt.value === type) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string, isRTL: boolean): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDocTypeColor(type: string | null | undefined): string {
  const dt = getDocTypeInfo(type);
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300',
  };
  return colors[dt.color] || colors.gray;
}

// ============================================================================
// Main Component
// ============================================================================

export function DocumentsManager({ application, onUpdate, isRTL = false }: DocumentsManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Attachment | null>(null);
  const [, setDeleting] = useState(false);

  useEffect(() => {
    loadAttachments();
  }, [application.id]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const items = await applicationsApi.listAttachments(application.id);
      setAttachments(items);
    } catch (error) {
      logger.error('Failed to load attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await applicationsApi.deleteAttachment(application.id, pendingDelete.id);
      clearCache();
      setAttachments((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      toast.success(isRTL ? 'מסמך הוסר' : 'Document removed');
      onUpdate();
    } catch {
      toast.error(isRTL ? 'שגיאה בהסרת מסמך' : 'Failed to remove document');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    const url = applicationsApi.getAttachmentDownloadUrl(application.id, attachment.id);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddComplete = () => {
    setShowAddDialog(false);
    clearCache();
    loadAttachments();
    onUpdate();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#9F5F80]" />
      </div>
    );
  }

  const isEmpty = attachments.length === 0 && !application.resume_id;

  return (
    <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-[#9F5F80]" />
          <h3 className="font-semibold text-[#383e4e] dark:text-white">
            {isRTL ? 'מסמכים' : 'Documents'}
          </h3>
          {attachments.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#9F5F80]/10 text-[#9F5F80] font-medium">
              {attachments.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="bg-[#9F5F80] hover:bg-[#8a5472] gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {isRTL ? 'הוסף' : 'Add'}
        </Button>
      </div>

      {/* Linked Resume/Cover Letter (from application record) */}
      {application.resume_id && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#6c757d] dark:text-[#b6bac5] uppercase tracking-wide">
            {isRTL ? 'מסמכים מקושרים' : 'Linked Documents'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/60 dark:border-blue-700/40">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {isRTL ? 'קורות חיים' : 'Resume'}
                </p>
                <p className="text-xs text-blue-600/70 dark:text-blue-300/70">
                  {isRTL ? 'מקושר לבקשה' : 'Linked to application'}
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#6c757d] dark:text-[#b6bac5] uppercase tracking-wide">
            {isRTL ? 'קבצים מצורפים' : 'Attached Files'}
          </p>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {attachments.map((att) => {
                const dtInfo = getDocTypeInfo(att.document_type);
                return (
                  <motion.div
                    key={att.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="group p-3 rounded-lg bg-gray-50 dark:bg-[#383e4e]/40 border border-gray-200/60 dark:border-[#b6bac5]/15 hover:border-[#9F5F80]/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-white dark:bg-[#2a2f3d] border border-gray-200 dark:border-[#b6bac5]/20 shrink-0">
                        <File className="h-4 w-4 text-[#9F5F80]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#383e4e] dark:text-white truncate">
                          {att.filename}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getDocTypeColor(att.document_type)}`}>
                            {isRTL ? dtInfo.labelHe : dtInfo.label}
                          </span>
                          <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                            {formatFileSize(att.file_size)}
                          </span>
                          <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                            {formatDate(att.created_at, isRTL)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownload(att)}
                          className="h-7 w-7 text-[#6c757d] hover:text-[#9F5F80]"
                          title={isRTL ? 'הורד' : 'Download'}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPendingDelete(att)}
                          className="h-7 w-7 text-[#6c757d] hover:text-red-600"
                          title={isRTL ? 'מחק' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-10">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#9F5F80]/10 flex items-center justify-center mb-3">
            <FileText className="h-7 w-7 text-[#9F5F80]/60" />
          </div>
          <h4 className="text-sm font-semibold text-[#383e4e] dark:text-white mb-1">
            {isRTL ? 'אין מסמכים מצורפים' : 'No documents attached'}
          </h4>
          <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mb-4">
            {isRTL
              ? 'צרף קורות חיים, מכתב נלווה או מסמכים אחרים לבקשה זו'
              : 'Attach resumes, cover letters, or other documents to this application'}
          </p>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="bg-[#9F5F80] hover:bg-[#8a5472] gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {isRTL ? 'הוסף מסמך' : 'Add Document'}
          </Button>
        </div>
      )}

      {/* Add Document Dialog */}
      <AddDocumentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        applicationId={application.id}
        onComplete={handleAddComplete}
        isRTL={isRTL}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={handleDelete}
        title={isRTL ? 'הסרת מסמך' : 'Remove Document'}
        description={
          pendingDelete
            ? (isRTL
              ? `האם אתה בטוח שברצונך להסיר את "${pendingDelete.filename}"?`
              : `Are you sure you want to remove "${pendingDelete.filename}"?`)
            : ''
        }
        confirmLabel={isRTL ? 'הסר' : 'Remove'}
        isRTL={isRTL}
      />
    </div>
  );
}

// ============================================================================
// Add Document Dialog
// ============================================================================

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: number | string;
  onComplete: () => void;
  isRTL?: boolean;
}

function AddDocumentDialog({ open, onOpenChange, applicationId, onComplete, isRTL = false }: AddDocumentDialogProps) {
  const [mode, setMode] = useState<'library' | 'upload'>('library');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Library mode state
  const [libraryDocs, setLibraryDocs] = useState<LibraryDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [docType, setDocType] = useState<string>('resume');

  // Upload mode state
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<string>('resume');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLibraryDocs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/documents/');
      if (response.ok) {
        const data = await response.json();
        setLibraryDocs(data.documents || []);
      }
    } catch {
      logger.error('Failed to load library documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadLibraryDocs();
      setSelectedDocId('');
      setDocType('resume');
      setFile(null);
      setUploadDocType('resume');
    }
  }, [open, loadLibraryDocs]);

  const handleAttachFromLibrary = async () => {
    if (!selectedDocId) {
      toast.error(isRTL ? 'נא לבחור מסמך' : 'Please select a document');
      return;
    }
    try {
      setSubmitting(true);
      await applicationsApi.attachFromDocument(applicationId, selectedDocId, docType);
      toast.success(isRTL ? 'מסמך צורף בהצלחה' : 'Document attached successfully');
      onComplete();
    } catch {
      toast.error(isRTL ? 'שגיאה בצירוף מסמך' : 'Failed to attach document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error(isRTL ? 'נא לבחור קובץ' : 'Please select a file');
      return;
    }
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', uploadDocType);
      await applicationsApi.uploadAttachment(applicationId, formData);
      toast.success(isRTL ? 'קובץ הועלה בהצלחה' : 'File uploaded successfully');
      onComplete();
    } catch {
      toast.error(isRTL ? 'שגיאה בהעלאת קובץ' : 'Failed to upload file');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        toast.error(isRTL ? 'הקובץ גדול מ-10MB' : 'File is larger than 10MB');
        return;
      }
      setFile(selected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#2a2f3d]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-[#383e4e] dark:text-white">
            {isRTL ? 'הוסף מסמך' : 'Add Document'}
          </DialogTitle>
          <DialogDescription className="text-[#6c757d] dark:text-[#b6bac5]">
            {isRTL
              ? 'בחר מהמסמכים שלך או העלה קובץ חדש'
              : 'Choose from your documents or upload a new file'}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#383e4e]/50 rounded-lg">
          <button
            onClick={() => setMode('library')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              mode === 'library'
                ? 'bg-white dark:bg-[#2a2f3d] text-[#9F5F80] shadow-sm'
                : 'text-[#6c757d] dark:text-[#b6bac5] hover:text-[#383e4e] dark:hover:text-white'
            }`}
          >
            <Library className="h-4 w-4" />
            {isRTL ? 'המסמכים שלי' : 'My Documents'}
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              mode === 'upload'
                ? 'bg-white dark:bg-[#2a2f3d] text-[#9F5F80] shadow-sm'
                : 'text-[#6c757d] dark:text-[#b6bac5] hover:text-[#383e4e] dark:hover:text-white'
            }`}
          >
            <Upload className="h-4 w-4" />
            {isRTL ? 'העלאה' : 'Upload'}
          </button>
        </div>

        {/* Library Mode */}
        {mode === 'library' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#9F5F80]" />
              </div>
            ) : libraryDocs.length === 0 ? (
              <div className="text-center py-6 text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL ? 'אין מסמכים בספרייה' : 'No documents in your library'}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-[#383e4e] dark:text-white">
                    {isRTL ? 'בחר מסמך' : 'Select Document'}
                  </Label>
                  <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                    <SelectTrigger className="bg-white dark:bg-[#383e4e]">
                      <SelectValue placeholder={isRTL ? 'בחר מסמך...' : 'Choose a document...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {libraryDocs.map((doc) => {
                        const dt = getDocTypeInfo(doc.document_type);
                        return (
                          <SelectItem key={doc.id} value={String(doc.id)}>
                            <div className="flex items-center gap-2">
                              <File className="h-3.5 w-3.5 shrink-0 text-[#6c757d]" />
                              <span className="truncate">{doc.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getDocTypeColor(doc.document_type)}`}>
                                {isRTL ? dt.labelHe : dt.label}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-[#383e4e] dark:text-white">
                    {isRTL ? 'סוג מסמך' : 'Document Type'}
                  </Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger className="bg-white dark:bg-[#383e4e]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((dt) => (
                        <SelectItem key={dt.value} value={dt.value}>
                          {isRTL ? dt.labelHe : dt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors
                ${file
                  ? 'border-[#9F5F80]/50 bg-[#9F5F80]/5'
                  : 'border-gray-300 dark:border-[#b6bac5]/30 hover:border-[#9F5F80]/40 hover:bg-[#9F5F80]/5'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                aria-label="Upload document file"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="h-8 w-8 text-[#9F5F80]" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#383e4e] dark:text-white truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-[#6c757d]">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-[#383e4e] rounded"
                  >
                    <X className="h-4 w-4 text-[#6c757d]" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-[#6c757d] dark:text-[#b6bac5] mb-2" />
                  <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                    {isRTL ? 'לחץ לבחירת קובץ' : 'Click to select a file'}
                  </p>
                  <p className="text-xs text-[#6c757d]/60 dark:text-[#b6bac5]/60 mt-1">
                    PDF, DOC, DOCX, TXT, RTF, PNG, JPG - max 10MB
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-[#383e4e] dark:text-white">
                {isRTL ? 'סוג מסמך' : 'Document Type'}
              </Label>
              <Select value={uploadDocType} onValueChange={setUploadDocType}>
                <SelectTrigger className="bg-white dark:bg-[#383e4e]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {isRTL ? dt.labelHe : dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-[#6c757d]">
            {isRTL ? 'ביטול' : 'Cancel'}
          </Button>
          <Button
            onClick={mode === 'library' ? handleAttachFromLibrary : handleUpload}
            disabled={submitting || (mode === 'library' && !selectedDocId) || (mode === 'upload' && !file)}
            className="bg-[#9F5F80] hover:bg-[#8a5472] gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'library' ? (
              <Paperclip className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {submitting
              ? (isRTL ? 'מעבד...' : 'Processing...')
              : mode === 'library'
              ? (isRTL ? 'צרף' : 'Attach')
              : (isRTL ? 'העלה' : 'Upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentsManager;