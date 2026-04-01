/**
 * PageLoader — Suspense fallback shown while lazy-loaded pages are being fetched.
 */

import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#9F5F80] animate-spin" />
    </div>
  );
}
