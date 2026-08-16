# Screw Hardware Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-compute screw pack quantities per job (drawer/hinge/handle/carcass counts) and surface them in the Hardware Order List (Summary tab) and the automatic Hardware cost subtotal (Costing tab), matching how hinges/runners/handles already work.

**Architecture:** Single-file vanilla-JS app (`/home/dutchman/cutlist_pro/dev.html`, no build step, no test framework). All changes are additive edits to existing functions/objects — no new files. A pure formula function (`screwCountsForUnit`) is shared by the Costing calculation and the Hardware Order List so counts never drift between the two views.

**Tech Stack:** Vanilla JS in `dev.html`. Verification uses Node.js directly (`vm.runInContext` for pure-function checks, `grep` for structural/wiring checks) — no browser available in this environment, no `npm`/test runner in this repo.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-16-screw-hardware-design.md` — follow it exactly; this plan implements it task-by-task.
- Pack sizes are fixed in code, not user-editable: 3.5×16mm=1000, 3.5×25mm=1000, 3.5×40mm=800, M4×40mm=50.
- Carcass screw count (3.5×40mm, flat 18 Floor / 20 Wall) applies **only** to kitchen-section units named `F<digit>...` or `W<digit>...` — not Bedroom/Linnekast/Bathroom units.
- Screw cost rolls into the same `hardwareCost` bucket as hinges/runners/handles (gets the existing 15% `HW_HANDLING` markup, included in the quote total automatically) — **no** new line in `EXTRAS & SHOPPING LIST`, **no** manual "add to quote" step.
- No test framework exists in this repo. Verification = `grep` structural checks + `node -e` with `vm.runInContext` for pure logic + a manual dev-server pass in the final task. Do not attempt Playwright (confirmed unavailable on this machine — no Chrome/Firefox install, WSL2/ubuntu26.04-x64 unsupported).

---

### Task 1: Screw pack pricing — data + My Costs UI

**Files:**
- Modify: `dev.html:13644` (add `SCREW_PACK_SIZE` constant, next to `RUNNER_STANDARD_SIZES`)
- Modify: `dev.html:13823-13830` (`costingPrices.hardware` object — add 4 new price fields)
- Modify: `dev.html:21687-21693` (My Costs tab — insert new "Screws" section between Handles and Other Services)

**Interfaces:**
- Produces: `SCREW_PACK_SIZE` constant — `{ screw16: 1000, screw25: 1000, screw40: 800, screwM4: 50 }`, keyed by the same names used on `costingPrices.hardware`. Later tasks (2, 3, 4) read this constant and these `costingPrices.hardware.screw*` fields.

- [ ] **Step 1: Add the pack-size constant**

In `dev.html`, right after line 13644 (`const RUNNER_STANDARD_SIZES = [300, 350, 400, 450, 500];`), add:

```js
// Screw pack sizes (fixed — not user-editable, matches supplier pack counts)
const SCREW_PACK_SIZE = { screw16: 1000, screw25: 1000, screw40: 800, screwM4: 50 };
```

- [ ] **Step 2: Add screw price fields to `costingPrices.hardware`**

Find (around line 13823):

```js
  hardware: {
    hingeNormal:  22,
    hingeSoft:    45,
    runnerNormal: 95,
    runnerSoft:   185,
    handle160:    28,
    handle240:    38,
  },
```

Replace with:

```js
  hardware: {
    hingeNormal:  22,
    hingeSoft:    45,
    runnerNormal: 95,
    runnerSoft:   185,
    handle160:    28,
    handle240:    38,
    screw16:       0,
    screw25:       0,
    screw40:       0,
    screwM4:       0,
  },
```

- [ ] **Step 3: Verify the fields were added correctly**

Run:
```bash
grep -n "screw16:\|screw25:\|screw40:\|screwM4:\|SCREW_PACK_SIZE" /home/dutchman/cutlist_pro/dev.html
```
Expected: 5 matches — the `SCREW_PACK_SIZE` const line plus the 4 `screw*` fields inside `costingPrices.hardware`.

- [ ] **Step 4: Add the "Screws" section to the My Costs tab UI**

Find (around line 21687-21693):

```js
        ${section('Handles')}
        ${fixedRow('160mm', 'per handle', 'handle160', hw)}
        ${fixedRow('240mm', 'per handle', 'handle240', hw)}
        ${catItems('handle')}
        ${suggestions('handle', ['96mm', '128mm', '320mm', '512mm', 'Knob', 'Edge Pull', 'Flush Pull'])}
        ${addRow('handle', 'e.g. 96mm, 320mm, Knob…')}

        ${section('Other Services')}
