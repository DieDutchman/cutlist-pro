---
target: dev.html
total_score: 31
p0_count: 0
p1_count: 2
p2_count: 2
timestamp: 2026-05-29T17-27-12Z
slug: cutlist-pro-dev-html
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast system solid. Save pill spins amber → green/red correctly. Job sync status clean. Trial badge has three urgency tiers. Job status badge (DRAFT/QUOTED/etc.) is a new addition — color-coded, clickable, integrates cleanly into the job bar. Remaining gap: `oninput="saveJobDetails()"` fires on every keystroke in the job details popover with no visible write confirmation — users typing in Client/House/Notes fields get no "saved" signal. |
| 2 | Match System / Real World | 3 | Language fluent for SA trade audience. PLAN [BETA] label now uses amber — the `title` tooltip is the only explanation. Job status labels (DRAFT, QUOTED, APPROVED, ORDERED, BUILT, INVOICED) are natural trade vocabulary. edging codes (L1/L2/W1/W2) still unexplained at the point of use. |
| 3 | User Control and Freedom | 4 | All three Edit Units editor delete buttons (`editorDeleteUserUnit`, `deleteUnit`, `deleteBuiltinUnit`) now use `confirmAction()`. The only remaining `_confirmPending` is in `resetUnit()` — a non-destructive "reset to default" action where the pattern is less harmful and arguably appropriate (reset, not permanent delete). Modal close, Escape, undo toast on archive — all present. This heuristic has no remaining P1 gaps. |
| 4 | Consistency and Standards | 3 | `.btn` now uses Barlow at 13px/0.5px letter-spacing — the Oswald/10px mobile override is gone. The header ghost buttons (Quotes, Clear All) now use the same font system as the job bar buttons. Summary ghost button removed from header. Minor residual: the job bar's inline-style buttons (`SAVE JOB`, `NEW JOB`, `PLAN [BETA]`, `DELETE`) and the header `.btn.btn-ghost` buttons are still two separate styling subsystems — both use Barlow but one via `.btn` class, the other via inline style attributes. Not broken, but not fully unified. Dead code: `border-left-color:var(--amber)` inline on the "All Units Combined" `cv-unit-card` div (line 19333) still present — `.cv-unit-card` has no `border-left` CSS property, so this style never renders. Same pattern on the Sheet Optimizer "Oversized" `.opt-stat` at line 26494. |
| 5 | Error Prevention | 3 | All three editor delete buttons now use `confirmAction()` — the P1 double-click trap is fully closed. Main flow destructive actions: all wrapped. `resetUnit()` still uses `_confirmPending` but reset is a recoverable action (defaults are known). Supplier Prices: stock/full-sheet/special-order toggles have `title` attributes explaining behavior. Min-sheets input has tooltip. Solid. |
| 6 | Recognition Rather Than Recall | 3 | Summary promoted to primary Tools row — no longer buried in More. Users can see it without hunting. More dropdown now contains only genuinely secondary tools (Supplier Prices, My Costs, Builder, Import, Imported Cutlist, Job P&L). Tools row is 7 items (Panels, Cutlist, Quote, Sheet Optimizer, Edit Units, Summary, Costing) — approaching cognitive limit but acceptable given domain density. L1/L2/W1/W2 edging labels in the parts editor still have no `title` or inline hint. Archive disclosure widget for hidden user units still has no visible label until toggled — users who archive a unit must remember the bar exists below. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts. No bulk actions. No saved-template quick-access from unit rows. Job status badge adds one new workflow affordance (mark job as QUOTED/APPROVED etc.) which is meaningful for multi-job power users. Still no fast path to regenerate cutlist after material changes without switching to the Cutlist tab. Summary is now one click (in primary row) rather than two (through More) — genuine efficiency gain for Alex's session flow. |
| 8 | Aesthetic and Minimalist Design | 3 | Header now has exactly two ghost buttons (Quotes, Clear All) — the duplicate Summary ghost button is gone. Job bar has clean amber/neutral system throughout: PLAN [BETA] amber confirms. The job status badge introduces a third semantic color role (green for APPROVED/BUILT, blue for QUOTED, amber for DRAFT, red for ORDERED) — this is intentional and works as a status vocabulary. Dead code: the `border-left-color:var(--amber)` inline on `cv-unit-card` and `border-left-color:#d4583a` on the Sheet Optimizer oversized stat are harmless but cluttering. Tools row at 7 items is readable. |
| 9 | Error Recovery | 2 | Toast replaces blocking alerts. Save fail fires toast but no retry affordance. Import form cleared on error (data lost). No field-level error pointing — toasts name the problem but do not scroll to or highlight the offending element. No change from previous run. |
| 10 | Help and Documentation | 1 | L1/L2/W1/W2 edging labels: still no `title` attributes. Sheet Optimizer inputs (kerf, edge trim, rotation): still no tooltips. Supplier selector: no `title` explaining that changing active supplier updates all material cost lines. No guided post-room-add nudge ("now add your first unit") — welcome screen drops the user but post-room state is silent. Trial countdown hover-only — touch users never see it. No change from previous run. |
| **Total** | | **31/40** | **Good — closing in on Very Good** |

