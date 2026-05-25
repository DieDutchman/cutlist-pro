---
name: pl-invoice-amount-vat-flag
description: plData invoices carry a vatIncluded boolean; renderer normalises via _invInclVAT() before /1.15. Touch all aggregation sites together when changing semantics.
metadata:
  type: project
---

`plData[jobId].invoices[].amount` is the line total **as printed on the supplier invoice**, paired with `inv.vatIncluded` (boolean) that says whether the amount includes VAT or not.

**Why:** SA suppliers print invoices both ways — some list line totals incl VAT, some excl VAT with VAT as a separate footer. Before 2026-05-25 the AI prompt forced Groq to redistribute VAT into every line and `inv.amount` was assumed incl-VAT everywhere. That misrepresented excl-VAT invoices: the displayed label was wrong AND comparison math (`amount / 1.15`) under-reported actual costs by ~13%.

**How to apply:**
- All P&L cost aggregation MUST route through `_invInclVAT(inv)` (defined just above `plOpenPDFImport`), which returns `amount * 1.15` when `vatIncluded === false`, else `amount`. The existing `/1.15` math downstream then yields true excl-VAT. There is a sibling `_invUnitInclVAT(inv)` for unit_price.
- `vatIncluded` defaults to `true` when missing (backwards-compatible with pre-flag data).
- The AI prompt now asks Groq to **detect** the invoice's VAT mode and return `{ vat_included, items: [...] }` with raw printed amounts. Don't revert it to "always redistribute VAT" — that broke excl-VAT invoices.
- Import review modal (`renderPLPDFResults`) shows a per-line `Incl/Excl` select pre-populated from AI's judgement; user can override per-row before clicking IMPORT SELECTED.
- Manual "Add invoice" row and the per-row edit UI both expose an `Incl VAT / Excl VAT` toggle next to the amount input. `plUpdateInvoice('vatIncluded', bool)` writes the flag.
- Sites that aggregate `inv.amount`: `invoiceTotal`, `matActualInclVAT`/`unmatchedBoardsInclVAT`, `edgeActualInclVAT`/`unmatchedEdgeInclVAT`, `allBoardsActual`, `allEdgeActual`, `catTotals`, `topsActual`, `hwActual[cat]`, `_findActualForLine`, `cutActual`. The qty-detail display line still reads raw `inv.amount` for the printed value — that's intentional.

**Known prior bug (2026-05-08):** Tops invoice (R20114.575 excl VAT) showed as R16751.81 in P&L because the AI prompt forced VAT redistribution and the original prompt mishandled it.
**Known prior bug (2026-05-25):** Excl-VAT supplier invoices were being labelled "Total (incl VAT)" and divided by 1.15 in comparisons, under-reporting actuals. Fix added the `vatIncluded` flag, the `_invInclVAT` helper, AI detection of VAT mode, and per-row toggles.
