# Price Staleness Prompt on Job Load

## Problem

`costingPrices` (`dev.html:13733+`) is the single global object every
calculation reads — Quote totals, Costing breakdown, P&L Expected. It is
meant to track the live, Supabase-synced supplier prices (`README.md`:
"Prices sync to Supabase — all users pull the same rates automatically").

`getJobState()` (`dev.html:15026`) also serializes a full copy of
`costingPrices.mat` / `.edge` / `.extras` / `.hardware` into every job's
saved state, as a byproduct of capturing "everything the job needs."
`applyState()` → `_applyStateInner()` (`dev.html:22591`, restore block
`:22709-22713`) unconditionally restores that byproduct copy on every job
load:

```js
if (state.costingPrices.mat)      Object.assign(costingPrices.mat,      state.costingPrices.mat);
if (state.costingPrices.edge)     Object.assign(costingPrices.edge,     state.costingPrices.edge);
if (state.costingPrices.extras)   Object.assign(costingPrices.extras,   state.costingPrices.extras);
if (state.costingPrices.hardware) Object.assign(costingPrices.hardware, state.costingPrices.hardware);
```

This silently overwrites live, just-synced prices with whatever was live
*the last time that specific job autosaved*. On cold boot this is masked
by luck: `restoreLastJob()` (`:14530`) runs before `loadSupplierPrices()`
in `onLoginSuccess()` (`:14119-14144`), so the last job's stale prices get
corrected moments later. But switching jobs mid-session via
`loadJobFromSelect()` (`:15171`) calls `applyState()` with nothing
re-syncing afterward — the newly-opened job's stale mirror sticks, and
every tab (Quote, Costing, P&L) now shows outdated numbers with no
indication anything is wrong. This is exactly what the user hit: updated
prices via a Prices-tab sync, the job they had open reflected it
correctly (it was live, no stale mirror involved), but opening a
different, older job reverted to the old prices.

The fix turns this from a silent bug into an intentional, user-controlled
feature: a job's prices are frozen ("as quoted") only when the user
explicitly chooses that, are always live otherwise, and the choice is
visible and reversible.

## Scope

Applies to `costingPrices.mat`, `.edge`, `.extras` (cutLabel,
cutLabelMasonite, drilling, hPrice, boardSurcharge), and `.hardware`. When
a job is "frozen," ALL views — Quote, Costing, P&L — use its frozen
prices (confirmed with user: "Everything," not just P&L). This unifies
with the existing manual "Set Historical Prices" feature
(`openHistoricalPriceModal`, `dev.html:28397+`), which already freezes
`mat`/`edge` for P&L only via `costingPriceSnapshot`
(`dev.html:27404-27407`) — that field becomes the single mechanism behind
both the manual modal and this new automatic prompt, extended to also
carry `extras`/`hardware`.

Non-goals: no retroactive re-prompt sweep across all saved jobs on
deploy — detection is lazy, only runs when a job is actually opened.
No email/notification — this is purely an in-app, on-open interaction.

## Design

### 1. Canonical live-price cache

New global, initialized alongside `costingPrices`:

```js
let liveCostingPrices = null; // { mat, edge, extras, hardware } — never
                               // mutated by job load. null until first
                               // populated (e.g. cold boot before the
                               // first sync completes).
```

**Must never be derived by copying the live `costingPrices` object** —
if a Frozen job happens to be open when a sync runs, `costingPrices.mat`
at that moment holds that job's frozen values, not true current prices;
copying it would corrupt the cache with stale data disguised as live.
Two distinct sources instead, matching how each part of `costingPrices`
actually gets its values today:

- **`mat` / `edge` / `extras`** (`cutLabel`, `cutLabelMasonite`,
  `drilling`, `hPrice`, `boardSurcharge`) are genuinely Supabase-synced.
  Rebuild these three directly from the raw `rows` fetched inside
  `loadSupplierPrices()` (`dev.html:18292`) — the same `sbBoards`/
  `sbEdges`/service-row data that function already uses to populate
  `costingPrices` — not from `costingPrices` itself. Runs at the end of
  `loadSupplierPrices()`, right before the existing `renderSyncBadge();
  refreshPriceViews(); ...` tail (`:18412-18416`), so every sync (auto,
  manual "↻ Sync"/"↻ RELOAD PRICES", supplier switch) keeps it current
  regardless of which job — Frozen or Live — happens to be open.
