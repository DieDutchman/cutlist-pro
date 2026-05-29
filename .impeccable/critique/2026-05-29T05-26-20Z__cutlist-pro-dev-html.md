---
target: dev.html
total_score: 26
p0_count: 0
p1_count: 2
p2_count: 2
timestamp: 2026-05-29T05-26-20Z
slug: cutlist-pro-dev-html
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast system fully replaces alert(). Save pill now shows icon + color coding (amber spinning for saving, green for success, red for error). Active tab state clear. Minor: the `#job-sync-status` element still carries an inline `style="font-size:10px..."` attribute on the HTML element that conflicts with the now-class-driven CSS; no functional impact but worth cleaning. |
| 2 | Match System / Real World | 3 | Language remains fluent for the SA trade audience. "Linne Kas" / "Badkamer" still Afrikaans — acceptable for target. No regression here. |
| 3 | User Control and Freedom | 2 | Delete Job now uses `confirmAction()` (good). Clear All still uses the silent double-click pattern — first click changes button color and sets `_confirmPending`; no toast, no popup, no timer. No undo anywhere. Modals have close buttons; Escape key not wired. |
| 4 | Consistency and Standards | 3 | `alert()` gone — removes the biggest inconsistency. Side-stripe border reduced from 20+ instances to ~9, now semantically scoped (active list items, More panel active state, compare rows, warning banners). `.btn` class still uses Oswald at 13px; mobile override drops it to 10px via `!important` — Oswald at 10px is still strained. Section headers switched to Barlow in responsive breakpoints but remain Oswald at 13px in the primary stylesheet. Font strategy improved but not fully resolved. |
| 5 | Error Prevention | 2 | confirmAction() wraps Delete Job, template delete, preset delete, seed operation — correct. Clear All still lacks a confirmation dialog. The job bar still packs 10+ elements flat; easy to fat-finger wrong field. No autosave indicator beyond the save pill (which is good progress). |
| 6 | Recognition Rather Than Recall | 3 | Nav collapsed from 18 visible tabs to 5 primary + More dropdown. Users no longer need to scan two full rows. The More trigger correctly marks itself `has-active` when a secondary tab is open. Dropdown items labeled clearly. Loss: discoverability of the 7 More items requires opening the dropdown — users won't know Sheet Optimizer or Builder exist unless they explore. |
| 7 | Flexibility and Efficiency | 2 | No change — no keyboard shortcuts, no bulk actions, no saved-template quick-access from unit rows. The More dropdown actually slightly reduces efficiency for power users of secondary tools (extra click). |
| 8 | Aesthetic and Minimalist Design | 3 | Side-stripe removal is the biggest visual improvement in this pass. Section headers, unit cards (cv-unit-card), stat blocks (opt-stat), and section heads (cv/qv/bldr) no longer use left-rail accents — they use border-bottom or background instead. Remaining border-left uses are semantically correct: active selection in list, active item in More panel, compare-row selection, warning callout, structural panel divider. Job bar still dense but the status cluster now groups sync + trial + email behind a visual divider with margin-left:auto — meaningful reduction in perceived density. |
| 9 | Error Recovery | 2 | Toast replaces alert for error display. Errors now appear in-context rather than blocking the page. Still no inline field-level errors — error toasts don't point to the offending field. Save fail still fires a toast but offers no retry affordance. Step up from score 1 but not fully resolved. |
| 10 | Help and Documentation | 1 | No change. No tooltips on complex fields (edging notation, material codes). No contextual help. The `title` attribute appears on a handful of icon-only buttons (client-clear, client-edit, theme toggle) but not on the complex domain fields that need it most. |
| **Total** | | **26/40** | **Acceptable — improvements needed** |

---

## Anti-Patterns Verdict

**LLM assessment**: The app no longer triggers "AI-generated" recognition on first glance. The amber-on-dark trade tool aesthetic reads as deliberate and appropriate for the workshop environment. The most glaring anti-pattern (side-stripe borders as universal accent) has been substantially cleaned up — sections now distinguish themselves through background tint and border-bottom rather than left-rail amber, which significantly reduces visual noise.

