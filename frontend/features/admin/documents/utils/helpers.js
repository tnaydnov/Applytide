// frontend/features/admin/documents/utils/helpers.js

/**
 * Document type options with colors and icons
 */
export const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume', icon: '📄', color: 'blue' },
  { value: 'cover_letter', label: 'Cover Letter', icon: '📝', color: 'green' },
  { value: 'portfolio', label: 'Portfolio', icon: '🎨', color: 'purple' },
  { value: 'certificate', label: 'Certificate', icon: '🏆', color: 'yellow' },
  { value: 'other', label: 'Other', icon: '📎', color: 'gray' },
];

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get document type config
 */
export function getDocumentTypeConfig(type) {
  return DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[4];
}

/**
 * Calculate storage statistics
 */
export function calculateStorageStats(documents) {
  const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  const byType = {};
  
  documents.forEach(doc => {
    const type = doc.document_type || 'other';
    if (!byType[type]) {
      byType[type] = { count: 0, size: 0 };
    }
    byType[type].count++;
    byType[type].size += doc.file_size || 0;
  });
  
  return {
    totalSize,
    totalCount: documents.length,
    byType,
    avgSize: documents.length > 0 ? totalSize / documents.length : 0
  };
}

/**
 * Group documents by user
 */
export function groupDocumentsByUser(documents) {
  const grouped = {};
  
  documents.forEach(doc => {
    const userId = doc.user_id;
    if (!grouped[userId]) {
      grouped[userId] = {
        userId,
        userEmail: doc.user_email,
        userName: doc.user_name,
        documents: [],
        totalSize: 0
      };
    }
    grouped[userId].documents.push(doc);
    grouped[userId].totalSize += doc.file_size || 0;
  });
  
  return Object.values(grouped).sort((a, b) => b.totalSize - a.totalSize);
}

/**
 * Export documents to CSV
 */
export function exportToCSV(documents) {
  const headers = ['ID', 'User Email', 'Document Type', 'File Name', 'File Size', 'Uploaded At'];
  const rows = documents.map(doc => [
    doc.id,
    doc.user_email || '',
    doc.document_type || 'other',
    doc.file_name || 'unknown',
    formatFileSize(doc.file_size),
    new Date(doc.created_at).toLocaleString(),
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `documents_export_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/**
 * Validate file size filter
 */
export function validateSizeFilter(minSize, maxSize) {
  if (minSize && maxSize && minSize > maxSize) {
    return { valid: false, message: 'Minimum size cannot be greater than maximum size' };
  }
  if (minSize && minSize < 0) {
    return { valid: false, message: 'Minimum size must be positive' };
  }
  if (maxSize && maxSize < 0) {
    return { valid: false, message: 'Maximum size must be positive' };
  }
  return { valid: true };
}
