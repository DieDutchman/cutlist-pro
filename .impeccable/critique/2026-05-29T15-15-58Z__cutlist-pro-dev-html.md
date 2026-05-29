---
target: dev.html
total_score: 28
p0_count: 0
p1_count: 2
p2_count: 2
timestamp: 2026-05-29T15-15-58Z
slug: cutlist-pro-dev-html
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toast system fully replaces alert(). Save pill shows spinning amber icon → green/red correctly. Job sync status element is now clean HTML (no inline style remnant found). Active tab state clear. Trial badge now has three urgency tiers (green/amber/red) with clickable action. Minor gap: no inline "saving…" feedback on the job-details popover fields themselves — they fire `saveJobDetails()` on `oninput` with no visible write confirmation. |
| 2 | Match System / Real World | 3 | Language fluent for SA trade audience. "Linne Kas" / "Badkamer" Afrikaans — acceptable. Edging codes, unit IDs, and mm dimensions all appear consistently without awkward qualifiers. The PLAN [BETA] label in the job bar is visible but `title` text ("AI extracts room dimensions") is the only explanation — no label or badge that tells a new user what plan means in context. |
| 3 | User Control and Freedom | 3 | Clear All now correctly calls `confirmAction('Clear all units and panels?')` — the P1 double-click trap is gone. Delete Job uses `confirmAction`. New Job uses `confirmAction`. Archive Unit gives a timed UNDO toast with Restore button — genuine undo affordance. Modal close buttons present. Escape closes job-details popover and More dropdown. Remaining gap: `editorDeleteUserUnit`, `deleteUnit`, and `deleteBuiltinUnit` in the Edit Units editor still use the undiscoverable `_confirmPending` pattern — silent button-text flip with a 3-second timer, no toast, no accessible announcement. These paths are less-travelled (editor-only), but the inconsistency persists. |
| 4 | Consistency and Standards | 3 | `alert()` fully gone. Confirmation UI is `confirmAction()` everywhere in the main flow. Font strategy: `.btn` still uses Oswald at 13px, overridden to 10px via `!important` at 480px. Buttons in the job bar and modals use Barlow inline (`font-family:'Barlow',sans-serif`) directly on style attributes — two parallel button idioms live side-by-side. Not broken, but inconsistent. The `cv-unit-card` on the "All Units Combined" summary card still has a dead inline `style="border-left-color:var(--amber)"` with no matching `border-left` CSS property — leftover dead code. |
| 5 | Error Prevention | 3 | `confirmAction()` now wraps Clear All, Delete Job, New Job (unsaved changes), template delete, preset delete, seed, board delete, supplier delete, merge, and all remove-unit paths in the main panel. Material merge fires if a rename collision is detected. PLAN BETA upload has a `title` tooltip explaining what it does. Remaining gap: the Edit Units editor's delete buttons (`editorDeleteUserUnit`, `deleteUnit`, `deleteBuiltinUnit`) use the silent `_confirmPending` double-tap — these paths were not updated when Clear All was fixed. |
| 6 | Recognition Rather Than Recall | 3 | Nav collapsed from 18 tabs to 6 primary + More. Summary is still in More (also duplicated in header as a ghost button). Edit Units promoted to primary bar — better. Sheet Optimizer in primary bar — better. More still buries Summary (needed after every completed quote), Builder, and Import. The archive bar ("restore hidden units") uses a chevron disclosure widget with no label visible until toggled — users who archive a unit must remember the archive bar exists below. The `📋 DETAILS` button in the job bar now shows an amber dot indicator when there are details — good discoverability signal. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts for any primary action. No bulk actions. No saved-template quick-access from unit rows. The More dropdown still adds one click for Summary, Builder, and Import — all used during a normal job session. Edit Units is now one click (promoted). The archive/restore pattern for user units is the only "soft delete" affordance, and only in user-mode. Power user Alex still has no fast path to regenerate the cutlist after changing materials. |
| 8 | Aesthetic and Minimalist Design | 3 | Header still has three ghost buttons (Quotes, Clear All, Summary) plus a primary button (Generate Cutlist) — the Summary button is a duplicate of the Summary tab in More. The job bar is now measurably cleaner: 7 visible items (Job label, job selector, DETAILS button, status badge, SAVE JOB, NEW JOB, PLAN BETA) plus a muted status cluster. That is a significant improvement from 15. The remaining noise: the PLAN [BETA] button's purple accent (rgba(120,80,200,0.12) border) is a third color introduction in an amber/neutral system. The amber/purple pairing reads as unresolved — neither harmonious nor deliberately contrasting. |
| 9 | Error Recovery | 2 | Toast system replaces blocking alerts — errors surface in-context. No inline field-level errors — error toasts name the problem but don't point to the offending field. Save fail fires a toast with no retry affordance (user must manually click SAVE JOB again). Import errors in the AI plan import modal surface as toast but the form is cleared on error, not preserved. Step up from score 1 but field-level error pointing still absent. |
| 10 | Help and Documentation | 1 | No contextual help. `title` attributes appear on icon-only utility buttons (theme toggle, feedback, PLAN BETA) but are absent from the complex domain fields that need them most: edging notation (what does L1/L2/W1/W2 mean?), material codes, the Sheet Optimizer inputs (kerf, edge trim, rotation). No tooltip on the supplier selector explaining what changing it affects. No guided onboarding after the first room is added — welcome screen drops the user at an empty room with no "now add your first unit" nudge. |
| **Total** | | **28/40** | **Good — address weak areas** |

