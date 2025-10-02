# Complete Logging Implementation Guide

## Overview
Comprehensive logging has been added throughout the entire scraping flow to track failures and debug extraction issues.

## Logging Symbols Legend
- ✓ = Success
- ✗ = Error
- ⚠ = Warning
- === = Major section separator
- *** = Decision point separator
- ### = Component boundary (e.g., LLM extractor)
- --- = Phase separator

## Flow Coverage

### 1. Frontend (Chrome Extension)

#### popup.js
**Location**: `saveCurrentJob()` function
```
Logs Added:
- User click event tracking
- Message sent to background script
- Response received from background
- Success/failure result display with job details
```

#### background.js
**Location**: `APPLYTIDE_RUN_FLOW1` message handler
```
Logs Added:
- Flow start with 80-char header
- Tab query and URL detection
- Cache check (hit/miss with age and data summary)
- getRenderedCapture() timing and data collection
- Payload preparation (URL, HTML length, JSON-LD items)
- apiExtract() comprehensive request/response tracking
- API response validation and error handling
- Final result assembly
```

**Location**: `apiExtract()` function
```
Logs Added:
- API call initiation with URL
- Request payload size tracking
- Fetch timing measurement
- Response status validation
- Backend error details extraction
- Success/failure paths
```

### 2. Backend (Python)

#### service.py
**Location**: `extract_job()` main orchestrator
```
Logs Added:
- Input parameter logging (URL, hints, data sizes)
- Path detection (Manual text vs HTML)
```

**Manual Text Path**:
```
Logs Added:
- Decision marker: "TAKING MANUAL TEXT PATH"
- LLM service availability check
- LLM call parameters (URL, text length, hints)
- LLM execution timing
- LLM response fields (title, company, location, etc.)
- Final result assembly
- Success/error markers
```

**HTML Processing Path**:
```
Phase 0: Quick DOM hints
- Title/company extraction from DOM
- Success/failure for each field

Phase 1: Structured data extraction
- JSON-LD JobPosting search
- Server-side structured extraction fallback
- Mapped fields logging

Phase 2: Main content text extraction
- Readability vs main_content extractor decision
- Text length tracking
- Metadata extraction (title, siteName)

Phase 2.5: XHR fallback (if main text empty)
- XHR log entry checking
- JSON parsing attempts
- Job content detection
- Suitable content finding

Phase 3: Location and remote type
- Raw text length
- Location fallback extraction
- Remote type fallback extraction

Phase 4: LLM hints preparation
- All hint fields logged (title, company, location, remote_type, job_type)

Phase 5: LLM extraction (optional)
- LLM availability check
- Main text availability check
- LLM call timing
- LLM response fields
- Fallback on error

Phase 6: Description processing
- Raw description length
- Requirements/skills from LLM

Phase 7: Requirement splitting
- Splitter execution
- Additional requirements extracted
- Final description length

Phase 8: Final result assembly
- All final fields logged
- Validation check
- Success/warning markers
```

#### openai_llm.py
**Location**: `extract_job()` method
```
Logs Added:
- Component boundary markers (###)
- Input parameters (URL, text length, model, hints)
- Text validation (length check)
- Text preparation (line count)
- Message array building (message count, sizes)
- API call metadata (model, temperature, max_tokens)
- API response timing
- Response metadata (tokens, finish reason)
- Response content length
- JSON parsing status
- Extracted field values
- Post-processing steps
- Final result with all fields
- Error handling (JSON decode errors, API errors, rate limits)
```

## How to Use the Logs

### Frontend Console Logs
Open Chrome DevTools Console to see:
1. User action in popup
2. Message flow to background
3. Page capture process
4. API communication
5. Result display

### Backend Logs
Terminal/console will show:
1. Request receipt
2. Path decision (Manual vs HTML)
3. Step-by-step extraction phases
4. LLM interaction details
5. Final result assembly
6. Success/error outcomes

## Debugging Workflow

### When Extraction Fails:

1. **Check Frontend Console First**
   - Did the flow start? Look for "saveCurrentJob called"
   - Did capture succeed? Look for "✓ Capture successful"
   - Did API call succeed? Look for "API response received"

2. **Check Backend Logs**
   - Which path was taken? Look for "TAKING MANUAL TEXT PATH" or "TAKING HTML PROCESSING PATH"
   - Which phase failed? Look for "✗" markers
   - What data was passed? Look for length/preview logs

3. **Trace Through Phases**
   - HTML Path: Follow Phase 0 → 8
   - Manual Text Path: Follow LLM call directly
   - LLM: Check request construction → API call → response parsing

4. **Common Failure Points**
   - Phase 0-1: DOM/JSON-LD extraction (usually not critical)
   - Phase 2: Main content extraction (critical - check Readability/XHR)
   - Phase 5: LLM extraction (check API keys, quotas, prompts)
   - Phase 8: Validation (check for minimal content)

## Log Search Patterns

### PowerShell/CMD
```powershell
# Search for errors
Select-String -Pattern "✗" -Path backend.log

# Search for specific phase
Select-String -Pattern "PHASE 5" -Path backend.log

# Search for LLM calls
Select-String -Pattern "\[LLM\]" -Path backend.log
```

### Browser Console
```javascript
// Filter logs in Chrome DevTools
// Use filter: "FLOW" to see background flow
// Use filter: "API" to see API calls
// Use filter: "✗" to see errors
```

## Performance Tracking

Timing logs are included for:
- `getRenderedCapture()` execution
- API call round-trip time
- LLM extraction duration
- Total flow execution time

Look for patterns like:
```
Capture took: 2.34s
API call took: 1.23s
LLM extraction completed in 3.45s
```

## Data Inspection Points

Every major data transformation is logged:
- **Input**: URL, hints, HTML length, text length
- **Intermediate**: JSON-LD items, Readability content, main text
- **LLM**: Request messages, response fields, token counts
- **Output**: Final job object with all fields

## Error Classification

### Frontend Errors
- Network errors (API unreachable)
- Backend rejection (validation failed)
- Extension errors (capture failed)

### Backend Errors
- Input validation (empty HTML, short text)
- LLM errors (rate limit, quota, API key)
- Processing errors (JSON parse, extraction logic)

All errors are logged with:
- Error type
- Error message
- Stack trace (where applicable)
- Context (what was being processed)

## Success Markers

Look for these to confirm successful extraction:
```
✓✓✓ SUCCESS - Returning result
=== EXTRACTION SERVICE SUCCESS ===
### OPENAI LLM EXTRACTOR SUCCESS ###
```

## Next Steps

If you encounter persistent failures:
1. Capture the full log output from both frontend and backend
2. Identify the last successful phase
3. Check the data at that point
4. Examine the error details
5. Verify API keys, quotas, and network connectivity
