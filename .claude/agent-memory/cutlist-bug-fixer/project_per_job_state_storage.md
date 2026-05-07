---
name: Per-job state must round-trip through jobs.state JSON
description: Any per-job data added to dev.html must be in getJobState() AND applyState() AND persisted server-side, not localStorage-only
type: project
---

Per-job data in CutList Pro lives in the Supabase `jobs.state` JSON column. Any new per-job state must:

1. Be included in `getJobState()` so saveJobToCloud() persists it
2. Be restored in `_applyStateInner()` so opening the job (any browser) rehydrates it
3. If the feature has its own mutation paths (not just Save), it needs its own PATCH helper that writes to `jobs.state` directly, OR call saveJobToCloud()
4. localStorage may be used as a fast cache, but is NEVER the source of truth — always hydrate from `state` on load

**Why:** Past bug — Job P&L (actualCosts/invoices/labour/notes) was localStorage-only via `plData = {}` + `plSave()`. Cross-browser opens showed empty P&L. Fix added `plData` to getJobState(), applyState(), plus a `plPersistJob(jobId)` helper for picker-based mutations on non-current jobs.

**How to apply:** When you see `localStorage.setItem('cutlist_…')` for what looks like per-job data, it's a red flag — verify it's also in jobs.state. Globals like `customUnits`/`unitOverrides`/`deletedUnits` are intentionally localStorage-only (per-user templates), not per-job.