What remains in the "competent but not distinctive" category: The nav bar still pairs two labeled rows (Rooms + Tools) with a horizontal divider — the spatial hierarchy is structurally better post-collapse but the two-row format itself still signals "grew organically" rather than "was designed." The job bar's cluster grouping is an improvement, but it still stretches 12-15 elements across a single flex row, which reads as a toolbar rather than a product header.

**Deterministic scan**: CLI detector engine not installed in this environment. Manual review substituted. No false positives to flag.

**Visual overlays**: No browser automation available. Overlay injection not attempted.

---

## Overall Impression

The three fixes landed well. Going from 19 to 26 is a genuine improvement — the interface now reads as a coherent dark tool rather than a collection of amber-accented fragments. The toast system in particular removes the most jarring UX failure: blocking browser dialogs over a styled dark UI. The nav collapse achieves its goal: 18-item tab scan is gone.

The biggest remaining opportunity is a two-way push: (1) finish the typography discipline — Oswald at 13px on buttons gets overridden to 10px on mobile, and the `.btn` class should just use Barlow for UI labels; (2) give the job bar a proper structural treatment rather than a flat toolbar — context fields (client, address, notes) should collapse or move, not sit permanently in the header.

---

## What's Working

1. **Toast system is well-crafted.** The four types (success/error/warning/info) with correct color theming for both dark and light/supplier themes, a spinning icon on save, the close button, and `confirmAction()` replacing blocking dialogs — this is production-quality feedback infrastructure. The `aria-live="polite"` on the container is correct.

2. **Side-stripe reduction meaningfully restores hierarchy.** The amber left rail now signals "active/selected" in list contexts and "warning" in callout contexts — two clear semantic purposes, down from 20+ decorative uses. Section headers with `border-bottom` read cleanly.

3. **More dropdown implementation is technically sound.** `aria-haspopup`, `aria-expanded`, `role="menu"`, correct active-state propagation (`has-active` on the trigger when a child is selected), mobile positioning fix (`right: 6px`). The tab count still works. No regressions from the nav restructure.

---

## Priority Issues

**[P1] Clear All still uses undiscoverable double-click confirmation**
The `_confirmPending` flag pattern — first click silently changes button text/color, second click executes — is not communicated to users, is not time-limited, and produces no accessible feedback. A user who clicks once and then navigates away has no idea they've armed the button. A user who double-clicks fast clears the job with no warning.
**Fix:** Replace with `confirmAction('Clear all units and panels? This cannot be undone.', { confirmLabel: 'CLEAR ALL' })`. One line of JS, consistent with the rest of the app. Remove `_confirmPending` entirely.
**Suggested command:** `/impeccable harden dev.html`

**[P1] Job bar remains a flat toolbar — context fields always visible**
The job bar now has a visual divider separating utility cluster from status cluster, which helps. But it still exposes client, stand/nr, address, and notes as persistent flat inputs in the header alongside the primary controls. On screens below ~1300px this wraps to 2-3 rows. The density is better organized but not reduced.
**Fix:** Move client/address/notes to a collapsible "Job Details" panel triggered by a single "pencil" icon button next to the job selector. The header then shows: Job selector + SAVE JOB + NEW JOB + status badge + [status cluster]. ~5 items instead of 15.
**Suggested command:** `/impeccable layout dev.html`

**[P2] Oswald on `.btn` drops to 10px on mobile via `!important`**
The `.btn` class defines Oswald at 13px. Two media-query overrides reduce it to 11px then 10px. Oswald at 10px with `letter-spacing: 1px` is at the edge of legibility on non-retina mobile screens. The "Generate Cutlist" button, "Clear All", and modal action buttons all hit this in the 480px breakpoint.
**Fix:** Change `.btn` font-family from Oswald to Barlow. Buttons are UI controls, not display headings. Keep Oswald only for the `.logo`, section titles, and display-scale headings (≥14px). The letter-spacing on `.btn` can drop from `2px` to `0.5px` accordingly.
**Suggested command:** `/impeccable typeset dev.html`

