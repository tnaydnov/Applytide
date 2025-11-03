# Subscription Plan Migration Guide

## Overview

This document explains the migration from a boolean `is_premium` field to a flexible `subscription_plan` enum system that supports multiple tiers: Starter (free), Pro, and Premium.

## Database Changes

### New Schema

**Before:**
```python
is_premium: bool = False  # Only two states: free or premium
```

**After:**
```python
subscription_plan: str = "starter"  # Three states: 'starter', 'pro', 'premium'
is_premium: bool = False  # Deprecated but kept for backward compatibility
```

### Migration File

Location: `backend/app/db/migrations/versions/20251103_subscription_plan.py`

**What it does:**
1. Adds new `subscription_plan` column
2. Migrates existing data:
   - `is_premium=True` → `subscription_plan='premium'`
   - `is_premium=False` → `subscription_plan='starter'`
3. Keeps `is_premium` for backward compatibility
4. Adds index on `subscription_plan` for performance

**To apply:**
```bash
cd backend
alembic upgrade head
```

## Model Updates

### User Model (backend/app/db/models.py)

**New Properties:**
```python
# Check specific plan
user.is_starter      # True if on free plan
user.is_pro          # True if on Pro plan
user.is_premium_plan # True if on Premium plan
user.has_paid_plan   # True if Pro or Premium

# Feature access
user.has_feature_access("unlimited_ai")        # True for Pro/Premium
user.has_feature_access("ai_agent")            # True for Premium only
user.has_feature_access("auto_fill")           # True for Premium only
```

**Feature Matrix:**
```python
# Available to all plans (Starter, Pro, Premium)
- Basic tracking
- Chrome extension
- Calendar integration
- Document storage

# Pro & Premium only
- unlimited_applications
- unlimited_ai
- unlimited_cover_letters
- unlimited_resume_analysis
- advanced_analytics
- interview_prep
- company_insights
- skills_gap_analysis

# Premium only
- ai_agent
- auto_fill
- resume_generation
- auto_optimize_resume
- email_tracking
```

## API Schema Updates

### UserInfo Schema (backend/app/api/schemas/auth.py)

**Added:**
```python
subscription_plan: str = "starter"  # 'starter', 'pro', 'premium'
```

**Response Example:**
```json
{
  "id": "...",
  "email": "user@example.com",
  "subscription_plan": "pro",
  "is_premium": true,
  "premium_expires_at": "2025-12-31T23:59:59Z"
}
```

Note: `is_premium` is now computed as `subscription_plan != "starter"` for backward compatibility

## Frontend Integration

### AuthContext Updates

Update `frontend/contexts/AuthContext.js`:

```javascript
// Before
if (user.is_premium) {
  // Premium feature
}

// After - Recommended
if (user.subscription_plan === 'premium') {
  // Premium-only feature
}

if (user.subscription_plan === 'pro' || user.subscription_plan === 'premium') {
  // Pro or Premium feature
}

// Or using helper function
const hasPaidPlan = user.subscription_plan !== 'starter';
```

### Feature Gating Examples

```javascript
// Starter: 25 applications limit
const canAddApplication = user.subscription_plan === 'starter' 
  ? applicationCount < 25 
  : true;

// AI features: 10/month for Starter, unlimited for Pro/Premium
const canGenerateCoverLetter = user.subscription_plan === 'starter'
  ? aiUsageThisMonth < 10
  : true;

// Premium-only features
const canUseAIAgent = user.subscription_plan === 'premium';
const canUseAutoFill = user.subscription_plan === 'premium';
```

## Backend Service Updates

### Checking Permissions

```python
from app.api.deps import get_current_user

# Check specific plan
if user.subscription_plan == "premium":
    # Premium feature

# Check feature access (recommended)
if user.has_feature_access("ai_agent"):
    # AI Agent feature

# Check paid plan
if user.has_paid_plan:
    # Any paid feature
```

### Upgrade/Downgrade Logic

```python
# Upgrade user to Pro
user.subscription_plan = "pro"
user.is_premium = True  # Update for backward compatibility
user.premium_expires_at = datetime.now() + timedelta(days=30)
db.commit()

# Downgrade to Starter
user.subscription_plan = "starter"
user.is_premium = False
user.premium_expires_at = None
db.commit()
```

## Testing Checklist

- [ ] Run database migration
- [ ] Verify existing premium users are migrated to 'premium' plan
- [ ] Verify existing free users are migrated to 'starter' plan
- [ ] Test feature access methods
- [ ] Test frontend authentication context
- [ ] Test API responses include `subscription_plan`
- [ ] Test upgrade/downgrade flows
- [ ] Test backward compatibility with `is_premium`

## Rollback Plan

If issues arise:

```bash
# Rollback database
cd backend
alembic downgrade -1

# Or manually:
ALTER TABLE users DROP COLUMN subscription_plan;
```

The `is_premium` field is preserved, so existing code will continue working.

## Future Improvements

1. **Remove `is_premium` field** (Phase 2 - after all code is updated):
   ```sql
   ALTER TABLE users DROP COLUMN is_premium;
   ```

2. **Add subscription history table**:
   ```sql
   CREATE TABLE subscription_history (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES users(id),
     from_plan VARCHAR(20),
     to_plan VARCHAR(20),
     changed_at TIMESTAMP,
     reason VARCHAR(100)
   );
   ```

3. **Add payment integration**:
   - Stripe subscription IDs
   - Payment method on file
   - Billing history

## Plan Limits Reference

### Starter (Free)
- 25 job applications
- 10 AI cover letters/month
- 7 AI resume analyses/month
- Basic features (kanban, calendar, reminders, etc.)

### Pro
- Unlimited applications
- Unlimited AI
- Advanced analytics
- Interview prep
- Company insights
- Skills gap analysis
- Priority support

### Premium
- Everything in Pro
- AI Smart Agent (job finder)
- Resume generation from scratch
- Auto-optimize resumes
- One-click auto-fill
- Email tracking & categorization

## Questions?

Contact: Your backend team or check Slack #backend channel
