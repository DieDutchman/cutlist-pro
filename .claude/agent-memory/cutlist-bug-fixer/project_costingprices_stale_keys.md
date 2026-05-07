---
name: costingPrices.mat retains stale keys after loadSupplierPrices
description: costingPrices.mat is never cleared on price reload, so deleted/renamed boards linger as ghost entries; UIs that iterate it directly show stale data
type: project
---

`costingPrices.mat` is seeded from hardcoded defaults in `dev.html` AND merged from `localStorage`, then `loadSupplierPrices()` overwrites entries for boards present in `supplier_prices`. It does NOT delete keys that are absent from the DB result. The `MATS` array, by contrast, IS rebuilt from scratch each load and reflects only live Supabase rows. `EDGES` and `costingPrices.edge` have explicit removal logic, but `costingPrices.mat` does not.

**Why:** This caused the Bulk Adjust modal to show boards the supplier had deleted or renamed (deleted DB row → ghost key still in `costingPrices.mat` from the hardcoded defaults / localStorage cache).

**How to apply:** Any UI that enumerates `Object.entries(costingPrices.mat)` (or `.edge` to a lesser extent) for a "show me what's in the supplier's price list" view must intersect against the `MATS` / `EDGES` arrays — those are the post-load source of truth. Pure cost-calculation lookups (`costingPrices.mat[item.mat]`) are fine because they only hit keys that quoted parts reference. Suspect this pattern any time the user reports "I deleted a board but it still appears in X dialog."