---

## Anti-Patterns Verdict

**LLM assessment**: The app no longer reads as AI-generated on first glance. The amber-on-dark trade tool aesthetic is coherent and earned. Side-stripe borders are semantically contained — active selection in lists, warning callouts — not decorative repetition. The biggest remaining visual flag is the PLAN [BETA] button's purple accent (`rgba(120,80,200,0.12)` border + `#b899f5` text) in a job bar that otherwise speaks entirely in amber/neutral. It was clearly added as a one-off and reads as an external element dropped in rather than a deliberate system extension. Not AI slop, but a loose thread.

The two-row nav (Rooms + Tools with divider) still signals "grew organically" rather than "was designed." It is structurally sound and functional — but the label/row separation plus the More trigger is three layers of navigation chrome where the content could speak for itself.

**Deterministic scan**: CLI detector not installed (`bundled detector not found` error from detect.mjs). Manual review substituted. No false positives to flag. Dead code confirmed: `border-left-color:var(--amber)` inline on `cv-unit-card` "All Units Combined" row (line 19349) — the CSS class has no `border-left` property, so this style has no visual effect.

**Visual overlays**: Browser automation unavailable in this environment. Overlay injection not attempted.

---

## Overall Impression

The five fixes since the previous critique (26/40) all landed. Clear All now has a proper confirmation dialog — the highest-risk gap is closed. The job bar details moving to the DETAILS popover is the most impactful structural improvement: the bar went from 15 items to ~7 visible items, which is usable at normal viewport widths. Sheet Optimizer and Edit Units in the primary nav row means less hunting for the two most-used workflow tools. Hardware BOM in Summary + XLSX is a feature completeness win that removes a recall burden. The title fix is trivial but correct.

The score moves from 26 to 28: two points gained, moving from "Acceptable" into "Good." The remaining ceiling is the typography inconsistency (Oswald on `.btn` at 10px mobile), the Edit Units editor still using `_confirmPending` on its delete buttons, the Help/Documentation floor at 1, and Summary still buried in More despite also being a header button.

---

## What's Working

1. **Clear All confirmation is now correct.** `confirmAction('Clear all units and panels? This cannot be undone.', { confirmLabel: 'CLEAR ALL' })` — one call, consistent with every other destructive action in the app. The `_confirmPending` double-click trap is gone from the main flow. This was the highest real-world risk and it is closed.

2. **DETAILS popover reduces job bar from 15 to 7 items.** The amber dot indicator when details are populated is a smart discoverable signal — users can see at a glance whether the job has context filled in. The popover closes on Escape. The `aria-haspopup`/`aria-expanded` attributes are present. This is the right implementation.

