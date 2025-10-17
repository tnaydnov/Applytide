# Analytics Service Refactoring Plan

## Current State Analysis

**File:** `backend/app/domain/admin/analytics_service.py`
**Size:** 905 lines (note: contains duplicate methods)
**Class:** `AnalyticsService`
**Pattern:** Monolithic service with mixed analytics concerns

### Identified Methods

1. **`get_cohort_retention(months_back=12)`** - Line 35 (async)
   - Calculates cohort retention analysis by signup month
   - Returns: `CohortAnalysisResponseDTO`
   - Complexity: ~90 lines

2. **`predict_churn(days_inactive_threshold=30)`** - Line 124 (sync) & Line 516 (async - duplicate)
   - Predicts users at risk of churning
   - Returns: `ChurnPredictionResponseDTO`
   - Complexity: ~110 lines

3. **`get_feature_adoption()`** - Line 234 (async) & Line 626 (async - duplicate)
   - Tracks adoption of key features
   - Returns: `FeatureAdoptionResponseDTO`
   - Complexity: ~100 lines

4. **`get_application_funnel(days=30)`** - Line 335 (async) & Line 727 (async - duplicate)
   - Analyzes conversion funnel for job applications
   - Returns: `ConversionFunnelResponseDTO`
   - Complexity: ~120 lines

5. **`get_application_velocity(days=30)`** - Line 453 (async) & Line 845 (async - duplicate)
   - Tracks how fast applications move through pipeline
   - Returns: `ApplicationVelocityResponseDTO`
   - Complexity: ~65 lines

### Issues Identified

1. **Duplicate Methods**: Multiple methods appear twice (one sync, one async)
2. **God Object Pattern**: Single class handling all analytics concerns
3. **Mixed Concerns**: Cohort, churn, features, funnel, velocity all in one file
4. **Testing Difficulty**: Hard to test individual analytics features in isolation
5. **File Size**: 905 lines makes navigation and maintenance difficult

## Proposed Solution

### Module Structure

Break into **6 focused modules** by analytics domain:

```
backend/app/domain/admin/analytics/
├── __init__.py           (~150 lines) - Barrel export for AnalyticsService
├── cohort.py             (~120 lines) - Cohort retention analysis
├── churn.py              (~130 lines) - Churn prediction
├── features.py           (~120 lines) - Feature adoption tracking
├── funnel.py             (~140 lines) - Conversion funnel analysis
└── velocity.py           (~90 lines)  - Application velocity tracking
```

### Module Breakdown

#### 1. **cohort.py** - Cohort Retention Analysis
**Purpose:** Track user retention by signup cohort
**Class:** `CohortAnalytics`
**Methods:**
- `get_cohort_retention(months_back: int) -> CohortAnalysisResponseDTO`

**Logic:**
- Groups users by signup month
- Calculates retention at 1M, 2M, 3M, 6M, 12M intervals
- Returns cohort data with retention percentages

**Dependencies:**
- User model (last_login_at, created_at)
- Session (db)

---

#### 2. **churn.py** - Churn Prediction
**Purpose:** Predict users at risk of churning
**Class:** `ChurnAnalytics`
**Methods:**
- `predict_churn(days_inactive_threshold: int) -> ChurnPredictionResponseDTO`

**Logic:**
- Churn scoring algorithm (0-100):
  - Days inactive: 40 points max
  - Application activity: 30 points max
  - Recent apps: 20 points max
  - Premium status: 10 points max
- Categorizes: high risk (70+), medium risk (40-69)
- Returns top 50 users per category

**Dependencies:**
- User model (last_login_at, is_premium)
- Application model (count, last created_at)
- Session (db)

---

#### 3. **features.py** - Feature Adoption Tracking
**Purpose:** Track adoption rates of key features
**Class:** `FeatureAnalytics`
**Methods:**
- `get_feature_adoption() -> FeatureAdoptionResponseDTO`

**Logic:**
- Tracks feature usage:
  - Job applications (total + active in 30d)
  - Document uploads (total + recent)
  - Premium features (conversion rate)
  - Calendar integration (adoption rate)
- Calculates adoption percentages
- Identifies growth trends

**Dependencies:**
- User model (premium status, feature flags)
- Application, Resume models (usage counts)
- Session (db)

---

#### 4. **funnel.py** - Conversion Funnel Analysis
**Purpose:** Analyze conversion funnel for applications
**Class:** `FunnelAnalytics`
**Methods:**
- `get_application_funnel(days: int) -> ConversionFunnelResponseDTO`

