# Price Staleness Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the bug where opening an older job silently reverts material/edging/hardware prices to whatever was live the last time that specific job autosaved, with no indication anything changed — replace it with an explicit Live/Frozen model: jobs always use true current prices unless the user explicitly freezes them "as quoted," and price changes since a job was last opened trigger a one-time prompt to choose.

**Architecture:** Single-file vanilla-JS app (`/home/dutchman/cutlist_pro/dev.html`, no build step, no test framework). A new canonical `liveCostingPrices` global tracks true-current prices independently of the shared, job-mutable `costingPrices` object. Job load resets `costingPrices` to either `liveCostingPrices` (default) or the job's `costingPriceSnapshot` (if frozen) — never to the job's own incidental last-saved mirror, which was the root cause. A watermark (`priceAckWatermark`, per job) avoids re-prompting when nothing changed since the job was last checked.

**Tech Stack:** Vanilla JS in `dev.html`. Verification uses `grep` for structural/wiring checks and `node -e` with `vm.runInContext` for pure comparison-logic checks — no test framework, no browser (established project constraint; see `docs/superpowers/specs/2026-08-03-price-staleness-prompt-design.md`'s own Verification section).

## Global Constraints

- Full design: `docs/superpowers/specs/2026-08-03-price-staleness-prompt-design.md` — read it once before starting; its "Addendum (2026-08-20)" section has current line numbers, already verified against the live file as of this plan.
- Scope: `costingPrices.mat`, `.edge`, `.extras` (`cutLabel`, `cutLabelMasonite`, `drilling`, `hPrice`, `boardSurcharge`), and `.hardware` (all 8 fields: `hingeNormal`/`hingeSoft`/`runnerNormal`/`runnerSoft`/`handle160`/`handle240`/`screw16`/`screw25`/`screw40`/`screwM4` — screw fields added after the original spec, confirmed in scope by the addendum). Everything else `_applyStateInner()`'s costingPrices block restores today (`tops`, `customBoards`, `hiddenMats`, `matMinSheets`/`matSpecialOrder`/`matFullSheet`, price-date metadata, and the derived `MATS`/`EDGES`/`COLORS`/`EDGE_COLORS` array rebuild) is OUT of scope — must keep restoring from the job's own mirror exactly as today, unconditionally.
- No retroactive re-prompt sweep on deploy — detection is lazy, only runs when a job is actually opened.
- No email/notification — purely in-app.
- `liveCostingPrices.mat`/`.edge`/`.extras` must never be derived by copying `costingPrices` at an arbitrary point in time (a Frozen job's values could be live in `costingPrices` at that moment) — see Task 2 for the specific safe insertion point this plan uses instead (a documented, narrower deviation from the spec's "rebuild from raw rows" instruction, justified by exact code-ordering analysis, not a shortcut).
- No test framework in this repo. Verification = `grep` structural checks + `node -e`/`vm.runInContext` for comparison logic + a manual browser pass in the final task.

---

### Task 1: `liveCostingPrices` global + hardware boot capture + hardware write-through

**Files:**
- Modify: `dev.html:13939-13940` (insert new global right after the existing costingPrices localStorage-restore `try/catch` block)
- Modify: `dev.html:21729-21730` (`fixedRow()`'s `onchange`/`onblur` — add the hardware write-through)

**Interfaces:**
- Produces: `liveCostingPrices` global — `{ mat: null, edge: null, extras: null, hardware: {...} }`. `mat`/`edge`/`extras` stay `null` until Task 2 populates them (first successful `loadSupplierPrices()` call this session) — `null` is the "no sync yet" signal later tasks check for. `hardware` is populated immediately (local-only, not Supabase-synced) and kept current forever after by this task's `fixedRow()` edit.

- [ ] **Step 1: Add the `liveCostingPrices` global**

Find (`dev.html:13938-13941`):

```js
    }
  }
} catch(e) {}

// ── Price History ─────────────────────────────────────────────────────────────
```

Replace with:

```js
    }
  }
} catch(e) {}

// Canonical live/current prices — independent of `costingPrices`, which a
// Frozen job's load can temporarily fill with historical values. mat/edge/
// extras are populated from raw Supabase rows the first time
// loadSupplierPrices() completes this session (see loadSupplierPrices);
// null until then signals "no sync yet, don't compare/reset against this."
// hardware is local-only (not Supabase-synced) — captured once here, then
// kept current in lockstep by every direct edit (see fixedRow() below).
let liveCostingPrices = {
  mat: null, edge: null, extras: null,
  hardware: JSON.parse(JSON.stringify(costingPrices.hardware)),
};

// ── Price History ─────────────────────────────────────────────────────────────
```

- [ ] **Step 2: Verify the global was added**

```bash
grep -n "let liveCostingPrices" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match, placed after the costingPrices restore block and before the `// ── Price History` comment.

- [ ] **Step 3: Add the hardware write-through in `fixedRow()`**

Find (`dev.html:21725-21731`):

```js
  const fixedRow = (label, unit, key, obj) => `
    <div class="cv-extra-row">
      <span class="cv-extra-label">${label} <span style="font-size:10px;color:var(--amber-dim)">★</span> <span style="font-size:10px;color:var(--text-muted)">(${unit})</span></span>
      <input autocomplete="off" class="cv-extra-input" type="number" min="0" value="${obj[key]||0}"
        onchange="costingPrices.hardware.${key}=parseFloat(this.value)||0;saveCostingPrices();refreshCostingResults()"
        onblur="costingPrices.hardware.${key}=parseFloat(this.value)||0;saveCostingPrices()">
      <span style="font-size:10px;color:var(--text-muted)">R</span>
    </div>`;
```

Replace with:

```js
  const fixedRow = (label, unit, key, obj) => `
    <div class="cv-extra-row">
      <span class="cv-extra-label">${label} <span style="font-size:10px;color:var(--amber-dim)">★</span> <span style="font-size:10px;color:var(--text-muted)">(${unit})</span></span>
      <input autocomplete="off" class="cv-extra-input" type="number" min="0" value="${obj[key]||0}"
        onchange="costingPrices.hardware.${key}=parseFloat(this.value)||0;liveCostingPrices.hardware.${key}=costingPrices.hardware.${key};saveCostingPrices();refreshCostingResults()"
        onblur="costingPrices.hardware.${key}=parseFloat(this.value)||0;liveCostingPrices.hardware.${key}=costingPrices.hardware.${key};saveCostingPrices()">
      <span style="font-size:10px;color:var(--text-muted)">R</span>
    </div>`;
```

Note: this fires even while a Frozen job is open — the edit is a global settings change, exactly like editing a board price already does for `costingPrices.mat` today (also unguarded by Frozen/Live state). Not a new quirk introduced by this plan.

- [ ] **Step 4: Verify the write-through**

```bash
grep -n "liveCostingPrices.hardware.\${key}" /home/dutchman/cutlist_pro/dev.html
```
Expected: 2 matches (onchange, onblur).

- [ ] **Step 5: Confirm no syntax errors**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => { try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); } });
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`.

- [ ] **Step 6: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: add liveCostingPrices global and hardware write-through"
```

