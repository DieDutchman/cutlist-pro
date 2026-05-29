---
target: dev.html
total_score: 33
p0_count: 0
p1_count: 3
p2_count: 2
timestamp: 2026-05-29T18-15-38Z
slug: cutlist-pro-dev-html
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast system solid. Save pill spins amber → green/red correctly. Supplier change fires amber warning toast. Trial badge click fires info toast — touch users now get the countdown detail. Job sync status clean. Remaining gap: `oninput="saveJobDetails()"` fires on every keystroke in the job details popover (Client, House, Address, Notes) with no visible write confirmation — save goes to localStorage silently, with no "saved" signal visible to the user. |
| 2 | Match Between System and Real World | 3 | L1/L2/W1/W2 edging codes now have `title` attributes on both the `<th>` column headers and the `addon-field` divs — the most used entry point now explains these codes inline. Language fluent for SA trade audience throughout. Job status labels (DRAFT, QUOTED, APPROVED, ORDERED, BUILT, INVOICED) are natural trade vocabulary. The edge abbreviation reference card in the Import Cutlist view (EAR, 1L, 2S, TE, BE) is a good discoverability aid for first-timers. |
| 3 | User Control and Freedom | 4 | All destructive actions use `confirmAction()`: delete unit (3 paths), reset unit, delete template, seed templates, clear all, delete job, delete supplier, delete/remove in rooms, merge board. Modal close works via Escape + outside-click in Users modal. Archive unit has UNDO toast. No remaining `_confirmPending` patterns on destructive flows. Full control is genuinely present here. |
| 4 | Consistency and Standards | 3 | `.btn` typography unified (Barlow 13px/0.5px). Dead inline `border-left-color` styles are gone. Job status menu items now render as `<button>` elements (keyboard-accessible). Residual inconsistencies: `renameRoomPrompt()` and two board/edging rename flows still use native `prompt()` — inconsistent with `confirmAction()` modal pattern used everywhere else. `#more-panel` has `role="menu"` but items inside are `.tab` elements without `role="menuitem"`. `role="tab"` buttons in the Users modal lack `aria-selected` — screen readers cannot announce which tab is active. |
| 5 | Error Prevention | 3 | All destructive paths confirmed wrapped with `confirmAction()`. `resetUnit()` now async and properly targeted (no more wrong-row querySelector). Supplier change fires an amber toast warning before prices silently update — gives users a signal to notice. `prompt()` still used in three rename flows (board, edging, room) — no validation, no cancel confirmation style, could be confused for a browser alert. |
| 6 | Recognition Rather Than Recall | 3 | L1/L2/W1/W2 tooltips now present on both the column headers and the per-part dropdowns. Sheet Optimizer (kerf, edge trim, rotation) all have `title` attributes. Supplier selector has tooltip. Summary still in primary nav row. The main remaining gap: the archive disclosure bar for hidden user units has no visible label until toggled — users who archive a unit must remember the bar exists below the units table. Post-room-add state is silent — there is no nudge to add units after the first room is created. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts. No bulk actions. No saved-template quick-access from unit rows. Job status badge adds one workflow affordance for multi-job power users. No fast path to regenerate cutlist after material changes. No change from previous run on this heuristic. |
| 8 | Aesthetic and Minimalist Design | 3 | Dead `border-left-color` inline styles removed. Side-stripe border ban violations (`border-left:3px solid`) remain in: `.more-panel .tab.active` (line 259), `.editor-unit-item.active` (line 1089), `.qv-compare-row.active-row` (line 1911), and the new empty-state nudge (line 6727). The first three are "active selection" highlights where a background tint would communicate the same state without the stripe; the nudge is a new addition that uses `border-left:3px solid var(--amber-dim)`. Feedback cards in the Users modal use `border-left:4px solid ${catColor}` (line 13733) — a classic side-stripe category indicator that violates the ban. The overall layout is clean and the header remains tight with two ghost buttons. |
| 9 | Error Recovery | 3 | Save-fail toast now has a RETRY button (`action: { label: 'RETRY', fn: () => saveJobToCloud() }`, `persist: true`) — a meaningful upgrade. Plan import preserves the last file across error/retry cycles (`_planImportLastFile`) and shows "↺ RETRY SAME FILE" button. AI cutlist import preserves `importState.raw` on error, so re-render shows "✓ File loaded" and the Parse button remains. No field-level error pointing — toasts name the problem but do not highlight the offending element. |
| 10 | Help and Documentation | 2 | L1/L2/W1/W2 tooltips on both `<th>` and `addon-field` divs — the P1 gap from three prior runs is now fully closed. Sheet Optimizer inputs all have `title` attributes. Supplier selector has tooltip. These three fixes move this heuristic from 1 to 2. Remaining gap: no guided nudge after first room is created ("now add units from the list below"); the empty units table shows the zero-quantity nudge but only after units exist. The edge abbreviation reference card in the Import view is useful but accessible only to users who open that tab. No searchable help, no guided tour, no task-focused documentation. |
| **Total** | | **33/40** | **Good — approaching Very Good** |

