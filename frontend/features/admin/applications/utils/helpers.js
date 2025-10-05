// frontend/features/admin/utils/applicationHelpers.js

/**
 * Helper utilities for applications management
 */

// Application status options with colors
export const APPLICATION_STATUSES = [
  { value: 'applied', label: 'Applied', color: 'blue', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  { value: 'screening', label: 'Screening', color: 'yellow', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  { value: 'interviewing', label: 'Interviewing', color: 'purple', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  { value: 'offer', label: 'Offer', color: 'green', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  { value: 'accepted', label: 'Accepted', color: 'emerald', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
  { value: 'rejected', label: 'Rejected', color: 'red', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'gray', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
];

/**
 * Get status badge styling
 */
export function getStatusStyle(status) {
  const statusConfig = APPLICATION_STATUSES.find(s => s.value === status);
  return statusConfig || APPLICATION_STATUSES[0];
}

/**
 * Format conversion funnel data for visualization
 */
export function formatConversionFunnel(analytics) {
  if (!analytics) return [];
  
  return [
    { stage: 'Applied', count: analytics.total_count, rate: 100 },
    { stage: 'Screening', count: analytics.status_distribution?.screening || 0, rate: 0 },
    { stage: 'Interviewing', count: analytics.status_distribution?.interviewing || 0, rate: 0 },
    { stage: 'Offer', count: analytics.status_distribution?.offer || 0, rate: 0 },
    { stage: 'Accepted', count: analytics.status_distribution?.accepted || 0, rate: 0 },
  ].map((stage, index, array) => {
    if (index === 0) return stage;
    const prevCount = array[index - 1].count;
    const rate = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
    return { ...stage, rate: Math.round(rate * 10) / 10 };
  });
}

/**
 * Calculate status distribution percentages
 */
export function calculateStatusDistribution(analytics) {
  if (!analytics || !analytics.status_distribution) return [];
  
  const total = analytics.total_count;
  return Object.entries(analytics.status_distribution).map(([status, count]) => {
    const statusConfig = getStatusStyle(status);
    return {
      status,
      label: statusConfig.label,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : 0,
      color: statusConfig.color,
      bgColor: statusConfig.bgColor,
      textColor: statusConfig.textColor,
    };
  }).sort((a, b) => b.count - a.count);
}

/**
 * Format date range for display
 */
export function formatDateRange(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return 'All Time';
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  if (dateFrom && dateTo) {
    return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
  } else if (dateFrom) {
    return `From ${formatDate(dateFrom)}`;
  } else {
    return `Until ${formatDate(dateTo)}`;
  }
}

/**
 * Export applications to CSV
 */
export function exportToCSV(applications) {
  const headers = ['ID', 'User Email', 'Job Title', 'Company', 'Status', 'Created At', 'Updated At'];
  const rows = applications.map(app => [
    app.id,
    app.user_email || '',
    app.job_title || 'N/A',
    app.company_name || 'N/A',
    app.status,
    new Date(app.created_at).toLocaleString(),
    new Date(app.updated_at).toLocaleString(),
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `applications_export_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/**
 * Validate bulk delete selection
 */
export function validateBulkSelection(selectedIds, applications) {
  if (selectedIds.length === 0) {
    return { valid: false, message: 'No applications selected' };
  }
  
  if (selectedIds.length > 100) {
    return { valid: false, message: 'Cannot delete more than 100 applications at once' };
  }
  
  // Check if all selected IDs exist
  const existingIds = new Set(applications.map(app => app.id));
  const invalidIds = selectedIds.filter(id => !existingIds.has(id));
  
  if (invalidIds.length > 0) {
    return { valid: false, message: `Invalid application IDs: ${invalidIds.join(', ')}` };
  }
  
  return { valid: true };
}
