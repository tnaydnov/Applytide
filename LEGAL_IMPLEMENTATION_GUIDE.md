# Legal Agreements & Account Deletion Implementation Guide

## Overview
This document outlines the complete implementation of:
1. **Legal Agreements System** - Mandatory acceptance during registration
2. **Account Deletion with Recovery** - 7-day grace period

---

## Part 1: Legal Agreements System

### Requirements Implemented

#### ✅ Database Schema
**Added to `User` model:**
- `terms_accepted_at` - Timestamp when user accepted Terms of Service
- `privacy_accepted_at` - Timestamp when user accepted Privacy Policy
- `terms_version` - Version of terms accepted (e.g., "1.0")
- `acceptance_ip` - IP address from which agreements were accepted

#### ✅ Frontend Component
**Created:** `frontend/components/auth/LegalAgreements.jsx`

**4 Required Checkboxes:**
1. **Terms of Service** - Links to /terms (Extension usage, arbitration, liability)
2. **Privacy/Cookie/Copyright** - Links to all 3 policies
3. **Age Verification** - COPPA compliance (13+ years)
4. **Data Processing Consent** - GDPR/CCPA compliance

**Features:**
- Prevents form submission until all checked
- Opens links in new tab without closing modal
- Visual warning when incomplete
- Disabled state during submission

#### ✅ Backend Validation
**Updated:** `backend/app/api/schemas/auth.py`

**New RegisterIn fields:**
```python
terms_accepted: bool = Field(..., description="Must accept Terms")
privacy_accepted: bool = Field(..., description="Must accept Privacy")
age_verified: bool = Field(..., description="Must be 13+ years")
data_processing_consent: bool = Field(..., description="GDPR/CCPA consent")
```

**Updated:** `backend/app/api/routers/auth/registration.py`

**Validation logic:**
```python
if not all([
    payload.terms_accepted,
    payload.privacy_accepted,
    payload.age_verified,
    payload.data_processing_consent
]):
    raise HTTPException(400, "You must accept all legal agreements")
```

**Tracking on user creation:**
```python
terms_accepted_at=now,
privacy_accepted_at=now,
terms_version="1.0",
acceptance_ip=ip_address
```

### Google OAuth Flow

**Challenge:** OAuth users don't see registration form

**Solution:** Two-step OAuth process

1. **Step 1:** Show legal agreements BEFORE OAuth redirect
   - User clicks "Continue with Google"
   - Modal shows legal checkboxes
   - User must check all boxes
   - Then redirect to Google OAuth

2. **Step 2:** After Google callback, store agreements
   - Frontend sends agreements state with callback
   - Backend stores acceptance metadata
   - User created with legal tracking

**Implementation needed:**
- Modify frontend Google OAuth button to show legal modal first
- Store agreement state in session/localStorage
- Send agreements with OAuth callback
- Update `process_google_login()` to accept and store agreements

---

## Part 2: Account Deletion with Recovery

### Requirements Implemented

#### ✅ Database Schema
**Added to `User` model:**
- `deleted_at` - When user requested deletion (null = not deleted)
- `deletion_scheduled_at` - When permanent deletion will occur (deleted_at + 7 days)
- `deletion_recovery_token` - Secure token for recovery link

#### ✅ Schemas
**Created:** `backend/app/api/schemas/auth.py`

```python
class AccountDeletionRequestIn(BaseModel):
    password: Optional[str]  # Required for email users
    confirmation: str  # Must type "DELETE"

class AccountRecoveryIn(BaseModel):
    recovery_token: str
```

### Workflow

#### Deletion Request
1. User clicks "Delete Account" in settings
2. Modal shows:
   - Warning about 7-day recovery period
   - Password field (if non-OAuth)
   - Type "DELETE" to confirm
3. Backend validates password/confirmation
4. Sets `deleted_at = now()`, `deletion_scheduled_at = now() + 7 days`
5. Generates `deletion_recovery_token`
6. Sends email with recovery link
7. User logged out immediately

#### During 7-Day Grace Period
- User cannot log in normally
- Login endpoint checks `deleted_at`:
  - If exists: Show recovery UI instead of dashboard
  - Recovery button visible
- Recovery link in email: `https://applytide.com/auth/recover?token=<recovery_token>`

#### Recovery Process
1. User clicks recovery link or logs in during grace period
2. Frontend shows: "Your account is scheduled for deletion. Recover now?"
3. User clicks "Recover My Account"
4. Backend verifies token, clears deletion fields:
   ```python
   deleted_at = None
   deletion_scheduled_at = None
   deletion_recovery_token = None
   ```
5. User redirected to dashboard

#### Permanent Deletion
- **Scheduled Job** (runs daily):
  ```python
  DELETE FROM users 
  WHERE deletion_scheduled_at IS NOT NULL 
  AND deletion_scheduled_at < NOW()
  ```
- Or better: **Soft delete permanently** (keep record for audit):
  ```python
  UPDATE users 
  SET email = 'deleted_' || id::text,
      password_hash = NULL,
      full_name = 'Deleted User',
      -- Clear all PII
  WHERE deletion_scheduled_at < NOW()
  ```

### Implementation Status

#### ✅ Completed
- Database schema design
- Pydantic schemas
- Migration file created

#### ⏳ Pending
- Deletion endpoint (`POST /api/auth/delete-account`)
- Recovery endpoint (`POST /api/auth/recover-account`)
- Login modification (check deleted_at)
- Frontend deletion modal
- Frontend recovery UI
- Email templates (deletion confirmation + recovery link)
- Scheduled cleanup job

---

## Migration Instructions

```bash
# 1. Activate backend environment
cd backend

# 2. Run migration
alembic upgrade head

# 3. Verify migration
alembic current

# 4. Check database
psql -d applytide -c "\\d users"
```

