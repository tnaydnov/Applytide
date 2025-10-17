# Job Extraction Service Refactoring Plan

## Current State Analysis

**File:** `backend/app/domain/jobs/extraction/service.py`
**Size:** 617 lines (678 lines total file)
**Class:** `JobExtractionService` + `_DefaultRequirementStripper`
**Pattern:** Monolithic service orchestrating multiple extraction strategies

### Identified Methods & Responsibilities

#### Utility Methods (Static)
1. **`_validate_job_content(job, context)`** - Line 36
   - Validates extracted job has meaningful content
   - Checks title, company, description length
   - ~15 lines

2. **`_clean_text(s)`** - Line 51
   - Text normalization (nbsp, whitespace, newlines)
   - ~8 lines

3. **`_extract_remote_type(text, *candidates)`** - Line 59
   - Detects remote/hybrid/on-site from text
   - ~8 lines

4. **`_extract_location_freeform(text)`** - Line 67
   - Extracts location from text using regex patterns
   - ~20 lines

5. **`_preclean_noise(text)`** - Line 87
   - Removes UI chrome from LinkedIn/ATS pages
   - ~50 lines

#### JSON-LD Methods
6. **`_iter_jsonld_items(arr)`** - Line 140
   - Flattens nested JSON-LD structures
   - ~13 lines

7. **`_hints_from_raw_paste(raw)`** - Line 153
   - Extracts hints from raw pasted text
   - ~42 lines

8. **`_is_type(obj, name)`** - Line 195
   - Checks JSON-LD type
   - ~7 lines

9. **`_find_job_from_jsonld(arr)`** - Line 202
   - Finds JobPosting in JSON-LD array
   - ~6 lines

10. **`_map_job_jsonld(obj, url)`** - Line 208
    - Maps JSON-LD JobPosting to internal format
    - ~59 lines

#### Main Extraction Method
11. **`extract_job(...)`** - Line 267
    - Main orchestrator method
    - Handles multiple extraction strategies
    - ~365 lines (most complex)
    - Sub-paths:
      - Manual text extraction (LLM-based)
      - HTML processing path:
        - DOM extraction
        - JSON-LD structured data
        - Readability content
        - XHR logs fallback
        - Meta tags
        - LLM enhancement
        - Requirement splitting

#### Requirement Splitting
12. **`_DefaultRequirementStripper.split(description, existing_reqs)`** - Line 633
    - Splits description into clean description + requirements
    - Regex-based bullet point extraction
    - ~45 lines

### Issues Identified

1. **God Object Pattern**: Single 617-line file handling all extraction concerns
2. **Complex Orchestration**: `extract_job()` is 365 lines with nested logic
3. **Mixed Concerns**: Text cleaning, JSON-LD parsing, DOM extraction, LLM calls all in one place
4. **Testing Difficulty**: Hard to test individual extraction strategies
5. **Strategy Pattern Missing**: Multiple extraction paths (manual/HTML/JSON-LD) not cleanly separated

## Proposed Solution

### Module Structure

Break into **6 focused modules** by extraction concern:

```
backend/app/domain/jobs/extraction/service/
├── __init__.py           (~150 lines) - Barrel export for JobExtractionService
├── utils.py              (~120 lines) - Text cleaning, validation, location/remote extraction
├── jsonld.py             (~130 lines) - JSON-LD structured data extraction
├── dom.py                (~100 lines) - DOM-based extraction (title/company, main content)
├── llm.py                (~180 lines) - LLM-based extraction and enhancement
├── requirements.py       (~80 lines)  - Requirement splitting logic
└── orchestrator.py       (~200 lines) - Main extraction orchestration logic
```

### Module Breakdown

#### 1. **utils.py** - Text Processing Utilities
**Purpose:** Shared text cleaning and extraction utilities
**Class:** `ExtractionUtils`
**Methods:**
- `validate_job_content(job: Dict, context: str) -> None` - Validate extraction
- `clean_text(s: str) -> str` - Normalize text
- `extract_remote_type(text: str, *candidates: str) -> str` - Detect remote type
- `extract_location_freeform(text: str) -> str` - Extract location
- `preclean_noise(text: str) -> str` - Remove UI chrome