```

Replace with:

```js
        ${section('Handles')}
        ${fixedRow('160mm', 'per handle', 'handle160', hw)}
        ${fixedRow('240mm', 'per handle', 'handle240', hw)}
        ${catItems('handle')}
        ${suggestions('handle', ['96mm', '128mm', '320mm', '512mm', 'Knob', 'Edge Pull', 'Flush Pull'])}
        ${addRow('handle', 'e.g. 96mm, 320mm, Knob…')}

        ${section('Screws')}
        ${fixedRow('3.5×16mm', 'per pack of 1000', 'screw16', hw)}
        ${fixedRow('3.5×25mm', 'per pack of 1000', 'screw25', hw)}
        ${fixedRow('3.5×40mm', 'per pack of 800', 'screw40', hw)}
        ${fixedRow('M4×40mm Machine', 'per pack of 50', 'screwM4', hw)}

        ${section('Other Services')}
```

This reuses the existing `fixedRow(label, unit, key, obj)` helper (defined at line 21623) — no new UI code needed, it already wires `onchange`/`onblur` to `costingPrices.hardware.${key}` and calls `saveCostingPrices()` + `refreshCostingResults()`.

- [ ] **Step 5: Verify the UI section renders and is wired**

Run:
```bash
grep -n "section('Screws')" /home/dutchman/cutlist_pro/dev.html
grep -c "fixedRow('3.5" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match for the section call, `4` for the fixedRow count (3.5×16mm, 3.5×25mm, 3.5×40mm — the M4 row doesn't start with "3.5" so this count should be exactly 3; if the grep returns 3, that's correct — the 4th row is `'M4×40mm Machine'`).

