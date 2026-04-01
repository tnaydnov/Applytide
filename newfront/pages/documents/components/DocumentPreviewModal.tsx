/**
 * DocumentPreviewModal Component
 * Inline PDF preview via backend /preview endpoint, with download fallback
 */

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { documentsApi, type Document } from '../../../features/documents/api';
import { toast } from 'sonner';
import { apiFetch } from '../../../lib/api/core';
import { logger } from '../../../lib/logger';

interface DocumentPreviewModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  isRTL?: boolean;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
  isRTL = false,
}: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load preview when modal opens
  useEffect(() => {
    if (!isOpen || !document?.id) {
      setPreviewUrl(null);
      setPreviewHtml(null);
      setError(null);
      return;
    }

    let revoke: string | null = null;

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      setPreviewUrl(null);
      setPreviewHtml(null);

      try {
        const response = await apiFetch(`/documents/${document.id}/preview`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(isRTL ? 'הקובץ לא נמצא באחסון' : 'File not found in storage');
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/html')) {
          // DOCX converted to HTML
          const html = await response.text();
          setPreviewHtml(html);
        } else if (contentType.includes('text/plain')) {
          // Plain text file
          const text = await response.text();
          setPreviewHtml(`<pre style="white-space:pre-wrap;font-family:monospace;padding:24px;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
        } else {
          // PDF or other binary — display via blob URL in iframe
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          revoke = url;
          setPreviewUrl(url);
        }
      } catch (e) {
        logger.error('Preview failed:', e);
        const message = e instanceof Error ? e.message : undefined;
        setError(message || (isRTL ? 'שגיאה בתצוגה מקדימה' : 'Failed to load preview'));
      } finally {
        setLoading(false);
      }
    };

    loadPreview();

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [isOpen, document?.id]);

  const handleDownload = async () => {
    if (!document?.id) return;
    try {
      await documentsApi.downloadDocument(document.id);
      toast.success(isRTL ? 'מסמך הורד בהצלחה' : 'Document downloaded');
    } catch (e) {
      const message = e instanceof Error ? e.message : undefined;
      toast.error(message || (isRTL ? 'שגיאה בהורדת מסמך' : 'Failed to download'));
    }
  };

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!document) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="bg-gradient-to-r from-[#9F5F80] to-[#383e4e] p-4 sm:p-6 text-white flex-shrink-0"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg sm:text-2xl font-bold truncate">{document.name}</h2>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {previewUrl && (
                      <button
                        onClick={handleOpenExternal}
                        className="text-white/80 hover:text-white p-1"
                        title={isRTL ? 'פתח בטאב חדש' : 'Open in new tab'}
                      >
                        <ExternalLink className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={handleDownload}
                      className="text-white/80 hover:text-white p-1"
                      title={isRTL ? 'הורדה' : 'Download'}
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-[#2a2f3a]">
                {loading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#9F5F80] mb-3" />
                      <p className="text-[#6c757d] dark:text-[#b6bac5]">
                        {isRTL ? 'טוען תצוגה מקדימה...' : 'Loading preview...'}
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                      <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                      <p className="text-[#6c757d] dark:text-[#b6bac5] mb-6">{error}</p>
                      <Button
                        onClick={handleDownload}
                        style={{ background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)' }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isRTL ? 'הורד קובץ במקום' : 'Download file instead'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* PDF / binary via iframe */}
                {previewUrl && !loading && !error && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={document.name}
                  />
                )}

                {/* HTML / text content */}
                {previewHtml && !loading && !error && (
                  <div
                    className="w-full h-full overflow-auto bg-white p-6"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default DocumentPreviewModal;