**Logic:**
- Static utility functions for text processing
- No external dependencies
- Pure functions for easy testing

---

#### 2. **jsonld.py** - JSON-LD Structured Data Extraction
**Purpose:** Extract and map JSON-LD JobPosting data
**Class:** `JSONLDExtractor`
**Methods:**
- `iter_jsonld_items(arr: List[Dict]) -> Generator` - Flatten nested structures
- `hints_from_raw_paste(raw: str) -> Dict[str, str]` - Extract hints from paste
- `is_type(obj: Dict, name: str) -> bool` - Check JSON-LD type
- `find_job_from_jsonld(arr: List[Dict]) -> Optional[Dict]` - Find JobPosting
- `map_job_jsonld(obj: Dict, url: str) -> Dict[str, Any]` - Map to internal format

**Logic:**
- Walks JSON-LD graph structures
- Extracts title, company, location, remote_type, job_type, description
- Maps hiringOrganization, jobLocation, employmentType fields

---

#### 3. **dom.py** - DOM-Based Extraction
**Purpose:** Extract job data from HTML DOM
**Class:** `DOMExtractor`
**Dependencies:** `TitleCompanyExtractor`, `MainContentExtractor`
**Methods:**
- `extract_title_company(html: str) -> Dict[str, str]` - Get title/company from DOM
- `extract_main_content(html: str, readable: Optional[Dict]) -> str` - Get main text
- `extract_from_xhr_logs(xhr_logs: List[Dict]) -> str` - Fallback to XHR logs
- `extract_from_metas(metas: Dict) -> Dict[str, str]` - Get metadata

**Logic:**
- Uses injected port implementations (title_company, main_content)
- Handles Readability content priority
- Fallback to XHR logs if main text empty
- Meta tag extraction

---

#### 4. **llm.py** - LLM-Based Extraction
**Purpose:** LLM-powered extraction and enhancement
**Class:** `LLMExtractor`
**Dependencies:** `LLMExtractor` port
**Methods:**
- `extract_from_manual_text(url: str, text: str, hints: Dict) -> Dict` - Full LLM extraction
- `enhance_extraction(url: str, text: str, partial: Dict, hints: Dict) -> Dict` - Enhance partial data
- `merge_results(llm_result: Dict, base: Dict, hints: Dict) -> Dict` - Merge strategies

**Logic:**
- Calls LLM port for extraction
- Handles manual text path
- Enhances partial extractions
- Merges multiple data sources intelligently

---

#### 5. **requirements.py** - Requirement Splitting
**Purpose:** Split description into description + requirements
**Class:** `RequirementSplitter`
**Methods:**
- `split(description: str, existing_reqs: Optional[List[str]]) -> Tuple[str, List[str]]` - Main split logic
- `extract_bullets(text: str) -> List[str]` - Extract bullet points
- `deduplicate_requirements(reqs: List[str]) -> List[str]` - Remove duplicates
- `remove_requirements_from_description(desc: str, reqs: List[str]) -> str` - Clean description

**Logic:**
- Regex-based bullet point detection
- Multiple bullet patterns (•, -, *, numbered)
- Deduplication against existing requirements
- Description cleaning

---

#### 6. **orchestrator.py** - Extraction Orchestration
**Purpose:** Main extraction logic coordinating all strategies
**Class:** `ExtractionOrchestrator`
**Dependencies:** All other modules
**Methods:**
- `extract_job(...) -> Dict[str, Any]` - Main entry point
- `_extract_via_manual_text(...) -> Dict` - Manual text path
- `_extract_via_html(...) -> Dict` - HTML processing path
- `_merge_all_sources(...) -> Dict` - Merge all extraction sources

**Logic:**
- Routes to manual text vs HTML path
- Coordinates:
  1. Manual text → LLM extraction
  2. HTML path:
     - DOM extraction (title/company)
     - JSON-LD structured data
     - Main content extraction
     - XHR logs fallback
     - Meta tags
     - LLM enhancement (if available)
     - Requirement splitting
  3. Merge all sources with priority
  4. Validate final result

---

#### 7. **__init__.py** - Barrel Export
**Purpose:** Maintain backward compatibility
**Class:** `JobExtractionService`
**Pattern:** Composition - delegate to specialized modules

