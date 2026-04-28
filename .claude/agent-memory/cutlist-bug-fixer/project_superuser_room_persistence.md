---
name: Superuser rooms are profile-scoped (not job-scoped)
description: Superuser userRooms + userUnits persist via the profiles.templates blob, distinct from other roles where they live per-job
type: project
---

Superuser custom rooms and userUnits are persisted to `profiles.templates` (the same blob that holds `customUnits`, `unitOverrides`, `deletedUnits`, `customHardware`, `addonPresets`). Other roles (admin, user, supplier) continue to scope userRooms/userUnits per-job via the jobs table state JSON.

**Why:** `profiles.last_job_id` was missing in Supabase, so `restoreLastJob()` never fired on superuser login — their custom rooms vanished every session. Persisting through the templates blob bypasses the dependency on auto-restore, while still leaving the rest of the role model untouched.

**How to apply:**
- `pushTemplatesToCloud()` writes `userRooms` + `userUnits` to the blob only when `isSuperuser()` is true.
- `loadTemplatesFromCloud()` restores them only for superuser, re-registering each room in `MAT_GROUPS`, `materialConfig`, and `bedroomAddons`.
- `applyState()` MUST NOT overwrite `userRooms`/`userUnits` when the user is superuser (job state would clobber the persistent profile data).
- `newJob()` MUST NOT clear `userRooms`/`userUnits` for superuser (they survive job reset).
- Any handler that mutates `userRooms` (add/rename/delete) must call `pushTemplatesToCloud()` when the user is superuser, in addition to `scheduleAutoSave()`.
- `getEffectiveUnits()` short-circuits to `userUnits` only for non-superuser; superuser always returns the template library + customUnits, plus `userUnits` layered on when they have custom rooms.
- Superuser rooms carry a `templateSection` field (chosen at room creation) so `_renderPanel` can map "Kitchen" room → kitchen template units. Without `templateSection`, the room would show no template units (custom IDs like `ur_<ts>` don't match template section IDs).
