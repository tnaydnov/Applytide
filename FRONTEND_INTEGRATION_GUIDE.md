# Admin System - Frontend Integration Guide

Quick reference for frontend developers implementing the enhanced admin features.

---

## 🔐 Step-Up Authentication Flow

### When It's Needed
Step-up authentication is required for:
- **Changing admin status**: `PATCH /admin/users/{user_id}/admin-status`
- **Purging audit logs**: `DELETE /admin/logs/purge`

### Implementation

```javascript
// services/admin.js

export const updateAdminStatus = async (userId, isAdmin, reason) => {
  try {
    // Attempt the operation
    const response = await api.patch(`/admin/users/${userId}/admin-status`, {
      is_admin: isAdmin,
      reason: reason
    });
    return response.data;
    
  } catch (error) {
    // Check if step-up auth is required
    if (error.response?.status === 403 && 
        error.response?.data?.detail?.includes('Step-up authentication')) {
      
      // Show password prompt
      const password = await promptForPassword();
      
      if (!password) {
        throw new Error('Password verification cancelled');
      }
      
      // Verify password
      await verifyPassword(password);
      
      // Retry operation (will succeed for next 5 minutes)
      const retryResponse = await api.patch(`/admin/users/${userId}/admin-status`, {
        is_admin: isAdmin,
        reason: reason
      });
      return retryResponse.data;
    }
    
    throw error;
  }
};

const verifyPassword = async (password) => {
  const response = await api.post('/admin/verify-password', { password });
  
  if (!response.data.success) {
    throw new Error('Password verification failed');
  }
  
  // Optional: Show toast notification
  toast.success(`Password verified. Valid for ${response.data.expires_in_minutes} minutes.`);
  
  return response.data;
};
```

### React Component Example

```jsx
// components/PasswordVerificationModal.js

import React, { useState } from 'react';
import { Modal, Input, Button } from './ui';

export const PasswordVerificationModal = ({ isOpen, onClose, onVerify }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onVerify(password);
      onClose();
    } catch (err) {
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Verify Your Password</h2>
      <p>This action requires recent password verification for security.</p>
      
      <form onSubmit={handleSubmit}>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoFocus
          required
        />
        
        {error && <p className="error">{error}</p>}
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify Password'}
        </Button>
      </form>
    </Modal>
  );
};
```

### Usage in Admin Page

```jsx
// features/admin/UserManagement.js

import React, { useState } from 'react';
import { PasswordVerificationModal } from '../../components/PasswordVerificationModal';
import { updateAdminStatus, verifyPassword } from '../../services/admin';

export const UserManagement = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const handleAdminStatusChange = async (userId, isAdmin, reason) => {
    try {
      await updateAdminStatus(userId, isAdmin, reason);
      toast.success('Admin status updated successfully');
      
    } catch (error) {
      if (error.response?.status === 403) {
        // Show password modal
        setPendingAction({ userId, isAdmin, reason });
        setShowPasswordModal(true);
      } else {
        toast.error(error.message);
      }
    }
  };

  const handlePasswordVerified = async (password) => {
    await verifyPassword(password);
    
    // Retry pending action
    if (pendingAction) {
      const { userId, isAdmin, reason } = pendingAction;
      await updateAdminStatus(userId, isAdmin, reason);
      toast.success('Admin status updated successfully');
      setPendingAction(null);
    }
  };

  return (
    <>
      {/* Your user management UI */}
      
      <PasswordVerificationModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onVerify={handlePasswordVerified}
      />
    </>
  );
};
```

---

## 📝 Reason Field Input

### Requirements
- **Minimum length**: 10 characters
- **Maximum length**: 500 characters
- **Required**: Cannot be empty

### React Component