---

## Anti-Patterns Verdict

**LLM assessment**: The interface has shed most of its generic SaaS tell-tales across the last several revision cycles. The amber-on-dark trade tool aesthetic is coherent and internally consistent. The two-row nav is now well-justified (7 tools in primary row is dense but workable for domain experts). The job status badge vocabulary (DRAFT/QUOTED/APPROVED/ORDERED/BUILT/INVOICED) is genuinely trade-appropriate.

The remaining anti-pattern tell is the side-stripe `border-left:3px` pattern that appears in five places: the More dropdown active tab, the editor unit item active state, the quote-view compare row active state, the new empty-state nudge callout, and the feedback card category indicator. These are the classic "alert callout" and "active selection" patterns that the skill's absolute-bans list targets. The nudge at line 6727 is newly introduced since the previous critique — it's a new violation, not a regression from a fixed state.

**Deterministic scan**: CLI detector not available (`bundled detector not found`). Manual review substituted. No false positives. Key findings: five `border-left:3px`/`border-left:4px` violations confirmed by line-by-line search. No `background-clip:text` gradient text found. No glassmorphism. No hero-metric template. No identical card grids. No `border-left-color` dead-style inline attributes remain.

**Visual overlays**: Browser automation unavailable. Overlay injection not attempted.

---

## Overall Impression

Three heuristics improved in this pass. H9 (Error Recovery) moves from 2 to 3: the save-fail RETRY button and Plan Import file-preservation are genuine quality-of-life upgrades that eliminate the main "user loses work" scenario. H10 (Help and Documentation) moves from 1 to 2: all 8 tooltip additions shipped — L1/L2/W1/W2, kerf, edge trim, rotation, supplier selector — closing the longest-standing P1 gap in the entire critique history. H3 (User Control) moves to a solid 4: `resetUnit()` is now fully consistent with the rest of the app.

The ceiling is now H7 (Flexibility — 2/4) and H10 (Help — 2/4). H7 is a structural feature gap (keyboard shortcuts, bulk actions) that requires deliberate product decisions, not quick fixes. H10 can still improve with guided post-room-add onboarding and the edge abbreviation reference appearing in context (at the edging dropdowns, not only in the Import tab).

The empty-state nudge shipped with a `border-left:3px` — a new violation introduced while fixing a gap. It's the only genuine regression in this pass.

---

## What's Working

1. **Error recovery is now genuinely functional.** Save-fail RETRY with `persist:true` means the toast stays visible until the user acts. Plan Import RETRY SAME FILE means re-upload friction is gone. The AI cutlist import preserves raw parsed rows on error. These three paths cover every file/save failure the user would encounter.

2. **Help and Documentation ceiling broken after three stalled passes.** Eight one-line tooltip fixes ship in a single pass. L1/L2/W1/W2 now explain themselves at the point of entry (both headers and dropdowns). Sheet Optimizer controls are no longer silently numeric. Supplier selector warns about price impact. Jordan (first-timer) no longer has to guess what L1/W2 mean.

3. **User Control is a 4.** Every destructive action uses `confirmAction()`. `resetUnit()` is now correctly targeted and async. The only `prompt()` calls remaining are on rename flows — non-destructive by nature. Archive has UNDO. Modal close is keyboard-accessible.

---

## Priority Issues

**[P1] Empty-state nudge introduces a new side-stripe violation**
The new nudge at line 6727 uses `border-left:3px solid var(--amber-dim)`. It's a callout/alert pattern that the design system bans. The same visual hierarchy can be achieved with a `background:rgba(212,145,58,0.08)` tint and a 2px top border or no border at all — the amber text color already signals the brand context.
**Fix:** Remove `border-left:3px solid var(--amber-dim)` from the nudge div, increase the background tint slightly to `rgba(212,145,58,0.1)`.
**Suggested command:** `/impeccable polish dev.html`

**[P1] `prompt()` still used in three rename flows — inconsistent and inaccessible**
`renameRoomPrompt()` (line 14657), board rename (line 17276), edging rename (line 17434/17511) all use native `prompt()`. These are inconsistent with the modal-style `confirmAction()` used everywhere else for destructive actions. Native `prompt()` also cannot be styled, cannot be dismissed by Escape in the same way, and creates an a11y break (focus returns to document root on close, not the triggering element).
**Fix:** Replace `prompt()` calls with a thin inline modal using the existing `confirmAction()` infrastructure, or a dedicated `inputPrompt(message, defaultValue)` helper.
**Suggested command:** `/impeccable harden dev.html`

