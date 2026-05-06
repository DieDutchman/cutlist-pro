---
name: Legacy room normalization on job load
description: Older saved jobs may store userRooms without name/icon/templateSection — applyState must normalize or rendering breaks
type: project
---

Older saved jobs (created before fields were added) can have userRooms entries that lack `name`, `icon`, or `templateSection`. Three failure modes follow from this:

1. Missing `name` + `.tab` CSS uses `text-transform: uppercase` → nav button shows the raw id like "UR_1771234..." instead of a label.
2. Missing `icon` → renders the literal string "undefined" before the name.
3. Missing `templateSection` (superuser custom rooms only) → `_renderPanel`'s filter `u.section === userRoom.templateSection || u.section === userRoom.id` excludes all template units, so qty inputs all render as 0 even though `quantities` is correctly restored.

**Why:** The room schema accreted fields over time. `templateSection` was specifically added so superuser rooms could mirror a template section's units. Jobs saved before each field existed survived in supabase `jobs.state.userRooms` as partial objects.

**How to apply:** When touching `applyState` / room restore, always normalize: coerce string-only entries to objects, fall back `name` to a friendly id-derived label, default `icon` to '🏠', and (superuser only) infer `templateSection` from saved quantities by finding which template section's unit-ids dominate the nonzero quantities. The same defensive fallbacks belong in `renderUserRoomsNav` so a broken state doesn't render gibberish.
