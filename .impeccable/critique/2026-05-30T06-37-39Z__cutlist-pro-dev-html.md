---
target: dev.html
total_score: 35
p0_count: 0
p1_count: 1
p2_count: 2
timestamp: 2026-05-30T06-37-39Z
slug: cutlist-pro-dev-html
prev_score: 33
delta: +2
---
## Design Health Score

| # | Heuristic | Score | Δ | Key Issue |
|---|-----------|-------|---|-----------|
| 1 | Visibility of System Status | 4 | +1 | REGEN pill (amber, pulsing glow, appears when cutlist is stale) closes the fast-path staleness gap. `📋 DETAILS` button debounced-flashes green 500ms after last keystroke — the silent localStorage save complaint from the previous pass is fully resolved. Save pill, sync status, trial badge, and supplier-change toast all remain solid. |
| 2 | Match Between System and Real World | 3 | — | Language fluent for SA trade audience throughout. L1/L2/W1/W2 edge codes self-explain via ℹ popover at all three editor surfaces (Panels cutlist header, Cutlist tab header, Quote panel header). Job status vocabulary (DRAFT → INVOICED) appropriate. Edge abbreviation reference card in Import tab useful for first-timers but not surfaced at the edging dropdowns themselves — still a gap for Jordan. |
| 3 | User Control and Freedom | 4 | — | All destructive actions confirmed via `confirmAction()`. Rename flows (`renameRoomPrompt`, `renameMat`, `renameEdge`) now use `inputPrompt()` — keyboard-accessible, styled, dismissable. Archive has UNDO toast. Modal closes via Escape. No regressions. |
| 4 | Consistency and Standards | 4 | +1 | `renameRoomPrompt()`, board rename, and edging rename all replaced with `inputPrompt()`. `#more-panel` buttons now carry `role="menuitem"`. `aria-selected` wired dynamically in `showUsersTab()`. Remaining `prompt()` calls: `saveAddonPreset()` (line 9191) and `promptAddEdge()` (lines 17730/17732) — both admin-only, niche paths. Feedback cards changed from `border-left` to `border-top` category accent. |
| 5 | Error Prevention | 3 | — | Zero-qty nudge now fires only in user-mode (`isUserMode && units.length > 0 && _allQtyZero`), suppressing the noise on superuser template browsing. All destructive paths wrapped in `confirmAction()`. Two remaining `prompt()` calls in admin paths offer no input validation or styled cancel confirmation — niche but inconsistent. |
| 6 | Recognition Rather Than Recall | 4 | +1 | Post-room-add empty state is now a full guidance block: dashed-border panel with 📦 icon, "NO UNITS YET" heading, explanatory copy, and three inline CTAs (COPY FROM TEMPLATE / IMPORT UNIT / + NEW UNIT). Jordan no longer sees a blank table after adding a room. ℹ edge codes popover present at all editor surfaces. Archive bar labelled with count badge. Sort control visible when ≥2 units. |
| 7 | Flexibility and Efficiency | 3 | +1 | Alt+1–5 keyboard shortcuts live: Panels/Cutlist/Quote/Summary/Optimizer. Correctly suppressed inside inputs/textareas/selects. Tab tooltips document the shortcuts. REGEN pill is a single-click fast path after material/supplier changes, replacing the previous two-click cycle (tab switch + click Generate). No bulk actions yet; no saved-template quick-insert from unit rows. |
| 8 | Aesthetic and Minimalist Design | 4 | +1 | All five previously-flagged `border-left:3px solid` violations are gone: `.more-panel .tab.active` (now background tint only), `.editor-unit-item.active` (`border-left: none` explicit), `.qv-compare-row.active-row` (background tint), empty-state nudge (`border:1px solid` all-sides), and feedback cards (now `border-top:3px solid` category accent — top accent is semantically distinct from the banned left side-stripe). Remaining violation: builder shelf-crossing warning (line 22850) uses `border-left:3px solid #c07020` — contextually a warning callout in an admin-only builder, not a primary-flow element. Overall chrome is clean; amber-on-dark trade aesthetic internally consistent. No glassmorphism in primary flows (lightbox and unit-parts modal use `backdrop-filter` for functional overlay dimming, not decoration). |
| 9 | Error Recovery | 3 | — | Save-fail toast retains RETRY button with `persist:true`. Plan Import RETRY SAME FILE and AI cutlist import raw-state preservation both solid. No field-level error highlighting — toasts name the problem but do not focus the offending element. |
| 10 | Help and Documentation | 3 | +1 | Post-room-add empty state provides actionable onboarding at the moment of need. ℹ edge codes popover present at all L1/L2/W1/W2 editor surfaces. Sheet Optimizer controls have `title` attributes. Supplier selector has tooltip. Remaining gaps: no inline abbreviation reference at the edging dropdowns (only in Import tab and via ℹ on part headers); no searchable help; no guided tour. |
| **Total** | | **35/40** | **+2** | **Good → Very Good** |

