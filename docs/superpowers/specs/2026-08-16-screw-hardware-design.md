# Screw Hardware Tracking — Design

## Problem

Screw consumables (chipboard screws, machine screws for handles) are a real cost
and real purchasing need, but nothing in the app tracks them. Nico currently
guesses pack quantities by eye per job. He wants:

1. Screw pack prices entered once, like other hardware (hinges, runners, handles)
2. Pack quantities auto-computed per job and shown in the Hardware Order List
3. Screw cost auto-included in the job's costing/quote total, same as hinges/handles

## Source numbers (from Nico, per unit)

Floor kitchen unit (F\* units), per drawer:
- 20× 3.5×25mm — drawer box assembly
- 4× 3.5×25mm — drawer face
- 12× 3.5×16mm — runners + drawer box + carcass ties

Per hinge (Floor and Wall):
- 6× 3.5×16mm

Per handle (door or drawer face, any unit):
- 2× M4×40mm machine screw

Carcass (flat, per unit instance — F\*/W\* kitchen units only):
- Floor unit: 18× 3.5×40mm
- Wall unit: 20× 3.5×40mm

Bedroom, Linnekast, and Bathroom Vanity units get drawer/hinge/handle screws
(same formulas) but **no** carcass screw line — no numbers given for those yet.

Pack sizes (fixed, not user-editable):
- 3.5×16mm: 1000/pack
- 3.5×25mm: 1000/pack
- 3.5×40mm: 800/pack
- M4×40mm: 50/pack

## Design

### 1. Pricing — My Costs tab

New "Screws" section in `_renderMaterialsView()` (`dev.html`, alongside the
existing Hinges/Drawer Runners/Handles sections), using the same `fixedRow()`
pattern (★ = feeds auto-costing):

- 3.5×16mm — price per pack of 1000
- 3.5×25mm — price per pack of 1000
- 3.5×40mm — price per pack of 800
- M4×40mm Machine — price per pack of 50

New fields on `costingPrices.hardware`: `screw16`, `screw25`, `screw40`,
`screwM4` (default `0`, same as other hardware prices). New constant:

```js
const SCREW_PACK_SIZE = { screw16: 1000, screw25: 1000, screw40: 800, screwM4: 50 };
```

### 2. Per-unit screw count formula

New function taking the counts directly (not the whole `calcUnitCost()`
result), so it works both inside `calcUnitCost()` itself (where these are
still local vars) and in the BOM block (where they're already on `c`):

```js
function screwCountsForUnit(u, unitQty, hingeCount, drawerCount, handleCount) {
  const isFloor = /^F\d/.test(u.name) && u.section === 'kitchen';
  const isWall  = /^W\d/.test(u.name) && u.section === 'kitchen';

  const screw25 = drawerCount * 24;                 // 20 box + 4 face
  const screw16 = drawerCount * 12 + hingeCount * 6;
  const screwM4 = handleCount * 2;
  const screw40 = isFloor ? unitQty * 18 : isWall ? unitQty * 20 : 0;

  return { screw16, screw25, screw40, screwM4 };
}
```

Where `drawerCount` is `runnerCount` (one runner set per drawer) and
`handleCount` is `handle160Count + handle240Count`. Both callers already have
these values computed — the BOM block reads them off `c` (the
`calcUnitCost()` result), and `calcUnitCost()` itself has them as local vars
just before it builds the cost totals.

### 3. Hardware Order List (Summary tab)

In the existing BOM block (`dev.html` ~9100–9172), accumulate screw totals
alongside `_bomHinges`/`_bomH160`/etc. using `screwCountsForUnit()`, then
convert to packs and add rows:

```js
if (_bomScrews.screw16 > 0) _bomRows.push({ item: 'Chipboard Screws 3.5×16mm', qty: Math.ceil(_bomScrews.screw16 / SCREW_PACK_SIZE.screw16), unit: 'packs' });
// ...same for screw25, screw40, screwM4 (label "Machine Screws M4×40mm")
```

Packs round up (can't buy partial packs). No cost shown here — this list is
purely "what to buy," matching the existing hinge/runner/handle rows.

### 4. Costing — automatic Hardware subtotal

In `calcUnitCost()`, compute screw cost the same way hinge/runner/handle cost
is computed today:

```js
const screwCounts = screwCountsForUnit(u, unitQty, hingeCount, runnerCount, handle160Count + handle240Count);
const screwCost = includeHardware
  ? Object.entries(screwCounts).reduce((sum, [key, count]) =>
      sum + Math.ceil(count / SCREW_PACK_SIZE[key]) * (costingPrices.hardware[key] || 0), 0)
  : 0;
```

Note: cost is charged per **whole pack** consumed by that unit's own count —
same rounding-up logic as the order list, applied per unit (not pooled across
the job) since that's how `calcUnitCost` is scoped today for hinge/runner/handle
cost. Add `screwCost` to the function's `total` and to the returned object.

`hardwareRows()` (Costing tab breakdown) gets a new row per screw size with
count > 0, appended after the existing Hinges/Handles/Runners rows, same
`<tr>` format, folded into the existing "Hardware (subtotal)" line.

No changes to `quoteState.extras` or `EXTRAS & SHOPPING LIST` — screw cost
flows through the same automatic path as hinges/handles/runners, silently
included in the quote total.

## Out of scope

- Bedroom/Linnekast/Bathroom carcass screw counts (no numbers given yet)
- Pooling screw-pack rounding across the whole job instead of per-unit
  (matches existing hinge/runner/handle behavior, not changing that pattern)
- Any UI for editing pack sizes (hardcoded per Nico's supplier packs)

## Testing

No test suite in this repo (single-file HTML/JS app). Verify via dev server:
1. Enter screw pack prices in My Costs → Screws
2. Build a job with an F450 (drawers + door) and a W450, check Hardware Order
   List shows correct pack counts for all 4 sizes
3. Check Costing tab Hardware breakdown shows a screw cost row and the
   subtotal/quote total moved by the right amount
4. Add a Bedroom cupboard unit, confirm no 40mm carcass row contribution from
   it but hinge/drawer screws still count
