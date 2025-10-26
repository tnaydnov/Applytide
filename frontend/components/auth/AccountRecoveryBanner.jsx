import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../ui';

export default function AccountRecoveryBanner() {
  const router = useRouter();
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    checkDeletionStatus();
  }, []);

  const checkDeletionStatus = async () => {
    try {
      const response = await fetch('/api/auth/deletion-status', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.is_deleted) {
          setDeletionStatus(data);
        }
      }
    } catch (error) {
      console.error('Failed to check deletion status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    if (!deletionStatus?.recovery_token) return;

    setRecovering(true);
    try {
      const response = await fetch('/api/auth/recover-account', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recovery_token: deletionStatus.recovery_token,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to recover account');
      }

      // Success! Redirect to dashboard
      alert('Your account has been successfully recovered! 🎉');
      window.location.href = '/dashboard';
    } catch (error) {
      alert(error.message);
    } finally {
      setRecovering(false);
    }
  };

  if (loading || !deletionStatus) return null;

  const deletionDate = new Date(deletionStatus.deletion_scheduled_at);
  const daysRemaining = deletionStatus.days_remaining;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-900 via-red-800 to-red-900 border-b-2 border-red-500">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Warning Icon & Message */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 animate-pulse">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-lg">
                ⚠️ Your Account is Scheduled for Deletion
              </h3>
              <p className="text-red-100 text-sm">
                Your account will be permanently deleted on{' '}
                <strong>{deletionDate.toLocaleDateString()}</strong>
                {' '}({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-shrink-0">
            <Button
              onClick={handleRecover}
              disabled={recovering}
              className="bg-white text-red-900 hover:bg-red-50 font-semibold shadow-lg"
            >
              {recovering ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Recovering...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recover My Account
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                window.location.href = '/login';
              }}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Log Out
            </Button>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="mt-3 bg-white/10 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>{daysRemaining}</strong> {daysRemaining === 1 ? 'day' : 'days'} left to recover your account.
              After that, all your data will be permanently deleted.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
