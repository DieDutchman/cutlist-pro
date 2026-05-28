---
name: project-archive-units
description: Design decisions for the Archive Units feature in CutList Pro — scope, state location, and UX patterns
metadata:
  type: project
---

Archive Units feature — design locked 2026-05-28.

**Why:** Cabinet makers build many job-specific units and the panel gets cluttered. They want to hide unused units without losing the work. Not a library system — just decluttering.

**How to apply:** When implementing or revisiting archive functionality, follow these decisions unless the user explicitly overrides.

Key decisions:
- **State location:** Per-job in job state JSON. New field `archivedUnitIds: []` saved/restored alongside `deletedUnits`. Mirrors existing `deletedUnits` Set pattern at line ~5034 of dev.html.
- **Scope:** Current room, current job. No cross-job archive. Cross-context reuse already handled by Duplicate + Move.
- **Archive UX:** New `📦 Archive` button in unit card action row, between Duplicate and Delete. One click, no confirm dialog. Toast with 6-second Undo.
- **Restore UX:** Collapsed bar at bottom of room panel showing `📦 Archived (n) [Show]`. Expands inline into dimmed list of archived units, each with `↩ Restore`. No separate tab or modal.
- **Language:** Archive = hide (recoverable). Delete = gone (confirm dialog stays). Tooltip wording targets non-technical tradesmen.
- **Edge cases:** Archived units excluded from cutlist/quote/P&L. Qty, material overrides, special services preserved on restore. Delete of archived unit also clears from archivedUnits Set. Disable Move on archived units.
- **Counter:** Room tab badge counts active units only. Archived count shown only on the archive bar.

Related: [[project-status]]