---

## What Improved This Pass

### H1 +1 (3 → 4): Visibility of System Status
Two gaps from the previous report closed in a single pass. The REGEN pill (solid amber, bold, 1.8s pulsing glow, `display:none` until dirty) gives the most common post-edit action a permanent visual anchor — no more hunting for the Generate button after a supplier change. The `📋 DETAILS` green-flash (debounced 500ms, sustained 1.5s) converts a previously silent localStorage write into a visible confirmation without cluttering the UI during active typing. Together these two signals cover the two most frequent "did that actually save?" moments in a quoting session.

### H4 +1 (3 → 4): Consistency and Standards
The `prompt()` cleanup ships on the three highest-traffic rename flows. `renameRoomPrompt()` was called by Kobus every session with 6–8 rooms. Board and edge rename follow the same pattern. The result is a fully consistent modal vocabulary for all rename operations — styled, keyboard-accessible, dismissable by Escape, and returning focus to the triggering button. ARIA also improves: `role="menuitem"` correctly scopes the More panel's children, and `aria-selected` in the Users modal means screen readers can now announce the active tab.

### H6 +1 (3 → 4): Recognition Rather Than Recall
The post-room-add empty state is the single biggest onboarding win in this pass. The previous pattern (blank units table) left Jordan with no direction after adding a first room. The new block is explicit: icon, label, explanatory copy, and three inline action buttons pointing to the three available unit-entry paths. There is no ambiguity about what to do next.

### H7 +1 (2 → 3): Flexibility and Efficiency
Alt+1–5 breaks the power-user bottleneck. Alex reviewing Panels → Cutlist → Quote → Summary can now do that round trip without touching the mouse. The shortcuts are documented in tab tooltips (discoverable via hover without any additional help text). The REGEN pill adds the second efficiency improvement: one click to regenerate from anywhere in the Cutlist tab, replacing the two-click cycle.

### H8 +1 (3 → 4): Aesthetic and Minimalist Design
All five flagged `border-left:3px` violations are resolved. The feedback-card fix is the most complete — switching from `border-left:4px solid ${catColor}` to `border-top:3px solid ${catColor}` preserves category colour coding without the side-stripe tell. Active selection states (editor item, quote compare row, more-panel tab) now use background tints exclusively. The visual language is now internally consistent on this dimension.

### H10 +1 (2 → 3): Help and Documentation
The post-room-add empty state is Help and Documentation as much as it is Recognition — it documents the three unit-entry paths at the precise moment the user needs them. The ℹ edge codes popover across all editor surfaces means the L1/L2/W1/W2 question is self-answered wherever edging is edited.

---

## Anti-Patterns Verdict

**LLM assessment**: The interface is now clean of the left-stripe pattern in all primary-flow surfaces. The feedback card conversion (`border-left` → `border-top`) is well-executed. The only remaining `border-left:3px solid` instance (line 22850) is a builder-specific shelf-crossing warning in an admin tool — not a primary-flow element and not part of the banned "active selection" or "alert callout" patterns in the same way.

