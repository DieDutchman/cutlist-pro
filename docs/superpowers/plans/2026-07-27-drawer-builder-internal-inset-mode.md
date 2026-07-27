# Drawer Builder Internal (Inset) Face Style + Hinge Spacers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Face Style" toggle to the Drawer Builder — External (today's overlay-on-a-generated-carcass behavior, unchanged) vs Internal (new: inset faces recessed inside an existing carcass opening typed in directly, no carcass panels generated, optional left/right hinge-clearance filler panels added to the cutlist).

**Architecture:** All changes live in `dev.html`'s Drawer Builder section (`drawerState` object and its `drawer*` functions, `dev.html:24689-26976` region). Internal mode is threaded through via one new `faceStyle` field plus two new `spacerLeft`/`spacerRight` fields on `drawerState`, consumed by small additions to the existing auto+override calculation functions (`drawerFaceWidth`, `drawerEffectiveDepth`) and the cutlist generator (`drawerCalcParts`). External mode's code paths are untouched — every new check is `(ds.faceStyle || 'external') === 'internal'`, defaulting old/missing data to today's behavior.

**Tech Stack:** Vanilla JS, no framework, no build step, no test framework.

## Global Constraints

- Single file: all changes go into `/home/dutchman/cutlist_pro/dev.html`.
- No automated test framework exists in this project, and no browser is available in this environment (documented, permanent constraint — no Chrome/Firefox, Playwright unsupported on this host). Verification for pure-logic functions (`drawerEffectiveOpeningWidth`, `drawerFaceWidth`, `drawerEffectiveDepth`, `drawerCalcParts`) uses Node's `vm.runInContext` on function source extracted directly from `dev.html`, per this project's established pattern. Verification for render/UI/SVG code uses `grep` for wiring plus a full-file `node --check` syntax pass after every task.
- **Additive-only, backward compatible**: `drawerState.faceStyle` defaults to `'external'` when absent — every read site must use `(ds.faceStyle || 'external')`, never assume the field exists. Existing saved drawer units (no `faceStyle` field) must produce byte-identical `drawerCalcParts()` output to before this plan, in External mode.
- Spacer default shape: `{ enabled: false, width: 20 }` — disabled by default, so Internal mode with no spacer configuration produces a plain inset unit with no spacer parts.
- Do not touch Unit Builder (`builderState` and its functions) at all — this plan is scoped entirely to Drawer Builder.
- Follow the existing codebase convention for onclick-embedded field mutation seen throughout this section (e.g. `dev.html:26551`: `onclick="drawerState.drawerType='${val}';...;drawerRedraw()"`) — direct property assignment in the `onclick` string followed by a `drawerRedraw()` call, not a wrapper function, matching the established style for boolean/enum toggles in this section.

---

### Task 1: New `drawerState` fields + `drawerEffectiveOpeningWidth()`

