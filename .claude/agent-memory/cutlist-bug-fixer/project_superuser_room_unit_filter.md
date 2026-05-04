---
name: Superuser custom rooms host both userUnits AND template units
description: Filtering by u.section === sec.id alone hides template units inside superuser custom rooms; use buildRoomList matchIds
type: project
---

For superuser-with-custom-rooms, a user room (`ur_xxx`) carries a `templateSection` (e.g. 'kitchen'). Inside that room two unit sources coexist:
- userUnits with `section === room.id` (e.g. `ur_abc`)
- template units with `section === room.templateSection` (e.g. `'kitchen'`)

`_renderPanel()` already handles this (filters on both `userRoom.templateSection` and `userRoom.id`). Anything that iterates rooms-and-filters-units must do the same — otherwise template units silently disappear in that view.

**Why:** quote/costing/cutlist views previously hardcoded `userRooms.map(r => ({id: r.id}))` then filtered `u.section === sec.id`. For superusers using custom rooms this returned an empty unit list and the Quote tab rendered with no line items / zero totals — looked completely broken.

**How to apply:** use the existing `buildRoomList(withLabel)` helper. It returns `[{id, label?, matchIds: [r.id, r.templateSection].filter(Boolean)}]` for user-room mode and `[{id, label, matchIds: [s.id]}]` for template mode. Filter with `sec.matchIds.includes(u.section)` instead of `u.section === sec.id`. Three known sites fixed: `_renderQuoteView`, `computeQuoteTotals`, `downloadQuoteXLSX`. Audit any other view that iterates rooms × units (cutlist generator, P&L snapshot, etc.) for the same shape.
