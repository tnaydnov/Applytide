# Applications Router Refactoring Plan

## 📊 Current State

**File:** `backend/app/api/routers/applications.py`  
**Size:** 541 lines  
**Endpoints:** 20 total

## 🎯 Refactoring Strategy

Split into **6 focused modules** organized by resource/concern:

### Module Breakdown

1. **crud.py** (~120 lines) - Core Application CRUD
   - POST / - create_application
   - GET / - list_applications (with pagination)
   - GET /{app_id} - get_application
   - PATCH /{app_id} - update_application
   - DELETE /{app_id} - delete_application

2. **queries.py** (~80 lines) - Query/Read-Only Endpoints
   - GET /statuses - get_used_statuses
   - GET /cards - list_cards
   - GET /with-stages - list_applications_with_stages
   - GET /{app_id}/detail - get_detail

3. **stages.py** (~80 lines) - Stage Management
   - POST /{app_id}/stages - add_stage
   - GET /{app_id}/stages - list_stages
   - PATCH /{app_id}/stages/{stage_id} - update_stage_partial
   - DELETE /{app_id}/stages/{stage_id} - delete_stage

4. **notes.py** (~60 lines) - Note Management
   - POST /{app_id}/notes - add_note
   - GET /{app_id}/notes - list_notes

5. **attachments.py** (~120 lines) - Attachment Management
   - POST /{app_id}/attachments/from-document - attach_from_document
   - POST /{app_id}/attachments - upload_attachment
   - GET /{app_id}/attachments - list_attachments
   - GET /{app_id}/attachments/{attachment_id}/download - download_attachment
   - DELETE /{app_id}/attachments/{attachment_id} - delete_attachment

6. **utils.py** (~40 lines) - Shared Utilities
   - _paginate() helper
   - WebSocket broadcast wrapper
   - Shared imports/dependencies

7. **__init__.py** (~60 lines) - Barrel Export
   - Combine all sub-routers
   - Single APIRouter export
   - Maintain backward compatibility

## 📐 Module Structure

```
backend/app/api/routers/
├── applications.py.backup (541 lines) - Original file
└── applications/
    ├── __init__.py        - Barrel export (main router)
    ├── utils.py          - Shared utilities (_paginate, broadcast)
    ├── crud.py           - Core CRUD operations
    ├── queries.py        - Query/read-only endpoints
    ├── stages.py         - Stage management endpoints
    ├── notes.py          - Note management endpoints
    └── attachments.py    - Attachment management endpoints
```

## 🔄 Refactoring Steps

1. ✅ Analyze file structure and endpoints
2. ⏳ Create directory: `backend/app/api/routers/applications/`
3. ⏳ Create `utils.py` - Extract _paginate, broadcast helpers
4. ⏳ Create `crud.py` - Core CRUD endpoints (5 endpoints)
5. ⏳ Create `queries.py` - Query endpoints (4 endpoints)
6. ⏳ Create `stages.py` - Stage endpoints (4 endpoints)
7. ⏳ Create `notes.py` - Note endpoints (2 endpoints)
8. ⏳ Create `attachments.py` - Attachment endpoints (5 endpoints)
9. ⏳ Create `__init__.py` - Combine all routers
10. ⏳ Backup original file
11. ⏳ Validate imports

## 🎯 Goals

- ✅ Single Responsibility: Each module handles one resource type
- ✅ Clear Boundaries: Endpoints grouped by resource
- ✅ Maintainability: ~60-120 lines per module
- ✅ Testability: Test each resource separately
- ✅ Backward Compatibility: Same import path, same router

## 📝 Key Considerations

1. **Shared Dependencies**
   - All modules need: APIRouter, Depends, HTTPException
   - All modules need: ApplicationService, get_current_user
   - All modules need: logger, event_logger

2. **WebSocket Broadcasting**
   - Extract broadcast helper to utils
   - Used in: update, delete, stages, notes, attachments

3. **Pagination**
   - Extract _paginate to utils
   - Used in: list_applications

4. **Error Handling**
   - Consistent try-except patterns
   - Logging for all operations

## ✅ Success Criteria

- ✅ All 20 endpoints preserved
- ✅ Import path unchanged: `from ...api.routers.applications import router`
- ✅ No breaking changes to API
- ✅ All WebSocket broadcasts working
- ✅ All logging preserved
- ✅ Syntax validation passes

---

**Status:** Ready to execute  
**Estimated Time:** 20-30 minutes  
**Risk Level:** Low (router refactoring, proven pattern)
