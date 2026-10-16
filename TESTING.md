# FocusFeed Testing Strategy & Verification Guide

This document details the automated and manual verification procedures for FocusFeed.

---

## 1. Automated Test Suite

FocusFeed uses **Vitest** configured with `jsdom` and `fake-indexeddb/auto` for rapid, deterministic testing of all state machines and storage repositories without requiring a live browser.

### Test Execution Commands

```bash
# Execute full test suite
npm test

# Run tests in interactive watch mode
npm run test:watch

# Execute with code coverage report
npm run test:coverage
```

---

## 2. Test Coverage Breakdown

### A. Clock & Calendar Boundaries (`src/tests/unit/clock.test.ts`)
- **Local Date Formatting:** Validates `YYYY-MM-DD` calculation across time zones.
- **Next Midnight Calculation:** Validates computation of local midnight (`00:00:00.000`).
- **Time Advancements:** Simulates hours and day jumps deterministically.

### B. Credit Ledger & Restriction Lifecycle (`src/tests/unit/credit-ledger.test.ts`)
- **Allowance Initialization:** Full 5 credits quota available at start.
- **In-Interest Viewing:** 0 credits consumed.
- **First 5 Out-of-Interest Attempts:** Each consumes 1 credit and allows playback.
- **6th Qualifying Attempt:** Triggers the 10-hour focus lock (`blockedUntil = now + 10h`) and blocks playback.
- **Restricted Access Blocking:** Subsequent navigation/playback attempts during active restriction are rejected.
- **Idempotency Deduplication:** Double-clicks or repeated DOM events for the same video within 5 minutes do not charge duplicate credits.
- **Midnight Reset Behavior:** Daily credits reset to 5 when crossing into a new calendar day.
- **Active Restriction Survival:** An active 10-hour restriction that spans midnight is **not** cleared by the date change; access remains blocked until the 10 hours fully elapse.

### C. Policy Engine & Precedence (`src/tests/unit/policy-engine.test.ts`)
- **Explicit Blocked Channels:** Blocks channel regardless of keywords in title.
- **Explicit Blocked Topics:** Precedence over category matches.
- **Explicit Allowed Channels:** Allows creator content.
- **Category & Subcategory Matching:** Correctly matches nested keywords.
- **Manual User Corrections:** Highest precedence override for user feedback.
- **Resilience:** Gracefully handles empty or missing DOM metadata without throwing.
- **Uncertain Policy:** Honors configured behavior (`review` vs `block` vs `allow`).

### D. Semantic Classifier (`src/tests/unit/semantic-classifier.test.ts`)
- **Vector Cosine Similarity:** Embeddings accurately distinguish relevant vs irrelevant content.
- **Fallback Behavior:** Gracefully falls back to deterministic rules if model pipeline is uninitialized.

### E. Storage & Background Integration (`src/tests/integration/storage-and-messaging.test.ts`)
- **Dexie Persistence:** Tests profile saving, credit ledger indexing, and enforcement state storage.
- **Message Dispatching:** Tests end-to-end Zod message routing across all message types.

---

## 3. Manual Testing in Chromium

To verify live browser integration on YouTube:

1. Build the extension: `npm run build`
2. Open `chrome://extensions/` and load `.output/chrome-mv3`.
3. Open `https://www.youtube.com`:
   - Verify non-matching video cards on Home Feed are cleanly hidden.
   - Verify the bottom-right status pill displays: `FocusFeed: X filtered · Y allowed`.
   - Perform a search (e.g., "music hits"): observe individual search results being filtered.
   - Click on an allowed video (e.g., programming tutorial): verify playback starts without credit consumption.
   - Click on an out-of-interest video: verify the credit toast appears ("1 credit used, 4 remaining").
   - Click out-of-interest videos until credits hit 0, then click another: verify the full-screen 10-Hour Restriction overlay appears and halts playback.
   - Open extension popup: verify remaining credits meter and status toggle.
