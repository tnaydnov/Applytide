/**
 * ExportApplications Component
 * Utility for exporting applications to CSV/Excel
 */

import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import type { Application } from '../../../features/applications/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

interface ExportApplicationsProps {
  applications: Application[];
  isRTL?: boolean;
}

export function ExportApplications({ applications, isRTL = false }: ExportApplicationsProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    try {
      setExporting(true);

      const data = applications.map((app) => ({
        'Job Title': app.job_title || '',
        'Company': app.company_name || '',
        'Status': app.status || '',
        'Applied Date': app.applied_date || app.created_at || '',
        'Notes': app.notes || '',
        'Archived': app.archived ? 'Yes' : 'No',
      }));

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(','),
        ...data.map((row) =>
          headers.map((header) => `"${(row as Record<string, string>)[header]?.toString().replace(/"/g, '""') || ''}"`).join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(
        isRTL
          ? `${applications.length} בקשות יוצאו בהצלחה`
          : `${applications.length} applications exported successfully`
      );
    } catch (error) {
      logger.error('Failed to export:', error);
      toast.error(isRTL ? 'שגיאה בייצוא' : 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = async () => {
    try {
      setExporting(true);

      const data = applications.map((app) => ({
        id: app.id,
        job_title: app.job_title,
        company_name: app.company_name,
        status: app.status,
        applied_date: app.applied_date || app.created_at,
        notes: app.notes,
        archived: app.archived,
      }));

      const json = JSON.stringify(data, null, 2);

      // Download
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applications_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(
        isRTL
          ? `${applications.length} בקשות יוצאו כ-JSON`
          : `${applications.length} applications exported as JSON`
      );
    } catch (error) {
      logger.error('Failed to export:', error);
      toast.error(isRTL ? 'שגיאה בייצוא' : 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  if (applications.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exporting} data-tour="export-btn">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isRTL ? 'ייצוא' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? 'end' : 'start'}>
        <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isRTL ? 'ייצוא כ-CSV' : 'Export as CSV'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON} className="cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {isRTL ? 'ייצוא כ-JSON' : 'Export as JSON'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportApplications;