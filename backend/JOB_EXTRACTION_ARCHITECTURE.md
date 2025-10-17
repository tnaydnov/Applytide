# Job Extraction Service - Architecture Overview

## 📦 Module Structure

```
backend/app/domain/jobs/extraction/
├── service.py.backup (617 lines) - Original file preserved
└── service/
    ├── __init__.py          [150 lines] - Barrel export, backward compatibility
    ├── utils.py             [180 lines] - Pure utility functions
    ├── requirements.py      [140 lines] - Regex-based requirement splitting
    ├── jsonld.py           [230 lines] - JSON-LD structured data extraction
    ├── dom.py              [200 lines] - DOM extraction coordination
    ├── llm.py              [170 lines] - LLM extraction and result merging
    └── orchestrator.py     [450 lines] - Main extraction coordination
```

## 🔄 Extraction Flow Diagram

### Manual Text Path (LLM-First)

```
User Pastes Text
      ↓
ExtractionOrchestrator.extract_job()
      ↓
_extract_via_manual_text()
      ↓
┌─────────────────────────────────────────────────────┐
│ 1. ExtractionUtils.clean_text()                     │
│ 2. JSONLDExtractor.hints_from_raw_paste()           │
│    - Extract company · location (Remote)            │
│    - Extract "Save Job Title at Company"            │
│    - Detect Full-time/Part-time/Contract            │
│ 3. ExtractionUtils.preclean_noise()                 │
│    - Remove LinkedIn/ATS UI chrome                  │
│ 4. LLMExtractionHandler.extract_from_text()         │
│    - LLM extracts all fields                        │
│ 5. RequirementSplitter.split()                      │
│    - Backstop regex split                           │
│    - Deduplicate against LLM requirements           │
│ 6. Merge results (LLM + hints + regex)              │
└─────────────────────────────────────────────────────┘
      ↓
Final Job Dictionary
```

### HTML Path (Multi-Source)

```
User Captures Page
      ↓
ExtractionOrchestrator.extract_job()
      ↓
_extract_via_html()
      ↓
┌─────────────────────────────────────────────────────┐
│ Phase 0: DOM Hints                                   │
│   DOMExtractionHandler.extract_title_company()      │
│   → TitleCompanyExtractor (port)                    │
│                                                      │
│ Phase 1: Structured Data                            │
│   _extract_structured_data()                        │
│   ├── JSONLDExtractor.find_job_from_jsonld()        │
│   │   └── JSONLDExtractor.map_job_jsonld()          │
│   └── Fallback: StructuredDataExtractor (port)     │
│                                                      │
│ Phase 2: Main Content                               │
│   DOMExtractionHandler.extract_main_content()       │
│   ├── Readability (if available)                    │
│   └── MainContentExtractor (port)                  │
│   Fallback: DOMExtractionHandler.extract_from_xhr_logs() │
│                                                      │
│ Phase 3: Fallback Extraction                        │
│   ExtractionUtils.extract_location_freeform()       │
│   ExtractionUtils.extract_remote_type()             │
│                                                      │
│ Phase 4: Build LLM Hints                            │
│   Merge: DOM + Structured + Fallbacks               │
│                                                      │
│ Phase 5: LLM Enhancement (Optional)                 │
│   LLMExtractionHandler.enhance_extraction()         │
│   _extract_with_llm()                               │
│                                                      │
│ Phase 6-7: Description Processing                   │
│   _process_description_and_requirements()           │
│   ├── If LLM succeeded: Use LLM description         │
│   └── Else: RequirementSplitter.split() fallback   │
│                                                      │
│ Phase 8: Merge All Sources                          │
│   _merge_all_sources()                              │
│   Priority: LLM > JSON-LD > DOM > Readability > Fallbacks │
└─────────────────────────────────────────────────────┘
      ↓
ExtractionUtils.validate_job_content()
      ↓
Final Job Dictionary
```

## 🎯 Module Dependencies

```
JobExtractionService (__init__.py)
├── Depends on: All modules below
│
├── ExtractionOrchestrator (orchestrator.py)
│   ├── Depends on: utils, jsonld, requirements, llm, dom
│   └── Coordinates: Manual text path vs HTML path
│
├── LLMExtractionHandler (llm.py)
│   ├── Depends on: utils, LLMExtractor (port)
│   └── Methods: extract_from_text, enhance_extraction, merge_results
│
├── DOMExtractionHandler (dom.py)
│   ├── Depends on: utils, MainContentExtractor, TitleCompanyExtractor, StructuredDataExtractor (ports)
│   └── Methods: extract_title_company, extract_main_content, extract_from_xhr_logs
│
├── JSONLDExtractor (jsonld.py)
│   ├── Depends on: utils
│   └── Methods: iter_jsonld_items, hints_from_raw_paste, find_job_from_jsonld, map_job_jsonld
│
├── RequirementSplitter (requirements.py)
│   ├── Depends on: ExtractionUtils (for final cleaning)
│   └── Methods: split (regex-based requirement extraction)
│
└── ExtractionUtils (utils.py)
    ├── Depends on: None (pure functions)
    └── Methods: validate_job_content, clean_text, extract_remote_type, extract_location_freeform, preclean_noise
```

## 🔌 External Ports (Dependency Injection)

```
Ports (interfaces defined in ../ports.py):
├── MainContentExtractor - Extract main content from HTML
├── TitleCompanyExtractor - Extract job title and company name
├── StructuredDataExtractor - Extract structured data (fallback)
├── LLMExtractor (Optional) - LLM-based extraction
└── RequirementStripper (Optional) - Requirement splitting interface
```

## 📊 Result Priority Order

When merging results from multiple sources:

```
Field Priority:
├── title:         LLM > JSON-LD > DOM > Readability
├── company_name:  LLM > JSON-LD > DOM > Readability
├── location:      LLM > JSON-LD > Regex fallback
├── remote_type:   LLM > Regex fallback
├── job_type:      LLM > JSON-LD
├── description:   LLM (if succeeded) > Regex split main text
├── requirements:  LLM + Regex (merged & deduplicated)
└── skills:        LLM
```

## 🎨 Design Patterns Used

1. **Orchestrator Pattern**
   - `ExtractionOrchestrator` coordinates all extraction strategies
   - Routes between manual text path and HTML path
   - Manages fallback strategies

2. **Strategy Pattern**
   - Multiple extraction strategies: JSON-LD, DOM, LLM, Regex
   - Fallback chain: Primary → Secondary → Tertiary

3. **Composition/Delegation**
   - `JobExtractionService` delegates to specialized modules
   - No inheritance, clean module boundaries

4. **Dependency Injection**
   - External extractors injected via ports
   - Testability and flexibility

5. **Barrel Export**
   - `__init__.py` provides public API
   - Internal modules hidden from external consumers
   - 100% backward compatibility

## 🧪 Testing Strategy

```
Unit Tests (per module):
├── utils.py - Test pure functions independently
├── requirements.py - Test regex patterns and splitting logic
├── jsonld.py - Test JSON-LD parsing and mapping
├── dom.py - Test DOM coordination (mock ports)
├── llm.py - Test LLM interaction (mock LLM port)
└── orchestrator.py - Test coordination (mock all dependencies)

Integration Tests:
└── JobExtractionService - Test full extraction flow (mock external ports)
```

## 🔍 Key Improvements Over Original

1. **Single Responsibility**: Each module has one clear purpose
2. **Testability**: Pure functions and clear dependencies enable easy testing
3. **Maintainability**: Locate and modify specific logic in focused files
4. **Readability**: ~200 lines per module vs 617-line monolith
5. **Extensibility**: Add new extraction strategies without touching existing code
6. **Debuggability**: Phase-based logging makes troubleshooting easier

---

**Refactoring Complete:** December 2024 ✅
