# Backlog Ideas (requires user feedback)

## 1. Grouping Granularity (How deep is the organization?)
Instead of a one-size-fits-all approach, users can control how specific the groups should be.

| Granularity | Target Group Count | Rationale / Behavior | Example |
| :--- | :--- | :--- | :--- |
| **Broad (Minimalist)** | 2 - 4 groups | Combines relative topics. Prioritizes a clean, uncluttered layout with very few groups. | `Work`, `Personal`, `Leisure` |
| **Balanced (Standard)** | 4 - 8 groups | The current default. Groups by main themes and workflows. | `Rust Dev`, `Recipes`, `Reddit`, `Shopping` |
| **Detailed (Atomic)** | 8+ groups | Highly specific. Separates projects, issues, reference docs, and shopping types. | `Rust Compiler Bugs`, `Rust API Docs`, `Cargo Issues`, `Weekly Groceries` |

* **UI Element:** A horizontal slider or dropdown selection in the main view:
  `Granularity: [ Broad ─── ● Balanced ─── Detailed ]`

---

## 2. Categorization Perspectives (Alternative Sorting Dimensions)
Tabs aren't always grouped by topic. Users could select the **dimension** of sorting:

### A. Task-Oriented (Active Projects)
Groups tabs by the active *action* or project they belong to.
- *Best for:* Multi-tasking professionals.
- *Example Groups:* `Feature X Build`, `Tax Filing 2026`, `Vacation Planning`, `Incident Debugging`

### B. Functional / Intent-Oriented (Cognitive State)
Groups tabs by *what the user is doing* on the page.
- *Best for:* Reducing context switching.
- *Example Groups:* 
  - `Do / Edit` (Google Docs, code sandboxes, email compose)
  - `Reference` (API documentations, stackoverflow, github issues)
  - `Read / Watch` (Medium articles, YouTube videos, blogs)
  - `Utilities` (Calculator, calendar, settings)

### C. Domain-Oriented (Quick Access)
Sorts tabs strictly by primary website or application, merging minor sub-domains.
- *Best for:* Tab hoarders who open many pages from the same site.
- *Example Groups:* `GitHub`, `YouTube`, `AWS Console`, `Miscellaneous`

### D. Time & Urgency (Inbox Zero style)
Sorts tabs by their usage lifecycle.
- *Example Groups:*
  - `Inbox` (Newly opened, unread)
  - `Today` (Currently active tabs)
  - `Backlog` (Tutorials, articles, long-term references to read later)
  - `Snoozed` (Inactive tabs that can be auto-sleeping)

---

## 3. Personalization Profiles & Custom Rules
Let users specify **who** they are or **what mode** they are currently in.

* **Work Mode / Personal Mode Toggle:** Sets explicit system instructions (e.g. in Work Mode, personal tabs are grouped into a single "Ignore" or "After Work" group; in Personal Mode, work-related tabs are moved to another window or consolidated).
* **"Fences" (Pin-in-place rules):** Rules like "Always keep `reddit.com` in a group called 'Downtime'" or "Never group Google Meet tabs".
* **Ignored Domains / Privacy Shield:** Prevent sensitive pages (e.g., `bank.com`, local files) from being sent to the LLM or being regrouped, locking them in place.

---

## 4. Multi-State Previews (Compare Grouping Plans)
When the user clicks "Analyze", the AI generates **two distinct organization plans** (e.g., *Plan A: Broad/Minimalist* and *Plan B: Detailed/Categorized*). 
- The UI displays a tab/toggle component: `[ View Plan A (3 Groups) ]  [ View Plan B (7 Groups) ]`
- The user can preview the visual difference (a carousel or side-by-side card) and choose the one they like before clicking **Apply**.

---

## 5. Integrating Bookmarks & Stale/Closed Tabs
Bring order to the rest of the browser ecosystem:
* **Bookmark Sync Organizer:** Analyzes open tabs and checks if there are matching folders in the Bookmark Bar. Offers to file open tabs directly into those bookmark folders, or archive stale tabs into a new bookmark folder called `AI Archive - [Date]`.
* **Merged History Scanner:** Scans recently closed tabs to see if restoring any of them would fit into the active tab groups.