```jsx
// components/ReasonInput.js

import React, { useState } from 'react';

export const ReasonInput = ({ value, onChange, error }) => {
  const [charCount, setCharCount] = useState(value?.length || 0);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setCharCount(newValue.length);
    onChange(newValue);
  };

  return (
    <div className="reason-input">
      <label htmlFor="reason">
        Reason for Change *
        <span className="text-sm text-gray-500 ml-2">
          ({charCount}/500 characters)
        </span>
      </label>
      
      <textarea
        id="reason"
        value={value}
        onChange={handleChange}
        minLength={10}
        maxLength={500}
        rows={4}
        placeholder="Provide a detailed justification (10-500 characters)"
        className={error ? 'error' : ''}
        required
      />
      
      {error && <p className="error-message">{error}</p>}
      
      {charCount < 10 && charCount > 0 && (
        <p className="warning">At least {10 - charCount} more characters required</p>
      )}
    </div>
  );
};
```

### Usage Example

```jsx
// features/admin/AdminStatusForm.js

const [reason, setReason] = useState('');
const [reasonError, setReasonError] = useState('');

const validateReason = (value) => {
  if (value.length < 10) {
    setReasonError('Reason must be at least 10 characters');
    return false;
  }
  if (value.length > 500) {
    setReasonError('Reason must not exceed 500 characters');
    return false;
  }
  setReasonError('');
  return true;
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateReason(reason)) {
    return;
  }
  
  try {
    await updateAdminStatus(userId, isAdmin, reason);
    toast.success('Status updated successfully');
  } catch (error) {
    toast.error(error.message);
  }
};

return (
  <form onSubmit={handleSubmit}>
    <ReasonInput
      value={reason}
      onChange={setReason}
      error={reasonError}
    />
    <button type="submit">Update Status</button>
  </form>
);
```

---

## ⚠️ Rate Limit Handling

### Error Response
When rate limited, API returns:
```json
{
  "status_code": 429,
  "detail": "Rate limit exceeded: 20 per 1 minute"
}
```

### Implementation

```javascript
// lib/api.js

import axios from 'axios';
import { toast } from './toast';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      // Extract rate limit info
      const detail = error.response.data.detail;
      toast.error(`Rate limit exceeded. Please wait a moment and try again.`);
      
      // Optional: Extract retry time from header
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        toast.info(`You can retry in ${retryAfter} seconds.`);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Rate Limits Reference

| Endpoint | Rate Limit | Note |
|----------|------------|------|
| Dashboard, Health, Analytics | 100/minute | Read operations |
| List Users, Audit Logs | 100/minute | Read operations |
| Premium Status Changes | 50/minute | Medium sensitivity |
| Admin Status Changes | 20/minute | High sensitivity |
| CSV Export | 10/minute | Resource intensive |
| Password Verification | 10/minute | Prevent brute force |
| Log Purge | 5/hour | Extremely sensitive |

---

## 📊 CSV Export

### API Call

```javascript
// services/admin.js

export const exportAuditLogs = async (filters = {}) => {
  const { days = 30, admin_id, action } = filters;
  
  const params = new URLSearchParams();
  params.append('days', days);
  if (admin_id) params.append('admin_id', admin_id);
  if (action) params.append('action', action);
  
  try {
    const response = await api.get(`/admin/logs/export?${params.toString()}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : 'audit_logs.csv';
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    toast.success('Audit logs exported successfully');
  } catch (error) {
    if (error.response?.status === 429) {
      toast.error('Export rate limit exceeded. Please wait a moment.');
    } else {
      toast.error('Failed to export logs');
    }
  }
};
```

### React Component

```jsx
// features/admin/AuditLogExport.js

import React, { useState } from 'react';
import { exportAuditLogs } from '../../services/admin';

export const AuditLogExport = () => {
  const [exporting, setExporting] = useState(false);
  const [days, setDays] = useState(30);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAuditLogs({ days });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="audit-log-export">
      <label>
        Export last
        <select value={days} onChange={(e) => setDays(e.target.value)}>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
        </select>
      </label>
      
      <button onClick={handleExport} disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export to CSV'}
      </button>
    </div>
  );
};
```

---

## 🗑️ Log Purge

### API Call

```javascript
// services/admin.js

export const purgeAuditLogs = async (days) => {
  try {
    const response = await api.delete(`/admin/logs/purge?days=${days}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 403) {
      throw new Error('STEP_UP_REQUIRED');
    }
    throw error;
  }
};
```

### React Component with Confirmation

```jsx
// features/admin/LogPurge.js

