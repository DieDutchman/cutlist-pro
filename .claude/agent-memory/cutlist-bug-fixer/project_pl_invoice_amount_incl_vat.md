---
name: P&L invoice amounts must be incl VAT
description: plData invoices store inv.amount as VAT-INCLUSIVE total; all P&L display calcs divide by 1.15 to compare against quote (excl VAT). Mismatched semantics cause systemic under/over reporting.
type: project
---

`plData[jobId].invoices[].amount` is the VAT-INCLUSIVE line total throughout the P&L subsystem.

**Why:** Quotes are stored/displayed excl VAT. To compare invoice actuals against quote, the renderer divides `amount / 1.15`. This is hardcoded in many places in `_renderPLView` (see Tops at line ~22170, Cut & Label ~22295, Boards/Edging breakdowns, `invoiceExclVAT = invoiceTotal / 1.15` at ~21914). The UI label near the Boards/Edging breakdown header reads "incl. VAT as entered".

**How to apply:**
- Any new invoice category/total calc must divide stored `amount` by 1.15 to get excl-VAT.
- The AI invoice import (`plReadInvoice` system prompt around line ~21464) MUST instruct the model to return VAT-INCLUSIVE amounts. SA invoices commonly show line items excl VAT with VAT as a separate footer line — the prompt explicitly tells the AI to redistribute VAT into each line.
- When adding new amount input fields, label/placeholder must indicate "incl VAT" — otherwise users enter excl-VAT values and the displayed "actual cost ex VAT" is ~15% too low (system does `excl / 1.15`).
- If a category should NOT have VAT stripped (e.g. labour from a sole prop with no VAT), it must be handled separately like `labourCost` (raw, no /1.15) — currently only labour is treated this way.

**Known prior bug (2026-05-08):** User's Tops invoice (R20114.575 excl VAT) displayed as R16751.81 actual ex VAT in P&L. Root cause was AI import returning excl-VAT line totals, which then got `/1.15`'d again. Fix tightened the AI prompt + added incl-VAT hints to manual entry inputs.
