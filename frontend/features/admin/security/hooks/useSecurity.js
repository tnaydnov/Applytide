// frontend/features/admin/security/hooks/useSecurity.js
import { useState, useCallback } from 'react';
import { 
  getFailedLogins, 
  getBlockedIPs, 
  blockIP, 
  unblockIP,
  getActiveSessions,
  revokeSession
} from '../../../../services/admin';
import { showToast } from '../../../../lib/toast';

export function useFailedLogins(limit = 100) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFailedLogins(limit);
      setLogs(data.failed_logins);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load failed logins: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  return { logs, loading, error, loadLogs };
}

export function useIPBlacklist() {
  const [ips, setIps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadIPs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBlockedIPs();
      setIps(data.blocked_ips);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load blocked IPs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { ips, loading, error, loadIPs };
}

export function useActiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getActiveSessions();
      setSessions(data.sessions);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load sessions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { sessions, loading, error, loadSessions };
}

export function useSecurityActions() {
  const [actionLoading, setActionLoading] = useState(false);

  const blockIPAddress = async (ip, reason, justification, password) => {
    try {
      setActionLoading(true);
      await blockIP({ ip, reason, justification, password });
      showToast.success(`IP ${ip} blocked successfully`);
      return true;
    } catch (err) {
      showToast.error(`Failed to block IP: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const unblockIPAddress = async (ip, justification, password) => {
    try {
      setActionLoading(true);
      await unblockIP({ ip, justification, password });
      showToast.success(`IP ${ip} unblocked successfully`);
      return true;
    } catch (err) {
      showToast.error(`Failed to unblock IP: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const revokeUserSession = async (sessionId, justification, password) => {
    try {
      setActionLoading(true);
      await revokeSession({ sessionId, justification, password });
      showToast.success('Session revoked successfully');
      return true;
    } catch (err) {
      showToast.error(`Failed to revoke session: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { actionLoading, blockIPAddress, unblockIPAddress, revokeUserSession };
}