- **`hardware`** (handle/hinge/runner prices) is NOT Supabase-synced —
  it's a local/per-browser setting, written only via direct edits in the
  Prices tab (`dev.html:21545-21546`, `costingPrices.hardware.${key}=
  ...;saveCostingPrices()`) and persisted to `localStorage`. Capture
  `liveCostingPrices.hardware` once at script boot, immediately after
  the existing localStorage-restore block that builds the initial
  `costingPrices` (`:13771-13786`) — before any job's `applyState()` can
  possibly run and contaminate it. Every direct hardware-price edit site
  must then write through to `liveCostingPrices.hardware[key]` in
  lockstep with the existing `costingPrices.hardware[key]=` assignment,
  so it stays current without ever needing a "sync."

### 2. Extend `costingPriceSnapshot` to carry extras/hardware

Current shape (manual modal only writes `mat`/`edge`):
`{ mat: {}, edge: {}, savedAt: '' }`. Add two optional fields so the new
automatic flow can freeze everything:

`{ mat: {}, edge: {}, extras: {}, hardware: {}, savedAt: '', source: 'auto' | 'manual' }`

`source` distinguishes an auto-created freeze (this feature) from a
manually-typed historical snapshot (existing modal) — used only for the
badge's label text (§5), not for any behavioral branch.

Both `plCalcFromState()` (`:27479`, override block `:27565-27574`) and
`_applyStateInner()`'s costingPrices restore block (`:22709-22713`) get a
new override step after the existing plain-mirror restore, applying
`extras`/`hardware` from the snapshot when present — mirroring exactly
how `mat`/`edge` are already overridden:

```js
if (state.costingPriceSnapshot) {
  const snap = state.costingPriceSnapshot;
  if (snap.mat)      { Object.keys(costingPrices.mat).forEach(k=>delete costingPrices.mat[k]); Object.assign(costingPrices.mat, snap.mat); }
  if (snap.edge)     { Object.keys(costingPrices.edge).forEach(k=>delete costingPrices.edge[k]); Object.assign(costingPrices.edge, snap.edge); }
  if (snap.extras)   Object.assign(costingPrices.extras,   snap.extras);
  if (snap.hardware) Object.assign(costingPrices.hardware, snap.hardware);
}
```

Old manual snapshots (no `extras`/`hardware` keys) are unaffected — those
two `if`s simply don't fire, falling back to the job's plain mirror as
today.

### 3. Persistence model — two durable states, not three

- **Live** (default — no `costingPriceSnapshot`): the job always uses
  `liveCostingPrices` directly. `_applyStateInner()`'s restore block
  (`:22709-22713`) changes from "restore `state.costingPrices.*` into
  `costingPrices`" (the root cause described in Problem) to
  unconditionally **reset** `costingPrices.mat/edge/extras/hardware` to
  a deep copy of `liveCostingPrices` — every job load starts from true
  current prices, full stop. This reset must happen even when
  `liveCostingPrices` hasn't been decided one way or the other by this
  job yet, and even when switching FROM a Frozen job — otherwise a Live
  job opened right after a Frozen one would inherit the Frozen job's
  prices as leftover state instead of true live ones. On cold boot,
  `restoreLastJob()` (`:14530`) runs before `loadSupplierPrices()` ever
  completes (`liveCostingPrices` still `null` at that point) — the reset
  is skipped in that case, leaving `costingPrices` at its hardcoded
  initial defaults (`:13733+`) until the first sync populates
  `liveCostingPrices` moments later and `loadSupplierPrices()`'s own
  existing `costingPrices.mat[name]=...` assignments bring it current
  directly, same as today. The job's own
  `state.costingPrices.*` mirror is still captured by `getJobState()` as
  today (harmless byproduct) but is no longer ever applied — it survives
  only as the comparison reference §4 needs.
- **Frozen** (`costingPriceSnapshot` present, extended per §2): the job
  always uses the snapshot's prices, everywhere, until the user clicks
  "Update to current" (§5 or the §6 badge), which deletes the snapshot
  and returns the job to Live.

A job that picks "Update to current" needs no ongoing state beyond
"no snapshot" — Live jobs structurally can't go stale again, since they
never trust a stored copy. What they DO need is a way to avoid
re-prompting every single time they're opened, even when nothing changed
since the user last saw the prompt. New top-level job-state field, round-
tripped through `getJobState()`/`applyState()` the same safe-early-
restore way `jobStatus`/`plData`/`costingPriceSnapshot` already are
(`:22599-22617`):