---

### Task 2: Populate `liveCostingPrices.mat/edge/extras` at the end of a successful sync

**Files:**
- Modify: `dev.html` inside `loadSupplierPrices()` (currently `dev.html:18429-18578`) — insert right before the function's existing `console.log('[Supabase] Loaded...')` line, still inside the `try` block.

**Interfaces:**
- Consumes: `liveCostingPrices` (Task 1).
- Produces: `liveCostingPrices.mat`/`.edge`/`.extras` become non-null after this runs — the "no sync yet" signal later tasks check (`liveCostingPrices.mat === null`) flips permanently false for the rest of the session once any sync succeeds.

- [ ] **Step 1: Add the snapshot capture**

Find (inside `loadSupplierPrices()`, the tail of its `try` block):

```js
    _priceLoadedAt = latestTs || new Date().toISOString();
    try { localStorage.setItem('cutlist_prices_loaded_at', _priceLoadedAt); } catch(e) {}
    console.log(`[Supabase] Loaded ${rows.length} supplier prices (watermark: ${_priceLoadedAt})`);
```

Replace with:

```js
    _priceLoadedAt = latestTs || new Date().toISOString();
    try { localStorage.setItem('cutlist_prices_loaded_at', _priceLoadedAt); } catch(e) {}

    // Snapshot true-current prices for liveCostingPrices. Safe to copy from
    // costingPrices HERE specifically (not anywhere else) because every
    // assignment above this point in this same synchronous try block wrote
    // costingPrices.mat/.edge/.extras directly and authoritatively from the
    // rows just fetched — no job load or snapshot-apply can interleave
    // between those writes and this line (no `await` in between). Copying
    // costingPrices at any OTHER point in the app risks capturing a
    // Frozen job's values instead of true-live ones — do not reuse this
    // pattern elsewhere without the same ordering guarantee.
    liveCostingPrices.mat    = JSON.parse(JSON.stringify(costingPrices.mat));
    liveCostingPrices.edge   = JSON.parse(JSON.stringify(costingPrices.edge));
    liveCostingPrices.extras = JSON.parse(JSON.stringify(costingPrices.extras));

    console.log(`[Supabase] Loaded ${rows.length} supplier prices (watermark: ${_priceLoadedAt})`);
```

- [ ] **Step 2: Verify**

```bash
grep -n "liveCostingPrices.mat    = JSON.parse\|liveCostingPrices.edge   = JSON.parse\|liveCostingPrices.extras = JSON.parse" /home/dutchman/cutlist_pro/dev.html
```
Expected: 3 matches, all inside `loadSupplierPrices()`, before its `console.log('[Supabase] Loaded...')` line.

- [ ] **Step 3: Confirm placement is inside the `try` block, before `catch`**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const fnStart = src.indexOf('async function loadSupplierPrices()');
const fnBody  = src.slice(fnStart, fnStart + 6000);
const catchIdx = fnBody.indexOf('} catch(e) {\n    sbSyncStatus');
const liveIdx  = fnBody.indexOf('liveCostingPrices.mat    = JSON.parse');
console.log('catch at offset', catchIdx, '| liveCostingPrices capture at offset', liveIdx);
console.log(liveIdx > 0 && liveIdx < catchIdx ? 'PASS — capture is before catch' : 'FAIL — check placement');
"
```
Expected: `PASS — capture is before catch`.

- [ ] **Step 4: Syntax check**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => { try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); } });
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`.

- [ ] **Step 5: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: populate liveCostingPrices.mat/edge/extras after each price sync"
```

---

### Task 3: Extend `costingPriceSnapshot` schema + freeze/unfreeze helpers

**Files:**
- Modify: `dev.html` near `currentJobPriceSnapshot` global (currently `dev.html:27600-27605`) — add a sibling global and the two helper functions.
- Modify: `dev.html` inside `openHistoricalPriceModal()`'s save handler (currently around `dev.html:28685-28691`) — extend the manually-saved snapshot shape.
- Modify: `dev.html` inside `plCalcFromState()`'s snapshot override block (currently around `dev.html:27763-27770`) — apply `extras`/`hardware` when present, matching the existing `mat`/`edge` pattern.

**Interfaces:**
- Produces: `currentJobPriceAckWatermark` global (string or `null`). `_freezeCurrentJobPrices(jobStateMirror)` — freezes the current job using the given last-saved mirror (shape `{mat,edge,extras,hardware}`), applies it to live `costingPrices` immediately, sets the ack watermark. `_unfreezeCurrentJobPrices()` — clears the freeze, resets `costingPrices` to `liveCostingPrices` (no-op on the mat/edge/extras/hardware values if `liveCostingPrices.mat` is still `null`), sets the ack watermark. Both are consumed by Task 5 (the prompt modal) and Task 6 (the badge's "Update to current" link).
- Consumes: `liveCostingPrices` (Task 1/2), `currentJobPriceSnapshot` (existing global, `dev.html:27605`), `_priceLoadedAt` (existing global, `dev.html:18726`).

- [ ] **Step 1: Add `currentJobPriceAckWatermark` and the two helpers**

Find (`dev.html:27602-27606`):

```js
// Per-job historical price snapshot (set by openHistoricalPriceModal save and
// restored by applyState). Lives outside costingPrices so autosaves do not
// clobber it with live supplier prices. Shape: { mat:{}, edge:{}, savedAt:'' }.
let currentJobPriceSnapshot = null;
```

Replace with:

```js
// Per-job historical price snapshot (set by openHistoricalPriceModal save,
// the price-staleness prompt, or the "Update to current" badge; restored by
// applyState). Lives outside costingPrices so autosaves do not clobber it
// with live supplier prices. Shape: { mat:{}, edge:{}, extras:{}, hardware:{},
// savedAt:'', source: 'auto'|'manual' }. extras/hardware/source are optional
// — older manually-saved snapshots only have mat/edge/savedAt.
let currentJobPriceSnapshot = null;

// Sync watermark (see _priceLoadedAt) in effect the last time THIS job's
// price-staleness prompt was shown-and-answered, or found to have nothing
// to ask. Compared against current _priceLoadedAt on next open: equal →
// skip the check; different → prices moved again, re-check. Restored by
// applyState alongside currentJobPriceSnapshot.
let currentJobPriceAckWatermark = null;

// Freeze this job's prices "as quoted" using the given last-saved price
// mirror (job's own state.costingPrices — what was live when this job's
// autosave last ran). Applies immediately to live costingPrices so the
// current view reflects the freeze without a reload.
function _freezeCurrentJobPrices(jobPriceMirror, source) {
  currentJobPriceSnapshot = {
    mat:      { ...((jobPriceMirror && jobPriceMirror.mat)      || {}) },
    edge:     { ...((jobPriceMirror && jobPriceMirror.edge)     || {}) },
    extras:   { ...((jobPriceMirror && jobPriceMirror.extras)   || {}) },
    hardware: { ...((jobPriceMirror && jobPriceMirror.hardware) || {}) },
    savedAt: new Date().toISOString(),
    source: source || 'auto',
  };
  Object.keys(costingPrices.mat).forEach(k => delete costingPrices.mat[k]);
  Object.assign(costingPrices.mat, currentJobPriceSnapshot.mat);
  Object.keys(costingPrices.edge).forEach(k => delete costingPrices.edge[k]);
  Object.assign(costingPrices.edge, currentJobPriceSnapshot.edge);
  Object.assign(costingPrices.extras,   currentJobPriceSnapshot.extras);
  Object.assign(costingPrices.hardware, currentJobPriceSnapshot.hardware);
  currentJobPriceAckWatermark = _priceLoadedAt;
}