---

## Next Steps

### Priority 1: Legal Agreements (Registration)
1. ✅ Create `LegalAgreements.jsx` component
2. **TODO:** Integrate into email registration form
3. **TODO:** Integrate into Google OAuth flow (two-step process)
4. **TODO:** Update Google OAuth callback to store agreements
5. **TODO:** Test both registration flows

### Priority 2: Account Deletion
1. **TODO:** Create deletion endpoint with password validation
2. **TODO:** Create recovery endpoint
3. **TODO:** Modify login to check deleted_at
4. **TODO:** Create frontend deletion modal
5. **TODO:** Create frontend recovery UI
6. **TODO:** Email templates (deletion + recovery)
7. **TODO:** Scheduled cleanup job (Celery or cron)

### Priority 3: Testing
1. Test legal agreement validation (frontend + backend)
2. Test OAuth flow with agreements
3. Test account deletion (email + OAuth users)
4. Test recovery within 7 days
5. Test permanent deletion after 7 days
6. Test email notifications

---

## Legal Compliance Checklist

### GDPR (EU)
- ✅ Explicit consent for data processing
- ✅ Right to access data (existing profile page)
- ✅ Right to delete data (7-day recovery = graceful deletion)
- ✅ Data retention policy (7 days after deletion request)
- ✅ Clear privacy policy with links

### CCPA (California)
- ✅ Notice of data collection (Privacy Policy)
- ✅ Right to delete personal information
- ✅ Consent for data processing

### COPPA (Children)
- ✅ Age verification (13+ checkbox)
- ✅ No accounts for under 13

### Terms of Service
- ✅ Chrome Extension usage rules
- ✅ Third-party site compliance
- ✅ Arbitration clause
- ✅ Liability limitations
- ✅ Acceptable use policy

---

## Email Templates Needed

### 1. Account Deletion Confirmation
**Subject:** Your Applytide Account Will Be Deleted in 7 Days

**Body:**
```
Hi [Name],

We've received your request to delete your Applytide account.

Your account is scheduled for permanent deletion on [deletion_scheduled_at].

**Changed your mind?**
You have 7 days to recover your account. Click the link below or simply log in:

[Recover My Account] → https://applytide.com/auth/recover?token=[recovery_token]

After 7 days, all your data will be permanently deleted and cannot be recovered.

If you didn't request this, please contact support@applytide.com immediately.

Best regards,
The Applytide Team
```

### 2. Account Recovered Successfully
**Subject:** Your Applytide Account Has Been Recovered

**Body:**
```
Hi [Name],

Great news! Your account has been successfully recovered.

You can continue using Applytide as normal. All your data has been preserved.

If you didn't request this recovery, please change your password immediately.

Best regards,
The Applytide Team
```

---

## Database Migration File

**Created:** `backend/app/db/migrations/versions/20250128_legal_agreements_deletion.py`

**Adds:**
- Legal agreement tracking (4 columns)
- Account deletion mechanism (3 columns)
- Index on recovery token

**Run with:**
```bash
alembic upgrade head
```

---

## Frontend Integration Example

### Email Registration Form
```jsx
import LegalAgreements from '@/components/auth/LegalAgreements';

function RegisterForm() {
  const [legalAgreements, setLegalAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
    dataProcessing: false,
  });
  const [allAgreed, setAllAgreed] = useState(false);

  const handleAgreementsChange = (allChecked, agreements) => {
    setAllAgreed(allChecked);
    setLegalAgreements(agreements);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!allAgreed) {
      toast.error('Please accept all legal agreements');
      return;
    }

    await api.post('/api/auth/register', {
      email,
      password,
      full_name,
      terms_accepted: legalAgreements.terms,
      privacy_accepted: legalAgreements.privacy,
      age_verified: legalAgreements.age,
      data_processing_consent: legalAgreements.dataProcessing,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Email, password, name fields */}
      
      <LegalAgreements 
        onAgreementsChange={handleAgreementsChange}
        disabled={isSubmitting}
      />

      <button disabled={!allAgreed || isSubmitting}>
        Register
      </button>
    </form>
  );
}
```

### Google OAuth Flow
```jsx
function GoogleOAuthButton() {
  const [showLegal, setShowLegal] = useState(false);
  const [agreements, setAgreements] = useState(null);

  const handleGoogleClick = () => {
    setShowLegal(true); // Show legal modal first
  };

  const handleLegalAccepted = (allChecked, agreementState) => {
    if (allChecked) {
      // Store in session for callback
      sessionStorage.setItem('oauth_agreements', JSON.stringify(agreementState));
      
      // Now redirect to Google OAuth
      window.location.href = '/api/auth/google';
    }
  };

  return (
    <>
      <button onClick={handleGoogleClick}>
        Continue with Google
      </button>

      {showLegal && (
        <Modal>
          <LegalAgreements onAgreementsChange={handleLegalAccepted} />
        </Modal>
      )}
    </>
  );
}
```

---

## Summary

### ✅ Completed
1. Database schema for legal agreements + deletion
2. Migration file created
3. Backend schemas updated (RegisterIn, AccountDeletionRequestIn, AccountRecoveryIn)
4. Registration endpoint validates agreements
5. Legal tracking stored on user creation
6. LegalAgreements.jsx component created

### ⏳ Next Actions Required
1. Integrate LegalAgreements into registration forms
2. Implement two-step Google OAuth with legal modal
3. Create account deletion endpoint
4. Create account recovery endpoint
5. Modify login to handle deleted accounts
6. Create email templates
7. Set up scheduled cleanup job

Would you like me to continue with the implementation of any specific part?
