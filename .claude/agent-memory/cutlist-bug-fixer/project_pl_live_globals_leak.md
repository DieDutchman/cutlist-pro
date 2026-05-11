---
name: P&L Expected column can leak live prices
description: _renderPLView's live-job branch uses global costingPrices which a supplier refresh can mutate after applyState; honour selJob._state snapshot first
type: project
---

In `_renderPLView` (dev.html), the live-job branch (`selJobId === currentJobId`) calls `computeQuoteTotals()` / `computeJobMatBreakdown()` directly against the global `costingPrices`. That global is mutated by supplier-price refreshes (e.g. `loadSupplierPrices`/`loadSupplierPricesFromCloud` overwrites `costingPrices.mat[name] = Number(row.price)`), so even though `applyState` initially merged the job's `state.costingPrices.mat` snapshot into globals, a later refresh can leak current prices into the P&L Expected column.

**Why:** Historical-price snapshots are stored in `jobs.state.costingPrices.mat/edge`. The Expected column is derived from whatever the calc functions read off live globals — there is no separate "snapshot path" that bypasses globals unless `plCalcFromState(state)` is called, which deep-copies globals, applies the state, computes, and restores.

**How to apply:** Whenever a P&L (or any historical/billed) view must reflect saved prices instead of live ones, route through `plCalcFromState(selJob._state)` — never through `computeQuoteTotals()` against live globals. Use `_hasPriceSnapshot` (true when `selJob._state.costingPrices.mat` has any keys) as the deciding flag. The live-globals path is only safe when no snapshot exists.
