# FocusFeed Security & Permissions Model

## 1. Principle of Least Privilege

FocusFeed requests only the minimal permissions necessary to perform feed filtering and restriction enforcement under Chrome Manifest V3:

| Permission | Justification |
| :--- | :--- |
| `storage` | Required for persisting interest profiles, daily credit ledgers, and restriction timestamps in `chrome.storage.local` and IndexedDB. |
| `alarms` | Required to periodically wake up the service worker to check restriction unlock times and midnight reset boundaries without continuously running in the background. |
| `*://*.youtube.com/*` | Restricts content script injection exclusively to YouTube surfaces. FocusFeed cannot access or monitor any other websites or domains. |

### Permissions Explicitly Avoided
- ❌ No `<all_urls>` permission.
- ❌ No `history` or `tabs` permission (does not track user navigation outside YouTube).
- ❌ No `webRequest` or `declarativeNetRequest` (does not inspect network traffic or cookies).
- ❌ No `cookies` or identity permissions.

---

## 2. Threat Modeling & Trust Boundaries

1. **Untrusted DOM Content:**
   Content scripts run within YouTube's origin. All DOM text (video titles, creator names, URLs) is treated as untrusted input:
   - Sanitized and validated via **Zod schemas** before cross-context message transmission.
   - Text is assigned via `textContent` rather than `innerHTML` when rendering dynamic data to prevent DOM XSS.
2. **Manifest V3 Content Security Policy (CSP):**
   - Strictly prohibits `eval()`, `Function()`, and execution of remotely hosted code.
   - All extension scripts are packaged locally within the build.
3. **Scope Clarification:**
   FocusFeed is a personal browser-level productivity and intentionality tool, not a tamper-proof enterprise parental control or OS-level lock. Users can disable extensions via Chrome settings if needed.

---

## 3. Reporting Security Vulnerabilities

If you discover a vulnerability or security flaw in FocusFeed, please open an issue or submit a patch with detailed reproduction steps.