**[P2] More dropdown buries primary workflow tools**
"Sheet Optimizer," "Summary," and "Builder" are workflow tools that users hit during every job — not admin/config utilities. Moving them behind More adds a click for the most common non-quote operations. "Edit Units" in More is hit every time a cabinet maker adjusts a custom unit. "Supplier Prices" and "My Costs" are admin tasks that could stay in More, but the workflow tools should be in the primary bar.
**Fix:** Move Sheet Optimizer and Summary to the primary tools bar. Move only admin/config tabs (Supplier Prices, My Costs, Builder, Import) to More. This gives primary bar: Panels, Cutlist, Quote, Costing, Sheet Optimizer, Summary + More.
**Suggested command:** `/impeccable shape nav-restructure`

**[P3] Page title still reads "Cutlist Generator"**
The `<title>` tag is `Cutlist Generator`. The header logo says "CutList Pro". The brand is not reflected in the browser tab, bookmark, and print header. One-line fix with zero risk.
**Fix:** Change `<title>Cutlist Generator</title>` to `<title>CutList Pro</title>`.

---

## Persona Red Flags

**Alex (Power User — experienced cabinet maker quoting a full kitchen):**
- Clear All double-click pattern is a trap: Alex works fast. He will accidentally clear a job and lose 20 minutes of work with no undo. This is the highest real-world risk remaining.
- Sheet Optimizer is now in More — Alex uses this after every material change. One extra click per session adds up over a full job day.
- No keyboard shortcut to jump to Cutlist or Quote after adding units. Still requires mouse navigation.
- "Edit Units" in More means every time Alex edits a custom unit, he must open a dropdown first.

**Jordan (First-timer — new shop owner on trial):**
- Welcome screen ("WELCOME TO CUTLIST PRO / Start by adding your first room") is good — this is an improvement. But after adding the first room and units, there is no next-step prompt: "Now go to Cutlist to generate your cut list." The workflow sequence is not communicated.
- More dropdown is invisible until clicked. Jordan will use only the 5 visible primary tools and never discover Builder, Sheet Optimizer, or Import.
- The `[BETA]` tag on Plan Import remains as "📐 PLAN [BETA]" in the job bar with no tooltip explaining what it does. Jordan will click it and be surprised by the PDF upload interface with no preparation.
- Trial countdown badge still has no "what happens when this expires" context inline.

**Kobus (SA cabinet shop owner, manages multiple jobs):**
- Supplier selector relationship to per-unit material dropdowns still unexplained. The supplier selector in the job bar affects pricing, but nothing visually connects it to the material rows in the quote.
- The job status pill ("● DRAFT") is now a clickable button with a dropdown — a genuine improvement over the previous monochrome badge. But the status menu and status-change workflow are not discoverable without clicking.

---

## Minor Observations

- The `#job-sync-status` element has a redundant inline style attribute (`style="font-size:10px;color:var(--text-muted);font-family:'JetBrains Mono',monospace"`) that the new CSS class system now overrides. The inline style is dead code — clean it up.
- `clearAll()` button's color-change pattern (turns amber text on first click) uses direct DOM manipulation of `btn.style.color` and `btn.textContent` without a class toggle — inconsistent with how the rest of the app applies state.
- The `cv-unit-card` in the Costing tab still sets `border-left-color:var(--amber)` inline on the "all units combined" card (line 19173). This is a leftover from the side-stripe cleanup — the card itself has no `border-left` in its CSS class, so this style has no visual effect. It is dead code.
- The `opt-stat` stat blocks in Sheet Optimizer still have `border-left-color` set dynamically for the "Oversized" stat (line 26332) — this is the one correct usage (semantic warning state). It is fine.
- The job bar "Job" label (`<span>Job</span>`) is correctly hidden at mobile via `#job-bar > span:first-child { display: none !important }`. However, this relies on position (`:first-child`) rather than an ID or class — fragile to reordering.
- The feedback button unread dot uses `font-family:'JetBrains Mono'` at 9px for the number badge — appropriate (monospace numeric badge is a valid pattern at that scale).

---

## Questions to Consider

- Clear All is the one remaining blocking risk. It has stayed unreplaced through multiple passes — is there a reason the `confirmAction` pattern wasn't applied here, or was it simply missed?
- "Edit Units" is in More, but it contains the custom unit builder — arguably the most powerful feature in the app. Should it be promoted to a visible tab, or does the "Builder" tab in More serve the same purpose?
- The welcome screen has a clear call to action ("Add Your First Room"). Does the flow continue with the same clarity after the first room is added? A "What's next" nudge on the empty room could close the loop.
