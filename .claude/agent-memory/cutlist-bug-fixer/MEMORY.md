# Memory Index

- [Superuser rooms profile-scoped](project_superuser_room_persistence.md) — superuser userRooms/userUnits live in profiles.templates blob, not per-job state
- [Superuser user-mode](project_superuser_user_mode.md) — superuser-with-rooms enters user-mode in dev.html; renderUserRoomsNav must keep static admin rows visible
- [Superuser room/unit filter](project_superuser_room_unit_filter.md) — room-iterating views must use buildRoomList matchIds, not u.section === sec.id, or template units vanish
- [Legacy room normalization](project_legacy_room_normalization.md) — applyState must normalize older userRooms (missing name/icon/templateSection) on job load
- [costingPrices.mat ghost keys](project_costingprices_stale_keys.md) — costingPrices.mat is never cleared on reload; UIs enumerating it must filter via MATS/EDGES
- [Per-job state in jobs.state](project_per_job_state_storage.md) — per-job data must round-trip through getJobState/applyState; localStorage is cache only, never source of truth
- [P&L live globals leak](project_pl_live_globals_leak.md) — _renderPLView live-job branch uses globals; route through plCalcFromState when job has price snapshot
- [P&L price snapshot](project_pl_price_snapshot.md) — snapshots live in state.costingPriceSnapshot (dedicated field), not state.costingPrices.mat; survives autosave
