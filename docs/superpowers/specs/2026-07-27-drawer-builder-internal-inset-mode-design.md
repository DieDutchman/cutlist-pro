# Drawer Builder: Internal (Inset) Face Style + Hinge-Clearance Spacers

## Problem

CutList Pro's Drawer Builder (`drawerState`, `dev.html:24689-24718`, render at
`renderDrawerBuilderHTML()` `:26530`, cutlist generation at
`drawerCalcParts()` `:26885`) only ever builds a **standalone chest of
drawers**: it generates its own outer carcass (top/bottom/sides/back/
supports) and sizes drawer faces to overlay that carcass, covering its edges
with a small reveal (`sideGap`, default 2mm).

The user's next job needs to build drawers **inside a carcass that already
exists** (built separately, e.g. as part of a larger unit with doors
elsewhere on the same carcass). That carcass is not something this feature
should generate cut parts for. The drawer faces need to sit **recessed
inside** the opening (inset), not overlay it. Because the existing carcass
also has doors nearby, their hinges intrude into the opening — the drawer
box needs a **physical filler panel** (spacer) on the hinge side(s) to clear
that intrusion, sized so the drawer box doesn't foul the hinge.

## Scope

Drawer Builder only. Unit Builder (`builderState`, doors/bays/dividers) is
untouched — this is deliberately staying inside Drawer Builder per the
user's direction, not a merge into Unit Builder's per-bay system.

## Goals / non-goals

- Goal: a "Face Style" toggle — External (today's overlay behavior,
  unchanged, default) vs Internal (new: inset faces, no carcass panels
  generated, direct opening-dimension entry, optional hinge-clearance
  spacers).
- Goal: existing saved drawer units and the current default behavior are
  completely unaffected — External stays byte-identical to today's output.
- Non-goal: no automatic hinge-clearance calculation from a hinge
  type/geometry — always a manual mm value the user enters. (Confirmed:
  hinges exist in this app only as a cost line item, never as physical
  geometry — building real hinge-swing math is out of scope.)
- Non-goal: no per-drawer spacers — one full-height spacer per side only.
- Non-goal: no top/bottom spacers — left/right only.
- Non-goal: no back-panel/rear-gap depth subtraction in Internal mode — the
  depth entered is used directly as the usable box depth.

## Design

### 1. New state fields on `drawerState`

```
faceStyle: 'external',        // 'external' (today's behavior) | 'internal' (new)
spacerLeft:  { enabled: false, width: 20 },
spacerRight: { enabled: false, width: 20 },
```

Additive only — existing saved units have no `faceStyle` field, and any read
site must treat `undefined`/missing as `'external'` (e.g.
`(ds.faceStyle || 'external') === 'internal'`), so old data needs no
migration.

### 2. Effective-width calculation (new function, mirrors the existing
   `drawerEffectiveDepth()` / `drawerEffectiveBoxH()` auto+override pattern)

```
function drawerEffectiveOpeningWidth() {
  const ds = drawerState;
  if ((ds.faceStyle || 'external') !== 'internal') return ds.width;
  const lw = ds.spacerLeft?.enabled  ? (ds.spacerLeft.width  || 0) : 0;
  const rw = ds.spacerRight?.enabled ? (ds.spacerRight.width || 0) : 0;
  return Math.max(50, ds.width - lw - rw);
}
```

