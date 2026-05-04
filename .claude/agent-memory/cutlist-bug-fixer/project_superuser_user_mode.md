---
name: Superuser hybrid user-mode
description: dev.html lets superuser enter user-mode when they have rooms — has knock-on effects on nav and unit visibility
type: project
---

In dev.html, `usesUserUnits()` returns `!isSuperuser() || userRooms.length > 0`. INDEX has `!isSuperuser()`. The dev change makes a superuser with custom rooms enter user-mode, which routes through `_renderPanel`'s user-mode branch and calls `renderUserRoomsNav()`.

**Why:** Superusers can build custom rooms that map to a `templateSection` (e.g., a room based on the kitchen template). These rooms need user-mode rendering to show only the relevant template units.

**How to apply:** When fixing nav-row or unit-list bugs for superuser, remember:
- `renderUserRoomsNav()` must NOT hide the static admin rows for superuser, or they lose access to template sections (Kitchen, Fillers, etc.).
- `_renderPanel`'s user-room filter for superuser uses `u.section === userRoom.templateSection || u.section === userRoom.id`.
- `getEffectiveUnits()` short-circuits for non-superuser via `usesUserUnits() && !isSuperuser()`. Superuser always falls through to template + customUnits + userUnits.
- The Remove button in user mode calls `deleteUserUnit`, which must fall through to `deleteCustomUnit` and `deletedUnits` for non-userUnit IDs (template units shown in custom rooms).
- `matGroupIds` for kitchen splits into wall+floor; superuser custom rooms with `templateSection === 'kitchen'` need the same split.
