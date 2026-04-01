/**
 * GoogleCalendarButton Component
 * Google Calendar sync & disconnect button
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Unplug } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { remindersApi } from '../../../features/reminders/api';
import { toast } from 'sonner';

interface GoogleCalendarButtonProps {
  onSync: () => void;
  syncing: boolean;
  isRTL?: boolean;
}

export function GoogleCalendarButton({ onSync, syncing, isRTL = false }: GoogleCalendarButtonProps) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    remindersApi.checkGoogleConnection()
      .then(setConnected)
      .catch(() => setConnected(false));
  }, []);

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await remindersApi.disconnectGoogle();
      setConnected(false);
      toast.success(isRTL ? 'Google Calendar נותק בהצלחה' : 'Google Calendar disconnected');
    } catch {
      toast.error(isRTL ? 'שגיאה בניתוק' : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={onSync}
        disabled={syncing || disconnecting}
        className="border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
        {syncing
          ? (isRTL ? 'מסנכרן...' : 'Syncing...')
          : (isRTL ? 'סנכרן Google Calendar' : 'Sync Google Calendar')}
      </Button>

      {connected && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleDisconnect}
          disabled={disconnecting || syncing}
          title={isRTL ? 'נתק Google Calendar' : 'Disconnect Google Calendar'}
          className="border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Unplug className={`h-4 w-4 ${disconnecting ? 'animate-pulse' : ''}`} />
        </Button>
      )}
    </div>
  );
}

export default GoogleCalendarButton;
