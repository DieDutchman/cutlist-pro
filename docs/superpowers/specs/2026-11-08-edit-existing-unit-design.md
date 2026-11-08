# Edit Existing Unit in Builder — Design

## Problem

The 🔨 Unit Builder and 🗂 Drawer Builder can only create new units. Once saved,
the only ways to change one are the ✏ Edit modal (name + proportional scale
only) or the 🔧 Parts editor (manual, part-by-part). Fixing a structural choice
made in the Builder — e.g. switching the bottom from "inside" to "full width",
or turning on a divider — means rebuilding the whole unit from scratch and
manually re-pointing any quantities/overrides to the new id.

Units built via the Builder already carry everything needed to reconstruct
them: `builderState`/`drawerState` are plain, fully serializable objects. We
just don't currently save a copy of that recipe alongside the generated parts.

## Scope

In scope: units created by 🔨 Unit Builder (`builderSaveUnit`) and 🗂 Drawer
Builder (`drawerSaveUnit`) only. These are the only two creation paths that
have a structured, replayable "recipe" behind the generated parts.

Out of scope: units from the ⚡ Build Custom Unit dialog, the Width/Height
Builder, templates, or imported cutlists. These have no structured recipe —
freeform parts only — so "edit in Builder" has nothing to reconstruct from.
They keep using ✏ Edit (scale) and 🔧 Parts as today.

Bundled fix: `builderSaveUnit()` currently always pushes new units into the
shared `customUnits` list, even for non-superuser accounts that should get
their own `userUnits` (the array shape `drawerSaveUnit()` already branches on
correctly via `usesUserUnits() && userRooms.length > 0`). This is unrelated to
"edit" itself but sits in the exact code this feature touches, so it's fixed
as part of this work rather than filed separately.

## Data model

Both save functions stamp two new fields onto the unit object at save time:

- `builderType: 'unit' | 'drawer'`
- `builderConfig: <deep clone of builderState / drawerState at save time,
  via JSON.parse(JSON.stringify(...)) — the same cloning idiom used
  elsewhere in the file (e.g. scenario snapshots, addon presets)>`

Units without `builderConfig` simply don't show the new "Edit in Builder"
button — no migration needed for existing units; they stay editable the way
they always were.

## Load flow — `builderLoadUnit(unitId)`

1. Look up the unit in `userUnits` then `customUnits`; read `builderType` /
   `builderConfig`. If missing (defensive — the button shouldn't render for
   these), toast and bail: *"This unit wasn't created in the Builder, so it
   can't be edited here — use Parts instead."*
2. Set `_builderMode` to `unit.builderType` (same global the mode-bar
   tabs already drive).
3. Set two new globals: `_builderEditingUnitId = unitId` and
   `_builderEditingUnitSource = 'user' | 'custom'` (whichever array it was
   found in — needed at save time to write back to the right place).
4. `Object.assign(builderState, JSON.parse(JSON.stringify(unit.builderConfig)))`
   (or `drawerState`, per type) — both are `const`, so mutate in place
   rather than reassign. Keys not present in an older saved config simply
   keep their current default, so a unit built before some new builder
   field existed still loads, just with that one field defaulted.
5. `switchTab(document.getElementById('builder-tab'), '__builder__')` —
   already renders the Builder view as a side effect.

## Save flow — overwrite vs. create

`builderSaveUnit()` / `drawerSaveUnit()` branch at the top on whether
`_builderEditingUnitId` is set:

**Editing (id set):**
1. `confirmAction(...)`: *"This regenerates all parts from the Builder
   settings — any manual edits made via Parts since will be lost.
   Continue?"* Cancel leaves everything untouched, builder stays open.
2. On confirm: locate the existing unit object by id in
   `_builderEditingUnitSource`'s array (`userUnits` or `customUnits`) and
   replace `name`, `section`, `parts`, `buildW`, `buildH`, `builderConfig`
   in place. **`id` and `price` are left untouched** — any quantities,
   per-unit material overrides, or special-service links keyed by that id
   keep working with zero extra bookkeeping.
3. Clear `_builderEditingUnitId` / `_builderEditingUnitSource`.
4. Persist via whichever of `saveCustomUnits()` / `scheduleAutoSave()`
   matches the source array (same split `drawerSaveUnit` already makes).
5. Toast: `"${name}" updated`.

**Creating (id not set):** unchanged from today, except the unit object now
also carries `builderType` + `builderConfig` — and, per the bundled fix,
`builderSaveUnit()` now branches `userUnits` vs `customUnits` the same way
`drawerSaveUnit()` already does.

## UI changes

- New "🔨 Edit in Builder" button in the per-unit action row (next to
  ✏ Edit / 🔧 Parts / ✂ Move / 📦 Archive / × Remove), rendered only when
  `u.builderConfig` exists. Calls `builderLoadUnit(u.id)`.
- While `_builderEditingUnitId` is set, a small banner at the top of the
  Builder panel: *"Editing: `<unit name>`"* with a "✕ Cancel" button that
  clears both editing globals and resets `builderState`/`drawerState` back
  to their defaults — so the user can back out to building something new
  without a page reload.
- Clicking the other mode's tab (🔨 Unit Builder ↔ 🗂 Drawer Builder) while
  `_builderEditingUnitId` is set clears the editing globals first. The two
  builders are different tools with incompatible recipes; switching away is
  treated as an implicit cancel, never a silent overwrite of the wrong unit.

## Edge cases

- **Unit deleted elsewhere while mid-edit:** save flow can't find the id in
  the expected array — fall back to treating it as a create (matches the
  principle of least surprise: the work isn't lost, it just becomes a new
  unit) and toast accordingly.
- **Re-opening an in-progress edit:** no autosave/draft concept here, same
  as the rest of the Builder today — navigating away without saving
  discards the in-progress edit, consistent with existing behavior.
