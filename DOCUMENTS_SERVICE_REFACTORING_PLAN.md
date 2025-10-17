# Documents Service Refactoring Plan

## Current State
- **File**: `backend/app/domain/documents/service.py`
- **Lines**: 1,173 lines
- **Methods**: 31 methods
- **Issues**: 
  - Mixed concerns (CRUD, AI analysis, generation, caching)
  - God object pattern
  - Difficult to test individual features
  - High complexity in single class

## Proposed Module Structure

### 1. **crud.py** (~250 lines)
**Purpose**: Basic document CRUD operations
- `upload_document()` - Upload and store document
- `get_document()` - Retrieve single document
- `list_documents()` - List with filtering/pagination
- `delete_document()` - Remove document
- `update_status()` - Change document status
- `resolve_document_response()` - Build DocumentResponse

**Dependencies**: DocumentStore, TextExtractor, models, schemas

### 2. **analysis.py** (~400 lines)
**Purpose**: AI-powered document analysis
- `analyze_document_ats()` - Main ATS analysis entry point
- `_analyze_against_job()` - Job-specific analysis
- `_perform_general_resume_analysis()` - General resume analysis
- `_llm_analyze_job_first()` - LLM analysis with job context
- `_llm_analyze_general_first()` - LLM general analysis
- `_extract_keywords_from_job()` - Extract keywords from job posting
- `_log_analysis_data()` - Debug logging for analysis

**Dependencies**: OpenAI, models, schemas, caching utilities

### 3. **generation.py** (~200 lines)
**Purpose**: Document generation and optimization
- `optimize_document()` - Optimize resume for job
- `_generate_template_cover_letter()` - Generate cover letter
- `_cover_letter_text()` - Cover letter content generation
- `get_document_templates()` - Retrieve templates
- `_generate_html_via_openai()` - HTML generation

**Dependencies**: AICoverLetterService, OpenAI, models, schemas

### 4. **preview.py** (~150 lines)
**Purpose**: Document preview and download
- `get_preview_payload()` - Generate preview data
- `resolve_download()` - Prepare document for download

**Dependencies**: DocumentStore, models

### 5. **cache.py** (~100 lines)
**Purpose**: Analysis caching utilities
- `_compute_cache_key()` - Generate cache key
- `_read_analysis_cache()` - Read from sidecar cache
- `_write_analysis_cache()` - Write to sidecar cache

**Dependencies**: DocumentStore, pathlib

### 6. **utils.py** (~80 lines)
**Purpose**: Shared utilities and helpers
- `_sidecar()` - Read sidecar data
- `_write_sidecar()` - Write sidecar data
- `_clamp_pct()` - Clamp percentage values
- `_coerce_list()` - Coerce to list
- `_normalize_ai_detailed_analysis()` - Normalize AI response
- `_normalize_tokens()` - Tokenization helper
- `_llm_call()` - Generic LLM call wrapper

**Dependencies**: DocumentStore, OpenAI

## Implementation Strategy

### Phase 1: Setup & Utilities
1. Create directory: `backend/app/domain/documents/service/`
2. Create `utils.py` with shared helpers
3. Create `cache.py` for caching logic

### Phase 2: Core Features
4. Create `crud.py` with CRUD operations
5. Create `preview.py` for preview/download
6. Create `analysis.py` for AI analysis
7. Create `generation.py` for document generation

### Phase 3: Integration
8. Create `__init__.py` barrel export that:
   - Combines all functionality
   - Exports `DocumentService` class
   - Maintains backward compatibility
9. Backup original: `service.py` → `service.py.backup`

## Backward Compatibility

### Current Import Pattern
```python
from ...domain.documents.service import DocumentService
```

### After Refactoring
```python
from ...domain.documents.service import DocumentService  # Still works!
```

The `__init__.py` will export a `DocumentService` class that delegates to the specialized modules.

## Dependencies Map

```
DocumentService (main class in __init__.py)
├── CRUDOperations (crud.py)
│   ├── DocumentStore
│   └── TextExtractor
├── AnalysisOperations (analysis.py)
│   ├── OpenAI LLM
│   ├── CacheOperations
│   └── AnalysisUtils
├── GenerationOperations (generation.py)
│   ├── AICoverLetterService
│   └── OpenAI LLM
├── PreviewOperations (preview.py)
│   └── DocumentStore
├── CacheOperations (cache.py)
│   └── DocumentStore
└── SharedUtils (utils.py)
    ├── DocumentStore
    └── OpenAI LLM
```

## Method Distribution

### crud.py (6 methods)
- upload_document
- resolve_document_response
- list_documents
- get_document
- delete_document
- update_status

### preview.py (2 methods)
- resolve_download
- get_preview_payload

### cache.py (3 methods)
- _compute_cache_key
- _read_analysis_cache
- _write_analysis_cache

### utils.py (7 methods)
- _sidecar
- _write_sidecar
- _clamp_pct
- _coerce_list
- _normalize_ai_detailed_analysis
- _normalize_tokens
- _llm_call

### analysis.py (7 methods)
- analyze_document_ats
- _analyze_against_job
- _perform_general_resume_analysis
- _llm_analyze_job_first
- _llm_analyze_general_first
- _extract_keywords_from_job
- _log_analysis_data

### generation.py (5 methods)
- optimize_document
- _generate_template_cover_letter
- _cover_letter_text
- get_document_templates
- _generate_html_via_openai

**Total**: 31 methods organized across 6 modules

## Benefits

1. **Separation of Concerns**: Each module has clear, single responsibility
2. **Testability**: Can test CRUD without AI dependencies
3. **Maintainability**: Easier to locate and fix bugs
4. **Scalability**: Can add new features without bloating single file
5. **Code Navigation**: Much easier to find specific functionality

## Testing Checklist

### CRUD Operations
- [ ] Upload document (PDF, DOCX, TXT)
- [ ] List documents with filters
- [ ] Get single document
- [ ] Delete document
- [ ] Update document status

### Analysis Features
- [ ] General resume analysis (no job)
- [ ] Job-specific analysis
- [ ] ATS scoring
- [ ] Cache hit/miss scenarios

### Generation Features
- [ ] Optimize resume for job
- [ ] Generate cover letter
- [ ] Get document templates

### Preview/Download
- [ ] Generate preview
- [ ] Download document

## Success Criteria

- ✅ All 31 methods properly extracted
- ✅ Zero breaking changes to existing imports
- ✅ Each module < 400 lines
- ✅ Clear separation of concerns
- ✅ Comprehensive documentation
- ✅ Original file backed up

---

**Status**: Ready to implement
**Estimated Modules**: 7 files (6 modules + 1 barrel export)
**Estimated Total Lines**: ~1,180 lines (similar total, better organized)
