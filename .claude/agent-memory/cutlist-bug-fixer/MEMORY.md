# Memory Index

- [Superuser rooms profile-scoped](project_superuser_room_persistence.md) — superuser userRooms/userUnits live in profiles.templates blob, not per-job state
- [Superuser user-mode](project_superuser_user_mode.md) — superuser-with-rooms enters user-mode in dev.html; renderUserRoomsNav must keep static admin rows visible
- [Superuser room/unit filter](project_superuser_room_unit_filter.md) — room-iterating views must use buildRoomList matchIds, not u.section === sec.id, or template units vanish
- [Legacy room normalization](project_legacy_room_normalization.md) — applyState must normalize older userRooms (missing name/icon/templateSection) on job load
- [costingPrices.mat ghost keys](project_costingprices_stale_keys.md) — costingPrices.mat is never cleared on reload; UIs enumerating it must filter via MATS/EDGES