**Structure:**
```python
class JobExtractionService:
    def __init__(
        self,
        *,
        main_content: MainContentExtractor,
        structured: StructuredDataExtractor,
        title_company: TitleCompanyExtractor,
        llm: Optional[LLMExtractor] = None,
        req_splitter: Optional[RequirementStripper] = None,
    ):
        self.utils = ExtractionUtils()
        self.jsonld = JSONLDExtractor(self.utils)
        self.dom = DOMExtractor(title_company, main_content, self.utils)
        self.llm_extractor = LLMExtractionModule(llm, self.utils) if llm else None
        self.requirements = RequirementSplitter()
        self.orchestrator = ExtractionOrchestrator(
            utils=self.utils,
            jsonld=self.jsonld,
            dom=self.dom,
            llm=self.llm_extractor,
            requirements=self.requirements,
            structured=structured,
        )
    
    def extract_job(self, **kwargs) -> Dict[str, Any]:
        return self.orchestrator.extract_job(**kwargs)
```

## Benefits

### 1. **Separation of Concerns** ✅
- Each module handles ONE extraction strategy
- Clear boundaries: utils ≠ JSON-LD ≠ DOM ≠ LLM
- Orchestrator coordinates without implementation details

### 2. **Improved Testability** ✅
- Test JSON-LD extraction independently
- Mock LLM for DOM extraction tests
- Test requirement splitting in isolation
- Orchestrator can be tested with mocked modules

### 3. **Better Maintainability** ✅
- Smaller files (~80-200 lines vs 617)
- Easy to understand each extraction strategy
- Clear flow: orchestrator → strategy modules

### 4. **Strategy Pattern** ✅
- Manual text strategy (LLM-first)
- HTML strategy (multi-source)
- Easy to add new strategies (e.g., API-based)

### 5. **Zero Breaking Changes** ✅
- Import still works: `from ...domain.jobs.extraction.service import JobExtractionService`
- Same constructor signature
- Same `extract_job()` method signature

## Migration Strategy

### Phase 1: Setup
1. Create `backend/app/domain/jobs/extraction/service/` directory
2. Create plan document (this file)

### Phase 2: Extract Modules (順序)
1. **utils.py** - Simplest, no dependencies
2. **requirements.py** - Self-contained logic
3. **jsonld.py** - Depends on utils
4. **dom.py** - Depends on ports, utils
5. **llm.py** - Depends on LLM port, utils
6. **orchestrator.py** - Depends on all modules

### Phase 3: Integration
1. Create `__init__.py` with composition pattern
2. Verify `extract_job()` method accessible

### Phase 4: Finalization
1. Backup original: `service.py` → `service.py.backup`
2. Test imports in routers
3. Verify no errors

## Testing Checklist

### Unit Tests (Per Module)
- [ ] `utils.py` - Text cleaning, validation, location extraction
- [ ] `requirements.py` - Bullet extraction, deduplication
- [ ] `jsonld.py` - JSON-LD parsing, mapping
- [ ] `dom.py` - HTML extraction
- [ ] `llm.py` - LLM extraction (mocked)
- [ ] `orchestrator.py` - Coordination logic

### Integration Tests
- [ ] `JobExtractionService.__init__` - All modules initialized
- [ ] `extract_job()` delegates correctly
- [ ] Manual text path works end-to-end
- [ ] HTML path works end-to-end
- [ ] Merged results correct

### Backward Compatibility
- [ ] Import statement works
- [ ] Constructor signature unchanged
- [ ] `extract_job()` method signature unchanged
- [ ] Return format unchanged

## Success Criteria

1. ✅ 617-line file split into 6-7 modules (~80-200 lines each)
2. ✅ Zero breaking changes to public API
3. ✅ No errors in router files
4. ✅ `extract_job()` method works identically
5. ✅ Clear extraction strategy separation
6. ✅ Improved testability

## Notes

- **Port Pattern Preserved**: `MainContentExtractor`, `TitleCompanyExtractor`, `StructuredDataExtractor`, `LLMExtractor` ports unchanged
- **Orchestrator Pattern**: Central coordination without implementation details
- **Defensive Programming**: Preserve try/except patterns per module
- **Logging Preserved**: Maintain detailed logging throughout