3. **Archive + UNDO toast is the app's best micro-interaction.** `archiveUserUnit` fires `_showArchiveToast` with a 5.5s fade and a clearly labelled UNDO button. The timer is cleared on UNDO click. This pattern — soft delete with timed undo — is genuinely good UX for a working tradesperson who might accidentally tap Archive mid-scroll.

---

## Priority Issues

**[P1] Edit Units editor delete buttons still use silent `_confirmPending` double-tap**
`editorDeleteUserUnit`, `deleteUnit`, and `deleteBuiltinUnit` all use the same undiscoverable double-click pattern that Clear All used to use. First click silently changes button text to "Confirm Delete?" with a 3-second auto-reset. No toast, no accessible announcement, no visual feedback beyond the button text. A user who clicks once and then moves the mouse will not know the button is armed. A fast double-click deletes the unit with no warning.
**Fix:** Replace the three functions' `_confirmPending` blocks with `if (!(await confirmAction('Delete this unit? This cannot be undone.', { confirmLabel: 'DELETE' }))) return;`. Same pattern as every other delete in the app.
**Suggested command:** `/impeccable harden dev.html`

**[P1] Summary duplicated between header ghost button and More dropdown — one is dead weight**
`generateSummary()` is callable from the header "☰ Summary" ghost button (line 4407) AND from the Summary tab in the More dropdown (line 4441). The header button fires `generateSummary()` directly; the tab switches to the `__summary__` section view. These are slightly different actions — one generates and renders in whatever view is current, one navigates to the summary tab. Users cannot distinguish them. The duplication also means Summary could be promoted out of More without losing the header shortcut.
**Fix:** Remove the "☰ Summary" ghost button from the header actions. Move the Summary tab from More to the primary Tools row. This eliminates the duplication and gives Summary a permanent visible home.
**Suggested command:** `/impeccable layout dev.html`