// Return this job to Live — always true-current prices, never a stored copy.
function _unfreezeCurrentJobPrices() {
  currentJobPriceSnapshot = null;
  if (liveCostingPrices.mat) {
    Object.keys(costingPrices.mat).forEach(k => delete costingPrices.mat[k]);
    Object.assign(costingPrices.mat, liveCostingPrices.mat);
    Object.keys(costingPrices.edge).forEach(k => delete costingPrices.edge[k]);
    Object.assign(costingPrices.edge, liveCostingPrices.edge);
    Object.assign(costingPrices.extras,   liveCostingPrices.extras);
    Object.assign(costingPrices.hardware, liveCostingPrices.hardware);
  }
  currentJobPriceAckWatermark = _priceLoadedAt;
}
```

- [ ] **Step 2: Verify Step 1**

```bash
grep -n "let currentJobPriceAckWatermark\|function _freezeCurrentJobPrices\|function _unfreezeCurrentJobPrices" /home/dutchman/cutlist_pro/dev.html
```
Expected: 3 matches.

- [ ] **Step 3: Extend `openHistoricalPriceModal()`'s save handler to carry extras/hardware**

Find (inside the save handler, currently around `dev.html:28685-28691`):

```js
    const newState = JSON.parse(JSON.stringify(job._state));
    newState.costingPriceSnapshot = {
      mat:  histMat,
      edge: histEdge,
      savedAt: new Date().toISOString(),
    };
```

Replace with:

```js
    const newState = JSON.parse(JSON.stringify(job._state));
    // Manual snapshot only lets the user type mat/edge prices (the modal's
    // UI is boards/edging only) — carry forward whatever extras/hardware
    // this job already had frozen (if any), so re-saving mat/edge via this
    // modal doesn't silently drop a previously-frozen hardware/extras set.
    const _existingExtras   = (job._state.costingPriceSnapshot && job._state.costingPriceSnapshot.extras)   || {};
    const _existingHardware = (job._state.costingPriceSnapshot && job._state.costingPriceSnapshot.hardware) || {};
    newState.costingPriceSnapshot = {
      mat:  histMat,
      edge: histEdge,
      extras:   _existingExtras,
      hardware: _existingHardware,
      savedAt: new Date().toISOString(),
      source: 'manual',
    };
```

- [ ] **Step 4: Verify Step 3**

```bash
grep -n "source: 'manual'" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match.

- [ ] **Step 5: Extend `plCalcFromState()`'s snapshot override to apply extras/hardware**

Find (`dev.html:27763-27772`):

```js
    if (st.costingPriceSnapshot) {
      if (st.costingPriceSnapshot.mat) {
        Object.keys(costingPrices.mat).forEach(k => delete costingPrices.mat[k]);
        Object.assign(costingPrices.mat, st.costingPriceSnapshot.mat);
      }
      if (st.costingPriceSnapshot.edge) {
        Object.keys(costingPrices.edge).forEach(k => delete costingPrices.edge[k]);
        Object.assign(costingPrices.edge, st.costingPriceSnapshot.edge);
      }
    }
```

Replace with:

```js
    if (st.costingPriceSnapshot) {
      if (st.costingPriceSnapshot.mat) {
        Object.keys(costingPrices.mat).forEach(k => delete costingPrices.mat[k]);
        Object.assign(costingPrices.mat, st.costingPriceSnapshot.mat);
      }
      if (st.costingPriceSnapshot.edge) {
        Object.keys(costingPrices.edge).forEach(k => delete costingPrices.edge[k]);
        Object.assign(costingPrices.edge, st.costingPriceSnapshot.edge);
      }
      if (st.costingPriceSnapshot.extras)   Object.assign(costingPrices.extras,   st.costingPriceSnapshot.extras);
      if (st.costingPriceSnapshot.hardware) Object.assign(costingPrices.hardware, st.costingPriceSnapshot.hardware);
    }
```

(Old manual snapshots with no `extras`/`hardware` keys simply don't trigger the two new lines — harmless, matches today's behavior for those jobs.)

- [ ] **Step 6: Verify Step 5**

```bash
grep -n "st.costingPriceSnapshot.extras\|st.costingPriceSnapshot.hardware" /home/dutchman/cutlist_pro/dev.html
```
Expected: 2 matches, both inside `plCalcFromState()`.

- [ ] **Step 7: Syntax check**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => { try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); } });
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`.

- [ ] **Step 8: Test the freeze/unfreeze helpers in isolation**

```bash
node -e "
const vm = require('vm');
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const freezeFn   = src.match(/function _freezeCurrentJobPrices\([\s\S]*?\n}/)[0];
const unfreezeFn = src.match(/function _unfreezeCurrentJobPrices\([\s\S]*?\n}/)[0];

const ctx = vm.createContext({
  costingPrices: { mat: { OldBoard: 100 }, edge: { OldEdge: 5 }, extras: { cutLabel: 10 }, hardware: { hingeNormal: 20 } },
  liveCostingPrices: { mat: { NewBoard: 200 }, edge: { NewEdge: 8 }, extras: { cutLabel: 15 }, hardware: { hingeNormal: 25 } },
  currentJobPriceSnapshot: null,
  currentJobPriceAckWatermark: null,
  _priceLoadedAt: '2026-08-20T00:00:00Z',
});
vm.runInContext(freezeFn, ctx);
vm.runInContext(unfreezeFn, ctx);

// Freeze with a job mirror
ctx.eval = null;
vm.runInContext('_freezeCurrentJobPrices({ mat:{JobBoard:50}, edge:{JobEdge:3}, extras:{cutLabel:9}, hardware:{hingeNormal:19} }, \"auto\")', ctx);
console.log('after freeze, costingPrices.mat:', JSON.stringify(ctx.costingPrices.mat));
console.assert(ctx.costingPrices.mat.JobBoard === 50 && !('OldBoard' in ctx.costingPrices.mat), 'freeze should fully replace mat, not merge');
console.assert(ctx.currentJobPriceSnapshot.source === 'auto', 'source should default to auto');
console.assert(ctx.currentJobPriceAckWatermark === '2026-08-20T00:00:00Z', 'ack watermark should be set on freeze');

// Unfreeze back to live
vm.runInContext('_unfreezeCurrentJobPrices()', ctx);
console.log('after unfreeze, costingPrices.mat:', JSON.stringify(ctx.costingPrices.mat));
console.assert(ctx.costingPrices.mat.NewBoard === 200 && !('JobBoard' in ctx.costingPrices.mat), 'unfreeze should fully replace mat with liveCostingPrices, not merge');
console.assert(ctx.currentJobPriceSnapshot === null, 'unfreeze should clear the snapshot');