```js
priceAckWatermark: string  // the loadSupplierPrices() sync watermark
                            // (_priceLoadedAt, dev.html:18403) in effect
                            // the last time this job's prompt was shown-
                            // and-answered, or found to match with
                            // nothing to ask. Compared against the
                            // CURRENT _priceLoadedAt on next open: equal
                            // → nothing new since then, skip the check;
                            // different → prices moved again, re-check.
```

This self-heals across repeated future price updates — a Live job that
said "update to current" once still gets asked again the *next* time
prices genuinely move, because the watermark from that point is now
stale. (A boolean "already answered forever" flag was the first draft of
this design and was wrong: once set, it would permanently suppress
prompting even after a Frozen→Live transition's subsequent price change,
silently reintroducing the exact bug this feature exists to fix.)

### 4. Detection, on every `applyState()` call

Runs inside `applyState()` (`:22591`), after `_applyStateInner()`
completes successfully — at that point `quantities`/`panelsState`/etc.
are the job's own restored values, but `costingPrices` is now always
Live (per §3's fix) unless this job is Frozen.

1. If `liveCostingPrices` is `null` (no sync has completed yet this
   session — e.g. cold boot before the first `loadSupplierPrices()`
   finishes), skip silently. Nothing to compare against.
2. If the job is Frozen (`costingPriceSnapshot` present), skip — it
   already made its choice; §6's badge is the only way to revisit.
3. If `state.priceAckWatermark === _priceLoadedAt`, skip — nothing new
   since this job was last checked.
4. Call `computeJobMatBreakdown()` — `quantities`/`panelsState`/etc. are
   this job's own restored values at this point, so this returns exactly
   the boards/edges this job's own quote uses.
5. For each `{ mat }` in `matBreakdown` and `{ edgeKey }` in
   `edgeBreakdown`: compare `state.costingPrices.mat[mat]` /
   `state.costingPrices.edge[edgeKey]` (the job's own **last-saved**
   mirror — what was live when this job's autosave last ran) against
   `liveCostingPrices.mat[mat]` / `liveCostingPrices.edge[edgeKey]`
   (true current). Any mismatch → stale.
6. Regardless of what the job's cutlist uses, also directly compare all
   five `extras` keys (`cutLabel`, `cutLabelMasonite`, `drilling`,
   `hPrice`, `boardSurcharge`) and all `hardware` keys between
   `state.costingPrices` and `liveCostingPrices` — these apply job-wide,
   so "does this job use them" is always true for any real job.
7. No difference → quietly set `currentJobPriceAckWatermark =
   _priceLoadedAt` and move on. No prompt, no badge.
8. Difference found → show the prompt (§5).

### 5. The prompt

A modal (matching the existing `_openModalA11y`/`_closeModalA11y`
pattern used by `openHistoricalPriceModal` and `confirmAction`):

> **Prices have changed since this job was quoted**
> [Board/edging names that differ, e.g. "Picco White, White Edging 1mm — 2 more not shown" if long]
>
> [UPDATE TO CURRENT PRICES]  [KEEP PRICES AS QUOTED]

- **Update to current prices**: no mutation of `costingPrices` needed —
  Live is already the active default (per §3), so the view is already
  showing current prices. Just set `currentJobPriceAckWatermark =
  _priceLoadedAt`. If the job happened to already be Frozen from before
  this feature shipped (an old manual snapshot), clear
  `currentJobPriceSnapshot` too, transitioning it to Live and re-
  rendering the current view with the now-live prices. Trigger
  `scheduleAutoSave()` so the acknowledgement persists.
- **Keep prices as quoted**: build `currentJobPriceSnapshot` from the
  job's own **last-saved mirror** (`state.costingPrices.mat/edge/extras/
  hardware` — exactly what "as quoted" means: prices as they were the
  last time this job was saved) with `source: 'auto'` and `savedAt: new
  Date().toISOString()`; apply it immediately to live `costingPrices` so
  the current view reflects the freeze; set `currentJobPriceAckWatermark
  = _priceLoadedAt`; trigger `scheduleAutoSave()`.

Both branches re-render the current view so the numbers update
immediately without a manual refresh.

### 6. Change-your-mind indicator

When a job is frozen (`currentJobPriceSnapshot` truthy) — regardless of
whether it came from this prompt or the manual modal — show a small badge
next to `#job-status-wrap` (`dev.html:4555`), following
`_renderJobStatusBadge()`'s (`:14972`) existing pattern for that area:

> 📌 Prices as quoted {savedAt, formatted like the existing `en-ZA` short
> date format used elsewhere (`toLocaleDateString('en-ZA', {day:'2-digit',
> month:'short', year:'2-digit'})`)} · [Update to current]

Clicking "Update to current" runs the same action as the prompt's
"Update to current prices" button (§5). No badge is shown when the job is
live (no snapshot) — that's the default, unremarkable state.

## Data flow summary

```
loadSupplierPrices() ──────────────► liveCostingPrices (canonical, global)

applyState(job.state)
  └─ _applyStateInner(job.state)   // costingPrices = liveCostingPrices (Live default),
       │                           // OR job's frozen costingPriceSnapshot if one exists
       │                           // (job's own state.costingPrices.* mirror is captured
       │                           // but never applied — comparison reference only)
  └─ if job not Frozen && liveCostingPrices exists && watermark stale:
       compare job's LAST-SAVED mirror (state.costingPrices.*) vs liveCostingPrices
       (mat/edge scoped to job's own usage via computeJobMatBreakdown; extras/hardware always)
       └─ differs?  → show prompt → user picks:
            "Update"  → ack watermark; already Live, nothing else to do
            "Keep"    → currentJobPriceSnapshot = job's last-saved mirror (Frozen)
       └─ same?      → ack watermark, silently, no prompt
```

## Addendum (2026-08-20) — re-verified before implementation

Line references throughout this doc predate the screw-hardware-tracking
feature (`docs/superpowers/specs/2026-08-16-screw-hardware-design.md`),
which added ~150-190 lines earlier in the file, shifting everything below.
Core architecture and mechanism described above are unchanged and confirmed
still accurate; only line numbers moved. Current locations, for the
implementation plan to use:

- `currentJobPriceSnapshot` global: `dev.html:27605`
- `getJobState()`: `dev.html:15159`
- `applyState()`: `dev.html:22789`, `_applyStateInner()`: `dev.html:22836`
- costingPrices mirror restore block (the root-cause bug, §1's quoted
  snippet): `dev.html:22908-22911` — unchanged in content, confirmed exact
  match to the spec's original quote
- `loadSupplierPrices()`: `dev.html:18429`
- `openHistoricalPriceModal()`: `dev.html:28565`
- `plCalcFromState()`: `dev.html:27677`, snapshot override block:
  `dev.html:27763-27770`
- `_renderJobStatusBadge()`: `dev.html:15085`
- `computeJobMatBreakdown()`: `dev.html:13244`
- `restoreLastJob()`: `dev.html:14643`, `loadJobFromSelect()`:
  `dev.html:15303`
- `_priceLoadedAt` global: `dev.html:18726`, set in
  `loadSupplierPrices()`: `dev.html:18573`

One scope note the original spec predates: `costingPrices.hardware` now
also includes `screw16`/`screw25`/`screw40`/`screwM4` (added by the screw-
tracking feature), alongside the original `hingeNormal`/`hingeSoft`/
`runnerNormal`/`runnerSoft`/`handle160`/`handle240`. All eight fields are
edited through a single shared template function, `fixedRow()`
(`dev.html:21725`), not scattered per-field handlers as §1's "every direct
hardware-price edit site" phrasing implies — so the hardware write-through
to `liveCostingPrices.hardware` (§1) is a **single edit** to `fixedRow()`'s
`onchange`/`onblur`, not an enumeration of sites. All eight fields are
therefore automatically in scope for freeze/live/prompt behavior with no
extra work.

## Verification

No automated test framework, no browser in this environment (established
project constraint). Plan:

1. `node --check` on both inline `<script>` blocks after every edit.
2. `vm.runInContext` unit tests for the comparison logic in isolation:
   mock a job's `state.costingPrices` (last-saved mirror),
   `liveCostingPrices`, and a fake `computeJobMatBreakdown()` return
   value; assert stale is detected when a used material's price differs,
   and NOT detected when only an unused material's price differs
   (confirms the "only what the job uses" scoping from
   `matBreakdown`/`edgeBreakdown`, plus the unconditional extras/hardware
   compare). Also assert a Frozen job never gets flagged, and that a
   matching watermark short-circuits before any comparison runs.
3. Manually verify (via the user testing on staging, per this session's
   established pattern) with two real jobs: bump a board price used by
   Job A, confirm switching from Job A to Job B (unaffected) doesn't
   prompt for Job B, then bump a price Job B actually uses and confirm
   opening Job B does prompt; verify both prompt choices update the
   correct views (Quote total, Costing breakdown, P&L Expected) and that
   the badge appears/updates/clears correctly.