**[P2] Oswald on `.btn` drops to 10px at 480px via `!important`**
`.btn` uses `font-family: 'Oswald', sans-serif` at 13px. At ≤480px, the mobile breakpoint forces `font-size: 10px !important; letter-spacing: 1px !important`. Oswald at 10px with letter-spacing is at the legibility floor for condensed capitals on non-retina screens. "Generate Cutlist", "Clear All", and modal action buttons all hit this.
**Fix:** Change `.btn` to `font-family: 'Barlow', sans-serif`. Drop `letter-spacing` from 2px to 0.5px. Keep Oswald only for the `.logo`, section headers, and modal titles (where it's already applied inline at ≥14px). The mobile override's `!important` can then be removed.
**Suggested command:** `/impeccable typeset dev.html`

**[P2] PLAN [BETA] button introduces a third color without system rationale**
The button uses `rgba(120,80,200,0.12)` background and `#b899f5` text — purple — in a job bar that speaks entirely in amber and neutral grey. The color is not documented as a system role (there is no "experimental" or "AI" color token). It reads as a CSS value copied from a mockup and never reconciled with the design system.
**Fix:** Style PLAN [BETA] using the amber system with a `[BETA]` superscript tag: `background: rgba(212,145,58,0.08); border: 1px solid var(--amber-dim); color: var(--amber)`. Add a small `BETA` badge using `font-size:8px` superscript if you want to visually flag its experimental status. This removes the rogue color without losing the visual differentiation.
**Suggested command:** `/impeccable colorize dev.html`

**[P3] Edging field labels (L1/L2/W1/W2) have no tooltip or inline hint**
The edging dropdowns in the parts editor use terse labels: L1, L2, W1, W2. These mean Length-1, Length-2, Width-1, Width-2 (top/bottom and left/right edges). No `title` attribute, no inline label, no legend. A first-time user who does not know edging notation must guess or ask.
**Fix:** Add `title="L1 = leading length edge (top)"` etc. on each label element. One attribute per label. Zero structural change.
**Suggested command:** `/impeccable clarify dev.html`

---

## Persona Red Flags

**Alex (Power User — experienced cabinet maker quoting a full kitchen):**
- Delete unit in Edit Units still uses the silent double-click pattern. Alex works fast and edits units frequently. He will accidentally delete a unit and lose customisation work without any warning.
- Summary is still in More — Alex checks the summary after every material change before exporting. Each job session costs one extra click per summary check.
- No keyboard shortcut to jump between Panels → Cutlist → Quote → Summary. All navigation is mouse-only.
- The "Generate Cutlist" button is the primary action but lives in the header rather than adjacent to the unit list — requires spatial context shift every time.

**Jordan (First-timer — new shop owner on 14-day trial):**
- After adding the first room, there is no "now add your first unit" nudge below the empty room panel. The welcome screen has the CTA; the post-room state does not. Jordan adds a room, sees an empty panel, does not know what to do next.
- The `📋 DETAILS` button dot indicator is a good hint, but there is no tooltip or label explaining what "details" contains. Jordan may ignore it for multiple sessions.
- Edging codes (L1/L2/W1/W2) in parts editor have no explanation. Jordan will either skip edging entirely or set it wrong, then wonder why the cutlist doesn't match what the supplier cuts.
- Trial countdown badge shows time remaining but only explains expiry consequence on hover (`title="Click to extend…"`). Jordan on mobile (touch) never sees the hover state and may not know their access is being metered until the full-screen block appears.

**Kobus (SA cabinet shop owner managing multiple jobs and suppliers):**
- PLAN [BETA] button is purple in the amber job bar. Kobus will notice the color discrepancy and may interpret it as a different product feature or a warning state. The `title` tooltip explaining it is an AI-powered PDF import only shows on hover/focus — never on first glance.
- The supplier selector relationship to per-unit material pricing is still not visually connected. Changing the active supplier affects every material cost line, but nothing in the quote or materials view points back to "prices from [Supplier X]". A mismatched supplier creates silent quote errors.

---

## Minor Observations

- Dead code confirmed: `<div class="cv-unit-card" style="border-left-color:var(--amber)">` at line 19349 — the `.cv-unit-card` CSS class has no `border-left` property, so this inline style has no effect. Safe to remove.
- The `job-sync-status` inline style regression from the previous critique is resolved — the element is now a clean `<span id="job-sync-status"></span>` with no inline style.
- The `#job-bar > span:first-child { display: none !important }` mobile hide still uses positional selector — fragile if the job bar children are reordered. Add a `class="job-bar-label"` to the "Job" span and target that instead.
- The More trigger uses `aria-haspopup="true"` and `aria-expanded="false"`. This is correct. However, `role="menu"` is set on `#more-panel` but the items inside are `<button>` elements without `role="menuitem"`. Screen readers will announce these as buttons rather than menu items — acceptable but not fully correct ARIA.
- `clearAll()` is now called from `onclick="clearAll()"` on the header ghost button. The function body correctly awaits `confirmAction(...)`. Good.
- The feedback button `title="Send feedback or report an issue"` is correct. The unread dot uses JetBrains Mono at 9px for the number — appropriate monospace badge pattern.
- Three ghost buttons in the header (Quotes, Clear All, Summary) use `.btn.btn-ghost` with Oswald. The job bar buttons (SAVE JOB, NEW JOB, PLAN BETA, DELETE) use inline `font-family:'Barlow',sans-serif`. Two type-systems for action buttons in the same app header.

---

## Questions to Consider

- Now that Clear All has been fixed everywhere in the main flow, is it worth one focused pass to replace `_confirmPending` in the Edit Units editor (three functions, 12 lines each)? The fix is mechanical.
- Summary appears in both the header and the More dropdown. If Summary moves to the primary Tools row, the header "☰ Summary" button becomes dead weight. Should it stay as a "quick generate without switching tabs" action, or be removed entirely?
- The PLAN [BETA] purple is the only non-amber/non-neutral accent in the entire product. Was that deliberate (to signal "AI feature, different category") or incidental? If deliberate, it needs a system token (`--ai-accent`) and consistent use on other AI features. If incidental, the one-line color fix resolves it.
- The Help/Documentation floor at 1/4 is unchanged across three critique passes. The most impactful single-session fix would be `title` attributes on edging labels (L1/L2/W1/W2) and the Sheet Optimizer inputs. These are 8–10 one-line additions. Is that in scope?
