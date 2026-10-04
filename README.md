# Revision Atlas
**Private Manuscript Continuity & Revision Studio**

*A local-first, privacy-respecting revision operating system for serious authors and editors.*

---

## 1. Product Overview
Revision Atlas is designed specifically for the deep, non-linear revision stages of long-form literary works, novels, and narrative memoirs. It bridges the gap between drafting and publication without turning the manuscript into a generic word processor document or cluttered developer tool.

The studio operates under a strict principle:
**Writing → Revision → Manuscript Understanding → Continuity → Final Draft Preparation**

It does **not** contain agent querying, submission tracking, query letters, or synopsis CRM tools (which belong to its dedicated companion, *Submission Atlas*).

---

## 2. Premium Typography System (100% Offline & Local)
Typography in Revision Atlas is an editorial instrument, not decoration. All typography is rendered using sophisticated local system font stacks with zero external dependencies, webfont downloads, or remote CDN requests.

- **Product / Display Serif Stack**:
  `'Iowan Old Style', 'Baskerville', 'Charter', 'Palatino', 'Georgia', 'Cambria', serif`
  *Applied to the brand wordmark, major workspace titles, and chapter headings.*
- **Interface Sans-Serif Stack**:
  `-apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', 'Aptos', 'Helvetica Neue', Arial, sans-serif`
  *Applied to functional navigation, search, inspector controls, tables, and status pills.*
- **Manuscript Writing Stacks (Writer Selectable)**:
  1. **Editorial Serif** (Default): `'Charter', 'Iowan Old Style', 'Georgia', serif`
  2. **Classic Manuscript**: `'Courier Prime', 'Courier New', monospace`
  3. **Clean Sans**: Modern humanist UI sans stack.
- **Canvas Ergonomics**:
  - 18.5px standard editorial type size.
  - 1.78 line height for optimal rhythmic flow.
  - Line length calibrated to ~65–75 characters (620px Narrow, 740px Comfortable, 920px Wide).
  - Generous top margin above manuscript chapter openings.
  - Runtime writing preferences are persisted locally and strictly decoupled from output formatting.

---

## 3. Brand Continuity & Mineral Palette
Revision Atlas shares geometric ancestry with Context & Muse and GenSort via its **four-quadrant brand mark**, executed in a distinctive, desaturated mineral palette:
- **Quadrant 1 (Top-Left):** Deep Forest / Mineral Green (`#244d3f`)
- **Quadrant 2 (Top-Right):** Muted Plum / Aubergine (`#5e3c54`)
- **Quadrant 3 (Bottom-Left):** Burnished Amber / Bronze (`#92602c`)
- **Quadrant 4 (Bottom-Right):** Deep Teal / Mineral Blue (`#1c4e5e`)

The studio offers three non-destructive appearance modes:
- **Dark Theme:** Deep graphite background (`#121316`), warm charcoal panels (`#181a20`), layered ink cards (`#20232b`), and warm-white prose (`#e4e2dd`).
- **Light Theme:** Warm stone/ivory background (`#f7f6f2`), muted stone surface (`#eeece5`), off-white writing surface (`#fdfcf9`), and deep charcoal prose (`#222220`).
- **System Theme:** Automatically adapts to operating system light/dark settings.
*Theme switching never reloads the project, loses cursor focus, or resets unsaved edits.*

---

## 4. Chapter Function Builder & Manuscript Function Map
Answering the author's primary structural question: **"Why does this chapter exist?"**

### Chapter Function Model
Each chapter maintains a first-class structural function profile:
- **Purpose:** The core job this chapter performs.
- **Central Turn:** What fundamentally changes during this chapter.
- **Entry & Exit States:** What is true when the reader enters vs. leaves.
- **Reader Knowledge:** What the reader already knows vs. what they now know, suspect, or understand differently.
- **Opens & Answers:** Tensions and questions introduced vs. resolved.
- **Setup & Payoff:** Material prepared for future chapters vs. earlier setup transformed.
- **Stakes & Character Movement:** How urgency shifts and who undergoes change.
- **Theme / Motif Work:** Symbolic and thematic developments.
- **What Would Be Lost:** What breaks in the manuscript if this chapter vanished.
- **Function Tags:** Descriptive categorizations (e.g. *Introduces character, Establishes canon, Raises stakes, Recontextualizes earlier material*).

### Manuscript Function Map
Located under **Reference → Function Map**, this structural grid provides a top-level narrative overview across all chapters. It includes an automated **Neutral Observations Engine** that surfaces objective patterns without judging quality:
- Identifies neighboring chapters performing duplicate recorded jobs.
- Detects unlinked setups or payoffs with missing prerequisites.
- Identifies multi-chapter sequences lacking recorded central turns.

### Compare + Function Integration
When comparing revisions in the **Compare** workspace, the studio automatically detects and flags modifications to Chapter Function metadata alongside prose diffs.

---

## 5. Version Identity & Lineage System
Revision Atlas prevents version confusion across complex drafting cycles:
- **Permanent Identity:** Every version stores a unique internal ID, sequential code (`RA-W-0001`, `RA-R-0001`, `RA-S-0001`, `RA-F-0001`), human-readable name, version type, exact local timestamp, parent lineage, total word count, and author notes.
- **Version Types:**
  - `Working Branch`: Active editable manuscript branch.
  - `Reference Draft`: Frozen benchmark milestone.
  - `Master Snapshot`: Major milestone archive.
  - `Safety Snapshot`: Automatic routine capture before major operations.
  - `Final Draft Snapshot`: Immutable state captured upon final formatting.
