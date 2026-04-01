/**
 * ApplicationDrawer Component - Clean Premium Redesign
 * Fast, clean, and organized application detail view
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Building2,
  MapPin,
  FileText,
  Trash2,
  ExternalLink,
  Clock,
  MessageSquare,
  AlertCircle,
  Link as LinkIcon,
  Archive,
  Paperclip,
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
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import type { Application } from '../../../features/applications/api';
import { ApplicationTimeline } from './ApplicationTimeline';
import { NotesPanel } from './NotesPanel';
import { RemindersPanel } from './RemindersPanel';
import { DocumentsManager } from './DocumentsManager';
import { DEFAULT_STATUSES } from '../constants/statuses';

interface ApplicationDrawerProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: number | string) => void;
  onArchive?: (id: number | string) => void;
  isRTL?: boolean;
}

// Use centralized status configuration
const STATUSES = DEFAULT_STATUSES.map(status => ({
  value: status.id,
  label: { en: status.name, he: status.nameHe }
}));

export function ApplicationDrawer({
  application,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onArchive,
  isRTL = false,
}: ApplicationDrawerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (application) {
      setActiveTab('details');
    }
  }, [application]);

  if (!application) return null;

  const handleDelete = () => {
    onDelete(application.id);
    setShowDeleteConfirm(false);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return isRTL ? 'לא ידוע' : 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusLabel = (statusValue: string) => {
    const statusObj = STATUSES.find((s) => s.value === statusValue);
    return statusObj
      ? isRTL
        ? statusObj.label.he
        : statusObj.label.en
      : statusValue;
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={onClose}
            />

            {/* Drawer - Simplified animation for better performance */}
            <motion.div
              initial={{ x: isRTL ? -100 : 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isRTL ? -100 : 100, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                fixed top-0 ${isRTL ? 'left-0' : 'right-0'} 
                h-full w-full sm:w-[600px] md:w-[700px]
                bg-white dark:bg-[#2a2f3d]
                shadow-2xl z-[100]
                flex flex-col
              `}
            >
              {/* Clean Header */}
              <div
                className="bg-gradient-to-br from-[#9F5F80] to-[#7a4a63] p-6 text-white shrink-0"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <h2 className="text-2xl font-bold mb-2 leading-tight">
                      {application.job_title}
                    </h2>
                    <div className="flex items-center gap-2 text-white/90 mb-3">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      <span className="font-semibold">{application.company_name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {application.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{application.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(application.created_at || application.applied_date)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col overflow-hidden"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <TabsList className="w-full justify-start rounded-none border-b border-[#b6bac5]/20 bg-white dark:bg-[#2a2f3d] px-4 h-12 shrink-0">
                  <TabsTrigger value="details" className="gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">{isRTL ? 'פרטים' : 'Details'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">{isRTL ? 'הערות' : 'Notes'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="reminders" className="gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">{isRTL ? 'תזכורות' : 'Reminders'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-2">
                    <Paperclip className="h-4 w-4" />
                    <span className="hidden sm:inline">{isRTL ? 'מסמכים' : 'Docs'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">{isRTL ? 'ציר זמן' : 'Timeline'}</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab Contents */}
                <div className="flex-1 overflow-hidden">
                  {/* Details Tab */}
                  <TabsContent value="details" className="h-full m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6 space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
                        {/* Status */}
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <label className={`text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2 block ${isRTL ? 'text-right' : ''}`}>
                            {isRTL ? 'סטטוס' : 'Status'}
                          </label>
                            <p className={`font-semibold text-[#383e4e] dark:text-white ${isRTL ? 'text-right' : ''}`}>
                              {getStatusLabel(application.status)}
                            </p>
                        </div>

                        {/* Job Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {application.location && (
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#383e4e]/30 border border-gray-200 dark:border-[#b6bac5]/20">
                              <label className="text-xs font-semibold text-[#6c757d] dark:text-[#b6bac5] mb-1 block flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" />
                                {isRTL ? 'מיקום' : 'Location'}
                              </label>
                              <p className="text-sm text-[#383e4e] dark:text-white">
                                {application.location}
                              </p>
                            </div>
                          )}

                          {application.source && (
                            <div className="p-4 rounded-lg bg-gray-50 dark:bg-[#383e4e]/30 border border-gray-200 dark:border-[#b6bac5]/20">
                              <label className="text-xs font-semibold text-[#6c757d] dark:text-[#b6bac5] mb-1 block flex items-center gap-1.5">
                                <LinkIcon className="h-3 w-3" />
                                {isRTL ? 'מקור' : 'Source'}
                              </label>
                              <p className="text-sm text-[#383e4e] dark:text-white">
                                {application.source}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Source URL */}
                        {application.source_url && (
                          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <label className="text-xs font-semibold text-green-900 dark:text-green-100 mb-2 block">
                              {isRTL ? 'קישור מקורי' : 'Original Posting'}
                            </label>
                            <a
                              href={application.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-green-700 dark:text-green-300 hover:underline text-sm"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>{isRTL ? 'פתח משרה מקורית' : 'View original posting'}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Notes Tab */}
                  <TabsContent value="notes" className="h-full m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <NotesPanel applicationId={application.id as number} isRTL={isRTL} />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Reminders Tab */}
                  <TabsContent value="reminders" className="h-full m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <RemindersPanel 
                          applicationId={application.id as number} 
                          application={application}
                          isRTL={isRTL} 
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="h-full m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <DocumentsManager
                          application={application}
                          onUpdate={onUpdate}
                          isRTL={isRTL}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="h-full m-0">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <ApplicationTimeline
                          applicationId={application.id as number}
                          currentStatus={application.status}
                          appliedAt={application.created_at || application.applied_date || ''}
                          isRTL={isRTL}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Footer Actions */}
              <div
                className="shrink-0 p-4 bg-gray-50 dark:bg-[#383e4e]/30 border-t border-[#b6bac5]/20 flex flex-wrap gap-2"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {onArchive && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onArchive(application.id);
                      onClose();
                    }}
                    className="flex-1 sm:flex-none text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    <Archive className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {application.archived 
                        ? (isRTL ? 'הסר מארכיון' : 'Unarchive')
                        : (isRTL ? 'העבר לארכיון' : 'Archive')
                      }
                    </span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 sm:flex-none text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{isRTL ? 'מחק' : 'Delete'}</span>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <AlertDialogTitle>
              {isRTL ? 'מחיקת בקשה' : 'Delete Application'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL
                ? 'האם אתה בטוח שברצונך למחוק בקשה זו? פעולה זו אינה ניתנת לביטול.'
                : 'Are you sure you want to delete this application? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {isRTL ? 'מחק' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ApplicationDrawer;