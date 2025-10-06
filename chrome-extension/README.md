# Chrome Extension Structure Documentation

## 📁 File: `background.js` (1,540 lines)

This service worker handles all extension logic. While large, it's structured logically.

### 🗺️ **Code Map**

```
Lines   | Section                  | Description
--------|--------------------------|------------------------------------------
1-15    | Config & Setup           | DEV flag, API_HOST, console wrapper
16-42   | Utilities                | authHeaders, notifyProgress, keepAlive
45-77   | Auth Tokens              | fetchExtensionToken, ensureAccessToken
79-152  | API Calls                | apiExtract, apiSaveJob
153-867 | Page Capture             | getRenderedCapture + INJECTED_CAPTURE
        |   ├─ tryExpandAll        | Click expand buttons (170-255)
        |   ├─ overscanScroll      | Scroll to render content (257-289)
        |   ├─ serializeWithShadow | Capture HTML + shadow DOM (291-351)
        |   ├─ harvestJSONLD       | Extract structured data (353-361)
        |   ├─ harvestMetas        | Extract meta tags (363-372)
        |   ├─ getReadable         | Readability.js integration (374-407)
        |   ├─ hookNetwork         | Capture XHR/fetch bodies (409-477)
        |   ├─ detectAccessibility | Find iframes, PDFs, etc (479-589)
        |   └─ Main Flow           | Orchestrate capture (591-867)
869-906 | Auth: Email/Password     | loginWithEmail
908-943 | Auth: Google OAuth       | loginWithGoogle
945-951 | Auth: Logout             | logoutEverywhere
953-968 | Compliance Gate          | RESTRICTED_HOSTS, classifyPage
970-1530| Message Handlers         | chrome.runtime.onMessage switch
        |   ├─ GET_STATUS          | Check auth & page type (976-1071)
        |   ├─ USE_PASTED          | Manual text extraction (1073-1124)
        |   ├─ LOGIN_EMAIL         | Email login (1126-1131)
        |   ├─ LOGIN_GOOGLE        | Google OAuth (1133-1138)
        |   ├─ LOGOUT              | Logout (1140-1144)
        |   ├─ RUN_FLOW1           | Auto-extract job (1146-1424)
        |   ├─ RUN_FLOW1_CONFIRM   | Extract with preview (1426-1467)
        |   └─ SAVE_CONFIRMED_JOB  | Save confirmed job (1469-1475)
1533-   | Periodic Maintenance     | Token refresh alarm
```

### 🔧 **How to Work with This File**

#### Finding Code:
1. **Search by function name** - All functions are clearly named
2. **Jump by line number** - Use the map above
3. **Search by keyword** - "capture", "auth", "login", etc.

#### Making Changes:
1. **Capture logic** → Lines 153-867 (test thoroughly on multiple job sites!)
2. **Auth flows** → Lines 45-951
3. **Message handlers** → Lines 970-1530 (each case is independent)
4. **API calls** → Lines 79-152

#### Testing:
- **Auth changes**: Test login/logout flows
- **Capture changes**: Test on LinkedIn, Greenhouse, Lever, Workday
- **API changes**: Test with backend running
- **Message changes**: Test from popup.js

### ⚠️ **Critical Sections (Don't Break!)**

1. **INJECTED_CAPTURE** (Lines 165-780)
   - Stringified and executed in page context
   - Must be self-contained (no external dependencies)
   - Handles Shadow DOM, iframes, lazy-loading

2. **Message Handler Switch** (Lines 976-1520)
   - Each case must call `sendResponse()` exactly once
   - Must `return true` to keep channel open
   - All async code must be wrapped

3. **Production Console Wrapper** (Lines 11-14)
   - Disables console.log in production
   - Preserves console.error/warn
   - Must run before any console.log calls

### 📝 **Common Tasks**

#### Add a new message type:
```javascript
// In background.js, add to switch statement (line ~970)
case 'YOUR_NEW_MESSAGE_TYPE': {
  // Your code here
  sendResponse({ ok: true, data: ... });
  break;
}
```

#### Add a new API endpoint:
```javascript
// After apiSaveJob (line ~153)
async function apiYourFunction(payload) {
  await ensureAccessToken();
  const res = await fetch(`${API_HOST}/your/endpoint`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return await res.json();
}
```

#### Modify capture logic:
- **Add selector**: Lines 170-199 (button selectors)
- **Add extraction**: Lines 730-777 (contentSelectors array)
- **Adjust timing**: Lines 153-161 (timeout/delay parameters)

### 🎯 **Why This Structure Works**

✅ **All code in one file** → No import/export complexity  
✅ **Clear sections** → Easy to navigate  
✅ **Self-contained** → No external dependencies  
✅ **MV3 compatible** → Works with service workers  
✅ **Production tested** → Battle-hardened code  

### 🚫 **Why NOT to Refactor**

❌ **INJECTED_CAPTURE must be self-contained** → Can't split into modules  
❌ **MV3 doesn't support ES modules** → Would need build step  
❌ **Message handlers share state** → Hard to split  
❌ **Working code** → High risk, low reward  

---

**Bottom Line**: This file is large but **well-structured and working**. Use this documentation to navigate it effectively instead of refactoring.