- **Autosave Discipline:** Typing autosaves update `lastEditedAt` and chapter records without spawning spurious draft versions.
- **Chapter Revision States:**
  - `Unreviewed`: Chapter exists in branch awaiting current pass.
  - `In Revision`: Actively undergoing revision.
  - `Revised`: Completed intended revision pass (sets `lastRevisionCompletedAt`).
  - `Locked`: Chapter marked stable; protected from accidental overwrites.
- **Historical View Safety:** Historical drafts display a persistent amber banner (`⚠️ Viewing Historical Version · Read-Only`). Historical versions can only be edited by explicitly selecting **Branch as New Working Draft**.

---

## 6. Advanced Revision Comparison & Recovery
The Compare workspace enables precise, multi-level structural and editorial inspection between any two drafts, branches, or snapshots:
- **Three Perspective Modes:**
  - `What Changed`: Highlights modified, added, removed, and shifted paragraphs.
  - `What Survived`: Displays persistent prose that weathered the revision pass intact.
  - `What Disappeared`: Isolates excised passages for review or salvage.
- **Granular Shift Detection:**
  - Distinguishes rewritten prose, moved blocks, added sections, and removed material.
  - Sentence and phrase-level inline diff tokens (`.diff-inline-added`, `.diff-inline-removed`).
  - Chapter Revision Intensity Map (5-slice visual strip with percentage metrics).
  - Function & Continuity Shift sidebar highlighting recorded structural shifts.
- **Surgical Recovery & Safeguards:**
  - **Restore Previous Paragraph**: Deterministically replaces only the targeted modified paragraph in the active manuscript while leaving surrounding paragraphs completely intact.
  - **Insert at Cursor**: Accurately inserts comparison excerpts or fragments at the author's exact saved cursor offset across panel switches.
  - **Save as Fragment**: Saves excised or alternate passages directly into the Fragments Vault for future use.

---

## 7. Final Draft Formatter & Consistency Pre-Flight
The Final Draft Formatter produces clean, uniform finished manuscripts ready for offline export:
- **Presets:**
  - `Standard Manuscript`: 12pt monospace / Times, double spaced (2.0), 1-inch margins, 0.5-inch first-line indent, centered `#` scene breaks, running header, and title page.
    *Explicit Notice: "Standard Manuscript — common publishing convention; verify recipient requirements."*
  - `Clean Reading Draft`: 11.5pt serif, 1.5 line spacing, 1-inch margins, modern chapter drops.
  - `Custom`: Fully configurable formatting.
- **Live Paged Preview:** Renders an authentic 8.5" × 11" paged simulator with running headers and page numbers.
- **Consistency Pre-Flight Scanner:**
  - Scans for formatting irregularities: multiple spaces, raw tabs, zero-width characters, excessive blank lines, and trailing spaces.
  - **Fix Invisible Formatting Artifacts**: Deterministically strips invisible formatting defects without altering prose words. Editorial punctuation (straight vs. curly quotes, hyphens vs. em-dashes) is surfaced as objective observations for author review rather than altered automatically.
- **Offline Exports:**
  - Markdown (`.md`)
  - Plain Text (`.txt`)
  - Full Vault JSON backup & faithful bidirectional restore (`importVaultData`)
  - Print / Save as PDF via native browser print CSS (`@media print`).

---

## 8. Commercial Architecture & Privacy Isolation
The commercial distribution root (`standalone-tools/revision-atlas/`) contains strictly generic and commercial-safe assets:
- `index.html`, `studio.css`, `app.js`
- `profiles/default_template.js` (Blank project template)
- `profiles/demo_profile.js` (Fictional mystery demo: *"The Glass Clockmaker"*)

**Private Author Data:**
Private manuscript projects (such as private author projects) are strictly isolated outside the commercial distribution root in `standalone-tools/private-projects/`. The studio's conditional loader safely accesses local private profiles in development while ensuring zero private prose or canon leaks into the commercial release package.

---

## 9. Multi-Destination Persistence & Cloud Sync
Revision Atlas ensures authors never risk losing their work across browsers, devices, or system crashes:
- **Continuous Local Vault (IndexedDB):** Instantaneous continuous auto-saving with live status indicator (`Saved` / `Saving...`) and `Ctrl+S` manual flush.
- **Google Drive Direct Integration:** On-demand client-side backup and restore directly with the author's Google Drive. In strict accordance with Gate 7 (100% offline isolation), Google Identity Services are loaded dynamically only when the author explicitly initiates Google Drive sync.
- **Live Disk / Cloud-Synced Folder (File System Access API):** Allows linking Revision Atlas directly to a file on physical disk inside a desktop Google Drive, Dropbox, or OneDrive folder. Every `Ctrl+S` automatically writes to that file, triggering real-time background sync through the author's desktop cloud client.
- **Portable Project Vaults:** Universal JSON project exports (`.atlas.json`) containing complete version trees, notes, and characters for manual cold storage or off-site backups.