import React, { useState } from 'react';
import { purgeAuditLogs, verifyPassword } from '../../services/admin';
import { PasswordVerificationModal } from '../../components/PasswordVerificationModal';

export const LogPurge = () => {
  const [days, setDays] = useState(365);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handlePurgeClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmPurge = async () => {
    setShowConfirmation(false);
    
    try {
      const result = await purgeAuditLogs(days);
      toast.success(`Purged ${result.deleted_count} log entries`);
      
    } catch (error) {
      if (error.message === 'STEP_UP_REQUIRED') {
        setShowPasswordModal(true);
      } else {
        toast.error(error.message);
      }
    }
  };

  const handlePasswordVerified = async (password) => {
    await verifyPassword(password);
    await purgeAuditLogs(days);
    toast.success('Audit logs purged successfully');
  };

  return (
    <>
      <div className="log-purge">
        <h3>⚠️ Danger Zone: Purge Old Logs</h3>
        <p>Permanently delete audit logs older than specified days.</p>
        
        <label>
          Delete logs older than
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value={30}>30 days (minimum)</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year (default)</option>
            <option value={730}>2 years</option>
          </select>
        </label>
        
        <button onClick={handlePurgeClick} className="btn-danger">
          Purge Logs
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <Modal onClose={() => setShowConfirmation(false)}>
          <h2>⚠️ Confirm Log Purge</h2>
          <p>This will <strong>permanently delete</strong> all logs older than {days} days.</p>
          <p>This action cannot be undone!</p>
          
          <div className="modal-actions">
            <button onClick={() => setShowConfirmation(false)}>Cancel</button>
            <button onClick={handleConfirmPurge} className="btn-danger">
              Yes, Purge Logs
            </button>
          </div>
        </Modal>
      )}

      {/* Password Verification Modal */}
      <PasswordVerificationModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onVerify={handlePasswordVerified}
      />
    </>
  );
};
```

---

## 🎨 UI/UX Best Practices

### 1. Step-Up Authentication
- Show password modal immediately when 403 received
- Clear error message: "This action requires password verification"
- Auto-retry after successful verification
- Show success toast: "Password verified. Valid for 5 minutes."

### 2. Reason Field
- Show character count (e.g., "50/500 characters")
- Real-time validation feedback
- Clear error messages
- Placeholder with example text

### 3. Rate Limiting
- User-friendly error messages
- Show retry time if available
- Disable button temporarily after rate limit hit
- Consider exponential backoff for retries

### 4. CSV Export
- Show loading spinner during export
- Trigger browser download automatically
- Success toast on completion
- Error handling for rate limits

### 5. Log Purge
- Double confirmation (modal + password)
- Show warning icon and red color
- Display number of logs to be deleted (if possible)
- Success message with count of deleted logs

---

## 🧪 Testing

### Manual Testing Checklist

```javascript
// Step-up authentication
[ ] Admin status change without verification → 403 error
[ ] Verify password → success
[ ] Admin status change within 5 min → success
[ ] Admin status change after 6 min → 403 again

// Reason field
[ ] Submit without reason → validation error
[ ] Submit with <10 chars → validation error
[ ] Submit with >500 chars → validation error
[ ] Submit with valid reason → success

// Rate limiting
[ ] Make 25 admin status requests → limited at 21st
[ ] Make 15 export requests → limited at 11th
[ ] Wait 1 minute → can make requests again

// CSV export
[ ] Export last 30 days → CSV downloaded
[ ] Export with filters → correct data
[ ] Open CSV in Excel → properly formatted

// Log purge
[ ] Purge without verification → 403
[ ] Verify password + purge → success
[ ] Check logs deleted → confirmed
```

---

## 📞 Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify JWT token is being sent correctly
3. Check rate limit headers in response
4. Ensure step-up verification is cached properly

---

## 🔗 Related Documentation

- **Full Implementation**: `ADMIN_IMPLEMENTATION_COMPLETE.md`
- **Backend API**: `backend/app/api/routers/admin.py`
- **Security Tests**: `backend/tests/test_admin_security.py`

---

**Last Updated**: January 2025  
**Version**: 1.0.0
