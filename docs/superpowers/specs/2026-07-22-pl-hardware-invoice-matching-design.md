# P&L Hardware: Quoted-to-Invoiced Line Matching

## Problem

The P&L tab's HARDWARE section shows per-line "expected vs actual" comparisons
(`dev.html` ~28414-28530) so a user can see whether a specific quoted item
(e.g. a custom hardware line like "Plinth 150mm x 3m") cost more or less than
quoted once the real supplier invoice comes in.

The actual-cost lookup (`_findActualForLine`, `dev.html:28456-28463`) matches
an invoiced line to a quoted line by **exact case-insensitive string equality**
between the quoted item's label and the invoice line's AI-extracted `desc`.
Real invoices rarely match the wording of a user's Costing-tab item name
(quoted: `"Plinth 150mm x 3m"`, invoiced: `"ALI COVERED PLINTH 150x3m"`), so
the ACT column silently shows "—" even though the cost was in fact invoiced
and already counted in the category total. This makes real per-item
profit/loss invisible for anything but items named identically to the
invoice.

## Scope

Hardware section only (`dev.html` ~28414-28530), matching within a single
P&L category (e.g. both lines are "Hardware – Other"). TOPS and CUT & LABEL
sections have no per-line comparison today and are out of scope — this spec
does not add it there.

## Goals / non-goals

- Goal: when no exact match exists, suggest the most likely invoice line as
  a candidate match, and let the user confirm it with one click.
- Goal: user stays in control — no silent/automatic fuzzy matching of costs
  into a quoted line. A suggestion only takes effect once clicked.
- Non-goal: cross-category matching (AI mis-categorization recovery) — not
  handled, category is trusted as-is.
- Non-goal: preserving a link across a quoted item rename — accepted as a
  known limitation (see below).

## Design

### 1. Matching/scoring algorithm

For a quoted line `label` and a candidate invoice `desc`:

1. Normalize both: lowercase, split on `/[^a-z0-9]+/`, drop tokens < 2 chars
   → `wordTokens`.
2. Extract all digit runs from the normalized string (regex `\d+`) →
   `numberTokens`.
3. `score = 0.5 * jaccard(wordTokens_a, wordTokens_b) + 0.5 * jaccard(numberTokens_a, numberTokens_b)`
   where `jaccard(A, B) = |A ∩ B| / |A ∪ B|` (0 if both sets empty).
4. Candidate qualifies as a suggestion if `score >= 0.35`.

Worked example: `"Plinth 150mm x 3m"` vs `"ALI COVERED PLINTH 150x3m"` →
word tokens `{plinth,150mm,3m}` vs `{ali,covered,plinth,150x3m}`, word
Jaccard = 1/6 ≈ 0.167; number tokens `{150,3}` vs `{150,3}`, Jaccard = 1.0;
combined score ≈ 0.58 — qualifies.

### 2. Data model

New optional field on invoice line items (`plData[jobId].invoices[i]`):

```
matchedQuotedKey: string   // "<category>::<label>", set on manual confirm
```

Additive only, no migration. Absent on all existing invoice records
(treated as unset).

The quoted-line side has no persisted ID — `category + label` (deterministic,
recomputed each render from `quoteState.extras` / `hardwareExtrasDetail`) is
used as the stable key for matching purposes.

### 3. Match resolution order

For each quoted hardware detail line (`category` = `cat`, `label` = `label`,
`key = \`${cat}::${label}\``), when computing its actual cost:

1. **Manual match**: sum all invoices in this job where
   `matchedQuotedKey === key`. If any exist, use this sum — done.
2. **Exact match** (existing behavior, unchanged): sum all invoices where
   `category === cat` and `desc.trim().toLowerCase() === label.trim().toLowerCase()`.
   If any exist, use this sum — done.
3. **No match**: render "—" as today, and compute suggestions (below).

Invoices consumed by step 1 or 2 for *any* quoted line are tracked in a
"claimed" set for the render pass, so they're never also offered as a
suggestion for a different quoted line.

### 4. Suggestions (only computed for step-3 lines)

Candidate pool = invoices in this job where `category === cat` and the
invoice is not in the claimed set (from step 3 above) and does not already
have a `matchedQuotedKey` pointing at a *different* key.

Score every candidate against `label` using the algorithm in §1.

- **0 qualifying candidates** → render "—", no suggestion UI.
- **1 clear top candidate** (best score ≥ 0.35, and no other candidate
  within 0.1 of it) → render a suggestion row directly under the quoted
  line's row:
  `↳ possible match: "<desc>" — R<amount incl VAT / 1.15> [Link]`
- **2+ candidates tied** (within 0.1 of the top score) → same suggestion
  row, but as a `<select>` of the tied candidates (desc + amount) plus a
  `[Link]` button that links whichever is selected.

Clicking `[Link]` calls `plLinkInvoiceToQuotedLine(jobId, invoiceId, key)`.

### 5. Actions

- `plLinkInvoiceToQuotedLine(jobId, invoiceId, key)` — finds the invoice by
  `id` in `plData[jobId].invoices`, sets `matchedQuotedKey = key`, persists
  (`plPersistJob`), re-renders the P&L view for the currently selected job.
- `plUnlinkInvoiceMatch(jobId, invoiceId)` — clears `matchedQuotedKey` on
  that invoice, persists, re-renders. Exposed as a small "✕ unlink" control
  next to any ACT value that came from a manual match (step 1), so a wrong
  link is correctable without deleting/re-importing the invoice line.

### 6. Rendering changes

In the HARDWARE section's detail-row builder (`dev.html` ~28485-28499):
- Row for a matched line (manual or exact) renders as today; manual matches
  additionally show the "✕ unlink" control next to the ACT cost cell.
- Row for an unmatched line, when a suggestion exists, gets one additional
  `<tr>` immediately after it: dim/italic styling consistent with the
  existing `↳` detail-row convention, containing the suggestion text (or
  select) and the Link button.

### Known limitation

Renaming a quoted item's label (e.g. editing the custom hardware item's
name on the Costing tab) changes its `category::label` key. A previously
confirmed manual match against the old key stops resolving — the line
reverts to "no match" and fresh suggestions are computed. This is accepted
as a rare edge case; solving it properly would require threading a stable
ID through `quoteState.extras`/custom-hardware items, a larger change to
the quote data model that isn't justified by this feature alone.

### Error handling

- Invoice line deleted (`plRemoveImportedDoc`) after being linked: the
  dangling `matchedQuotedKey` reference simply matches nothing on next
  render (self-healing, no cleanup pass needed).
- Multiple invoices linked to the same quoted key (e.g. a split shipment
  across two invoices): summed, consistent with existing exact-match
  behavior.

## Verification

No automated test suite exists for this single-file app (manual
verification is the established pattern per project conventions). Plan:

1. Quote a custom hardware line named distinctly from how you'd naturally
   word an invoice (e.g. "Plinth 150mm x 3m").
2. Import an invoice (JPG or PDF) containing a differently-worded line for
   the same item (e.g. "ALI COVERED PLINTH 150x3m") in the same P&L
   category.
3. Confirm: ACT column shows "—", suggestion row appears with correct desc
   and amount.
4. Click Link — confirm ACT column populates, variance/% recompute
   correctly, category totals unchanged (already included the invoice
   amount before linking).
5. Click unlink — confirm it reverts to "—" plus the suggestion row again.
6. Construct a two-candidate tie (two invoice lines with near-identical
   scores against one quoted label) — confirm the dropdown variant renders
   and linking the non-default option works.
7. Confirm an invoice line already exact-matched to one quoted line is
   never offered as a suggestion for a different quoted line in the same
   category.
