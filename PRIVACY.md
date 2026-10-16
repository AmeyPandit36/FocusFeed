# FocusFeed Privacy & Data Policy

FocusFeed was designed from day one with a strict, privacy-first architecture. It contains **no telemetry, no tracking analytics, and no remote data collection**.

---

## 1. What Data Is Stored Locally

All data is stored exclusively in your browser's local sandbox using IndexedDB (via Dexie.js) and `chrome.storage.local`:

1. **Interest Profile:**
   - Selected categories, subcategories, keywords, allowed channels, and blocked channels.
2. **Credit Ledger Records:**
   - Video ID, video title, channel name, timestamp, and local date for deliberate viewing attempts. Used solely to calculate your daily 5-credit quota and display the local activity table.
3. **Enforcement State:**
   - Daily allowance configuration, restriction lock timestamps (`blockedUntil`), and daily reset tracking.
4. **User Corrections:**
   - Manual overrides ("Allow Always" / "Block Always") submitted through the Review Queue.
5. **Local Classification Cache:**
   - In-memory/temporary mapping of video titles to policy decisions to avoid reprocessing identical cards during scrolling.

---

## 2. Network & Third-Party Communication

- **No Remote Servers:** FocusFeed does not operate a backend server, account database, or cloud synchronization service.
- **Zero Third-Party APIs:** FocusFeed does not contact external AI APIs or tracking endpoints.
- **No Browsing History Access:** FocusFeed does not request the `history` permission or monitor any non-YouTube browsing activity.

---

## 3. Data Deletion & Export

You have full control over your data:
- **Export Configuration:** Click **Export Profile** on the Interest Profile page to save a portable JSON file of your settings.
- **Instant Wipe:** Click **Clear Data** under Policy & Data Settings to purge all viewing history, reset restriction timestamps, and clear caches immediately.
- **Extension Removal:** Uninstalling FocusFeed permanently removes all local IndexedDB tables and stored settings from your browser.