**Logic:**
- Funnel steps:
  1. Applied
  2. Interviewing
  3. Offer
  4. Accepted
- Calculates:
  - Count per step
  - Conversion rates between steps
  - Drop-off rates
  - Overall funnel efficiency

**Dependencies:**
- Application model (status, created_at)
- Session (db)

---

#### 5. **velocity.py** - Application Velocity Tracking
**Purpose:** Track application processing speed
**Class:** `VelocityAnalytics`
**Methods:**
- `get_application_velocity(days: int) -> ApplicationVelocityResponseDTO`

**Logic:**
- Daily metrics:
  - Total applications
  - Conversion to interview rate
  - Conversion to offer rate
- Aggregate metrics:
  - Overall interview rate
  - Overall offer rate
- Time tracking (avg time to interview/offer)

**Dependencies:**
- Application model (status, created_at)
- Session (db)

---

#### 6. **__init__.py** - Barrel Export
**Purpose:** Maintain backward compatibility
**Class:** `AnalyticsService`
**Pattern:** Composition - delegate to specialized modules

**Structure:**
```python
class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.cohort = CohortAnalytics(db)
        self.churn = ChurnAnalytics(db)
        self.features = FeatureAnalytics(db)
        self.funnel = FunnelAnalytics(db)
        self.velocity = VelocityAnalytics(db)
    
    # Delegate methods
    async def get_cohort_retention(self, months_back: int = 12):
        return await self.cohort.get_cohort_retention(months_back)
    
    async def predict_churn(self, days_inactive_threshold: int = 30):
        return await self.churn.predict_churn(days_inactive_threshold)
    
    # ... etc
```

## Benefits

### 1. **Separation of Concerns** ✅
- Each module handles ONE analytics domain
- Clear boundaries between cohort, churn, features, funnel, velocity
- Easier to reason about each analytics type

### 2. **Improved Testability** ✅
- Test cohort analysis independently of churn prediction
- Mock only required dependencies per module
- Faster, more focused unit tests

### 3. **Better Maintainability** ✅
- Smaller files (~90-140 lines vs 905)
- Easier navigation and understanding
- Clear ownership of analytics logic

### 4. **Scalability** ✅
- Easy to add new analytics modules (e.g., engagement.py, revenue.py)
- Each module can evolve independently
- No risk of monolithic file growth

### 5. **Zero Breaking Changes** ✅
- Import still works: `from ...domain.admin.analytics_service import AnalyticsService`
- All public methods preserved via delegation
- Backward compatible API

## Migration Strategy

### Phase 1: Setup
1. Create `backend/app/domain/admin/analytics/` directory
2. Create plan document (this file)

### Phase 2: Extract Modules (順序)
1. **cohort.py** - Simplest, clear boundaries
2. **churn.py** - Self-contained scoring logic
3. **features.py** - Multiple feature tracking
4. **funnel.py** - Multi-step analysis
5. **velocity.py** - Simplest metrics

### Phase 3: Integration
1. Create `__init__.py` with composition pattern
2. Verify all methods accessible via `AnalyticsService`

### Phase 4: Finalization
1. Backup original: `analytics_service.py` → `analytics_service.py.backup`
2. Test imports in routers
3. Verify no errors

## Testing Checklist

### Unit Tests (Per Module)
- [ ] `cohort.py` - Retention calculations correct
- [ ] `churn.py` - Churn scoring algorithm accurate
- [ ] `features.py` - Feature adoption percentages correct
- [ ] `funnel.py` - Conversion rates calculated properly
- [ ] `velocity.py` - Application velocity metrics accurate

### Integration Tests
- [ ] `AnalyticsService.__init__` - All modules initialized
- [ ] All delegated methods work correctly
- [ ] No import errors in router files

### Backward Compatibility
- [ ] Import statement works: `from ...domain.admin.analytics_service import AnalyticsService`
- [ ] All 5 public methods accessible
- [ ] Return types unchanged

## Success Criteria

1. ✅ 905-line file split into 6 modules (~90-150 lines each)
2. ✅ Zero breaking changes to public API
3. ✅ No errors in admin router or main.py
4. ✅ All analytics methods accessible via delegation
5. ✅ Clear separation of analytics concerns
6. ✅ Improved testability and maintainability

## Notes

- **Async/Sync Duplicates**: Use async versions only (modern FastAPI best practice)
- **DTOs Preserved**: All analytics_dto imports remain unchanged
- **Database Session**: Passed to each module constructor
- **Error Handling**: Preserve existing try/except patterns per module
