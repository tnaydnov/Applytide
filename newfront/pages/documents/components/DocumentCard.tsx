/**
 * DocumentCard Component - Modern Redesign
 * Clean, professional document cards with better visuals
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Download,
  Eye,
  Sparkles,
  Trash2,
  MoreVertical,
  Archive,
  ArchiveRestore,
  FileCheck,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../../../components/ui/dropdown-menu';
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
import type { Document, DocumentStatus } from '../../../features/documents/api';
import type { ViewMode } from '../DocumentsPage';

interface DocumentCardProps {
  document: Document;
  viewMode: ViewMode;
  onPreview: () => void;
  onAnalyze: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onStatusChange: (status: DocumentStatus) => void;
  onCompareToJob?: () => void;
  delay?: number;
  isRTL?: boolean;
}

const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const formatDate = (dateString: string | undefined, isRTL: boolean): string => {
  if (!dateString) return isRTL ? 'לא ידוע' : 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface TypeInfo {
  label: string;
  bg: string;
  border: string;
  icon: string;
  badge: string;
}

const getTypeInfo = (type: string, isRTL: boolean): TypeInfo => {
  const types: Record<string, TypeInfo> = {
    resume: {
      label: isRTL ? 'קורות חיים' : 'Resume',
      bg: 'from-blue-500/10 to-blue-600/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-500 text-white',
    },
    cover_letter: {
      label: isRTL ? 'מכתב נלווה' : 'Cover Letter',
      bg: 'from-purple-500/10 to-purple-600/10',
      border: 'border-purple-500/20',
      icon: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-500 text-white',
    },
    portfolio: {
      label: isRTL ? 'תיק עבודות' : 'Portfolio',
      bg: 'from-green-500/10 to-green-600/10',
      border: 'border-green-500/20',
      icon: 'text-green-600 dark:text-green-400',
      badge: 'bg-green-500 text-white',
    },
    transcript: {
      label: isRTL ? 'תעודת גמר' : 'Transcript',
      bg: 'from-amber-500/10 to-amber-600/10',
      border: 'border-amber-500/20',
      icon: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500 text-white',
    },
    certificate: {
      label: isRTL ? 'תעודה' : 'Certificate',
      bg: 'from-teal-500/10 to-teal-600/10',
      border: 'border-teal-500/20',
      icon: 'text-teal-600 dark:text-teal-400',
      badge: 'bg-teal-500 text-white',
    },
    reference_letter: {
      label: isRTL ? 'מכתב המלצה' : 'Reference',
      bg: 'from-pink-500/10 to-pink-600/10',
      border: 'border-pink-500/20',
      icon: 'text-pink-600 dark:text-pink-400',
      badge: 'bg-pink-500 text-white',
    },
    reference: {
      label: isRTL ? 'מכתב המלצה' : 'Reference',
      bg: 'from-pink-500/10 to-pink-600/10',
      border: 'border-pink-500/20',
      icon: 'text-pink-600 dark:text-pink-400',
      badge: 'bg-pink-500 text-white',
    },
    other: {
      label: isRTL ? 'אחר' : 'Other',
      bg: 'from-gray-500/10 to-gray-600/10',
      border: 'border-gray-500/20',
      icon: 'text-gray-600 dark:text-gray-400',
      badge: 'bg-gray-500 text-white',
    },
  };
  return types[type] || types.other;
};

interface StatusInfo {
  label: string;
  color: string;
}

const getStatusInfo = (status: string, isRTL: boolean): StatusInfo => {
  const statuses: Record<string, StatusInfo> = {
    active: {
      label: isRTL ? 'פעיל' : 'Active',
      color: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20',
    },
    draft: {
      label: isRTL ? 'טיוטה' : 'Draft',
      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    },
    archived: {
      label: isRTL ? 'ארכיון' : 'Archived',
      color: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
    },
  };
  return statuses[status] || statuses.active;
};

export function DocumentCard({
  document,
  viewMode,
  onPreview,
  onAnalyze,
  onDownload,
  onDelete,
  onStatusChange,
  onCompareToJob: _onCompareToJob,
  delay = 0,
  isRTL = false,
}: DocumentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const typeInfo = getTypeInfo(document.document_type || 'other', isRTL);
  const statusInfo = getStatusInfo(document.status || 'active', isRTL);

  if (viewMode === 'list') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay }}
          className="group relative bg-white dark:bg-[#383e4e] rounded-xl border border-[#b6bac5]/20 hover:border-[#9F5F80]/30 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Status Gradient Bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${typeInfo.bg}`} />

          <div className="p-3 sm:p-4 md:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 p-2.5 sm:p-3 md:p-4 rounded-xl bg-gradient-to-br ${typeInfo.bg} border ${typeInfo.border}`}>
                <FileText className={`h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 ${typeInfo.icon}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#383e4e] dark:text-white truncate mb-1 text-sm sm:text-base">
                      {document.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <Badge className={`${typeInfo.badge} px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs`}>
                        {typeInfo.label}
                      </Badge>
                      <Badge className={`${statusInfo.color} border px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions - Hidden on mobile, shown in dropdown */}
                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onPreview}
                      className="h-8 w-8 p-0 hover:bg-[#9F5F80]/10"
                    >
                      <Eye className="h-4 w-4 text-[#6c757d]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDownload}
                      className="h-8 w-8 p-0 hover:bg-[#9F5F80]/10"
                    >
                      <Download className="h-4 w-4 text-[#6c757d]" />
                    </Button>
                    {(document.document_type === 'resume') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onAnalyze}
                        className="h-8 w-8 p-0 hover:bg-[#9F5F80]/10"
                      >
                        <Sparkles className="h-4 w-4 text-[#9F5F80]" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Dropdown Menu */}
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-[#9F5F80]/10 flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4 text-[#6c757d]" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 z-[100]">
                      <DropdownMenuLabel>{isRTL ? 'פעולות' : 'Actions'}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {/* Mobile-only quick actions */}
                      <div className="sm:hidden">
                        <DropdownMenuItem onClick={() => { onPreview(); setDropdownOpen(false); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          {isRTL ? 'תצוגה מקדימה' : 'Preview'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { onDownload(); setDropdownOpen(false); }}>
                          <Download className="h-4 w-4 mr-2" />
                          {isRTL ? 'הורדה' : 'Download'}
                        </DropdownMenuItem>
                        {document.document_type === 'resume' && (
                          <DropdownMenuItem onClick={() => { onAnalyze(); setDropdownOpen(false); }}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            {isRTL ? 'ניתוח AI' : 'AI Analyze'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                      </div>
                      
                      {/* Active / Draft toggle */}
                      {document.status !== 'active' && document.status !== undefined && (
                        <DropdownMenuItem onClick={() => { onStatusChange('active'); setDropdownOpen(false); }}>
                          <FileCheck className="h-4 w-4 mr-2" />
                          {isRTL ? 'סמן כפעיל' : 'Set Active'}
                        </DropdownMenuItem>
                      )}
                      {document.status !== 'draft' && (
                        <DropdownMenuItem onClick={() => { onStatusChange('draft'); setDropdownOpen(false); }}>
                          <Calendar className="h-4 w-4 mr-2" />
                          {isRTL ? 'סמן כטיוטה' : 'Set Draft'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {/* Archive / Restore */}
                      {document.status !== 'archived' && (
                        <DropdownMenuItem onClick={() => { onStatusChange('archived'); setDropdownOpen(false); }}>
                          <Archive className="h-4 w-4 mr-2" />
                          {isRTL ? 'העבר לארכיון' : 'Archive'}
                        </DropdownMenuItem>
                      )}
                      {document.status === 'archived' && (
                        <DropdownMenuItem onClick={() => { onStatusChange('active'); setDropdownOpen(false); }}>
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          {isRTL ? 'שחזר מארכיון' : 'Restore'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => { setShowDeleteDialog(true); setDropdownOpen(false); }}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isRTL ? 'מחק' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-[#6c757d] dark:text-[#b6bac5]">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <HardDrive className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{formatFileSize(document.file_size)}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{formatDate(document.created_at, isRTL)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isRTL ? 'אישור מחיקה' : 'Confirm Delete'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isRTL
                  ? 'האם אתה בטוח שברצונך למחוק מסמך זה? פעולה זו אינה ניתנת לביטול.'
                  : 'Are you sure you want to delete this document? This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                {isRTL ? 'מחק' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Grid View
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay }}
        className="group relative bg-white dark:bg-[#383e4e] rounded-xl border border-[#b6bac5]/20 hover:border-[#9F5F80]/30 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Gradient Header */}
        <div className={`relative h-24 bg-gradient-to-br ${typeInfo.bg} border-b ${typeInfo.border}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className={`h-12 w-12 ${typeInfo.icon}`} />
          </div>
          
          {/* Status Badge - Top Right */}
          <div className="absolute top-3 right-3">
            <Badge className={`${statusInfo.color} border text-xs px-2 py-0.5`}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-[#383e4e] dark:text-white mb-2 truncate" title={document.name}>
            {document.name}
          </h3>

          {/* Type Badge */}
          <Badge className={`${typeInfo.badge} mb-3 text-xs px-2 py-0.5`}>
            {typeInfo.label}
          </Badge>

          {/* Meta Info */}
          <div className="space-y-2 mb-4 text-xs text-[#6c757d] dark:text-[#b6bac5]">
            <div className="flex items-center gap-2">
              <HardDrive className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{formatFileSize(document.file_size)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{formatDate(document.created_at, isRTL)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              className="w-full border-[#b6bac5]/30 hover:bg-[#9F5F80]/10 hover:border-[#9F5F80]/50"
            >
              <Eye className="h-4 w-4 mr-2" />
              {isRTL ? 'תצוגה מקדימה' : 'Preview'}
            </Button>
            
            {(document.document_type === 'resume') && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAnalyze}
                className="w-full border-[#9F5F80]/30 hover:bg-[#9F5F80]/10 hover:border-[#9F5F80]/50 text-[#9F5F80]"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isRTL ? 'ניתוח AI' : 'AI Analysis'}
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                className="flex-1 border-[#b6bac5]/30 hover:bg-[#9F5F80]/10"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#b6bac5]/30 hover:bg-[#9F5F80]/10"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[100]">
                  <DropdownMenuLabel>{isRTL ? 'פעולות' : 'Actions'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* Active / Draft toggle */}
                  {document.status !== 'active' && document.status !== undefined && (
                    <DropdownMenuItem onClick={() => { onStatusChange('active'); setDropdownOpen(false); }}>
                      <FileCheck className="h-4 w-4 mr-2" />
                      {isRTL ? 'סמן כפעיל' : 'Set Active'}
                    </DropdownMenuItem>
                  )}
                  {document.status !== 'draft' && (
                    <DropdownMenuItem onClick={() => { onStatusChange('draft'); setDropdownOpen(false); }}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {isRTL ? 'סמן כטיוטה' : 'Set Draft'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {/* Archive / Restore */}
                  {document.status !== 'archived' && (
                    <DropdownMenuItem onClick={() => { onStatusChange('archived'); setDropdownOpen(false); }}>
                      <Archive className="h-4 w-4 mr-2" />
                      {isRTL ? 'העבר לארכיון' : 'Archive'}
                    </DropdownMenuItem>
                  )}
                  {document.status === 'archived' && (
                    <DropdownMenuItem onClick={() => { onStatusChange('active'); setDropdownOpen(false); }}>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      {isRTL ? 'שחזר מארכיון' : 'Restore'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setShowDeleteDialog(true); setDropdownOpen(false); }}
                    className="text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isRTL ? 'מחק' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <AlertDialogTitle>
              {isRTL ? 'אישור מחיקה' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL
                ? 'האם אתה בטוח שברצונך למחוק מסמך זה? פעולה זו אינה ניתנת לביטול.'
                : 'Are you sure you want to delete this document? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
              {isRTL ? 'מחק' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DocumentCard;