---

## Anti-Patterns Verdict

**LLM assessment**: The app no longer reads as AI-generated. The amber-on-dark trade tool aesthetic is coherent and now more internally consistent following the `.btn` typography unification. The two-row nav (Rooms + Tools) is structurally sound and now better justified — 7 tools in the primary row is the right number for this domain. The job status badge (DRAFT/QUOTED/APPROVED/ORDERED/BUILT/INVOICED) is a genuinely trade-appropriate addition that fits the vocabulary.

The Summary ghost button removal from the header is the cleanest signal of intentional editing in this diff — there is a visible "someone made a deliberate choice here" quality to the reduction. The interface is getting tighter.

Remaining noise: two pieces of dead CSS code (`border-left-color:var(--amber)` on `cv-unit-card`, `border-left-color:#d4583a` on `.opt-stat`) have no visual effect but signal incomplete cleanup. Side-stripe borders (3px left-accent) still appear in `.editor-unit-item.active`, the alert callout at line 22552, and the `cv-section-sep` region markers at lines 259 and 1911 — these are semantically meaningful (active selection highlight, warning callout) and not purely decorative, which is the distinction.

**Deterministic scan**: CLI detector not available (`bundled detector not found` from detect.mjs). Manual review substituted. Dead code confirmed at lines 19333 and 26494 (inline `border-left-color` with no matching CSS `border-left` property). No false positives to flag.

**Visual overlays**: Browser automation unavailable. Overlay injection not attempted.

---

## Overall Impression

Three of the five shipped fixes land cleanly on the scorecard. The Edit Units delete buttons are now consistent with the rest of the app — that closes the last `_confirmPending` issue on destructive actions. Summary promoted to the primary nav row is immediately visible as a quality-of-life improvement for the normal job session. `.btn` switching to Barlow is infrastructure-level hygiene that removes the Oswald/Barlow split from action buttons.

The two remaining unchanged heuristics (Error Recovery and Help/Documentation) are the ceiling. Both are solvable in a single focused session. Help/Documentation at 1/4 has been unchanged across three critique passes — the 8–10 `title` attribute additions (L1/L2/W1/W2, Sheet Optimizer, supplier selector) remain the highest-leverage single-session fix available.

Score moves from 28 to 31: three points gained across H3 (+1), H4 (+0 but gap closed), H5 (+0 but gap closed), H6 (+0 but Summary now primary), and most meaningfully the three heuristics where cumulative small improvements now push H3 to 4 and H6 holds a solid 3.

---

## What's Working

1. **Edit Units editor delete is now fully consistent.** `editorDeleteUserUnit`, `deleteUnit`, and `deleteBuiltinUnit` all use `confirmAction()`. The only `_confirmPending` left in the codebase is in `resetUnit()` — a recoverable non-delete action where the pattern is less harmful. The inconsistency flag from every previous critique is closed.

2. **Summary in primary nav is the right call.** Moving Summary from the More dropdown to the primary Tools row is the most impactful layout change in this diff. Alex checking the summary after every material change no longer costs an extra click per session. The header "☰ Summary" duplicate ghost button is gone — the reduction reads as intentional editing, not just addition.

3. **`.btn` typography is now a coherent system.** Barlow at 13px/0.5px letter-spacing with no `!important` mobile override. The Oswald/10px Condensed problem that appeared in every previous critique is resolved. The header buttons and job bar buttons now share the same type voice.

---

## Priority Issues

**[P1] Help/Documentation floor unchanged at 1/4 — 8 one-line fixes available**
L1/L2/W1/W2 edging labels in the parts editor have no `title` attribute. The Sheet Optimizer inputs (kerf, edge trim, rotation flag) have no tooltip. The supplier selector dropdown in the job bar has no `title` explaining that changing the active supplier updates every cost line in the job. The trial countdown badge has a hover `title` but touch users never see the countdown consequence explanation until the full-screen block fires.
**Fix:** Add `title="L1 = leading length edge (top)"` etc. on the four `<label>` elements in `addon-field`. Add `title="..."` on the three Sheet Optimizer inputs. Add `title="Changing supplier updates all board and edging prices in this job"` on `#supplier-select`. Eight one-line changes, zero structural change.
**Suggested command:** `/impeccable clarify dev.html`

**[P1] Error recovery still has no field-level pointing or retry affordance**
Save failures surface as a toast but the user must manually click SAVE JOB again — no retry button in the toast, no visual indicator on the save button. Import errors clear the form, losing the user's file selection. No inline field-level error hints for any form across the app.
**Fix for save fail:** Add a "Retry" action to the error toast — `showToast('Save failed — retry?', 'error', { action: { label: 'Retry', fn: saveJobToCloud } })`. For import, preserve the file input on error rather than clearing it. Field-level errors are out of scope for a one-pass fix.
**Suggested command:** `/impeccable harden dev.html`

