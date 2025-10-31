/**
 * @fileoverview Missing Documents Banner Component
 * 
 * Displays a warning banner when user has documents with missing physical files.
 * Provides quick actions to view affected documents and re-upload them.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/api';

/**
 * Banner component that alerts users to missing document files
 * 
 * Features:
 * - Auto-checks for missing files on mount
 * - Dismissible (stored in sessionStorage)
 * - Shows count and provides navigation to documents page
 * - Styled consistently with app theme
 * 
 * @returns {JSX.Element|null} Banner or null if no issues/dismissed
 */
export default function MissingDocumentsBanner() {
    const router = useRouter();
    const [missingInfo, setMissingInfo] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [cleaning, setCleaning] = useState(false);

    useEffect(() => {
        // Check if banner was dismissed this session
        const wasDismissed = sessionStorage.getItem('missing-docs-banner-dismissed');
        if (wasDismissed === 'true') {
            setDismissed(true);
            setLoading(false);
            return;
        }

        checkMissingFiles();
    }, []);

    async function checkMissingFiles() {
        try {
            const res = await apiFetch('/documents/health/missing-files');
            if (!res.ok) {
                console.warn('Failed to check missing files:', res.status);
                setLoading(false);
                return;
            }
            
            const data = await res.json();
            
            // Only show banner if there are missing files
            if (data.missing_count > 0) {
                setMissingInfo(data);
            }
        } catch (e) {
            console.error('checkMissingFiles error:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCleanup() {
        if (!confirm('This will hide all documents with missing files from your list. The metadata will be preserved but documents will be archived. Continue?')) {
            return;
        }

        setCleaning(true);
        try {
            const res = await apiFetch('/documents/cleanup/orphaned', {
                method: 'POST'
            });

            if (!res.ok) {
                throw new Error('Cleanup failed');
            }

            const data = await res.json();
            
            // Show success and refresh
            alert(`Successfully cleaned up ${data.cleaned_count} orphaned document(s). The page will now refresh.`);
            
            // Dismiss banner and reload
            handleDismiss();
            window.location.reload();
        } catch (e) {
            console.error('cleanup error:', e);
            alert('Failed to cleanup orphaned documents. Please try again.');
        } finally {
            setCleaning(false);
        }
    }

    function handleDismiss() {
        setDismissed(true);
        sessionStorage.setItem('missing-docs-banner-dismissed', 'true');
    }

    function handleViewDocuments() {
        router.push('/documents');
    }

    // Don't render if loading, dismissed, or no missing files
    if (loading || dismissed || !missingInfo || missingInfo.missing_count === 0) {
        return null;
    }

    return (
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 mb-4 flex items-start gap-3">
            {/* Warning Icon */}
            <svg 
                className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
            >
                <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
            </svg>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-yellow-200 mb-1">
                    Missing Document Files
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                    {missingInfo.missing_count} of your {missingInfo.total_documents} documents{' '}
                    {missingInfo.missing_count === 1 ? 'is' : 'are'} missing from storage. 
                    This may happen after file cleanup or migration. 
                    You can hide these documents or re-upload them.
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleCleanup}
                        disabled={cleaning}
                        className="px-3 py-1.5 text-sm font-medium text-yellow-200 bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-700/40 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cleaning ? 'Cleaning...' : 'Hide These Documents'}
                    </button>
                    <button
                        onClick={handleViewDocuments}
                        className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded transition-colors"
                    >
                        View All Documents
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>

            {/* Close Button */}
            <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-300 transition-colors flex-shrink-0"
                aria-label="Close banner"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