console.log('ALL ASSERTIONS PASSED');
"
```
Expected: `ALL ASSERTIONS PASSED`, no `Assertion failed` lines.

- [ ] **Step 9: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: extend costingPriceSnapshot to extras/hardware, add freeze/unfreeze helpers"
```

---

### Task 4: Fix `_applyStateInner()` AND `plCalcFromState()` — Live jobs reset to true-current prices, Frozen jobs use their snapshot

**Files:**
- Modify: `dev.html` inside `_applyStateInner()`'s costingPrices restore block (currently `dev.html:22907-22911`, the FIRST 4 lines only — the rest of that block, `tops`/`customBoards`/`hiddenMats`/metadata/array-rebuild, currently `dev.html:22912-22940`, is OUT of scope and must not change).
- Modify: `dev.html` inside `plCalcFromState()`'s costingPrices restore block (currently `dev.html:27749-27753`, the FIRST 4 lines only — the metadata lines directly after, `dev.html:27754-27757`, and the existing `costingPriceSnapshot` override block right after that, `dev.html:27763-27772`, are both OUT of scope for this step and must not change here).

**Interfaces:**
- Consumes: `currentJobPriceSnapshot` (already set by `applyState()` before `_applyStateInner()` runs — confirmed by reading `applyState()`'s body, Task 5 relies on this same ordering), `liveCostingPrices` (Task 1/2), `_freezeCurrentJobPrices`/`_unfreezeCurrentJobPrices` are NOT used here (this is the reset-on-load path, not a user action) — inline logic instead, matching the helpers' effect but without touching the ack watermark (that's Task 5's concern, on the SAME load).
- `plCalcFromState(st)` is a distinct, separate bug site from `_applyStateInner()` — it computes P&L "Expected" figures, potentially for a DIFFERENT job than whichever is currently open in the UI (it's a temporary global-swap-calculate-restore pattern, see its `finally` block at `dev.html:27831+`). It must NOT use the global `currentJobPriceSnapshot` (that only reflects the currently-open job) — Frozen/Live for the TARGET job is already correctly determined a few lines later by the existing `if (st.costingPriceSnapshot)` override block (`dev.html:27763-27772`), which runs unconditionally right after and will correctly overwrite whatever this step sets when the target job is Frozen. This step therefore only needs to change what the "otherwise" (Live) case resets to — no Frozen-specific branch needed here, avoiding duplicating that logic in two places.

- [ ] **Step 1: Replace the 4-line mat/edge/extras/hardware restore**

Find (`dev.html:22907-22911` — the start of the `if (state.costingPrices)` block, first 4 inner lines only):

```js
  if (state.costingPrices) {
    if (state.costingPrices.mat)          Object.assign(costingPrices.mat,      state.costingPrices.mat);
    if (state.costingPrices.edge)         Object.assign(costingPrices.edge,     state.costingPrices.edge);
    if (state.costingPrices.extras)       Object.assign(costingPrices.extras,   state.costingPrices.extras);
    if (state.costingPrices.hardware)     Object.assign(costingPrices.hardware, state.costingPrices.hardware);
    if (state.costingPrices.tops)         Object.assign(costingPrices.tops,     state.costingPrices.tops);
```

Replace with:

```js
  if (state.costingPrices) {
    // mat/edge/extras/hardware VALUES are no longer restored from this
    // job's own last-saved mirror (state.costingPrices.*) — that was the
    // root cause of jobs silently reverting to stale prices on open. A job
    // is either Frozen (uses its currentJobPriceSnapshot, already restored
    // by applyState() before this function runs) or Live (always resets to
    // true-current liveCostingPrices). The job's own state.costingPrices.*
    // mirror is still captured by getJobState() as a harmless byproduct —
    // it survives only as the comparison reference the staleness-detection
    // logic (applyState(), after this function returns) needs.
    if (currentJobPriceSnapshot) {
      Object.keys(costingPrices.mat).forEach(k => delete costingPrices.mat[k]);
      Object.assign(costingPrices.mat, currentJobPriceSnapshot.mat || {});
      Object.keys(costingPrices.edge).forEach(k => delete costingPrices.edge[k]);
      Object.assign(costingPrices.edge, currentJobPriceSnapshot.edge || {});
      if (currentJobPriceSnapshot.extras)   Object.assign(costingPrices.extras,   currentJobPriceSnapshot.extras);
      if (currentJobPriceSnapshot.hardware) Object.assign(costingPrices.hardware, currentJobPriceSnapshot.hardware);
    } else if (liveCostingPrices.mat) {
      Object.keys(costingPrices.mat).forEach(k => delete costingPrices.mat[k]);
      Object.assign(costingPrices.mat, liveCostingPrices.mat);
      Object.keys(costingPrices.edge).forEach(k => delete costingPrices.edge[k]);
      Object.assign(costingPrices.edge, liveCostingPrices.edge);
      Object.assign(costingPrices.extras,   liveCostingPrices.extras);
      Object.assign(costingPrices.hardware, liveCostingPrices.hardware);
    }
    // else: liveCostingPrices.mat is still null (cold boot, no sync has
    // completed yet this session) — leave costingPrices at its hardcoded/
    // localStorage defaults; the imminent first loadSupplierPrices() call
    // populates it directly, same as today (see restoreLastJob/
    // onLoginSuccess ordering — this branch is cold-boot-only).
    if (state.costingPrices.tops)         Object.assign(costingPrices.tops,     state.costingPrices.tops);
```

- [ ] **Step 2: Verify the rest of the block is untouched**

```bash
grep -n "if (state.costingPrices.customBoards\|if (state.costingPrices.hiddenMats\|if (state.costingPrices.matMinSheets" /home/dutchman/cutlist_pro/dev.html
```
Expected: 3 matches, all still present, unchanged, immediately following the block edited in Step 1.

- [ ] **Step 3: Verify the new logic**

```bash
grep -n "if (currentJobPriceSnapshot) {" /home/dutchman/cutlist_pro/dev.html
grep -n "else if (liveCostingPrices.mat) {" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match each, both inside `_applyStateInner()`.

- [ ] **Step 4: Apply the same fix to `plCalcFromState()`**

Find (`dev.html:27749-27753`):

```js
    if (st.costingPrices) {
      if (st.costingPrices.mat)             { Object.keys(costingPrices.mat).forEach(k=>delete costingPrices.mat[k]); Object.assign(costingPrices.mat, st.costingPrices.mat); }
      if (st.costingPrices.edge)            { Object.keys(costingPrices.edge).forEach(k=>delete costingPrices.edge[k]); Object.assign(costingPrices.edge, st.costingPrices.edge); }
      if (st.costingPrices.extras)          Object.assign(costingPrices.extras,   st.costingPrices.extras);
      if (st.costingPrices.hardware)        Object.assign(costingPrices.hardware, st.costingPrices.hardware);
      if (st.costingPrices.matMinSheets)    costingPrices.matMinSheets    = st.costingPrices.matMinSheets;
```

Replace with:

```js
    if (st.costingPrices) {
      // mat/edge/extras/hardware VALUES: same fix as _applyStateInner() —
      // reset to true-current liveCostingPrices instead of this job's own
      // stale last-saved mirror. No Frozen-specific branch needed here: if
      // the TARGET job (st, which may not be the currently-open job — see
      // this function's swap/restore pattern) is Frozen, the existing
      // `if (st.costingPriceSnapshot)` override a few lines below already
      // correctly overwrites these with st's own snapshot afterward.
      if (liveCostingPrices.mat) {
        Object.keys(costingPrices.mat).forEach(k=>delete costingPrices.mat[k]);
        Object.assign(costingPrices.mat, liveCostingPrices.mat);
        Object.keys(costingPrices.edge).forEach(k=>delete costingPrices.edge[k]);
        Object.assign(costingPrices.edge, liveCostingPrices.edge);
        Object.assign(costingPrices.extras,   liveCostingPrices.extras);
        Object.assign(costingPrices.hardware, liveCostingPrices.hardware);
      } else {
        // Cold boot fallback (no sync yet this session) — fall back to
        // this job's own last-saved mirror rather than leaving
        // costingPrices at hardcoded defaults for a P&L calc.
        if (st.costingPrices.mat)      { Object.keys(costingPrices.mat).forEach(k=>delete costingPrices.mat[k]); Object.assign(costingPrices.mat, st.costingPrices.mat); }
        if (st.costingPrices.edge)     { Object.keys(costingPrices.edge).forEach(k=>delete costingPrices.edge[k]); Object.assign(costingPrices.edge, st.costingPrices.edge); }
        if (st.costingPrices.extras)   Object.assign(costingPrices.extras,   st.costingPrices.extras);
        if (st.costingPrices.hardware) Object.assign(costingPrices.hardware, st.costingPrices.hardware);
      }
      if (st.costingPrices.matMinSheets)    costingPrices.matMinSheets    = st.costingPrices.matMinSheets;
```

- [ ] **Step 5: Verify Step 4**

```bash
grep -n "if the TARGET job (st, which may not be the currently-open job" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match, inside `plCalcFromState()`.

- [ ] **Step 6: Verify the metadata lines and the existing snapshot-override block right after are untouched**

```bash
grep -n "if (st.costingPrices.specialServices) costingPrices.specialServices = st.costingPrices.specialServices;" /home/dutchman/cutlist_pro/dev.html
grep -n "if (st.costingPriceSnapshot) {" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match each, both still present, in the same relative order right after the block edited in Step 4.

- [ ] **Step 7: Syntax check**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => { try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); } });
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`.

- [ ] **Step 8: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "fix: job load and P&L calc reset prices to live or frozen snapshot, never a stale job mirror"
```

---

### Task 5: Staleness detection + the prompt modal

**Files:**
- Modify: `dev.html` inside `applyState()` (currently `dev.html:22789-22834`) — add `currentJobPriceAckWatermark` restore to phase (a), and the detection call after `_jobRestoreFailed = false;` in phase (b).
- Modify: `dev.html` inside `getJobState()` (currently `dev.html:15159-15201`) — add `priceAckWatermark` to the returned object.
- Create (as new top-level functions near `_freezeCurrentJobPrices`/`_unfreezeCurrentJobPrices`, Task 3's location): `_detectStalePrices(state)`, `_showPriceStalePrompt(state)`.

**Interfaces:**
- Consumes: `computeJobMatBreakdown()` (`dev.html:13244`, returns `{matBreakdown: [{mat,...}], edgeBreakdown: [{edgeKey,...}], ...}`), `liveCostingPrices`, `currentJobPriceSnapshot`, `currentJobPriceAckWatermark`, `_priceLoadedAt`, `_freezeCurrentJobPrices`/`_unfreezeCurrentJobPrices` (Task 3), `_openModalA11y`/`_closeModalA11y` (existing, see `confirmAction()` for the usage pattern), `escHtml` (existing), `scheduleAutoSave` (existing — confirm it exists via grep in Step 1 below, this plan assumes the same name used elsewhere in the file for autosave triggers).
- Produces: job state gains a `priceAckWatermark` field, round-tripped like `jobStatus`/`plData`/`costingPriceSnapshot`.

- [ ] **Step 1: Confirm `scheduleAutoSave` exists**

```bash
grep -n "^function scheduleAutoSave\|^async function scheduleAutoSave" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match. If this returns nothing, search `grep -n "function.*[Aa]uto[Ss]ave" dev.html`, find the correct current name, and use that name in place of `scheduleAutoSave()` in every step below — do not guess, use what you find.

- [ ] **Step 2: Add `priceAckWatermark` to `getJobState()`**

Find (`dev.html:15196-15198`, the last two fields of the returned object):

```js
    plData: (currentJobId && plData[currentJobId]) ? plData[currentJobId] : null,
    costingPriceSnapshot: currentJobPriceSnapshot,
  };
}
```

Replace with:

```js
    plData: (currentJobId && plData[currentJobId]) ? plData[currentJobId] : null,
    costingPriceSnapshot: currentJobPriceSnapshot,
    priceAckWatermark: currentJobPriceAckWatermark,
  };
}
```

- [ ] **Step 3: Restore `currentJobPriceAckWatermark` in `applyState()`'s phase (a)**

Find (inside `applyState()`, currently `dev.html:22810-22813`):

```js
    currentJobPriceSnapshot = (state.costingPriceSnapshot && typeof state.costingPriceSnapshot === 'object'
      && state.costingPriceSnapshot.mat && Object.keys(state.costingPriceSnapshot.mat).length > 0)
      ? state.costingPriceSnapshot
      : null;
    currentJobArchived = state.archived === true;
```

Replace with:

```js
    currentJobPriceSnapshot = (state.costingPriceSnapshot && typeof state.costingPriceSnapshot === 'object'
      && state.costingPriceSnapshot.mat && Object.keys(state.costingPriceSnapshot.mat).length > 0)
      ? state.costingPriceSnapshot
      : null;
    currentJobPriceAckWatermark = (typeof state.priceAckWatermark === 'string') ? state.priceAckWatermark : null;
    currentJobArchived = state.archived === true;
```

- [ ] **Step 4: Add the detection call after a successful restore**

Find (inside `applyState()`, the second `try` block, currently `dev.html:22826-22829`):

```js
  try {
    _applyStateInner(state);
    _jobRestoreFailed = false;
  } catch (err) {
```

Replace with:

```js
  try {
    _applyStateInner(state);
    _jobRestoreFailed = false;
    _detectStalePrices(state);
  } catch (err) {
```

- [ ] **Step 5: Verify Steps 2-4**

```bash
grep -n "priceAckWatermark: currentJobPriceAckWatermark" /home/dutchman/cutlist_pro/dev.html
grep -n "currentJobPriceAckWatermark = (typeof state.priceAckWatermark" /home/dutchman/cutlist_pro/dev.html
grep -n "_detectStalePrices(state);" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match each.

- [ ] **Step 6: Add `_detectStalePrices()` and `_showPriceStalePrompt()`**

Insert these two new functions directly after `_unfreezeCurrentJobPrices()` (Task 3's location, near `dev.html:27605` in the pre-Task-3 file — find it by content, not line number, since Task 3 already shifted lines):

```js
// Compares this job's own last-saved price mirror (state.costingPrices —
// what was live when this job's autosave last ran) against true-current
// liveCostingPrices, scoped to what this job's cutlist actually uses (mat/
// edge) plus the job-wide extras/hardware fields (always relevant). Shows
// the staleness prompt on a real difference; silently acks otherwise.
function _detectStalePrices(state) {
  if (!liveCostingPrices.mat) return;           // no sync completed this session yet
  if (currentJobPriceSnapshot) return;           // already Frozen — user made their choice
  if (state.priceAckWatermark === _priceLoadedAt) return; // nothing new since last check
  if (!state.costingPrices) { currentJobPriceAckWatermark = _priceLoadedAt; return; }

  const mb = computeJobMatBreakdown();
  const changed = [];
  (mb.matBreakdown || []).forEach(({ mat }) => {
    const was = (state.costingPrices.mat || {})[mat] || 0;
    const now = liveCostingPrices.mat[mat] || 0;
    if (was !== now) changed.push(mat);
  });
  (mb.edgeBreakdown || []).forEach(({ edgeKey }) => {
    const was = (state.costingPrices.edge || {})[edgeKey] || 0;
    const now = liveCostingPrices.edge[edgeKey] || 0;
    if (was !== now && !changed.includes(edgeKey)) changed.push(edgeKey);
  });
  ['cutLabel', 'cutLabelMasonite', 'drilling', 'hPrice', 'boardSurcharge'].forEach(k => {
    const was = (state.costingPrices.extras || {})[k] || 0;
    const now = liveCostingPrices.extras[k] || 0;
    if (was !== now && !changed.includes(k)) changed.push(k);
  });
  Object.keys(liveCostingPrices.hardware || {}).forEach(k => {
    const was = (state.costingPrices.hardware || {})[k] || 0;
    const now = liveCostingPrices.hardware[k] || 0;
    if (was !== now && !changed.includes(k)) changed.push(k);
  });

  if (changed.length === 0) {
    currentJobPriceAckWatermark = _priceLoadedAt;
    return;
  }
  _showPriceStalePrompt(state, changed);
}

// Modal: "Prices have changed since this job was quoted" — two choices,
// mirroring confirmAction()'s _openModalA11y usage pattern.
function _showPriceStalePrompt(state, changedNames) {
  const shown = changedNames.slice(0, 3).map(escHtml).join(', ');
  const more  = changedNames.length > 3 ? ` — ${changedNames.length - 3} more not shown` : '';

  const el = document.createElement('div');
  el.id = 'price-stale-prompt-modal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99990;display:flex;align-items:center;justify-content:center;font-family:\'Barlow\',sans-serif';
  const a11yState = {};
  const settle = () => { _closeModalA11y(el, a11yState); el.remove(); };
  el.addEventListener('click', e => { if (e.target === el) settle(); }); // outside click = no default choice, stays as-is until reopened
  el.innerHTML = `
    <div role="alertdialog" aria-modal="true" aria-label="Prices have changed" style="background:var(--bg2);border:1px solid var(--amber);max-width:460px;width:92%;font-family:'Barlow',sans-serif;padding:20px">
      <div style="font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:2px;color:var(--amber);margin-bottom:8px">PRICES HAVE CHANGED SINCE THIS JOB WAS QUOTED</div>
      <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:18px">${shown}${more}</div>
      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button id="price-stale-keep" style="font-weight:500;background:none;border:1px solid var(--border);color:var(--text-muted);padding:8px 18px;font-family:'Barlow',sans-serif;font-size:11px;letter-spacing:0.3px;cursor:pointer">KEEP PRICES AS QUOTED</button>
        <button id="price-stale-update" style="background:var(--amber);border:none;color:#111;padding:8px 18px;font-family:'Barlow',sans-serif;font-size:11px;letter-spacing:0.3px;cursor:pointer;font-weight:600">UPDATE TO CURRENT PRICES</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  const _rerenderAfterChoice = () => {
    try { if (document.getElementById('quote-view')?.style.display !== 'none') renderQuoteView(); } catch(e) {}
    try { if (document.getElementById('costing-view')?.style.display !== 'none') renderCostingView(); } catch(e) {}
    try { renderPLView(); } catch(e) {}
    try { _renderPriceFrozenBadge(); } catch(e) {}
    try { scheduleAutoSave(); } catch(e) {}
  };

  el.querySelector('#price-stale-update').onclick = () => {
    // Already Live (per _applyStateInner's reset) — nothing to mutate,
    // just ack. If this job happened to be Frozen from before this feature
    // shipped (old manual snapshot with mat/edge only), clear it too.
    _unfreezeCurrentJobPrices();
    settle();
    _rerenderAfterChoice();
  };
  el.querySelector('#price-stale-keep').onclick = () => {
    _freezeCurrentJobPrices(state.costingPrices, 'auto');
    settle();
    _rerenderAfterChoice();
  };

  _openModalA11y(el, a11yState, () => { /* no outside-click default action */ });
}
```

- [ ] **Step 7: Verify Step 6**

```bash
grep -n "^function _detectStalePrices\|^function _showPriceStalePrompt" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match each.

- [ ] **Step 8: Syntax check**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => { try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); } });
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`. (`_renderPriceFrozenBadge` referenced in Step 6 doesn't exist yet — Task 6 adds it. This is a forward reference inside a function BODY, not a parse-time reference, so `new Function(s)` still succeeds; it would only throw at runtime if called before Task 6 lands, and it's wrapped in `try/catch` above specifically because of this ordering.)

- [ ] **Step 9: Test the detection comparison logic in isolation**

```bash
node -e "
const vm = require('vm');
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const fn = src.match(/function _detectStalePrices\([\s\S]*?\n}/)[0];

let promptShownWith = null;
const ctx = vm.createContext({
  liveCostingPrices: { mat: { UsedBoard: 200, UnusedBoard: 999 }, edge: { UsedEdge: 8 }, extras: { cutLabel: 85, cutLabelMasonite: 45, drilling: 8, hPrice: 5.31, boardSurcharge: 0 }, hardware: { hingeNormal: 22 } },
  currentJobPriceSnapshot: null,
  currentJobPriceAckWatermark: null,
  _priceLoadedAt: 'WATERMARK-2',
  computeJobMatBreakdown: () => ({ matBreakdown: [{ mat: 'UsedBoard' }], edgeBreakdown: [{ edgeKey: 'UsedEdge' }] }),
  _showPriceStalePrompt: (state, changed) => { promptShownWith = changed; },
});
vm.runInContext(fn, ctx);

// Case 1: only an UNUSED material's price differs — must NOT prompt
ctx.currentJobPriceAckWatermark = null;
promptShownWith = null;
vm.runInContext('_detectStalePrices({ priceAckWatermark: \"WATERMARK-1\", costingPrices: { mat: { UsedBoard: 200, UnusedBoard: 500 }, edge: { UsedEdge: 8 }, extras: { cutLabel: 85, cutLabelMasonite: 45, drilling: 8, hPrice: 5.31, boardSurcharge: 0 }, hardware: { hingeNormal: 22 } } })', ctx);
console.log('Case 1 (only unused material differs) — prompt shown:', promptShownWith);
console.assert(promptShownWith === null, 'must NOT prompt when only an unused material differs');
console.assert(ctx.currentJobPriceAckWatermark === 'WATERMARK-2', 'must silently ack when nothing relevant differs');

// Case 2: a USED material's price differs — must prompt
ctx.currentJobPriceAckWatermark = null;
promptShownWith = null;
vm.runInContext('_detectStalePrices({ priceAckWatermark: \"WATERMARK-1\", costingPrices: { mat: { UsedBoard: 150, UnusedBoard: 999 }, edge: { UsedEdge: 8 }, extras: { cutLabel: 85, cutLabelMasonite: 45, drilling: 8, hPrice: 5.31, boardSurcharge: 0 }, hardware: { hingeNormal: 22 } } })', ctx);
console.log('Case 2 (used material differs) — prompt shown:', promptShownWith);
console.assert(promptShownWith && promptShownWith.includes('UsedBoard'), 'must prompt when a used material differs, and name it');

// Case 3: a matching watermark short-circuits, even with real differences
ctx.currentJobPriceAckWatermark = null;
promptShownWith = null;
vm.runInContext('_detectStalePrices({ priceAckWatermark: \"WATERMARK-2\", costingPrices: { mat: { UsedBoard: 1 }, edge: {}, extras: {}, hardware: {} } })', ctx);
console.log('Case 3 (matching watermark) — prompt shown:', promptShownWith);
console.assert(promptShownWith === null, 'matching watermark must short-circuit before any comparison');

// Case 4: a Frozen job never gets flagged
ctx.currentJobPriceSnapshot = { mat: { x: 1 } };
ctx.currentJobPriceAckWatermark = null;
promptShownWith = null;
vm.runInContext('_detectStalePrices({ priceAckWatermark: \"WATERMARK-1\", costingPrices: { mat: { UsedBoard: 1 } } })', ctx);
console.log('Case 4 (Frozen job) — prompt shown:', promptShownWith);
console.assert(promptShownWith === null, 'a Frozen job must never be flagged');

console.log('ALL ASSERTIONS PASSED');
"
```
Expected: `ALL ASSERTIONS PASSED`, no `Assertion failed` lines.

- [ ] **Step 10: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: detect stale job prices on load and prompt to update or keep"
```

---

### Task 6: "Prices as quoted" badge

**Files:**
- Modify: `dev.html:4560-4568` (HTML — insert a new badge element between `#job-status-wrap` and the zone-separator span)
- Modify: `dev.html` near `_renderJobStatusBadge()` (currently `dev.html:15085-15093`) — add a sibling render function
- Modify: `dev.html` inside `applyState()` — call the new render function at the right point (after `currentJobPriceSnapshot` is set, not before — see Step 3)

**Interfaces:**
- Consumes: `currentJobPriceSnapshot` (existing), `_unfreezeCurrentJobPrices` (Task 3).
- Produces: `_renderPriceFrozenBadge()` — already referenced by Task 5's `_showPriceStalePrompt()` (forward reference, now resolved).

- [ ] **Step 1: Add the badge HTML element**

Find (`dev.html:4560-4568`):

```html
  <!-- Job status badge -->
  <div id="job-status-wrap" style="display:none;position:relative">
    <button id="job-status-btn" onclick="toggleJobStatusMenu()"
      style="font-weight:500;background:rgba(128,128,128,0.15);border:1px solid rgba(128,128,128,0.4);color:#888;padding:4px 10px;font-family:'Barlow',sans-serif;font-size:10px;letter-spacing:0.3px;text-transform:uppercase;cursor:pointer;white-space:nowrap;transition:all 0.15s">
      ● DRAFT
    </button>
    <div id="job-status-menu" style="display:none;position:absolute;top:calc(100% + 4px);left:0;background:var(--bg2);border:1px solid var(--border);min-width:150px;z-index:9100;box-shadow:0 6px 20px rgba(0,0,0,0.5);padding:4px 0">
    </div>
  </div>
  <!-- Zone separator: job-context → primary actions -->
```

Replace with:

```html
  <!-- Job status badge -->
  <div id="job-status-wrap" style="display:none;position:relative">
    <button id="job-status-btn" onclick="toggleJobStatusMenu()"
      style="font-weight:500;background:rgba(128,128,128,0.15);border:1px solid rgba(128,128,128,0.4);color:#888;padding:4px 10px;font-family:'Barlow',sans-serif;font-size:10px;letter-spacing:0.3px;text-transform:uppercase;cursor:pointer;white-space:nowrap;transition:all 0.15s">
      ● DRAFT
    </button>
    <div id="job-status-menu" style="display:none;position:absolute;top:calc(100% + 4px);left:0;background:var(--bg2);border:1px solid var(--border);min-width:150px;z-index:9100;box-shadow:0 6px 20px rgba(0,0,0,0.5);padding:4px 0">
    </div>
  </div>
  <!-- Frozen-price badge — hidden unless the open job has a costingPriceSnapshot -->
  <div id="price-frozen-badge" style="display:none;align-items:center;gap:6px;font-size:10px;color:var(--amber-dim);white-space:nowrap">
    <span id="price-frozen-badge-text">📌 Prices as quoted</span>
    <button id="price-frozen-badge-update" onclick="_unfreezeCurrentJobPricesFromBadge()"
      style="background:none;border:none;color:var(--amber);text-decoration:underline;cursor:pointer;font-family:'Barlow',sans-serif;font-size:10px;padding:0">Update to current</button>
  </div>
  <!-- Zone separator: job-context → primary actions -->
```

- [ ] **Step 2: Verify Step 1**

```bash
grep -n "id=\"price-frozen-badge\"" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match.

- [ ] **Step 3: Add `_renderPriceFrozenBadge()` and the badge's click handler**

Find (`dev.html:15085-15093`):

```js
function _renderJobStatusBadge() {
  const btn = document.getElementById('job-status-btn');
  if (!btn) return;
  const s = JOB_STATUSES.find(x => x.key === currentJobStatus) || JOB_STATUSES[0];
  btn.textContent = '● ' + s.label.toUpperCase();
  btn.style.color = s.color;
  btn.style.borderColor = s.color + '80';
  btn.style.background = s.bg;
}
```

Replace with:

```js
function _renderJobStatusBadge() {
  const btn = document.getElementById('job-status-btn');
  if (!btn) return;
  const s = JOB_STATUSES.find(x => x.key === currentJobStatus) || JOB_STATUSES[0];
  btn.textContent = '● ' + s.label.toUpperCase();
  btn.style.color = s.color;
  btn.style.borderColor = s.color + '80';
  btn.style.background = s.bg;
}

// Shows "📌 Prices as quoted {date}" next to the job status badge whenever
// the open job is Frozen — regardless of whether that came from the
// automatic staleness prompt or the manual "Set Historical Prices" modal.
function _renderPriceFrozenBadge() {
  const wrap = document.getElementById('price-frozen-badge');
  if (!wrap) return;
  if (!currentJobPriceSnapshot) {
    wrap.style.display = 'none';
    return;
  }
  const textEl = document.getElementById('price-frozen-badge-text');
  const savedAt = currentJobPriceSnapshot.savedAt
    ? new Date(currentJobPriceSnapshot.savedAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: '2-digit' })
    : '';
  textEl.textContent = '📌 Prices as quoted' + (savedAt ? ` ${savedAt}` : '');
  wrap.style.display = 'flex';
}

// Badge's "Update to current" link — same action as the stale-prompt's
// "Update to current prices" button, reachable any time a job is Frozen.
function _unfreezeCurrentJobPricesFromBadge() {
  _unfreezeCurrentJobPrices();
  try { if (document.getElementById('quote-view')?.style.display !== 'none') renderQuoteView(); } catch(e) {}
  try { if (document.getElementById('costing-view')?.style.display !== 'none') renderCostingView(); } catch(e) {}
  try { renderPLView(); } catch(e) {}
  _renderPriceFrozenBadge();
  try { scheduleAutoSave(); } catch(e) {}
}
```

(Uses whatever name Task 5 Step 1 confirmed for autosave — replace `scheduleAutoSave` here too if that step found a different name.)

- [ ] **Step 4: Call `_renderPriceFrozenBadge()` at the right point in `applyState()`**

Find (inside `applyState()`'s first `try` block, after Task 5 Step 3's edit):

```js
    currentJobPriceSnapshot = (state.costingPriceSnapshot && typeof state.costingPriceSnapshot === 'object'
      && state.costingPriceSnapshot.mat && Object.keys(state.costingPriceSnapshot.mat).length > 0)
      ? state.costingPriceSnapshot
      : null;
    currentJobPriceAckWatermark = (typeof state.priceAckWatermark === 'string') ? state.priceAckWatermark : null;
    currentJobArchived = state.archived === true;
```

Replace with:

```js
    currentJobPriceSnapshot = (state.costingPriceSnapshot && typeof state.costingPriceSnapshot === 'object'
      && state.costingPriceSnapshot.mat && Object.keys(state.costingPriceSnapshot.mat).length > 0)
      ? state.costingPriceSnapshot
      : null;
    currentJobPriceAckWatermark = (typeof state.priceAckWatermark === 'string') ? state.priceAckWatermark : null;
    if (typeof _renderPriceFrozenBadge === 'function') _renderPriceFrozenBadge();
    currentJobArchived = state.archived === true;
```

Note: this must come AFTER `currentJobPriceSnapshot` is assigned (it reads that global), which is why it's placed here rather than reusing the existing `_renderJobStatusBadge()` call site a few lines above (that one runs before `currentJobPriceSnapshot` is set for this job load, per `applyState()`'s existing statement order — verified by reading the full function body during planning).

- [ ] **Step 5: Verify Steps 3-4**

```bash
grep -n "^function _renderPriceFrozenBadge\|^function _unfreezeCurrentJobPricesFromBadge" /home/dutchman/cutlist_pro/dev.html
grep -n "if (typeof _renderPriceFrozenBadge === 'function') _renderPriceFrozenBadge();" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match each (3 total).

- [ ] **Step 6: Syntax check**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => { try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); } });
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`.

- [ ] **Step 7: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: add 'Prices as quoted' badge with Update-to-current link"
```

---

### Task 7: End-to-end manual verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: confidence the feature works end-to-end before pushing to staging.

- [ ] **Step 1: Serve the app locally**

```bash
python3 -m http.server 7823 --directory /home/dutchman/cutlist_pro
```

- [ ] **Step 2: Full syntax + wiring sanity pass**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => { try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); } });
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
grep -c "liveCostingPrices" /home/dutchman/cutlist_pro/dev.html
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`; the `liveCostingPrices` count should be well above 0 (global declaration + Task 2's 3 assignments + Task 4's 2 reads + Task 3/5's helper-function reads).

Ask the user (Nico) to open `http://localhost:7823/dev.html` in their own browser and:

- [ ] **Step 3: Baseline — confirm nothing regressed for a job with no price changes.** Open any existing job that hasn't had its prices touched recently. Confirm Quote/Costing/P&L totals look the same as before this feature shipped, and no prompt appears.

- [ ] **Step 4: Trigger and verify the stale-prompt flow.** Note a board price this job's cutlist actually uses (Costing tab breakdown shows which boards). In My Costs tab, bump that board's price by some amount, click "↻ Sync" (or wait for the natural Supabase sync if prices are edited there instead — whichever matches how Nico actually updates prices). Switch away from this job to a different job, then switch back (or reload and reopen it) — confirm the "Prices have changed since this job was quoted" prompt appears, naming the changed board.

- [ ] **Step 5: "Update to current prices" branch.** Click it. Confirm: modal closes, Quote/Costing/P&L totals reflect the new (current) price immediately, no "📌 Prices as quoted" badge appears, and reopening the same job later (without further price changes) does NOT re-prompt.

- [ ] **Step 6: "Keep prices as quoted" branch.** Repeat Step 4's price bump on a DIFFERENT job (or revert and re-bump the same one — either works). This time click "KEEP PRICES AS QUOTED". Confirm: modal closes, totals stay at the OLD (job's last-quoted) price, the "📌 Prices as quoted {date}" badge appears next to the job status badge, and reopening this job later does NOT re-prompt (it's Frozen — badge is the only revisit path).

- [ ] **Step 7: Badge's "Update to current" link.** With the Frozen job from Step 6 open, click "Update to current" in the badge. Confirm: badge disappears, totals jump to current live prices, and this matches exactly what clicking "Update to current prices" in the original prompt would have done.

- [ ] **Step 8: Re-staleness after a Live job's "Update" choice.** With a job that chose "Update to current" in Step 5 still Live, bump a price it uses AGAIN (a second, later change). Reopen that job — confirm it prompts again (the watermark correctly considers this new change, doesn't permanently suppress after the first "Update").

- [ ] **Step 9: Manual "Set Historical Prices" modal still works.** Open the existing manual snapshot modal (wherever it's triggered from in the UI — search the Jobs list or job actions menu for "historical" or a 📌-adjacent action) on a job, set some mat/edge prices, save. Confirm the badge appears (source: manual doesn't change the badge text, just internal bookkeeping) and P&L Expected reflects those manually-set prices.

- [ ] **Step 10: Screw hardware prices included.** Confirm a screw price change (My Costs → Screws section) also triggers the stale-prompt on a job that uses screws (any kitchen unit), and that freezing/unfreezing correctly carries screw prices too (Costing tab's pooled screw line should reflect Frozen vs Live screw prices appropriately).

- [ ] **Step 11: Report back.** Once Nico confirms the above look right, this task (and the plan) is done. If anything looks wrong, note exactly what and which task's code is implicated.