**[P2] Dead CSS code in two places — cosmetic but signals incomplete cleanup**
`border-left-color:var(--amber)` inline on the `cv-unit-card` "All Units Combined" div at line 19333 has no effect because `.cv-unit-card` has no `border-left` CSS property. Same pattern: `border-left-color:#d4583a` inline on the Sheet Optimizer "Oversized" `.opt-stat` at line 26494 — `.opt-stat` has no `border-left` property.
**Fix:** Remove both inline `style="border-left-color:..."` attributes. Two deletions, no visual change.
**Suggested command:** `/impeccable polish dev.html`

**[P2] `resetUnit()` still uses `_confirmPending` double-tap — inconsistent pattern**
`resetUnit()` at line 8677 uses the silent button-text flip with a 3-second auto-reset, not `confirmAction()`. Reset is recoverable (unit returns to factory defaults), but the pattern is inconsistent with every other confirmation in the app and provides no accessible announcement.
**Fix:** Replace with `if (!(await confirmAction('Reset this unit to its factory dimensions? Custom overrides will be lost.', { confirmLabel: 'RESET' }))) return;`. One function, 8 lines.
**Suggested command:** `/impeccable harden dev.html`

**[P3] Supplier selector has no tooltip — silent impact on all cost lines**
Changing the active supplier in the job bar affects every board and edging price in the job, but the `<select id="supplier-select">` has no `title` attribute. A user who accidentally selects the wrong supplier will see silent quote errors with no explanation of why costs changed.
**Fix:** Add `title="Active supplier — board and edging prices update when you change this"` on the `<select>` element. One attribute.

---

## Persona Red Flags

**Alex (Power User — experienced cabinet maker quoting a full kitchen):**
- Summary is now one click (primary nav). This was Alex's biggest friction point in the previous two critiques. It is resolved.
- No keyboard shortcuts still. Alex navigating Panels → Cutlist → Quote → Summary is four mouse clicks per review cycle, every session.
- `resetUnit()` in the Edit Units editor still uses the silent double-tap. Alex edits units frequently — a mis-reset loses custom dimension work with no warning dialog.
- No fast path to regenerate the cutlist after a material or supplier change. Must click the Cutlist tab, then click Generate Cutlist. Two clicks every time.

**Jordan (First-timer — new shop owner on 14-day trial):**
- Welcome screen has the "Add Your First Room" CTA. After adding the room, the panel is silent — no "now add units from the list" nudge below the empty room state. Jordan sees an empty table with no guidance.
- L1/L2/W1/W2 edging labels have no explanation anywhere. Jordan will skip edging entirely or set it wrong, then wonder why the supplier's cutlist doesn't match.
- Trial countdown badge shows time remaining but the consequence of expiry (full-screen block) is only explained on hover (`title` attribute) — touch users on mobile never see this. Jordan on a tablet has no warning that access is being metered until the block fires.
- The DETAILS button dot indicator is a good hint, but no tooltip or label explains what "details" contains. Jordan may ignore it for multiple sessions.

**Kobus (SA cabinet shop owner managing multiple jobs and suppliers):**
- Job status badge (DRAFT/QUOTED/APPROVED/ORDERED/BUILT/INVOICED) is directly useful for Kobus managing a pipeline of active jobs. This is a genuine improvement since the last critique.
- Changing the active supplier in the job bar affects every price line silently. Kobus switching between two suppliers to compare quotes will generate silent cost changes with no confirmation or visual bridge connecting the supplier dropdown to the materials cost table.

---

## Minor Observations

- Dead code confirmed at line 19333: `<div class="cv-unit-card" style="border-left-color:var(--amber)">` — `.cv-unit-card` has no `border-left` property in its CSS definition. Inline style has zero visual effect. Safe to remove.
- Dead code confirmed at line 26494: `<div class="opt-stat" style="border-left-color:#d4583a">` — `.opt-stat` CSS at line 2389 has no `border-left` property. Same situation.
- `#job-bar > span:first-child { display: none !important }` mobile hide still uses positional selector (line 2523) — fragile if the job bar children are reordered. A `class="job-bar-label"` on the "Job" span would be more robust. Low risk, cosmetic fix.
- More dropdown `role="menu"` on `#more-panel` but the items inside are `<button>` elements without `role="menuitem"` — screen readers will announce these as buttons rather than menu items. Acceptable but not fully correct ARIA for a declared menu role.
- The job status menu items at lines 13070–13076 use `<div onclick=...>` instead of `<button>` elements — not keyboard-accessible without `tabindex` and `onkeydown`. `<button>` should be preferred for interactive elements.
- `resetUnit()` targets `.btn-danger-soft` by class selector (`document.querySelector('.btn-danger-soft')`) — this will select the first `.btn-danger-soft` in the DOM regardless of which unit editor row is active. In a list with multiple visible rows, this could reset the wrong unit. Should target by id or pass the button reference via `onclick="resetUnit('${id}', this)"`.
