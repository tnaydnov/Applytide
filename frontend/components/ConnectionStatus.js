/**
 * Shows a subtle indicator when WebSocket connection is down
 * Only shows in development mode when backend is unreachable
 */
import { useEffect, useState } from 'react';

export default function ConnectionStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // Check if we can reach the backend
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health', { 
          method: 'GET',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        setIsOffline(!response.ok);
      } catch {
        setIsOffline(true);
      }
    };

    // Check immediately
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Only show warning after being offline for 5 seconds (avoid flashing)
    if (isOffline) {
      const timer = setTimeout(() => setShowWarning(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowWarning(false);
    }
  }, [isOffline]);

  if (!showWarning || process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-yellow-200">Backend offline</span>
        </div>
      </div>
    </div>
  );
}