The new REGEN pill animation (`regenPulse`, 1.8s, box-shadow expansion) is functionally correct and visually appropriate given the trade context — amber pulse on a tool that needs attention. No `prefers-reduced-motion` query exists in the codebase — the pulse will run for users who have OS-level motion reduction active. This is a minor accessibility gap worth noting.

**Deterministic scan**: No `background-clip:text` gradient text found. No glassmorphism in primary flows. `backdrop-filter:blur` appears on lightbox overlay and unit-parts modal background — functional dimming, not decorative frosting. No hero-metric template. No identical card grids. No `border-left-color` dead-style inline attributes.

---

## Priority Issues

**[P1] `promptAddEdge()` and `saveAddonPreset()` still use native `prompt()`**
Two admin-only flows use native `prompt()` (lines 9191, 17730, 17732). While less frequent than the rename flows, they are inconsistent with the rest of the modal vocabulary and inaccessible (focus returns to document root on close, not the triggering button).
- `saveAddonPreset()`: one `prompt()` call for the preset name.
- `promptAddEdge()`: two sequential `prompt()` calls (size, then price) — the two-prompt chain is especially disorienting.
**Fix:** Replace with `inputPrompt()` for single-field cases; for `promptAddEdge()`, build a two-field inline modal or a simple step-through using two sequential `inputPrompt()` awaits.

**[P2] Builder shelf-crossing warning uses `border-left:3px solid #c07020` (line 22850)**
The only remaining `border-left:3px` violation. It is in the Builder tab (admin/superuser only) and appears only when a shelf physically crosses a divider — a contextual warning callout. Replace with a `border-top` accent or background-only tint.
**Fix:** Change `border-left:3px solid #c07020` to `border-top:3px solid #c07020` or remove the border and increase the background tint.

**[P2] No `prefers-reduced-motion` query for pulsing REGEN animation**
`regenPulse` (1.8s box-shadow pulse on the REGEN pill) runs unconditionally. Users with OS-level motion reduction (vestibular disorders, motion sensitivity) see persistent animation. WCAG 2.3.3 (AAA) recommends honouring this preference; WCAG 2.1 requires no animation that flashes more than 3 times/second (not violated here, but the spirit is clear).
**Fix:** Add `@media (prefers-reduced-motion: reduce) { #cutlist-regen-pill { animation: none; } }` to the stylesheet.

---

## Persona Red Flags

**Alex (Power User):**
- Alt+1–5 now cover all five primary tabs without mouse — the review cycle bottleneck is resolved.
- REGEN pill eliminates the two-click regeneration loop after every material change.
- `saveAddonPreset()` still uses native `prompt()` — Alex uses addon presets frequently when managing plant-on configurations across rooms.

**Jordan (First-timer on 14-day trial):**
- Post-room-add empty state now provides explicit guidance. The "NO UNITS YET" block with three action buttons is the onboarding moment Jordan needed.
- L1/L2/W1/W2 are still not self-explained at the edging dropdowns in the unit parts editor — only available via the ℹ button on column headers (which requires noticing the small button) and in the Import tab reference card.

**Kobus (Multi-job SA shop owner):**
- Room rename now uses the styled `inputPrompt()` modal. Kobus with 6–8 rooms per job gets a consistent, keyboard-friendly rename experience.
- Supplier-change amber toast remains solid — the price-update signal is clear.

---

## Minor Observations

- `@keyframes regenPulse` has no `prefers-reduced-motion` guard — affects users with motion sensitivity.
- `promptAddEdge()` uses two sequential native `prompt()` calls — the chain is disorienting (second prompt appears only if first is accepted, with no way to go back).
- `saveAddonPreset()` at line 9191 is the last native `prompt()` in a user-facing flow.
- `aria-controls` not wired between tab buttons and their panel IDs in either the main nav or the Users modal — screen readers get `role="tab"` and `aria-selected` but not the explicit panel association.
- Return focus on modal close not implemented — closing `confirmAction()`, `inputPrompt()`, or the Users modal does not return focus to the triggering element. Minor a11y gap for keyboard-only users.
- `importState.label` persists across sessions — reloading the Import tab without clearing shows the previous file label. Low confusion risk but worth noting.