**[P1] `#more-panel role="menu"` without `role="menuitem"` on children — ARIA mismatch**
The More dropdown declares `role="menu"` on the panel but children are plain `.tab` buttons without `role="menuitem"`. Screen readers navigating the menu role expect `menuitem` descendants; plain buttons inside a `role="menu"` produce unpredictable announcements. `aria-selected` is also absent from `role="tab"` buttons in the Users modal, so the active tab state is invisible to assistive technology.
**Fix:** Add `role="menuitem"` to each `.tab` inside `#more-panel`. Add `aria-selected="true/false"` to the Users modal tab buttons in `showUsersTab()`.
**Suggested command:** `/impeccable audit dev.html`

**[P2] Post-room-add state is silent — no activation nudge**
After `confirmAddRoom()` closes the modal and switches to the new room, the user sees an empty units table with the zero-quantity nudge ("Start here — set a quantity"). But the nudge only fires when units already exist with qty=0 (line 6725: `units.length > 0 && _allQtyZero`). A brand-new room has no units — the nudge is invisible. Jordan (first-timer) sees a blank table with no direction.
**Fix:** Add a second nudge branch for `units.length === 0` — "No units yet. Add units from the library below, or create your own." pointing to the + Add Unit path.
**Suggested command:** `/impeccable onboard dev.html`

**[P2] Side-stripe `border-left:3px` in active-state selectors — ban violation × 4**
`.more-panel .tab.active` (line 259), `.editor-unit-item.active` (line 1089), `.qv-compare-row.active-row` (line 1911), feedback card `border-left:4px` (line 13733). All use a colored side stripe to indicate active/selected state or category. Replace with background tint. The `.editor-unit-item.active` and `.qv-compare-row.active-row` cases are the highest-traffic (used every session); the feedback card is superuser-only.
**Fix:** Replace `border-left:3px solid var(--amber)` with `border-left:none; background:rgba(212,145,58,0.15)` on active states. For feedback cards, use a filled category pill (already present) without the side stripe.
**Suggested command:** `/impeccable polish dev.html`

---

## Persona Red Flags

**Alex (Power User — experienced cabinet maker quoting a full kitchen):**
- `resetUnit()` now correctly targeted — the wrong-row reset bug that could lose dimension work is fixed.
- Still no keyboard shortcuts. Alex navigating Panels → Cutlist → Quote → Summary is four mouse clicks per review cycle, every session.
- `renameRoomPrompt()` uses native `prompt()` — Alex renames rooms frequently when quoting multi-room jobs. A styled modal would match the rest of the interaction vocabulary.
- No fast path to regenerate cutlist after material or supplier changes. Must click Cutlist tab, then Generate. Two clicks every time materials change.

**Jordan (First-timer — new shop owner on 14-day trial):**
- L1/L2/W1/W2 now have tooltips at the point of use — this was Jordan's biggest confusion vector. Resolved.
- Trial badge now fires an info toast on click/tap — Jordan on a tablet sees the countdown detail. Resolved.
- After adding first room, the units table is empty with no guidance (zero-quantity nudge requires units to exist first). Jordan sees a blank panel with no path forward.
- The "Edge Abbreviation Reference" card in Import Cutlist is genuinely useful but lives in a tab Jordan may not visit until they try to import. The abbreviation context should appear at the edging dropdowns, not only in Import.

**Kobus (SA cabinet shop owner managing multiple jobs and suppliers):**
- Job status badge (DRAFT → INVOICED) directly serves Kobus managing a pipeline. Working well.
- Supplier change now fires an amber warning toast. Kobus switching between suppliers to compare quotes gets an explicit signal that all prices have updated. Resolved.
- `renameRoomPrompt()` uses native `prompt()` — Kobus with 6–8 rooms per job will hit this frequently.

---

## Minor Observations

- `saveJobDetails()` fires on every keystroke (Client, House, Address, Notes fields) and writes to localStorage with no visible "saved" confirmation. The job sync status pill only reflects Supabase saves, not localStorage saves. Users who type in the job details popover get no feedback that their data is persisted.
- `#job-bar > span:first-child { display: none !important }` mobile hide uses positional selector — fragile if job bar children are reordered. Low risk, cosmetic.
- The empty-state nudge ("Start here") also fires in rooms that have units from a different role's library but all at qty=0. For a superuser browsing a template section, this nudge is irrelevant and adds noise.
- `importState.label` persists across sessions within the view — if a user loads a second file without clearing the label, the old label prepopulates. Minor confusion risk on repeated imports.
- `aria-selected` absent on Users modal `role="tab"` buttons — active tab state is announced by class only, not by ARIA.
