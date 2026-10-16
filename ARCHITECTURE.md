# FocusFeed Architecture & Technical Design

## 1. Architectural Philosophy

FocusFeed is engineered around strict boundaries, deterministic state machines, and a clean separation of concerns. It operates as an offline-first, client-side Manifest V3 Chrome extension.

### Core Architectural Pillars
1. **Separation of Policy, Classification, and Accounting:**
   - Classification only assesses semantic and rule matches.
   - The Policy Engine determines precedence without mutating state.
   - The Credit Ledger alone authoritatively manages viewing allowances, idempotency, and restriction timers.
2. **Deterministic Time and Persistence:**
   - Manifest V3 background service workers terminate upon idle. Therefore, in-memory timers are strictly forbidden as the source of truth for restriction state.
   - The extension relies on absolute timestamps (`blockedUntil`) and calendar date calculations (`YYYY-MM-DD` in local time).
3. **Pluggable Classifier Interface:**
   - Provides a unified `ClassifierInterface` allowing seamless runtime selection between zero-latency deterministic rules and semantic sentence embeddings.
4. **Single Source of Storage Truth:**
   - Dexie.js (IndexedDB) acts as the primary relational store in the background worker.
   - `chrome.storage.local` is synchronized for instant lookups by popup and content scripts.

---

## 2. Component Structure & Data Flow

```
+-------------------------------------------------------------------------+
|                              YouTube DOM                                |
|  - ytd-rich-item-renderer   - ytd-video-renderer   - video.html5-player |
+-------------------------------------------------------------------------+
                                    |
                    [DOM Mutation & Navigation Events]
                                    v
+-------------------------------------------------------------------------+
|                             Content Script                              |
|  - YouTubeDomAdapter: Selectors, card parsing, display hiding/showing   |
|  - NavigationObserver: SPA yt-navigate-finish & pushState               |
|  - FeedProcessor: Batched & debounced card extraction                   |
|  - PlaybackGuard: Intercepts card clicks & direct video URLs            |
+-------------------------------------------------------------------------+
                                    |
                    [Validated Messages (Zod Schema)]
                                    v
+-------------------------------------------------------------------------+
|                       Background Service Worker                         |
|  - Message Router & Handlers                                            |
|  - Bounded Classification LRU Cache (Version Invalidation)              |
|  - Policy Engine (Precedence & Uncertain Handling)                      |
|  - Credit Ledger (Idempotent daily accounting & 10h lock trigger)       |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                            Persistence Layer                            |
|  - Dexie.js (Profiles, Credit Ledger, Enforcement State, Corrections)   |
|  - chrome.storage.local (Enforcement cache)                             |
+-------------------------------------------------------------------------+
```

---

## 3. Decision Precedence Engine

The `PolicyEngine` evaluates videos with the following strict sequence:

1. **User Corrections Override:**
   If the user previously flagged this specific video ID in the Review Queue, their explicit correction (`allowed` or `blocked`) overrides all rules with 100% confidence.
2. **Explicit Blocked Channels & Topics:**
   Checks channel handles, creator names, and title keywords against `blockedChannels` and `blockedTopics`. If matched, returns `decision: 'blocked'`.
3. **Explicit Allowed Channels & Topics:**
   Checks against `allowedChannels` and `allowedTopics`. If matched, returns `decision: 'allowed'`.
4. **Category & Subcategory Matching:**
   Matches keywords within user's active categories (e.g., Programming → Python, TypeScript; AI → Machine Learning). Computes token density score.
5. **Semantic Similarity Classifier:**
   Calculates cosine similarity between video title embeddings and topic descriptions.
6. **Uncertainty Fallback Policy:**
   If match confidence is below `minConfidenceThreshold`, delegates to `uncertainPolicy`:
   - `review` (default): Hides card and adds to Review Queue.
   - `block`: Immediately hides.
   - `allow`: Permits display.

---

## 4. Credit Ledger & Restriction State Machine

```
              [User deliberately opens video]
                            |
                 Is Extension Enabled?
                     /          \
                  (No)          (Yes)
                  /                \
        [Allow Playback]    Is Active Restriction Present?
                                /                \
                             (Yes)               (No)
                             /                      \
                   [Block & Show 10h Modal]   Is Video In-Interest?
                                                  /         \
                                               (Yes)        (No)
                                               /               \
                                   [Allow (0 credits)]   Credits Remaining > 0?
                                                             /          \
                                                          (Yes)         (No)
                                                          /                \
                                                [Consume 1 Credit]  [Trigger 10h Lock]
                                                [Allow Playback]    [Show Modal & Block]
```

### Midnight Boundary Rules
- Daily allowance is evaluated per local calendar day (`YYYY-MM-DD`).
- Crossing midnight resets daily allowance to 5 credits.
- **Critical Invariant:** An active 10-hour restriction is **never** cleared simply because the date changed. If triggered at 11:30 PM (blocked until 9:30 AM), it continues to block access until 9:30 AM regardless of the midnight transition.

---

## 5. Bounded Cache Architecture

To eliminate repeated inference costs on YouTube feeds:
- `ClassificationCache` enforces a bounded LRU eviction policy (maximum 1,500 entries).
- Each entry stores `policyVersion`.
- Whenever the user updates their interest categories or rules, `profile.version` increments, instantly invalidating stale decisions across the entire extension.