`ds.width` in Internal mode is the **opening width**, typed directly (no
carcass-thickness subtraction — matches the "type internal dimensions
directly" decision). External mode is untouched: `ds.width` keeps meaning
"outer carcass width" exactly as today.

### 3. Face width (modify `drawerFaceWidth()`, `dev.html:26156-26158`)

Today:
```
function drawerFaceWidth() {
  return drawerState.width - 2 * drawerState.sideGap;
}
```
New:
```
function drawerFaceWidth() {
  return drawerEffectiveOpeningWidth() - 2 * drawerState.sideGap;
}
```
In External mode `drawerEffectiveOpeningWidth()` returns `ds.width`
unchanged, so this is a no-op for existing behavior. In Internal mode the
face is sized to the opening (minus spacers) minus the same `sideGap` reveal
value the field already has — reused as "inset reveal" instead of "overlay
reveal," no new reveal field needed (per the approved design).

`drawerFaceHeights()` (`:26160-26199`) is untouched — it only depends on
`ds.height`/`faceGap`/`drawerCount`, which mean the same thing in both
modes (opening height directly in Internal mode, carcass height in
External — the formula doesn't care which).

### 4. Depth (modify `drawerEffectiveDepth()`, `dev.html:26226-26230`)

Today:
```
function drawerEffectiveDepth() {
  const ds = drawerState;
  if (ds.drawerDepth != null && ds.drawerDepth > 0) return ds.drawerDepth;
  return drawerAutoDepth();
}
```
New:
```
function drawerEffectiveDepth() {
  const ds = drawerState;
  if ((ds.faceStyle || 'external') === 'internal') return ds.depth;
  if (ds.drawerDepth != null && ds.drawerDepth > 0) return ds.drawerDepth;
  return drawerAutoDepth();
}
```
Internal mode: `ds.depth` (the typed opening depth) is used directly as the
box depth — no back-panel/rear-gap subtraction, no manual-override field
shown (per the confirmed decision). The `drawerDepth`/`backPanel`/`rearGap`
UI fields (`dev.html:26594-26622`) are hidden when Internal mode is active
(they describe carcass-relative concepts that don't apply once there's no
carcass to build).

### 5. Box width (modify `drawerCalcParts()`, `dev.html:26885-26976`)

Today:
```
const innerW = W - 2 * T;
...
const fullBoxW = innerW - runnerClearance;
const boxW     = fullBoxW - 2 * boxSideW;
```
New: in Internal mode, `innerW` should be `drawerEffectiveOpeningWidth()`
instead of `W - 2*T` — there's no carcass side panel of thickness `T` to
subtract (the opening width already IS the internal usable width, before
spacers). In External mode this is unchanged.
```
const innerW = (ds.faceStyle || 'external') === 'internal'
  ? drawerEffectiveOpeningWidth()
  : W - 2 * T;
```
`fullBoxW`/`boxW` formulas stay identical — they already correctly consume
whatever `innerW` resolves to.

### 6. Carcass panel generation (modify `drawerCalcParts()`)

In Internal mode, skip pushing: Top Panel / Front Nailer / Back Nailer,
Bottom Panel, Sides, Backing, Front Support, Back Support, Supports (the
`n-1` intermediate supports between drawer boxes). These are all
carcass-relative parts that don't apply when the carcass already exists.
Wrap that whole block:
```
if ((ds.faceStyle || 'external') !== 'internal') {
  // existing carcass-parts pushes, unchanged
}
```
Drawer faces and drawer boxes (the rest of `drawerCalcParts()`) are
generated in both modes — unchanged logic, just now consuming the
Internal-mode `fw`/`boxW`/`DD` values from steps 3-5 above.

### 7. Spacer panels (new, appended in `drawerCalcParts()`)

```
if ((ds.faceStyle || 'external') === 'internal') {
  if (ds.spacerLeft?.enabled  && ds.spacerLeft.width  > 0) {
    parts.push(p('Left Hinge Spacer',  1, H, ds.spacerLeft.width,  cm, ce));
  }
  if (ds.spacerRight?.enabled && ds.spacerRight.width > 0) {
    parts.push(p('Right Hinge Spacer', 1, H, ds.spacerRight.width, cm, ce));
  }
}
```
Height = `H` (`ds.height`, the full opening height) — one full-height strip
per side, per the confirmed decision. Material = `cm`/`ce` (the same
`materials.carcass`/`materials.carcassEdge` fields already used for box
sides) — reusing the existing material selector rather than adding a new
one, since the spacer is carcass-adjacent construction material, not a
face-visible part.

### 8. UI (modify `renderDrawerBuilderHTML()`, `dev.html:26530+`)

- New toggle at the top of the "📦 Carcass" section (`:26580`): "Face
  Style: External / Internal", styled like the existing drawer-type toggle
  buttons (`:26551`, `drawerState.drawerType='${val}'` pattern) —
  `onclick="drawerState.faceStyle='internal';drawerRedraw()"` etc.
- Relabel Width/Height/Depth fields to "Opening Width/Height/Depth" when
  Internal is active (same inputs, just different label text and
  `placeholder`/help copy).
- Hide the Drawer depth / Back panel / Rear gap fields (`:26594-26627`)
  when Internal is active (not applicable — see §4).
- New "Hinge Clearance" subsection, shown only in Internal mode: two rows
  (Left spacer, Right spacer), each an enable toggle + mm width input,
  following the existing `bldr-row`/`bldr-input`/`bldr-unit` markup
  conventions used throughout this section.

### 9. SVG preview (modify `drawerSVG()`, `dev.html:26260+`, and
   `drawerSideSVG()`, `:26313+`)

External mode: unchanged (faces drawn overlapping/proud of the carcass
outline, as today).

Internal mode: draw the opening as a fixed frame (the existing carcass,
rendered as a lighter/dashed reference outline since this tool doesn't
generate its cut parts), with faces drawn recessed inside that frame
(inset, not proud), and spacer strips drawn along whichever side(s) are
enabled, in a visually distinct fill (e.g. a hatched or muted panel) so
they read as "filler," not a drawer face.

### 10. Parts preview / save (no changes needed)

`drawerPartsPreviewHTML()` (`:26866`) and `drawerSaveUnit()` (`:26978`)
already just consume whatever `drawerCalcParts()` returns — no
mode-specific logic needed there, the parts list naturally reflects
whichever parts got pushed.

## Verification

No automated test framework, no browser in this environment (established
project constraint). Plan:

1. External mode, before/after: build the same drawer unit in External
   mode before and after this change lands, confirm `drawerCalcParts()`
   output is byte-identical (same part names/qty/dimensions) — proves zero
   regression to existing behavior.
2. Internal mode, no spacers: set Face Style to Internal, enter opening
   W/H/D, confirm the parts list has NO carcass parts (no Top/Bottom/
   Sides/Backing/Supports), only drawer faces + drawer boxes, and confirm
   face width = opening width − 2×sideGap, box width matches the
   runner-clearance formula fed by the opening width directly (no `2×T`
   subtraction).
3. Internal mode, one spacer: enable only the right spacer at a given
   width, confirm exactly one "Right Hinge Spacer" part appears (height =
   opening height, width = entered value), and confirm face/box width
   shrank by that spacer's width compared to the no-spacer case.
4. Internal mode, both spacers: enable both with different widths, confirm
   both spacer parts appear independently sized, and face/box width
   shrank by the sum of both.
5. Toggle Internal → External → Internal: confirm `faceStyle` and spacer
   state persist correctly across toggles (no data loss) and the parts
   list recalculates correctly each time.
6. SVG preview: visually confirm (can't automate without a browser) faces
   render recessed inside the opening frame in Internal mode, and enabled
   spacers render as distinct strips on the correct side(s).
