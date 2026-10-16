# FocusFeed - YouTube Interest-Based Feed Controller

FocusFeed is a production-oriented Manifest V3 Chrome extension that gives users granular, intentional control over their YouTube recommendations, search results, and video consumption.

Unlike basic keyword blockers, FocusFeed features:
- **Hierarchical Interest Profiles:** Organize interests by categories (Programming, Data Science & AI, Science & Tech, Design, Productivity) and subcategories with deep keyword dictionaries.
- **Strict Policy Engine:** Deterministic rule evaluation with clear precedence (Blocked Channels/Topics → Allowed Channels/Topics → Category/Keyword Matching → Pluggable Semantic Inference → Configurable Uncertainty Policy).
- **Daily Out-of-Interest Credit System:** 5 viewing credits per local calendar day for deliberate out-of-interest videos.
- **10-Hour Focus Lock:** Exhausting daily credits triggers an automated 10-hour restriction that blocks playback and navigation across YouTube, surviving midnight and browser restarts.
- **Idempotent Ledger:** Prevents duplicate deductions from repeated DOM events or clicks.
- **YouTube DOM Adapter:** Dynamic MutationObserver reprocessing, SPA client navigation detection (`yt-navigate-finish`, `popstate`), clean element hiding without layout distortion, and helpful empty state banners.
- **100% Local & Private:** Powered by Dexie.js over IndexedDB and `chrome.storage.local`. Zero external telemetry, zero tracking servers.

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js v18+ (tested on Node.js v22.17.0)
- npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Extension
```bash
npm run build
```
The compiled, unpacked Chrome extension will be generated in `.output/chrome-mv3`.

### 3. Load into Chromium / Google Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** via the toggle switch in the top right corner.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3` folder inside this project directory.
5. FocusFeed is now active! The extension icon appears in your toolbar, and visiting `https://www.youtube.com` will immediately apply your interest filters.

---

## 🛠️ Development & Testing

### Running Tests
Unit and integration tests are powered by Vitest and execute against in-memory IndexedDB (`fake-indexeddb`):
```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Type Checking
Strict TypeScript type checking:
```bash
npm run typecheck
```

### Local Development with Hot Module Reload (HMR)
```bash
npm run dev
```
WXT will build the extension and launch a dedicated Chromium browser instance with extension hot-reloading.

---

## ⚙️ Configuration & Policy Rules

### Out-of-Interest Credit Ledger
- **Default Daily Allowance:** 5 credits per local calendar day.
- **In-Interest Content:** Does **not** consume credits.
- **Out-of-Interest Content:** Consumes 1 credit when deliberately clicked or opened directly.
- **6th Qualifying Attempt:** Activates a 10-hour focus lock (`blockedUntil` absolute timestamp).
- **Midnight Boundary:** At local midnight, daily credit counts reset. Active 10-hour restrictions are preserved and continue until their full duration expires.
- **Configuration:** Daily allowances (1-50) and restriction durations (1-72 hours) are fully configurable from the FocusFeed Settings tab.

### Decision Precedence
1. **Explicitly Blocked Channels & Topics:** Highest priority. Video is hidden and prohibited.
2. **Explicitly Allowed Channels & Topics:** Allowed unless in conflict with a higher-priority block.
3. **Category & Subcategory Matching:** Evaluated against user's active categories and keywords.
4. **Pluggable Semantic Classifier:** Vector cosine similarity using sentence embeddings for contextual classification.
5. **Uncertainty Policy:** Configurable action for low-confidence matches (`review` = hide & add to review queue, `block` = hide strictly, `allow` = permit).

---

## 📂 Project Structure

```
FocusFeed/
├── .output/chrome-mv3/       # Compiled production extension
├── entrypoints/
│   ├── background.ts         # Manifest V3 service worker & alarms
│   ├── youtube.content.ts    # YouTube DOM observer & playback guard
│   ├── popup/                # Extension toolbar popup (React)
│   └── options/              # Main dashboard, settings & onboarding (React)
├── src/
│   ├── classifier/           # RulesClassifier, SemanticClassifier, Cache
│   ├── components/           # Reusable UI components (Button, Badge)
│   ├── core/                 # PolicyEngine, CreditLedger, Clock, Types
│   ├── features/             # Dashboard, InterestEditor, ReviewQueue, Onboarding
│   ├── messaging/            # Zod message schemas, client, handlers
│   ├── storage/              # Dexie.js database & repository abstraction
│   ├── styles/               # Tailwind CSS v4 stylesheets
│   ├── tests/                # Vitest test suites (unit & integration)
│   └── youtube/              # Centralized DOM adapter, selectors, guard
├── wxt.config.ts             # WXT framework configuration
├── tsconfig.json             # Strict TypeScript configuration
└── vitest.config.ts          # Vitest testing configuration
```

---

## 📜 Documentation

- [Architecture & Design Decisions](file:///c:/Users/Amey%20Ravindra%20Pandit/Documents/FocusFeed/ARCHITECTURE.md)
- [Privacy & Data Security](file:///c:/Users/Amey%20Ravindra%20Pandit/Documents/FocusFeed/PRIVACY.md)
- [Testing & Quality Assurance](file:///c:/Users/Amey%20Ravindra%20Pandit/Documents/FocusFeed/TESTING.md)
- [Security & Permission Rationale](file:///c:/Users/Amey%20Ravindra%20Pandit/Documents/FocusFeed/SECURITY.md)

---

## 🛡️ License

MIT License. Built for healthy focus, learning, and productivity.
