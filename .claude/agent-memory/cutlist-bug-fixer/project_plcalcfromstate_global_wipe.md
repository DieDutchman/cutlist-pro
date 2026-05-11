---
name: plCalcFromState wipes globals not in getJobState
description: plCalcFromState must guard wipe-and-replace of customUnits/unitOverrides/deletedUnits because getJobState omits them as global template settings
type: project
---

`plCalcFromState(state)` round-trips live globals through the saved-state shape, then calls `computeQuoteTotals` + `computeJobMatBreakdown`. It must NEVER unconditionally clear globals that `getJobState()` deliberately omits — doing so causes the live-job-with-snapshot render path to lose those globals during the calc.

**Why:** `getJobState()` explicitly excludes `customUnits`, `unitOverrides`, `deletedUnits` (they live in localStorage as global template settings, not per-job). For the live current job with a `costingPriceSnapshot`, `_renderPLView` builds `_stateForCalc = getJobState()` and passes it into `plCalcFromState`. Any `globalX.length = 0` or `Object.keys(globalX).forEach(delete...)` that runs *before* a `if (st.globalX) ...` guard will empty the global because the state object never had that key. For superuser, `getEffectiveUnits()` includes `customUnits` — emptying it changes which units `computeJobMatBreakdown` iterates over, which silently shifts the Expected sheet counts after a snapshot is saved.

**How to apply:** Inside `plCalcFromState`, only wipe-and-replace a global if the deep-copied `st.X` exists. The pattern at the `unitOverrides` / `deletedUnits` / `unitSpecialServices` lines (`if (st.X) { clear; assign; }`) is correct. Audit any future addition to the wipe block against the keys actually returned by `getJobState()`. The `finally` restore is independent (uses `snap.X` captured at entry) and is always safe to run unconditionally.
