---
name: P&L historical price snapshot persistence
description: Snapshots live in dedicated state.costingPriceSnapshot field — costingPrices.mat is per-job and clobbered by autosave
type: project
---

The P&L historical price feature persists snapshots in `state.costingPriceSnapshot = { mat, edge, savedAt }` — NOT in `state.costingPrices.mat`/`edge`.

**Why:** `costingPrices.mat`/`edge` are mirrors of live globals captured by `getJobState()` on every autosave. Writing snapshots there means the next autosave overwrites them with current live supplier prices, destroying the snapshot. Using a dedicated field that `getJobState` reads from the in-memory `currentJobPriceSnapshot` global keeps it survivable across autosave round-trips.

**How to apply:**
- `getJobState()` writes `costingPriceSnapshot: currentJobPriceSnapshot`
- `applyState()` restores `currentJobPriceSnapshot` from `state.costingPriceSnapshot` in the safe pre-restore block
- `plCalcFromState()` applies `state.costingPriceSnapshot.mat/edge` AFTER `state.costingPrices.*` to override prices only — matFullSheet/matSpecialOrder/matMinSheets still come from `state.costingPrices.*` so sheet counts are immutable
- `_hasPriceSnapshot` falls back to `currentJobPriceSnapshot` when `selJob._state` is undefined (current job after page reload — `loadUserJobs` only selects minimal columns, not full state)
- `openHistoricalPriceModal` must ALWAYS rebuild `job._state` from `getJobState()` for the current job (do not reuse stale `_state` from earlier plSelectJob fetch — that's how stale quantities leak into the snapshot and shift sheet counts after save)
- `newJob()` must clear `currentJobPriceSnapshot = null`