**Files:**
- Modify: `dev.html:24689-24718` (the `drawerState` object literal).
- Modify: `dev.html` — insert new function immediately after `drawerFaceWidth()` currently at `:26156-26158` (exact anchor shown in Step 3; line number will shift once this task's own earlier edit lands, but the anchor is content, not line number).

**Interfaces:**
- Produces: `drawerState.faceStyle` (`'external' | 'internal'`, default `'external'`), `drawerState.spacerLeft` / `drawerState.spacerRight` (`{ enabled: boolean, width: number }`). `drawerEffectiveOpeningWidth() -> number` — returns `ds.width` unchanged in External mode; in Internal mode returns `ds.width` minus whichever of `spacerLeft`/`spacerRight` are enabled (floored at 50mm). Consumed by Tasks 2 and 3.

- [ ] **Step 1: Confirm the new field names and function don't exist yet**

Run:
```bash
grep -n "faceStyle\|spacerLeft\|spacerRight\|drawerEffectiveOpeningWidth" /home/dutchman/cutlist_pro/dev.html
```
Expected: no output.

- [ ] **Step 2: Add the new state fields**

In `dev.html`, find this exact text:
```
  materials: {
    carcass:    'Picco White',
    carcassEdge:'',
    face:       'Dunblane',
    faceEdge:   'Dunblane Edging 1mm',
  },
  unitName: 'Custom Drawer Unit',
  section:  'kitchen',
};
```
Replace it with:
```
  materials: {
    carcass:    'Picco White',
    carcassEdge:'',
    face:       'Dunblane',
    faceEdge:   'Dunblane Edging 1mm',
  },
  unitName: 'Custom Drawer Unit',
  section:  'kitchen',
  // Face style: 'external' = today's behavior (faces overlay a generated
  // carcass). 'internal' = faces sit recessed inside an existing carcass
  // opening (width/height/depth typed in directly, no carcass panels
  // generated). Absent on old saved units — always read via
  // (ds.faceStyle || 'external') so missing data means External.
  faceStyle: 'external',
  // Hinge-clearance filler panels (Internal mode only) — one full-height
  // strip per side, physically blocking the hinge-swing intrusion from an
  // adjacent door on the same existing carcass.
  spacerLeft:  { enabled: false, width: 20 },
  spacerRight: { enabled: false, width: 20 },
};
```

- [ ] **Step 3: Add `drawerEffectiveOpeningWidth()`**

In `dev.html`, find this exact text:
```
function drawerFaceWidth() {
  return drawerState.width - 2 * drawerState.sideGap;
}
```
Replace it with:
```
// Effective opening width used for face/box sizing. External mode: the
// typed carcass width, unchanged. Internal mode: the typed opening width
// minus whichever hinge-clearance spacer(s) are enabled — the drawer has
// less room to work with once a filler panel blocks part of the opening.
function drawerEffectiveOpeningWidth() {
  const ds = drawerState;
  if ((ds.faceStyle || 'external') !== 'internal') return ds.width;
  const lw = ds.spacerLeft  && ds.spacerLeft.enabled  ? (ds.spacerLeft.width  || 0) : 0;
  const rw = ds.spacerRight && ds.spacerRight.enabled ? (ds.spacerRight.width || 0) : 0;
  return Math.max(50, ds.width - lw - rw);
}

function drawerFaceWidth() {
  return drawerState.width - 2 * drawerState.sideGap;
}
```
(This step only adds the new function above `drawerFaceWidth` — `drawerFaceWidth` itself is modified in Task 2, kept separate so each task has one clear, independently reviewable change.)

- [ ] **Step 4: Write the vm verification script**

Create `/tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task1.js`:
```js
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');

function extract(name) {
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('missing: ' + name);
  const braceStart = src.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

function run(drawerStateOverrides) {
  const ctx = { drawerState: Object.assign({ width: 600, faceStyle: 'external', spacerLeft: {enabled:false,width:20}, spacerRight: {enabled:false,width:20} }, drawerStateOverrides) };
  vm.createContext(ctx);
  vm.runInContext(extract('drawerEffectiveOpeningWidth'), ctx);
  return ctx.drawerEffectiveOpeningWidth();
}

// External mode: always returns raw width, spacers irrelevant.
const r1 = run({ faceStyle: 'external', spacerLeft: {enabled:true,width:30} });
console.log('r1 (expect 600):', r1);
if (r1 !== 600) throw new Error('External mode should ignore spacers, got ' + r1);

// Internal mode, no spacers enabled: full width.
const r2 = run({ faceStyle: 'internal' });
console.log('r2 (expect 600):', r2);
if (r2 !== 600) throw new Error('expected 600, got ' + r2);

// Internal mode, left spacer only.
const r3 = run({ faceStyle: 'internal', spacerLeft: {enabled:true,width:25} });
console.log('r3 (expect 575):', r3);
if (r3 !== 575) throw new Error('expected 575, got ' + r3);

// Internal mode, both spacers, different widths.
const r4 = run({ faceStyle: 'internal', spacerLeft: {enabled:true,width:25}, spacerRight: {enabled:true,width:15} });
console.log('r4 (expect 560):', r4);
if (r4 !== 560) throw new Error('expected 560, got ' + r4);

// Internal mode, disabled spacer with a width set should NOT subtract.
const r5 = run({ faceStyle: 'internal', spacerLeft: {enabled:false,width:100}, spacerRight: {enabled:true,width:15} });
console.log('r5 (expect 585):', r5);
if (r5 !== 585) throw new Error('expected 585, got ' + r5);

console.log('ALL PASS');
```

- [ ] **Step 5: Run it, confirm it passes**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task1.js`
Expected: `r1 (expect 600): 600`, `r2 (expect 600): 600`, `r3 (expect 575): 575`, `r4 (expect 560): 560`, `r5 (expect 585): 585`, `ALL PASS`.

- [ ] **Step 6: Full-file syntax check**

```bash
grep -n "^<script" /home/dutchman/cutlist_pro/dev.html
grep -n "^</script>" /home/dutchman/cutlist_pro/dev.html
```
Note the line numbers of the two inline `<script>` blocks (no `src=`) and their matching `</script>` lines — the rest are external `<script src=...>` tags, ignore those. Extract each inline block (lines strictly between the open and close tag lines — exclusive on both ends) and check it:
```bash
sed -n '<first_open+1>,<first_close-1>p' /home/dutchman/cutlist_pro/dev.html > /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/dt1-block1.js
node --check /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/dt1-block1.js && echo "BLOCK1 OK"
sed -n '<second_open+1>,<second_close-1>p' /home/dutchman/cutlist_pro/dev.html > /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/dt1-block2.js
node --check /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/dt1-block2.js && echo "BLOCK2 OK"
```
Expected: `BLOCK1 OK` and `BLOCK2 OK`.

- [ ] **Step 7: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
feat: add drawerState faceStyle + spacer fields, drawerEffectiveOpeningWidth

Additive-only groundwork for Drawer Builder's new Internal (inset) face
style: faceStyle defaults to 'external' so existing saved units and
today's behavior are unaffected. drawerEffectiveOpeningWidth() is the
single place that later tasks consume to get the spacer-adjusted opening
width in Internal mode. No consumers wired yet — this commit only adds
the data and the one new function.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire `drawerFaceWidth()` and `drawerEffectiveDepth()` to Internal mode

**Files:**
- Modify: `dev.html:26156-26158` (now shifted by Task 1's insertion — locate by content) — `drawerFaceWidth()`.
- Modify: `dev.html:26226-26230` — `drawerEffectiveDepth()`.

**Interfaces:**
- Consumes: `drawerEffectiveOpeningWidth()` (Task 1).
- Produces: `drawerFaceWidth()` unchanged signature, now spacer-aware. `drawerEffectiveDepth()` unchanged signature, now returns `ds.depth` directly (no back-panel/rear-gap subtraction) in Internal mode.

- [ ] **Step 1: Write the vm verification script**

Create `/tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task2.js`:
```js
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');

function extract(name) {
  let start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('missing: ' + name);
  const braceStart = src.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

function ctxFor(drawerStateOverrides) {
  const ctx = { drawerState: Object.assign({
    width: 600, sideGap: 2, depth: 560, drawerDepth: null, backPanel: 16, rearGap: 18,
    faceStyle: 'external', spacerLeft: {enabled:false,width:20}, spacerRight: {enabled:false,width:20},
  }, drawerStateOverrides) };
  vm.createContext(ctx);
  vm.runInContext(
    extract('drawerEffectiveOpeningWidth') + '\n' +
    extract('drawerFaceWidth') + '\n' +
    extract('drawerAutoDepth') + '\n' +
    extract('drawerEffectiveDepth'),
    ctx
  );
  return ctx;
}

// External mode face width: unchanged formula (width - 2*sideGap).
let ctx = ctxFor({ faceStyle: 'external' });
const fw1 = ctx.drawerFaceWidth();
console.log('fw1 (expect 596):', fw1);
if (fw1 !== 596) throw new Error('expected 596, got ' + fw1);

// Internal mode face width, both spacers enabled: (600-25-15) - 2*2 = 556.
ctx = ctxFor({ faceStyle: 'internal', spacerLeft: {enabled:true,width:25}, spacerRight: {enabled:true,width:15} });
const fw2 = ctx.drawerFaceWidth();
console.log('fw2 (expect 556):', fw2);
if (fw2 !== 556) throw new Error('expected 556, got ' + fw2);

// External mode depth: auto = depth - backPanel - rearGap = 560-16-18=526.
ctx = ctxFor({ faceStyle: 'external' });
const d1 = ctx.drawerEffectiveDepth();
console.log('d1 (expect 526):', d1);
if (d1 !== 526) throw new Error('expected 526, got ' + d1);

// External mode depth with manual override still honoured.
ctx = ctxFor({ faceStyle: 'external', drawerDepth: 400 });
const d2 = ctx.drawerEffectiveDepth();
console.log('d2 (expect 400):', d2);
if (d2 !== 400) throw new Error('expected 400, got ' + d2);

// Internal mode depth: typed depth used directly, no subtraction, even if drawerDepth override is set (ignored in Internal mode).
ctx = ctxFor({ faceStyle: 'internal', depth: 560, drawerDepth: 400 });
const d3 = ctx.drawerEffectiveDepth();
console.log('d3 (expect 560):', d3);
if (d3 !== 560) throw new Error('expected 560, got ' + d3);

console.log('ALL PASS');
```

- [ ] **Step 2: Run it, confirm it fails (RED)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task2.js`
Expected: `fw1` passes (external mode formula already correct today), but throws on `fw2` (current `drawerFaceWidth` ignores spacers/Internal mode entirely, so `fw2` would compute using the same `width - 2*sideGap` formula as external — `600 - 4 = 596`, not `556`) — confirming the old implementation is in place.

- [ ] **Step 3: Modify `drawerFaceWidth()`**

Find this exact text:
```
function drawerFaceWidth() {
  return drawerState.width - 2 * drawerState.sideGap;
}
```
Replace it with:
```
function drawerFaceWidth() {
  return drawerEffectiveOpeningWidth() - 2 * drawerState.sideGap;
}
```

- [ ] **Step 4: Modify `drawerEffectiveDepth()`**

Find this exact text:
```
function drawerEffectiveDepth() {
  const ds = drawerState;
  if (ds.drawerDepth != null && ds.drawerDepth > 0) return ds.drawerDepth;
  return drawerAutoDepth();
}
```
Replace it with:
```
function drawerEffectiveDepth() {
  const ds = drawerState;
  // Internal mode: the existing carcass already accounts for its own rear
  // clearance — the typed depth IS the usable box depth, no subtraction,
  // no manual override (there's nothing to override against).
  if ((ds.faceStyle || 'external') === 'internal') return ds.depth;
  if (ds.drawerDepth != null && ds.drawerDepth > 0) return ds.drawerDepth;
  return drawerAutoDepth();
}
```

- [ ] **Step 5: Run the verification script again, confirm it passes (GREEN)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task2.js`
Expected: all five assertions print their expected values, `ALL PASS`.

- [ ] **Step 6: Full-file syntax check** (same method as Task 1 Step 6)

- [ ] **Step 7: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
feat: drawerFaceWidth/drawerEffectiveDepth honour Internal face style

drawerFaceWidth now sizes off the spacer-adjusted opening width instead
of raw carcass width — a no-op in External mode (drawerEffectiveOpeningWidth
returns ds.width unchanged there). drawerEffectiveDepth returns the typed
depth directly in Internal mode instead of subtracting a back-panel/
rear-gap allowance, since the existing carcass already accounts for its
own rear clearance.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `drawerCalcParts()` — skip carcass parts, adjust box width, add spacer parts

**Files:**
- Modify: `dev.html:26885-26976` — `drawerCalcParts()`.

**Interfaces:**
- Consumes: `drawerEffectiveOpeningWidth()` (Task 1), `(ds.faceStyle || 'external')` (Task 1's field).
- Produces: `drawerCalcParts()` — same return shape (`Array<{name,qty,l,w,mat,el1,el2,ew1,ew2,holes}>`), Internal mode now omits carcass-relative parts and adds spacer parts when enabled.

- [ ] **Step 1: Write the vm verification script**

This one is larger — `drawerCalcParts` depends on several sibling functions (`drawerEffectiveDepth`, `drawerFaceHeights`, `drawerFaceWidth`, `drawerEffectiveOpeningWidth`, `drawerReduction`, `drawerAutoDepth`, `drawerEffectiveBoxH`, `drawerEffectiveTopBoxH`). Extract all of them together.

Create `/tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task3.js`:
```js
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');

function extract(name) {
  let start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('missing: ' + name);
  const braceStart = src.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

const FNS = [
  'drawerEffectiveOpeningWidth', 'drawerFaceWidth', 'drawerFaceHeights',
  'drawerReduction', 'drawerAutoDepth', 'drawerEffectiveDepth',
  'drawerEffectiveBoxH', 'drawerEffectiveTopBoxH', 'drawerCalcParts',
];

function ctxFor(drawerStateOverrides) {
  const base = {
    width: 600, height: 780, depth: 560, thickness: 16,
    drawerDepth: null, backPanel: 16, rearGap: 18, sideGap: 2, faceGap: 4,
    runnerClearance: null, drawerType: 'equal', drawerCount: 4,
    potTopHeight: 192, customHeights: [], boxHeight: null, topBoxHeight: null,
    bottomGap: 26, topClearance: 30, topType: 'solid', hasBacking: true,
    materials: { carcass: 'Picco White', carcassEdge: '', face: 'Dunblane', faceEdge: 'Dunblane Edging 1mm' },
    faceStyle: 'external', spacerLeft: {enabled:false,width:20}, spacerRight: {enabled:false,width:20},
  };
  const ctx = { drawerState: Object.assign(base, drawerStateOverrides) };
  vm.createContext(ctx);
  vm.runInContext(FNS.map(extract).join('\n'), ctx);
  return ctx;
}

function names(parts) { return parts.map(p => p.name).sort(); }

// ── External mode: byte-identical to today (regression guard) ──────────────
let ctx = ctxFor({ faceStyle: 'external' });
const extParts = ctx.drawerCalcParts();
console.log('external part names:', JSON.stringify(names(extParts)));
const expectedExternalNames = ['Back Support','Backing','Bottom Panel','Drawer Bottoms','Drawer Faces','Drawer Fronts & Backs','Drawer Sides','Front Support','Sides','Supports','Top Panel'].sort();
if (JSON.stringify(names(extParts)) !== JSON.stringify(expectedExternalNames)) {
  throw new Error('External mode part set changed: ' + JSON.stringify(names(extParts)));
}
const topPanel = extParts.find(p => p.name === 'Top Panel');
if (topPanel.l !== 600 || topPanel.w !== 560) throw new Error('Top Panel dims changed: ' + JSON.stringify(topPanel));

// ── Internal mode, no spacers: no carcass parts, no spacer parts ───────────
ctx = ctxFor({ faceStyle: 'internal' });
const intParts = ctx.drawerCalcParts();
console.log('internal (no spacer) part names:', JSON.stringify(names(intParts)));
const forbidden = ['Top Panel','Bottom Panel','Sides','Backing','Front Support','Back Support','Supports','Front Nailer (Top)','Back Nailer (Top)','Left Hinge Spacer','Right Hinge Spacer'];
forbidden.forEach(n => { if (names(intParts).includes(n)) throw new Error('Internal mode should not include: ' + n); });
if (!names(intParts).includes('Drawer Faces') || !names(intParts).includes('Drawer Sides')) {
  throw new Error('Internal mode missing expected drawer parts: ' + JSON.stringify(names(intParts)));
}

// ── Internal mode, face/box width reflects opening (no -2*thickness) ───────
// drawerFaceWidth = openingWidth - 2*sideGap = 600 - 4 = 596 (no spacers).
const faceRow = intParts.find(p => p.name === 'Drawer Faces');
console.log('internal face width (expect 596):', faceRow.l);
if (faceRow.l !== 596) throw new Error('expected face width 596, got ' + faceRow.l);

// ── Internal mode, one spacer enabled: exactly one spacer part, correct dims
ctx = ctxFor({ faceStyle: 'internal', spacerRight: {enabled:true,width:22} });
const oneSpacerParts = ctx.drawerCalcParts();
const spacerNames = names(oneSpacerParts).filter(n => n.includes('Spacer'));
console.log('one-spacer names:', JSON.stringify(spacerNames));
if (spacerNames.length !== 1 || spacerNames[0] !== 'Right Hinge Spacer') {
  throw new Error('expected exactly one Right Hinge Spacer, got ' + JSON.stringify(spacerNames));
}
const rSpacer = oneSpacerParts.find(p => p.name === 'Right Hinge Spacer');
console.log('right spacer dims (expect l=780,w=22):', rSpacer.l, rSpacer.w);
if (rSpacer.l !== 780 || rSpacer.w !== 22) throw new Error('spacer dims wrong: ' + JSON.stringify(rSpacer));

// ── Internal mode, both spacers, different widths: two independent parts ──
ctx = ctxFor({ faceStyle: 'internal', spacerLeft: {enabled:true,width:18}, spacerRight: {enabled:true,width:22} });
const twoSpacerParts = ctx.drawerCalcParts();
const lSpacer = twoSpacerParts.find(p => p.name === 'Left Hinge Spacer');
const rSpacer2 = twoSpacerParts.find(p => p.name === 'Right Hinge Spacer');
console.log('two-spacer widths (expect 18, 22):', lSpacer.w, rSpacer2.w);
if (lSpacer.w !== 18 || rSpacer2.w !== 22) throw new Error('two-spacer dims wrong');

console.log('ALL PASS');
```

- [ ] **Step 2: Run it, confirm it fails (RED)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task3.js`
Expected: the External-mode assertions pass (current behavior already matches), but it throws on the Internal-mode checks — today's `drawerCalcParts()` always generates carcass parts and never generates spacer parts regardless of `faceStyle`, since nothing consumes that field yet.

- [ ] **Step 3: Modify `drawerCalcParts()`**

Find this exact text:
```
function drawerCalcParts() {
  const ds = drawerState;
  const W  = ds.width, H = ds.height, D = ds.depth, T = ds.thickness;
  const DD = drawerEffectiveDepth();
  const cm = ds.materials.carcass, ce = ds.materials.carcassEdge;
  const fm = ds.materials.face,    fe = ds.materials.faceEdge;
  const fh = drawerFaceHeights();
  const fw = drawerFaceWidth();
  const n  = ds.drawerCount;
  const innerW = W - 2 * T;

  // Runner clearance: total mm the drawer box is narrower than the inner carcass width.
  // Default 8mm (4mm each side). Soft-close 500mm runners typically need 27mm.
  const runnerClearance = (ds.runnerClearance != null && ds.runnerClearance >= 0) ? ds.runnerClearance : 8;
  const boxSideW = T;                // box side thickness matches carcass material
  const fullBoxW = innerW - runnerClearance; // outer drawer box span
  const boxW     = fullBoxW - 2 * boxSideW; // inner box width (between the two side panels)

  const p = (name, qty, l, w, mat, el1='', el2='', ew1='', ew2='') =>
    ({ name, qty, l: Math.round(l), w: Math.round(w), mat, el1, el2, ew1, ew2, holes:'' });

  const parts = [];

  // ── Carcass ──────────────────────────────────────────────────────────────
  if (ds.topType === 'nailers') {
    const innerW2 = W - 2 * T;
    parts.push(p('Front Nailer (Top)', 1, innerW2, 100, cm, ce));
    parts.push(p('Back Nailer (Top)',  1, innerW2,  70, cm, ce));
  } else {
    parts.push(p('Top Panel', 1, W, D, cm, ce, ce, ce, ce));
  }
  parts.push(p('Bottom Panel', 1, W, D, cm, ce, '', ce, ce));
  parts.push(p('Sides',        2, H, D, cm, ce));
  if (ds.hasBacking) parts.push(p('Backing', 1, H, W, '3MM White Masonite'));
  parts.push(p('Front Support', 1, innerW, 100, cm, ce));
  parts.push(p('Back Support',  1, innerW, 70,  cm, ce));
  // Intermediate supports between drawer boxes (n-1 gaps between n drawers)
  if (n > 1) parts.push(p('Supports', n - 1, W, 100, cm));

  // ── Drawer faces (overlay — full width minus side gaps) ───────────────────
```
Replace it with:
```
function drawerCalcParts() {
  const ds = drawerState;
  const isInternal = (ds.faceStyle || 'external') === 'internal';
  const W  = ds.width, H = ds.height, D = ds.depth, T = ds.thickness;
  const DD = drawerEffectiveDepth();
  const cm = ds.materials.carcass, ce = ds.materials.carcassEdge;
  const fm = ds.materials.face,    fe = ds.materials.faceEdge;
  const fh = drawerFaceHeights();
  const fw = drawerFaceWidth();
  const n  = ds.drawerCount;
  // External: inner width assumes a generated carcass of side thickness T.
  // Internal: the opening (minus any enabled hinge-clearance spacers) IS
  // the internal usable width already — there's no generated side panel to
  // subtract T for.
  const innerW = isInternal ? drawerEffectiveOpeningWidth() : (W - 2 * T);

  // Runner clearance: total mm the drawer box is narrower than the inner carcass width.
  // Default 8mm (4mm each side). Soft-close 500mm runners typically need 27mm.
  const runnerClearance = (ds.runnerClearance != null && ds.runnerClearance >= 0) ? ds.runnerClearance : 8;
  const boxSideW = T;                // box side thickness matches carcass material
  const fullBoxW = innerW - runnerClearance; // outer drawer box span
  const boxW     = fullBoxW - 2 * boxSideW; // inner box width (between the two side panels)

  const p = (name, qty, l, w, mat, el1='', el2='', ew1='', ew2='') =>
    ({ name, qty, l: Math.round(l), w: Math.round(w), mat, el1, el2, ew1, ew2, holes:'' });

  const parts = [];

  // ── Carcass ──────────────────────────────────────────────────────────────
  // Internal mode: the carcass already exists physically — nothing here is
  // generated, only the drawer boxes/faces/spacers below.
  if (!isInternal) {
    if (ds.topType === 'nailers') {
      const innerW2 = W - 2 * T;
      parts.push(p('Front Nailer (Top)', 1, innerW2, 100, cm, ce));
      parts.push(p('Back Nailer (Top)',  1, innerW2,  70, cm, ce));
    } else {
      parts.push(p('Top Panel', 1, W, D, cm, ce, ce, ce, ce));
    }
    parts.push(p('Bottom Panel', 1, W, D, cm, ce, '', ce, ce));
    parts.push(p('Sides',        2, H, D, cm, ce));
    if (ds.hasBacking) parts.push(p('Backing', 1, H, W, '3MM White Masonite'));
    parts.push(p('Front Support', 1, innerW, 100, cm, ce));
    parts.push(p('Back Support',  1, innerW, 70,  cm, ce));
    // Intermediate supports between drawer boxes (n-1 gaps between n drawers)
    if (n > 1) parts.push(p('Supports', n - 1, W, 100, cm));
  }

  // ── Hinge-clearance spacers (Internal mode only) ────────────────────────
  // Full-height filler strip per side, physically blocking the hinge-swing
  // intrusion from an adjacent door on the same existing carcass.
  if (isInternal) {
    if (ds.spacerLeft && ds.spacerLeft.enabled && ds.spacerLeft.width > 0) {
      parts.push(p('Left Hinge Spacer', 1, H, ds.spacerLeft.width, cm, ce));
    }
    if (ds.spacerRight && ds.spacerRight.enabled && ds.spacerRight.width > 0) {
      parts.push(p('Right Hinge Spacer', 1, H, ds.spacerRight.width, cm, ce));
    }
  }

  // ── Drawer faces (overlay — full width minus side gaps) ───────────────────
```

- [ ] **Step 4: Run the verification script again, confirm it passes (GREEN)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-drawer-task3.js`
Expected: all assertions pass, `ALL PASS`.

- [ ] **Step 5: Confirm no other call site needs updating**

```bash
grep -n "drawerCalcParts(" /home/dutchman/cutlist_pro/dev.html
```
Expected: the function definition plus its call sites (`drawerPartsPreviewHTML()`, `drawerSaveUnit()`) — same count as before this task, confirming the signature/return-shape change (still an array of the same part-object shape) needed no caller updates.

- [ ] **Step 6: Full-file syntax check** (same method as Task 1 Step 6)

- [ ] **Step 7: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
feat: drawerCalcParts skips carcass panels, adds hinge spacers in Internal mode

Internal face style: no Top/Bottom/Sides/Backing/Support/Nailer parts are
generated (the carcass already exists), innerW is sourced from the
spacer-adjusted opening width instead of width-minus-2×thickness, and
enabled hinge-clearance spacers are added as real cut parts (one
full-height strip per side). External mode's output is unchanged
(regression-guarded by a vm test comparing the exact part-name set and
Top Panel dimensions against today's behavior).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: UI — Face Style toggle, opening-dimension labels, Hinge Clearance controls

**Files:**
- Modify: `dev.html` — inside `renderDrawerBuilderHTML()`, currently starting `:26530`. Exact anchors below (line numbers will have shifted from Tasks 1-3's insertions — match by content).

**Interfaces:**
- Consumes: `drawerState.faceStyle`, `drawerState.spacerLeft`, `drawerState.spacerRight` (Task 1). Directly mutates them via inline `onclick`/`oninput` handlers followed by `drawerRedraw()`, matching the existing convention in this section (see Global Constraints).

- [ ] **Step 1: Confirm current anchors match**

```bash
grep -n '<div class="bldr-title">Drawer Builder</div>' /home/dutchman/cutlist_pro/dev.html
grep -n '<span class="bldr-label">Width</span>' /home/dutchman/cutlist_pro/dev.html
```
Both should return exactly one match each within the Drawer Builder render function (there may be other "Width" labels elsewhere in the file for Unit Builder — confirm the one found is inside `renderDrawerBuilderHTML()` by checking it's after the `function renderDrawerBuilderHTML() {` line number and before `function drawerPartsPreviewHTML() {`).

- [ ] **Step 2: Add the Face Style toggle**

Find this exact text:
```
      <div class="bldr-title">Drawer Builder</div>

      <div class="bldr-section">
        <div class="bldr-section-head">📦 Carcass</div>
```
Replace it with:
```
      <div class="bldr-title">Drawer Builder</div>

      <div class="bldr-section">
        <div class="bldr-section-head">🚪 Face Style</div>
        <div class="bldr-section-body">
          <div style="display:flex;gap:6px">
            <button onclick="drawerState.faceStyle='external';drawerRedraw()" title="Faces overlay a generated carcass — the default, standalone chest of drawers"
              style="font-weight:500;flex:1;padding:6px 0;border:1px solid ${(ds.faceStyle||'external')==='external'?'var(--amber)':'var(--border)'};background:${(ds.faceStyle||'external')==='external'?'rgba(212,145,58,0.15)':'var(--bg3)'};color:${(ds.faceStyle||'external')==='external'?'var(--amber)':'var(--text-muted)'};font-family:'Barlow',sans-serif;font-size:10px;letter-spacing:0.3px;cursor:pointer;border-radius:2px">EXTERNAL</button>
            <button onclick="drawerState.faceStyle='internal';drawerRedraw()" title="Faces sit recessed inside an existing carcass opening — no carcass panels generated"
              style="font-weight:500;flex:1;padding:6px 0;border:1px solid ${(ds.faceStyle||'external')==='internal'?'var(--amber)':'var(--border)'};background:${(ds.faceStyle||'external')==='internal'?'rgba(212,145,58,0.15)':'var(--bg3)'};color:${(ds.faceStyle||'external')==='internal'?'var(--amber)':'var(--text-muted)'};font-family:'Barlow',sans-serif;font-size:10px;letter-spacing:0.3px;cursor:pointer;border-radius:2px">INTERNAL</button>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:6px;line-height:1.5">
            ${(ds.faceStyle||'external')==='internal'
              ? 'Building inside an existing carcass — no carcass panels will be added to the cutlist. Enter the internal opening dimensions below.'
              : 'Builds a full standalone unit with its own carcass (today\\'s default behavior).'}
          </div>
        </div>
      </div>

      <div class="bldr-section">
        <div class="bldr-section-head">📦 Carcass</div>
```

- [ ] **Step 3: Relabel the Width/Height/Depth rows for Internal mode**

Find this exact text:
```
          <div class="bldr-row"><span class="bldr-label">Width</span>
            <input autocomplete="off" class="bldr-input" type="number" value="${ds.width}" min="200" max="1800" oninput="drawerNumInput('width',this.value)" onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
          <div class="bldr-row"><span class="bldr-label">Height</span>
            <input autocomplete="off" class="bldr-input" type="number" value="${ds.height}" min="200" max="2400" oninput="drawerNumInput('height',this.value)" onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
          <div class="bldr-row"><span class="bldr-label">Depth</span>
            <input autocomplete="off" class="bldr-input" type="number" value="${ds.depth}" min="200" max="800" oninput="drawerNumInput('depth',this.value)" onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
```
Replace it with:
```
          <div class="bldr-row"><span class="bldr-label">${(ds.faceStyle||'external')==='internal'?'Opening Width':'Width'}</span>
            <input autocomplete="off" class="bldr-input" type="number" value="${ds.width}" min="200" max="1800" oninput="drawerNumInput('width',this.value)" onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
          <div class="bldr-row"><span class="bldr-label">${(ds.faceStyle||'external')==='internal'?'Opening Height':'Height'}</span>
            <input autocomplete="off" class="bldr-input" type="number" value="${ds.height}" min="200" max="2400" oninput="drawerNumInput('height',this.value)" onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
          <div class="bldr-row"><span class="bldr-label">${(ds.faceStyle||'external')==='internal'?'Opening Depth':'Depth'}</span>
            <input autocomplete="off" class="bldr-input" type="number" value="${ds.depth}" min="200" max="800" oninput="drawerNumInput('depth',this.value)" onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
```

- [ ] **Step 4: Add the Hinge Clearance subsection, and hide the now-inapplicable Drawer depth / Back panel / Rear gap fields in Internal mode**

Find this exact text:
```
          <div class="bldr-row"><span class="bldr-label" title="Drawer box depth (sides). Leave blank for auto = carcass depth − back panel − rear gap.">Drawer depth</span>
            <input autocomplete="off" class="bldr-input" type="number"
              value="${ds.drawerDepth != null ? ds.drawerDepth : ''}"
              min="100" max="800"
              placeholder="${drawerAutoDepth()}"
              oninput="drawerState.drawerDepth=this.value===''?null:Math.max(50,parseFloat(this.value)||0);drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
          <div style="font-size:10px;color:var(--text-muted);margin:2px 0 6px;padding-left:2px;line-height:1.5">
            Auto: carcass depth − ${(ds.backPanel ?? 16) + (ds.rearGap ?? 18)}mm (${ds.backPanel ?? 16}mm back panel + ${ds.rearGap ?? 18}mm rear gap) = <strong style="color:var(--text)">${drawerAutoDepth()}mm</strong>${ds.drawerDepth == null ? '' : ' — overridden'}. Leave blank for auto; override if needed.
          </div>
          <div class="bldr-row">
            <span class="bldr-label" title="Thickness of back panel / support — deducted from carcass depth">Back panel</span>
            <input autocomplete="off" class="bldr-input" type="number"
              value="${ds.backPanel}"
              min="0" max="50" step="1"
              oninput="drawerState.backPanel=this.value===''?16:Math.max(0,parseFloat(this.value)||0);drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span>
          </div>
          <div class="bldr-row">
            <span class="bldr-label" title="Gap between drawer box rear and back panel">Rear gap</span>
            <input autocomplete="off" class="bldr-input" type="number"
              value="${ds.rearGap}"
              min="0" max="100" step="1"
              oninput="drawerState.rearGap=this.value===''?18:Math.max(0,parseFloat(this.value)||0);drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span>
          </div>
          ${ds.drawerDepth != null ? `
          <button onclick="drawerState.drawerDepth=null;drawerRedraw()"
            style="font-weight:500;margin:4px 0 6px;background:none;border:1px solid var(--border);color:var(--text-muted);font-size:10px;padding:3px 10px;cursor:pointer;width:100%;font-family:'Barlow',sans-serif;letter-spacing:0.3px">
            ↺ RESET DEPTH TO AUTO
          </button>` : ''}
```
Replace it with:
```
          ${(ds.faceStyle||'external')!=='internal' ? `
          <div class="bldr-row"><span class="bldr-label" title="Drawer box depth (sides). Leave blank for auto = carcass depth − back panel − rear gap.">Drawer depth</span>
            <input autocomplete="off" class="bldr-input" type="number"
              value="${ds.drawerDepth != null ? ds.drawerDepth : ''}"
              min="100" max="800"
              placeholder="${drawerAutoDepth()}"
              oninput="drawerState.drawerDepth=this.value===''?null:Math.max(50,parseFloat(this.value)||0);drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span></div>
          <div style="font-size:10px;color:var(--text-muted);margin:2px 0 6px;padding-left:2px;line-height:1.5">
            Auto: carcass depth − ${(ds.backPanel ?? 16) + (ds.rearGap ?? 18)}mm (${ds.backPanel ?? 16}mm back panel + ${ds.rearGap ?? 18}mm rear gap) = <strong style="color:var(--text)">${drawerAutoDepth()}mm</strong>${ds.drawerDepth == null ? '' : ' — overridden'}. Leave blank for auto; override if needed.
          </div>
          <div class="bldr-row">
            <span class="bldr-label" title="Thickness of back panel / support — deducted from carcass depth">Back panel</span>
            <input autocomplete="off" class="bldr-input" type="number"
              value="${ds.backPanel}"
              min="0" max="50" step="1"
              oninput="drawerState.backPanel=this.value===''?16:Math.max(0,parseFloat(this.value)||0);drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span>
          </div>
          <div class="bldr-row">
            <span class="bldr-label" title="Gap between drawer box rear and back panel">Rear gap</span>
            <input autocomplete="off" class="bldr-input" type="number"
              value="${ds.rearGap}"
              min="0" max="100" step="1"
              oninput="drawerState.rearGap=this.value===''?18:Math.max(0,parseFloat(this.value)||0);drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span>
          </div>
          ${ds.drawerDepth != null ? `
          <button onclick="drawerState.drawerDepth=null;drawerRedraw()"
            style="font-weight:500;margin:4px 0 6px;background:none;border:1px solid var(--border);color:var(--text-muted);font-size:10px;padding:3px 10px;cursor:pointer;width:100%;font-family:'Barlow',sans-serif;letter-spacing:0.3px">
            ↺ RESET DEPTH TO AUTO
          </button>` : ''}
          ` : `
          <div style="font-size:10px;color:var(--text-muted);margin:2px 0 6px;padding-left:2px;line-height:1.5">
            Internal mode: Opening Depth above is used as the drawer box depth directly — no back-panel or rear-gap subtraction (the existing carcass already accounts for its own rear clearance).
          </div>
          <div class="bldr-row">
            <span class="bldr-label">Left spacer</span>
            <input type="checkbox" ${ds.spacerLeft && ds.spacerLeft.enabled ? 'checked' : ''}
              onchange="drawerState.spacerLeft=drawerState.spacerLeft||{enabled:false,width:20};drawerState.spacerLeft.enabled=this.checked;drawerRedraw()">
            <input autocomplete="off" class="bldr-input" type="number"
              value="${(ds.spacerLeft && ds.spacerLeft.width) || 20}"
              min="1" max="200" step="1" ${ds.spacerLeft && ds.spacerLeft.enabled ? '' : 'disabled'}
              oninput="drawerState.spacerLeft=drawerState.spacerLeft||{enabled:false,width:20};drawerState.spacerLeft.width=parseFloat(this.value)||20;drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span>
          </div>
          <div class="bldr-row">
            <span class="bldr-label">Right spacer</span>
            <input type="checkbox" ${ds.spacerRight && ds.spacerRight.enabled ? 'checked' : ''}
              onchange="drawerState.spacerRight=drawerState.spacerRight||{enabled:false,width:20};drawerState.spacerRight.enabled=this.checked;drawerRedraw()">
            <input autocomplete="off" class="bldr-input" type="number"
              value="${(ds.spacerRight && ds.spacerRight.width) || 20}"
              min="1" max="200" step="1" ${ds.spacerRight && ds.spacerRight.enabled ? '' : 'disabled'}
              oninput="drawerState.spacerRight=drawerState.spacerRight||{enabled:false,width:20};drawerState.spacerRight.width=parseFloat(this.value)||20;drawerRedraw()"
              onblur="drawerRedraw()">
            <span class="bldr-unit">mm</span>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin:2px 0 6px;padding-left:2px;line-height:1.5">
            Each enabled spacer adds a full-height filler panel to the cutlist on that side, and narrows the drawer box/faces by that amount — for clearing a door hinge on the same existing carcass.
          </div>
          `}
```

- [ ] **Step 5: Confirm wiring**

```bash
grep -n "FACE STYLE\|Face Style\|EXTERNAL</button>\|INTERNAL</button>\|Left spacer\|Right spacer\|spacerLeft.enabled=this.checked\|spacerRight.enabled=this.checked" /home/dutchman/cutlist_pro/dev.html
```
Expected: the Face Style section head, both toggle buttons, both spacer rows, and both checkbox `onchange` handlers each appear.

- [ ] **Step 6: Full-file syntax check** (same method as Task 1 Step 6)

- [ ] **Step 7: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
feat: Drawer Builder UI for Internal face style + hinge-clearance spacers

New Face Style toggle (External/Internal) at the top of the Drawer
Builder panel. Internal mode relabels Width/Height/Depth as opening
dimensions, hides the now-inapplicable Drawer depth/Back panel/Rear gap
fields, and shows Left/Right hinge-clearance spacer toggles with a width
input each — wired directly to the drawerState fields Task 1 added.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: SVG preview — inset faces + spacer strips (front view)

**Files:**
- Modify: `dev.html` — `drawerSVG()`, currently `:26260-26300`.

**Interfaces:**
- Consumes: `drawerState.faceStyle`, `drawerState.spacerLeft`, `drawerState.spacerRight` (Task 1), `drawerFaceWidth()` (already spacer-aware as of Task 2 — no change needed to how `fw` itself is obtained).

**Scope note:** `drawerSideSVG()` (the depth cross-section / side view) is **not modified** by this task. It only shows depth (front-to-back), never width — hinge-clearance spacers are a width-wise (left/right) concept and don't appear in that view. `drawerEffectiveDepth()` (Task 2) already makes the side view's depth numbers correct in Internal mode with zero further changes. The side view may still visually show a "back panel"/"top board" that Internal mode doesn't actually generate as a cut part — a known, accepted cosmetic imperfection, not a numeric correctness issue; not worth the added risk of reworking that function in this pass.

- [ ] **Step 1: Confirm current anchor matches**

```bash
grep -n "function drawerSVG" /home/dutchman/cutlist_pro/dev.html
```

- [ ] **Step 2: Add spacer-aware face positioning and spacer strip rendering**

Find this exact text:
```
function drawerSVG() {
  const ds  = drawerState;
  const W   = ds.width, H = ds.height, T = ds.thickness;
  const fg  = ds.faceGap, sg = ds.sideGap;
  const fh  = drawerFaceHeights();
  const fw  = drawerFaceWidth();

  const SCALE = Math.min(200 / W, 280 / H);
  const sw = Math.round(W * SCALE), sh = Math.round(H * SCALE);
  const fwPx = Math.round(fw * SCALE);
  const sgPx = Math.round(sg * SCALE);
  const fgPx = Math.max(1, Math.round(fg * SCALE));

  // Draw faces bottom to top (index 0 = bottom)
  // Bottom face is flush; top gap (= faceGap) sits above the top face
  let faceSVG = '';
  let yPx = sh; // start at bottom (flush)
  fh.forEach((h, i) => {
    const hPx = Math.round(h * SCALE);
    yPx -= hPx;
    faceSVG += `<rect x="${sgPx}" y="${yPx}" width="${fwPx}" height="${hPx}" rx="1"
      fill="rgba(212,145,58,0.18)" stroke="var(--amber)" stroke-width="1.5"/>
    <text x="${sw/2}" y="${yPx + hPx/2}" text-anchor="middle"
      dominant-baseline="middle" font-size="9" fill="var(--amber-dim)" font-family="JetBrains Mono,monospace">${h}mm</text>`;
    yPx -= fgPx; // gap above each face (including the top gap above last face)
  });

  // PADY=26 matches side view so both SVGs render at identical total height (sh+26)
  const PADY = 26;
  return `<svg viewBox="0 0 ${sw+20} ${sh+PADY}" width="${sw+20}" height="${sh+PADY}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,10)">
    <!-- Carcass outline -->
    <rect x="0" y="0" width="${sw}" height="${sh}" rx="1" fill="rgba(255,255,255,0.04)" stroke="var(--border-light)" stroke-width="1" stroke-dasharray="3,2"/>
    <!-- Drawer faces (overlay) -->
    ${faceSVG}
    <!-- Width dim -->
    <line x1="0" y1="${sh+6}" x2="${sw}" y2="${sh+6}" stroke="var(--text-muted)" stroke-width="0.5"/>
    <text x="${sw/2}" y="${sh+16}" text-anchor="middle" font-size="8" fill="var(--text-muted)" font-family="JetBrains Mono,monospace">${W}mm</text>
    </g>
  </svg>`;
}
```
Replace it with:
```
function drawerSVG() {
  const ds  = drawerState;
  const isInternal = (ds.faceStyle || 'external') === 'internal';
  const W   = ds.width, H = ds.height, T = ds.thickness;
  const fg  = ds.faceGap, sg = ds.sideGap;
  const fh  = drawerFaceHeights();
  const fw  = drawerFaceWidth();

  const SCALE = Math.min(200 / W, 280 / H);
  const sw = Math.round(W * SCALE), sh = Math.round(H * SCALE);
  const fwPx = Math.round(fw * SCALE);
  const sgPx = Math.round(sg * SCALE);
  const fgPx = Math.max(1, Math.round(fg * SCALE));

  // Internal mode: faces are inset from whichever spacer(s) are enabled,
  // not just the sideGap reveal — offset the face x-origin accordingly.
  const leftSpacerMM  = isInternal && ds.spacerLeft  && ds.spacerLeft.enabled  ? (ds.spacerLeft.width  || 0) : 0;
  const rightSpacerMM = isInternal && ds.spacerRight && ds.spacerRight.enabled ? (ds.spacerRight.width || 0) : 0;
  const leftSpacerPx  = Math.round(leftSpacerMM  * SCALE);
  const rightSpacerPx = Math.round(rightSpacerMM * SCALE);
  const faceXPx = leftSpacerPx + sgPx;

  // Draw faces bottom to top (index 0 = bottom)
  // Bottom face is flush; top gap (= faceGap) sits above the top face
  let faceSVG = '';
  let yPx = sh; // start at bottom (flush)
  fh.forEach((h, i) => {
    const hPx = Math.round(h * SCALE);
    yPx -= hPx;
    faceSVG += `<rect x="${faceXPx}" y="${yPx}" width="${fwPx}" height="${hPx}" rx="1"
      fill="rgba(212,145,58,0.18)" stroke="var(--amber)" stroke-width="1.5"/>
    <text x="${sw/2}" y="${yPx + hPx/2}" text-anchor="middle"
      dominant-baseline="middle" font-size="9" fill="var(--amber-dim)" font-family="JetBrains Mono,monospace">${h}mm</text>`;
    yPx -= fgPx; // gap above each face (including the top gap above last face)
  });

  // Hinge-clearance spacer strips (Internal mode only, whichever side(s) enabled)
  let spacerSVG = '';
  if (leftSpacerMM > 0) {
    spacerSVG += `<rect x="0" y="0" width="${leftSpacerPx}" height="${sh}"
      fill="rgba(255,255,255,0.10)" stroke="var(--border-light)" stroke-width="1" stroke-dasharray="2,2"/>
    <text x="${leftSpacerPx/2}" y="${sh/2}" text-anchor="middle" dominant-baseline="middle"
      font-size="7" fill="var(--text-muted)" font-family="JetBrains Mono,monospace" transform="rotate(-90 ${leftSpacerPx/2} ${sh/2})">${Math.round(leftSpacerMM)}mm</text>`;
  }
  if (rightSpacerMM > 0) {
    spacerSVG += `<rect x="${sw-rightSpacerPx}" y="0" width="${rightSpacerPx}" height="${sh}"
      fill="rgba(255,255,255,0.10)" stroke="var(--border-light)" stroke-width="1" stroke-dasharray="2,2"/>
    <text x="${sw-rightSpacerPx/2}" y="${sh/2}" text-anchor="middle" dominant-baseline="middle"
      font-size="7" fill="var(--text-muted)" font-family="JetBrains Mono,monospace" transform="rotate(-90 ${sw-rightSpacerPx/2} ${sh/2})">${Math.round(rightSpacerMM)}mm</text>`;
  }

  // PADY=26 matches side view so both SVGs render at identical total height (sh+26)
  const PADY = 26;
  return `<svg viewBox="0 0 ${sw+20} ${sh+PADY}" width="${sw+20}" height="${sh+PADY}" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(0,10)">
    <!-- Carcass / opening outline -->
    <rect x="0" y="0" width="${sw}" height="${sh}" rx="1" fill="rgba(255,255,255,0.04)" stroke="var(--border-light)" stroke-width="1" stroke-dasharray="3,2"/>
    <!-- Hinge-clearance spacers (Internal mode) -->
    ${spacerSVG}
    <!-- Drawer faces -->
    ${faceSVG}
    <!-- Width dim -->
    <line x1="0" y1="${sh+6}" x2="${sw}" y2="${sh+6}" stroke="var(--text-muted)" stroke-width="0.5"/>
    <text x="${sw/2}" y="${sh+16}" text-anchor="middle" font-size="8" fill="var(--text-muted)" font-family="JetBrains Mono,monospace">${W}mm</text>
    </g>
  </svg>`;
}
```
(In External mode, `leftSpacerMM`/`rightSpacerMM` are always `0`, so `faceXPx === sgPx` — byte-identical face positioning to today, and `spacerSVG` is always `''`.)

- [ ] **Step 3: Confirm wiring**

```bash
grep -n "leftSpacerMM\|rightSpacerMM\|faceXPx" /home/dutchman/cutlist_pro/dev.html
```
Expected: all three names appear, used consistently within `drawerSVG()`.

- [ ] **Step 4: Full-file syntax check** (same method as Task 1 Step 6)

- [ ] **Step 5: Manual browser verification (cannot be automated in this environment — no Chrome/Firefox/Playwright available here per project verification notes)**

Serve the app locally: `python3 -m http.server 7823 --directory /home/dutchman/cutlist_pro`, open `http://localhost:7823/dev.html`, go to the Drawer Builder, and:
1. Confirm External mode's preview is visually unchanged from before this plan.
2. Switch to Internal mode, enter opening dimensions, confirm faces render recessed inside the dashed opening frame (not overlapping/proud of it).
3. Enable the left spacer with a width — confirm a distinct filler strip renders along the left edge, and the faces shift right to make room for it.
4. Enable the right spacer too (different width) — confirm both strips render independently and faces narrow further.
5. Toggle back to External — confirm the preview reverts to the original overlay rendering with no leftover spacer artifacts.

This step has no pass/fail command to run in this environment — record the outcome directly with the user.

- [ ] **Step 6: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
feat: drawerSVG renders inset faces + hinge-clearance spacer strips

Internal mode: drawer faces are offset by any enabled left spacer's
width (in addition to the existing sideGap reveal), and enabled
spacer(s) render as a distinct dashed-outline strip along their side
of the opening. External mode is a no-op change (spacer widths are
always 0 there, so face positioning is byte-identical to before).
drawerSideSVG (depth/side view) is intentionally untouched — spacers are
width-wise and don't appear in that cross-section; its depth numbers
already came out correct from the earlier drawerEffectiveDepth change.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```