- [ ] **Step 6: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: add screw pack pricing fields and My Costs UI section"
```

---

### Task 2: `screwCountsForUnit()` — pure formula function

**Files:**
- Modify: `dev.html` — add new function near `calcUnitCost` (insert directly above `function calcUnitCost(u, unitQty) {` at line 20348)

**Interfaces:**
- Consumes: nothing from other tasks (pure function, only reads `u.name` and `u.section`).
- Produces: `screwCountsForUnit(u, unitQty, hingeCount, drawerCount, handleCount)` → `{ screw16, screw25, screw40, screwM4 }` (raw screw counts, **not** packs). Task 3 (Costing) and Task 4 (Hardware Order List) both call this with values they already have on hand.

- [ ] **Step 1: Write the function**

Insert directly above line 20348 (`function calcUnitCost(u, unitQty) {`):

```js
// Screw counts for one unit, given its already-computed hinge/drawer/handle
// counts. drawerCount = number of drawers (one runner set per drawer).
// handleCount = handle160Count + handle240Count (doors + drawer faces).
// Carcass screws (3.5x40mm) are flat-per-unit-instance and only apply to
// kitchen F*/W* units — no numbers exist yet for bedroom/linnekast/bathroom.
function screwCountsForUnit(u, unitQty, hingeCount, drawerCount, handleCount) {
  const isFloor = /^F\d/.test(u.name) && u.section === 'kitchen';
  const isWall  = /^W\d/.test(u.name) && u.section === 'kitchen';

  const screw25 = drawerCount * 24;                 // 20 drawer box + 4 drawer face
  const screw16 = drawerCount * 12 + hingeCount * 6; // runners+box+carcass ties, + 6/hinge
  const screwM4 = handleCount * 2;                   // 2 per handle (door or drawer face)
  const screw40 = isFloor ? unitQty * 18 : isWall ? unitQty * 20 : 0;

  return { screw16, screw25, screw40, screwM4 };
}
```

- [ ] **Step 2: Verify the function exists**

```bash
grep -n "^function screwCountsForUnit" /home/dutchman/cutlist_pro/dev.html
```
Expected: 1 match, on the line directly above `calcUnitCost`.

- [ ] **Step 3: Test the formula logic in isolation**

No test framework in this repo — extract and run the function body directly via Node's `vm` module (this is the established verification method for this project, see `docs`/memory on verification).

```bash
node -e "
const vm = require('vm');
const src = require('fs').readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const m = src.match(/function screwCountsForUnit\([\s\S]*?\n}/);
if (!m) { console.error('FUNCTION NOT FOUND'); process.exit(1); }
const ctx = vm.createContext({});
vm.runInContext(m[0], ctx);

// F450: 1 drawer, 1 door (1 hinge), 1 handle (on the door)
let r = ctx.screwCountsForUnit({ name: 'F450', section: 'kitchen' }, 1, 1, 1, 1);
console.log('F450 x1, 1 drawer, 1 hinge, 1 handle:', JSON.stringify(r));
console.assert(r.screw25 === 24, 'screw25 should be 24 (drawerCount*24)');
console.assert(r.screw16 === 18, 'screw16 should be 18 (12 + 6)');
console.assert(r.screwM4 === 2,  'screwM4 should be 2 (handleCount*2)');
console.assert(r.screw40 === 18, 'screw40 should be 18 (Floor flat carcass)');

// W750: no drawers, 2 doors (2 hinges), 2 handles, qty 2
r = ctx.screwCountsForUnit({ name: 'W750', section: 'kitchen' }, 2, 2, 0, 2);
console.log('W750 x2, 0 drawers, 2 hinges, 2 handles:', JSON.stringify(r));
console.assert(r.screw25 === 0,  'screw25 should be 0 (no drawers)');
console.assert(r.screw16 === 12, 'screw16 should be 12 (0 + 2*6)');
console.assert(r.screwM4 === 4,  'screwM4 should be 4 (2 handles * 2)');
console.assert(r.screw40 === 40, 'screw40 should be 40 (Wall flat carcass, unitQty=2 * 20)');

// Bedroom cupboard: has hinges/handles but no carcass line
r = ctx.screwCountsForUnit({ name: 'BR1', section: 'mainbedroom' }, 1, 1, 0, 1);
console.log('Bedroom unit:', JSON.stringify(r));
console.assert(r.screw40 === 0, 'screw40 should be 0 for non-F/W units');

console.log('ALL ASSERTIONS PASSED');
"
```
Expected output ends with `ALL ASSERTIONS PASSED` and no `console.assert` failure lines (a failed `console.assert` prints `Assertion failed: <message>` to stderr).

- [ ] **Step 4: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: add screwCountsForUnit formula function"
```

---

### Task 3: Wire screws into Costing (automatic Hardware subtotal)

**Files:**
- Modify: `dev.html:20469-20496` (`calcUnitCost` — add screw cost computation, fold into `hardwareCost`, return `screwCounts`)
- Modify: `dev.html:20498-20544` (`hardwareRows` — add per-size screw cost rows)

**Interfaces:**
- Consumes: `screwCountsForUnit()` (Task 2), `SCREW_PACK_SIZE` and `costingPrices.hardware.screw*` (Task 1).
- Produces: `calcUnitCost()` return value gains `screwCounts: {screw16,screw25,screw40,screwM4}` and `screwCost: number`; `hardwareCost` now includes `screwCost`. Later tasks/consumers of `calcUnitCost()` (e.g. Task 4's BOM block) rely on `c.screwCounts`.

- [ ] **Step 1: Add screw cost calculation inside `calcUnitCost`**

Find (around line 20484-20489):

```js
  const handle160Cost = includeHandles ? handle160Count * hw.handle160 : 0;
  const handle240Cost = includeHandles ? handle240Count * hw.handle240 : 0;
  const hardwareCost  = hingeCost + runnerCost + handle160Cost + handle240Cost;
  const hwHandlingCost = hardwareCost * HW_HANDLING;
  const svcCost = calcSpecialServicesCost(unitSpecialServices[u.id]);
  const total = matCost + edgeCost + cutLabelCost + drillingCost + hardwareCost + hwHandlingCost + hPriceCost + svcCost;
```

Replace with:

```js
  const handle160Cost = includeHandles ? handle160Count * hw.handle160 : 0;
  const handle240Cost = includeHandles ? handle240Count * hw.handle240 : 0;
  const screwCounts   = screwCountsForUnit(u, unitQty, hingeCount, runnerCount, handle160Count + handle240Count);
  const screwCost      = includeHardware
    ? Object.entries(screwCounts).reduce((sum, [key, count]) =>
        sum + Math.ceil(count / SCREW_PACK_SIZE[key]) * (hw[key] || 0), 0)
    : 0;
  const hardwareCost  = hingeCost + runnerCost + handle160Cost + handle240Cost + screwCost;
  const hwHandlingCost = hardwareCost * HW_HANDLING;
  const svcCost = calcSpecialServicesCost(unitSpecialServices[u.id]);
  const total = matCost + edgeCost + cutLabelCost + drillingCost + hardwareCost + hwHandlingCost + hPriceCost + svcCost;
```

Note: `runnerCount` here is the variable already computed two lines above this block (`const runnerCount = totalRunnerCount(runnerSets);`, line 20475) — it is the drawer count (one runner set per drawer), matching what `screwCountsForUnit` expects as `drawerCount`.

- [ ] **Step 2: Add `screwCounts` and `screwCost` to the return object**

Find (line 20491-20495):

```js
  return { matM2, edgeM, partCount, doorCount, matCost, edgeCost, cutLabelCost, drillingCost,
           hingeCount, runnerCount, runnerSets, handle160Count, handle240Count,
           hingeCost, runnerCost, handle160Cost, handle240Cost, hardwareCost, hwHandlingCost,
           hPriceCost, svcCost, total,
           totalSheets, boardSheets, masoniteSheets };
```

Replace with:

```js
  return { matM2, edgeM, partCount, doorCount, matCost, edgeCost, cutLabelCost, drillingCost,
           hingeCount, runnerCount, runnerSets, handle160Count, handle240Count,
           hingeCost, runnerCost, handle160Cost, handle240Cost, screwCounts, screwCost,
           hardwareCost, hwHandlingCost,
           hPriceCost, svcCost, total,
           totalSheets, boardSheets, masoniteSheets };
```

- [ ] **Step 3: Verify the edits**

```bash
grep -n "screwCounts\s*=\s*screwCountsForUnit\|screwCost\s*=\|screwCounts, screwCost" /home/dutchman/cutlist_pro/dev.html
```
Expected: at least 2 matches inside `calcUnitCost` (the computation lines) plus the return-object line.

- [ ] **Step 4: Add screw cost rows to the Costing tab breakdown**

Find (around line 20516-20536, the runner block inside `hardwareRows`):

```js
  if (showRunners && c.runnerCount > 0) {
    const _rSets    = c.runnerSets || {};
    const _rType    = quoteState.runnerType || 'soft';
    const _hasSized = Object.keys(_rSets).some(k => Number(k) > 0);
    if (_hasSized) {
      RUNNER_STANDARD_SIZES.forEach(size => {
        const count = _rSets[size];
        if (!count) return;
        const hwItem = _findRunnerHwItem(size, _rType);
        const price  = hwItem ? hwItem.pricePerUnit : runnerPrice;
        const label  = hwItem ? hwItem.name : (runnerLabel + ' ' + size + 'mm');
        rows += `<tr><td>${label} (${count} set${count!==1?'s':''})</td><td colspan="3" class="num" style="color:var(--text-muted);font-size:11px">R${price}×${count}</td><td class="num cost">R ${Math.round(count * price).toLocaleString('en-ZA')}</td></tr>`;
      });
      if (_rSets[0]) {
        const count = _rSets[0];
        rows += `<tr><td>Runners – ${runnerLabel} (${count} set${count!==1?'s':''})</td><td colspan="3" class="num" style="color:var(--text-muted);font-size:11px">R${runnerPrice}×${count}</td><td class="num cost">R ${Math.round(count * runnerPrice).toLocaleString('en-ZA')}</td></tr>`;
      }
    } else {
      rows += `<tr><td>Runners – ${runnerLabel} (${c.runnerCount} set${c.runnerCount!==1?'s':''})</td><td colspan="3" class="num" style="color:var(--text-muted);font-size:11px">R${runnerPrice}×${c.runnerCount}</td><td class="num cost">R ${Math.round(c.runnerCost).toLocaleString('en-ZA')}</td></tr>`;
    }
  }
```

Directly after that closing `}` (still inside `hardwareRows`, before `if (rows) {`), add:

```js
  const _screwLabels = { screw16: '3.5×16mm', screw25: '3.5×25mm', screw40: '3.5×40mm', screwM4: 'M4×40mm Machine' };
  if (c.screwCounts) {
    Object.entries(c.screwCounts).forEach(([key, count]) => {
      if (!count) return;
      const packs = Math.ceil(count / SCREW_PACK_SIZE[key]);
      const price = hw[key] || 0;
      const cost  = packs * price;
      rows += `<tr><td>Screws – ${_screwLabels[key]} (${packs} pack${packs!==1?'s':''})</td><td colspan="3" class="num" style="color:var(--text-muted);font-size:11px">R${price}×${packs}</td><td class="num cost">R ${Math.round(cost).toLocaleString('en-ZA')}</td></tr>`;
    });
  }
```

- [ ] **Step 5: Verify the row-rendering edit**

```bash
grep -n "_screwLabels" /home/dutchman/cutlist_pro/dev.html
```
Expected: 2 matches (the const definition and its usage inside the `.forEach`).

- [ ] **Step 6: Verify cost math in isolation**

The pack-rounding + cost math is simple enough to check directly:

```bash
node -e "
const SCREW_PACK_SIZE = { screw16: 1000, screw25: 1000, screw40: 800, screwM4: 50 };
const hw = { screw16: 50, screw25: 55, screw40: 60, screwM4: 120 };
const screwCounts = { screw16: 1801, screw25: 2400, screw40: 18, screwM4: 6 };
let total = 0;
Object.entries(screwCounts).forEach(([key, count]) => {
  const packs = Math.ceil(count / SCREW_PACK_SIZE[key]);
  total += packs * hw[key];
  console.log(key, 'count=' + count, 'packs=' + packs, 'cost=' + (packs*hw[key]));
});
console.log('total', total);
console.assert(total === 2*50 + 3*55 + 1*60 + 1*120, 'expected 100+165+60+120=445');
console.log(total === 445 ? 'PASS' : 'FAIL');
"
```
Expected: `PASS` on the last line (1801/1000→2 packs, 2400/1000→3 packs, 18/800→1 pack, 6/50→1 pack).

- [ ] **Step 7: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: fold screw cost into automatic Hardware subtotal"
```

---

### Task 4: Wire screws into the Hardware Order List (Summary tab)

**Files:**
- Modify: `dev.html:9107-9145` (BOM accumulation block inside the Summary render function)

**Interfaces:**
- Consumes: `c.screwCounts` from `calcUnitCost()` (Task 3), `SCREW_PACK_SIZE` (Task 1).
- Produces: 4 additional rows in `_bomRows` (screw pack quantities), included in `window._bomForXlsx` for XLSX export automatically (no separate export code needed — `_bomRows` is already what gets exported).

- [ ] **Step 1: Accumulate screw totals across all units**

Find (around line 9104-9105):

```js
    const _bomRunnerSets = {};
    let _bomHinges = 0, _bomH160 = 0, _bomH240 = 0, _bomShelfPins = 0;
```

Replace with:

```js
    const _bomRunnerSets = {};
    let _bomHinges = 0, _bomH160 = 0, _bomH240 = 0, _bomShelfPins = 0;
    let _bomScrew16 = 0, _bomScrew25 = 0, _bomScrew40 = 0, _bomScrewM4 = 0;
```

Find (around line 9116-9119):

```js
      if (incHinges)  _bomHinges += c.hingeCount     || 0;
      if (incHandles) _bomH160   += c.handle160Count || 0;
      if (incHandles) _bomH240   += c.handle240Count || 0;
      if (incRunners && c.runnerSets) mergeRunnerSets(_bomRunnerSets, c.runnerSets);
```

Replace with:

```js
      if (incHinges)  _bomHinges += c.hingeCount     || 0;
      if (incHandles) _bomH160   += c.handle160Count || 0;
      if (incHandles) _bomH240   += c.handle240Count || 0;
      if (incRunners && c.runnerSets) mergeRunnerSets(_bomRunnerSets, c.runnerSets);
      if ((incHinges || incRunners || incHandles) && c.screwCounts) {
        _bomScrew16 += c.screwCounts.screw16 || 0;
        _bomScrew25 += c.screwCounts.screw25 || 0;
        _bomScrew40 += c.screwCounts.screw40 || 0;
        _bomScrewM4 += c.screwCounts.screwM4 || 0;
      }
```

- [ ] **Step 2: Push pack rows into `_bomRows`**

Find (around line 9143-9145):

```js
    if (_bomH160 > 0) _bomRows.push({ item: 'Handles 160mm', qty: _bomH160, unit: 'pcs' });
    if (_bomH240 > 0) _bomRows.push({ item: 'Handles 240mm', qty: _bomH240, unit: 'pcs' });
    if (_bomShelfPins > 0) _bomRows.push({ item: 'Shelf Pins', qty: _bomShelfPins, unit: 'pcs' });
```

Replace with:

```js
    if (_bomH160 > 0) _bomRows.push({ item: 'Handles 160mm', qty: _bomH160, unit: 'pcs' });
    if (_bomH240 > 0) _bomRows.push({ item: 'Handles 240mm', qty: _bomH240, unit: 'pcs' });
    if (_bomShelfPins > 0) _bomRows.push({ item: 'Shelf Pins', qty: _bomShelfPins, unit: 'pcs' });
    if (_bomScrew16 > 0) _bomRows.push({ item: 'Chipboard Screws 3.5×16mm', qty: Math.ceil(_bomScrew16 / SCREW_PACK_SIZE.screw16), unit: 'packs' });
    if (_bomScrew25 > 0) _bomRows.push({ item: 'Chipboard Screws 3.5×25mm', qty: Math.ceil(_bomScrew25 / SCREW_PACK_SIZE.screw25), unit: 'packs' });
    if (_bomScrew40 > 0) _bomRows.push({ item: 'Chipboard Screws 3.5×40mm', qty: Math.ceil(_bomScrew40 / SCREW_PACK_SIZE.screw40), unit: 'packs' });
    if (_bomScrewM4 > 0) _bomRows.push({ item: 'Machine Screws M4×40mm',    qty: Math.ceil(_bomScrewM4 / SCREW_PACK_SIZE.screwM4), unit: 'packs' });
```

- [ ] **Step 3: Verify the edits**

```bash
grep -n "_bomScrew16\|_bomScrew25\|_bomScrew40\|_bomScrewM4" /home/dutchman/cutlist_pro/dev.html
```
Expected: 4 declaration/accumulation occurrences plus 4 `_bomRows.push` occurrences = 8 total matches (each variable appears twice: once in the accumulation block, once in the push block).

- [ ] **Step 4: Commit**

```bash
cd /home/dutchman/cutlist_pro
git add dev.html
git commit -m "feat: show screw pack quantities in Hardware Order List"
```

---

### Task 5: End-to-end manual verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: confidence the feature works end-to-end before pushing to staging.

- [ ] **Step 1: Serve the app locally**

```bash
python3 -m http.server 7823 --directory /home/dutchman/cutlist_pro
```

- [ ] **Step 2: Structural sanity check — confirm nothing is syntactically broken**

Since there's no build step, a quick Node syntax check on the extracted `<script>` content catches typos before manual testing:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');
const scripts = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let ok = true;
scripts.forEach((s, i) => {
  try { new Function(s); } catch (e) { ok = false; console.error('Script block', i, 'SYNTAX ERROR:', e.message); }
});
console.log(ok ? 'ALL SCRIPT BLOCKS PARSE OK' : 'SYNTAX ERRORS FOUND');
"
```
Expected: `ALL SCRIPT BLOCKS PARSE OK`. (This only checks parse validity, not runtime correctness — the manual pass below covers that.)

Ask the user (Nico) to open `http://localhost:7823/dev.html` in their own browser and:

- [ ] **Step 3: Enter screw pack prices** — go to My Costs tab, confirm the new "Screws" section appears with 4 price inputs (3.5×16mm, 3.5×25mm, 3.5×40mm, M4×40mm Machine), enter a price in each, confirm it saves (reload page, values persist).

- [ ] **Step 4: Check Hardware Order List** — build a job with at least one F450 (with a drawer and a door) and one W450 (with doors), go to Summary tab, confirm the Hardware Order List shows pack-quantity rows for all 4 screw sizes with sensible numbers.

- [ ] **Step 5: Check Costing tab** — go to Costing tab, find the unit's Hardware breakdown, confirm screw rows appear (one per size with count > 0) and the Hardware subtotal increased by the expected amount; confirm the quote total price also increased (screw cost flows through automatically, no manual "add to quote" needed).

- [ ] **Step 6: Check unit-type exclusion** — add a Bedroom Cupboard unit with a door, confirm it gets hinge-screw counts but does NOT contribute to the 3.5×40mm carcass screw pack count (compare Hardware Order List totals with and without the bedroom unit added).

- [ ] **Step 7: Report back** — once Nico confirms the above look right, this task (and the plan) is done. If anything looks wrong, note exactly what and which task's code is implicated, so it can be fixed without redoing unrelated tasks.
