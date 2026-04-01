/**
 * UploadModal Component - Premium Redesign
 * Beautiful document upload with drag & drop
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, Loader2, Check, File, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { documentsApi, type DocumentType, type DocumentStatus } from '../../../features/documents/api';
import { toast } from 'sonner';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isRTL?: boolean;
}

export function UploadModal({ isOpen, onClose, onSuccess, isRTL = false }: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('resume');
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('active');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        isRTL
          ? 'נא להעלות קובץ PDF או DOCX'
          : 'Please upload a PDF or DOCX file'
      );
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        isRTL
          ? 'גודל הקובץ חייב להיות פחות מ-10MB'
          : 'File size must be less than 10MB'
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(
        isRTL ? 'נא לבחור קובץ' : 'Please select a file'
      );
      return;
    }

    setUploading(true);
    try {
      // uploadDocument(file, documentType, name?) - don't pass status as name
      await documentsApi.uploadDocument(selectedFile, documentType);
      toast.success(
        isRTL ? 'מסמך הועלה בהצלחה!' : 'Document uploaded successfully!'
      );
      onSuccess();
      // Reset form
      setSelectedFile(null);
      setDocumentType('resume');
      setDocumentStatus('active');
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בהעלאת מסמך' : 'Failed to upload document'
      );
    } finally {
      setUploading(false);
    }
  };

  const documentTypes = [
    { value: 'resume', label: isRTL ? 'קורות חיים' : 'Resume', icon: FileText, color: '#3b82f6' },
    { value: 'cover_letter', label: isRTL ? 'מכתב נלווה' : 'Cover Letter', icon: FileText, color: '#8b5cf6' },
    { value: 'portfolio', label: isRTL ? 'תיק עבודות' : 'Portfolio', icon: File, color: '#ec4899' },
    { value: 'transcript', label: isRTL ? 'תעודת גמר' : 'Transcript', icon: FileText, color: '#f59e0b' },
    { value: 'certificate', label: isRTL ? 'תעודה' : 'Certificate', icon: FileText, color: '#10b981' },
    { value: 'reference_letter', label: isRTL ? 'מכתב המלצה' : 'Reference Letter', icon: FileText, color: '#06b6d4' },
    { value: 'other', label: isRTL ? 'אחר' : 'Other', icon: File, color: '#6b7280' },
  ];

  const statusOptions = [
    { value: 'active', label: isRTL ? 'פעיל' : 'Active', color: '#10b981' },
    { value: 'draft', label: isRTL ? 'טיוטה' : 'Draft', color: '#f59e0b' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[90]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[91] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#2d3240] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-[#b6bac5]/20 flex flex-col"
              onClick={(e) => e.stopPropagation()}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header with Gradient */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#9F5F80] via-[#383e4e] to-[#2d3240] p-6 md:p-8 flex-shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9F5F80]/20 rounded-full blur-2xl" />
                
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3 md:gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20"
                    >
                      <Upload className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl md:text-3xl font-bold text-white mb-1">
                        {isRTL ? 'העלה מסמך' : 'Upload Document'}
                      </h2>
                      <p className="text-white/80 text-xs md:text-sm">
                        {isRTL
                          ? 'העלה PDF או DOCX עד 10MB'
                          : 'Upload PDF or DOCX files up to 10MB'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/10 flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-8 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* Document Type Selection */}
                <div className="space-y-3">
                  <Label className="text-[#383e4e] dark:text-white font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#9F5F80]" />
                    {isRTL ? 'סוג מסמך *' : 'Document Type *'}
                  </Label>
                  <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                    <SelectTrigger className="h-12 bg-gray-50 dark:bg-[#383e4e]/50 border-[#b6bac5]/30 hover:border-[#9F5F80] transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded" style={{ backgroundColor: `${type.color}20` }}>
                              <type.icon className="h-4 w-4" style={{ color: type.color }} />
                            </div>
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Document Status Selection */}
                <div className="space-y-3">
                  <Label className="text-[#383e4e] dark:text-white font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-[#9F5F80]" />
                    {isRTL ? 'סטטוס' : 'Status'}
                  </Label>
                  <Select value={documentStatus} onValueChange={(value) => setDocumentStatus(value as DocumentStatus)}>
                    <SelectTrigger className="h-12 bg-gray-50 dark:bg-[#383e4e]/50 border-[#b6bac5]/30 hover:border-[#9F5F80] transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {documentStatus === 'draft' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg"
                    >
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        {isRTL 
                          ? 'מסמכים בטיוטה לא יופיעו במסך הראשי עד שתשנה את הסטטוס לפעיל'
                          : 'Draft documents won\'t appear in the main view until status is changed to active'}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* File Upload Area */}
                <div className="space-y-3">
                  <Label className="text-[#383e4e] dark:text-white font-semibold flex items-center gap-2">
                    <File className="h-4 w-4 text-[#9F5F80]" />
                    {isRTL ? 'קובץ *' : 'File *'}
                  </Label>
                  <motion.div
                    animate={{
                      scale: dragActive ? 1.02 : 1,
                      borderColor: dragActive ? '#9F5F80' : selectedFile ? '#10b981' : '#b6bac5',
                    }}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
                      ${dragActive
                        ? 'bg-[#9F5F80]/5 border-[#9F5F80] shadow-lg'
                        : selectedFile 
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                          : 'bg-gray-50 dark:bg-[#383e4e]/30 border-[#b6bac5]/30 hover:border-[#9F5F80] hover:bg-[#9F5F80]/5'
                      }
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileInput}
                      className="hidden"
                      aria-label="Upload document file"
                    />

                    {!selectedFile ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                      >
                        <motion.div
                          animate={{ 
                            y: dragActive ? -10 : 0,
                            scale: dragActive ? 1.1 : 1 
                          }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <Upload className="h-16 w-16 mx-auto text-[#9F5F80]" />
                        </motion.div>
                        <div>
                          <p className="text-lg font-semibold text-[#383e4e] dark:text-white mb-2">
                            {isRTL
                              ? 'גרור ושחרר את הקובץ כאן'
                              : 'Drag and drop your file here'}
                          </p>
                          <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mb-4">
                            {isRTL ? 'או' : 'or'}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => document.getElementById('file-upload')?.click()}
                          className="border-[#9F5F80] text-[#9F5F80] hover:bg-[#9F5F80] hover:text-white transition-all duration-300"
                        >
                          <File className="h-4 w-4 mr-2" />
                          {isRTL ? 'בחר קובץ' : 'Browse Files'}
                        </Button>
                        <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mt-4">
                          {isRTL ? 'PDF, DOCX - עד 10MB' : 'PDF, DOCX - up to 10MB'}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-4"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 rounded-full"
                        >
                          <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
                        </motion.div>
                        <div>
                          <p className="text-lg font-bold text-[#383e4e] dark:text-white mb-1">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedFile(null)}
                          className="border-[#6c757d] hover:border-[#9F5F80] hover:text-[#9F5F80]"
                        >
                          {isRTL ? 'בחר קובץ אחר' : 'Choose Another File'}
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#b6bac5]/20">
                  <Button 
                    variant="outline" 
                    onClick={onClose} 
                    disabled={uploading}
                    size="lg"
                    className="min-w-[120px]"
                  >
                    {isRTL ? 'ביטול' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    size="lg"
                    className="min-w-[160px] bg-gradient-to-r from-[#9F5F80] to-[#383e4e] hover:from-[#8a4e6b] hover:to-[#2d3240] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {isRTL ? 'מעלה...' : 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        {isRTL ? 'העלה מסמך' : 'Upload Document'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default UploadModal;