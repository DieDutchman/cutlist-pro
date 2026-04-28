---
name: Superuser rooms have hybrid scope (profile blob + per-job)
description: Superuser userRooms/userUnits persist via profiles.templates AND per-job state; applyState merges both, count badges match templateSection ids
type: project
---

Superuser custom rooms and userUnits are persisted in two places at once:

1. **Profile templates blob** (`profiles.templates.userRooms` / `userUnits`) — survives logout, restored by `loadTemplatesFromCloud()` at login.
2. **Per-job state** (`jobs.state.userRooms` / `userUnits`) — saved by `getJobState()`, restored by `applyState()` so reopening a saved job shows that job's rooms.

Other roles (admin, user, supplier) keep rooms strictly job-scoped.

**Why:** Superuser needs rooms to appear immediately on login (before any job is loaded) AND when loading a previous job that had different rooms. The previous "profile-only, applyState skips for superuser" approach broke job-load behavior — old jobs with rooms in `state.userRooms` never restored. The hybrid approach handles login (blob), job-load (state.userRooms wins), and migration (after job-load we push the merged set back to the blob).

**How to apply:**
- `pushTemplatesToCloud()` writes `userRooms` + `userUnits` to the blob only when `isSuperuser()` is true.
- `loadTemplatesFromCloud()` restores them only for superuser, re-registering each room in `MAT_GROUPS`, `materialConfig`, and `bedroomAddons`. Sets `currentSection = userRooms[0].id` so the panel renders the right room.
- `applyState()` for superuser: if `state.userRooms?.length`, replace userRooms with job state (and re-register groups/config); if not, preserve the profile-loaded rooms. Same for `userUnits`. After loading, call `pushTemplatesToCloud()` to sync the merged set back.
- `applyState()` always normalises `currentSection` to a valid room id and calls `renderUserRoomsNav()` after restoring.
- `newJob()` MUST NOT clear `userRooms`/`userUnits` for superuser (they survive job reset).
- Any handler that mutates `userRooms` (add/rename/delete) must call `pushTemplatesToCloud()` when superuser.
- `getEffectiveUnits()` short-circuits to `userUnits` only for non-superuser; superuser always returns the template library + customUnits, plus `userUnits` layered on when they have custom rooms.
- Superuser rooms carry a `templateSection` field (chosen at room creation) so `_renderPanel` can map "Kitchen" room → kitchen template units. Without `templateSection`, the room would show no template units.
- `updateCounts()` and `updateSummary()` MUST match unit `section` against BOTH `room.id` AND `room.templateSection` (use a `matchIds` array). Otherwise the room badge stays at 0 because template units have `u.section === 'kitchen'` while `room.id === 'ur_<ts>'`.
