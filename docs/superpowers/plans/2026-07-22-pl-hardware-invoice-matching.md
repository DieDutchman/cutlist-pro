# P&L Hardware Quoted-to-Invoiced Line Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user confirm a suggested match between a quoted hardware line item (e.g. "Plinth 150mm x 3m") and a differently-worded invoiced line item (e.g. "ALI COVERED PLINTH 150x3m") in the P&L tab's HARDWARE section, so per-line profit/loss is visible even when invoice wording doesn't match the quote.

**Architecture:** All changes live in the single `dev.html` file (no build step, no framework). Four self-contained changes: (1) pure fuzzy-scoring helper functions, (2) two new data-mutation functions for manually linking/unlinking an invoice to a quoted line, (3) a rewrite of the existing exact-match lookup to also check manual links first, and (4) wiring the suggestion UI into the existing HARDWARE comparison table renderer.

**Tech Stack:** Vanilla JS, no framework, no build step, no test framework. Supabase backend (`plData[jobId]` persists via `plPersistJob`).

## Global Constraints

- Single file: all changes go into `/home/dutchman/cutlist_pro/dev.html`.
- No automated test framework exists in this project. Verification for pure-logic functions uses Node's `vm.runInContext` on function source extracted directly from `dev.html` (per this project's established verification pattern — see project memory `verification.md`). Verification for DOM/render/side-effecting code uses `grep` to confirm wiring, since no browser is available in this environment (Playwright unsupported on this host, no Chrome/Firefox installed).
- Match scoring threshold: `PL_MATCH_THRESHOLD = 0.35`. Tie margin: `PL_MATCH_TIE_MARGIN = 0.1`. These exact values come from the approved spec (`docs/superpowers/specs/2026-07-22-pl-hardware-invoice-matching-design.md`) and must not be changed without re-approval.
- Matching is scoped to the HARDWARE section only (`dev.html`, inside `_renderPLView()`), restricted to invoices sharing the same P&L category as the quoted line. Do not extend to TOPS or CUT & LABEL — out of scope per spec.
- New persisted field: `invoice.matchedQuotedKey` (string, format `"<category>::<label>"`) on entries of `plData[jobId].invoices`. Additive only — no migration, no schema change elsewhere.
- Follow the existing codebase convention for embedding arbitrary strings (item labels, ids) inside `onclick="..."` attributes: `.replace(/'/g,"\\'")` on any string interpolated into a single-quoted JS string literal within the attribute (see `dev.html:6135`, `:7790`, `:8419` for precedent).

---

### Task 1: Pure fuzzy-matching helper functions

**Files:**
- Modify: `dev.html` — insert new code between line 27878 (`}` closing `plImportedDocBlur`... actually the closing brace of the block ending the "Imported docs registry helpers" section) and line 27880 (`// ── Render ──` comment). Exact anchor shown in Step 3 below.

**Interfaces:**
- Produces: `_plNormTokens(str) -> { words: Set<string>, numbers: Set<string> }`, `_plJaccard(setA, setB) -> number`, `_plMatchScore(labelStr, descStr) -> number` (0–1), `_plSuggestMatches(cat, label, invs, excludeIds) -> Array<{inv, score}>` sorted descending by score, restricted to the top-scoring cluster within `PL_MATCH_TIE_MARGIN`. `invs` items are plain objects with at least `{id, category, desc, matchedQuotedKey}`. `excludeIds` is a `Set<string>` of invoice ids to skip. These four are pure — no DOM, no globals beyond the two new constants below.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Confirm the functions don't exist yet**

Run:
```bash
grep -n "_plMatchScore\|_plSuggestMatches\|_plNormTokens\|_plJaccard" /home/dutchman/cutlist_pro/dev.html
```
Expected: no output (functions not yet defined).

- [ ] **Step 2: Write the vm verification script**

Create `/tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-task1.js`:

```js
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');

function extract(name) {
  let start = src.indexOf('function ' + name + '(');
  if (start === -1) start = src.indexOf('const ' + name + ' = ');
  if (start === -1) throw new Error('missing: ' + name);
  const braceStart = src.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

function extractConst(name) {
  const m = src.match(new RegExp('const ' + name + ' = [^;]+;'));
  if (!m) throw new Error('missing const: ' + name);
  return m[0];
}

const code = [
  extractConst('PL_MATCH_THRESHOLD'),
  extractConst('PL_MATCH_TIE_MARGIN'),
  extract('_plNormTokens'),
  extract('_plJaccard'),
  extract('_plMatchScore'),
  extract('_plSuggestMatches'),
].join('\n\n');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);

// Worked example from the spec: quoted "Plinth 150mm x 3m" vs invoiced
// "ALI COVERED PLINTH 150x3m" should score ~0.58 and clear the threshold.
const score1 = ctx._plMatchScore('Plinth 150mm x 3m', 'ALI COVERED PLINTH 150x3m');
console.log('score1 (expect ~0.58):', score1);
if (score1 < 0.55 || score1 > 0.62) throw new Error('score1 out of expected range: ' + score1);

// Unrelated items must score 0 and never surface as a suggestion.
const score2 = ctx._plMatchScore('Handles 128mm', 'Hinges 35mm cabinet');
console.log('score2 (expect 0):', score2);
if (score2 !== 0) throw new Error('score2 should be 0, got ' + score2);

// Suggestion filtering: same category + above threshold + not excluded + not already linked.
const invs = [
  { id: 'a', category: 'Hardware – Other', desc: 'ALI COVERED PLINTH 150x3m' },
  { id: 'b', category: 'Hardware – Other', desc: 'Cabinet hinge 35mm' },
  { id: 'c', category: 'Hardware – Hinges', desc: 'PLINTH 150x3m clip' }, // wrong category
  { id: 'd', category: 'Hardware – Other', desc: 'ALI PLINTH 150x3m', matchedQuotedKey: 'x::y' }, // already linked elsewhere
];
const sug = ctx._plSuggestMatches('Hardware – Other', 'Plinth 150mm x 3m', invs, new Set());
console.log('suggestions:', JSON.stringify(sug.map(s => s.inv.id)));
if (sug.length !== 1 || sug[0].inv.id !== 'a') throw new Error('suggestion mismatch: ' + JSON.stringify(sug));

// excludeIds must remove an otherwise-qualifying candidate.
const sugExcluded = ctx._plSuggestMatches('Hardware – Other', 'Plinth 150mm x 3m', invs, new Set(['a']));
if (sugExcluded.length !== 0) throw new Error('excludeIds not respected: ' + JSON.stringify(sugExcluded));

console.log('ALL PASS');
```

- [ ] **Step 3: Run it, confirm it fails (RED)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-task1.js`
Expected: throws `Error: missing const: PL_MATCH_THRESHOLD` (or similar) — functions don't exist yet.

- [ ] **Step 4: Insert the implementation**

In `dev.html`, find this exact text (currently around line 27877-27880):

```
function plImportedDocBlur(jobId) {
  plPersistJob(jobId);
}

// ── Render ─────────────────────────────────────────────────────────────────────
```

Replace it with:

```
function plImportedDocBlur(jobId) {
  plPersistJob(jobId);
}

// ── P&L hardware line matching: fuzzy suggest for quoted-vs-invoiced labels ──
// Pure functions — no DOM/network access — so they're testable in isolation.
const PL_MATCH_THRESHOLD = 0.35;
const PL_MATCH_TIE_MARGIN = 0.1;

function _plNormTokens(str) {
  const s = (str || '').toLowerCase();
  const words = new Set((s.match(/[a-z0-9]+/g) || []).filter(t => t.length >= 2));
  const numbers = new Set(s.match(/\d+/g) || []);
  return { words, numbers };
}

function _plJaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  a.forEach(x => { if (b.has(x)) inter++; });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function _plMatchScore(labelStr, descStr) {
  const a = _plNormTokens(labelStr);
  const b = _plNormTokens(descStr);
  return 0.5 * _plJaccard(a.words, b.words) + 0.5 * _plJaccard(a.numbers, b.numbers);
}

// Candidates = unclaimed, unlinked invoices in the same category scoring >=
// threshold, restricted to the top-scoring cluster (within PL_MATCH_TIE_MARGIN
// of the best score) so near-ties surface together instead of picking one.
function _plSuggestMatches(cat, label, invs, excludeIds) {
  const candidates = (invs || [])
    .filter(inv => (inv.category || '') === cat)
    .filter(inv => !excludeIds.has(inv.id))
    .filter(inv => !inv.matchedQuotedKey)
    .map(inv => ({ inv, score: _plMatchScore(label, inv.desc || '') }))
    .filter(c => c.score >= PL_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  if (candidates.length === 0) return [];
  const top = candidates[0].score;
  return candidates.filter(c => top - c.score <= PL_MATCH_TIE_MARGIN);
}

// ── Render ─────────────────────────────────────────────────────────────────────
```

- [ ] **Step 5: Run the verification script again, confirm it passes (GREEN)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-task1.js`
Expected: prints `score1 (expect ~0.58): 0.58333...`, `score2 (expect 0): 0`, `suggestions: ["a"]`, `ALL PASS`.

- [ ] **Step 6: Commit**

```bash
git add dev.html
git commit -m "$(cat <<'EOF'
feat: add fuzzy match-scoring helpers for P&L hardware lines

Pure functions only — no wiring yet. Scores a quoted line's label against
an invoice's desc using word + number token Jaccard similarity, so
differently-worded invoice lines (e.g. "ALI COVERED PLINTH 150x3m" vs
quoted "Plinth 150mm x 3m") can still be suggested as a likely match.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Manual link/unlink data actions

**Files:**
- Modify: `dev.html` — insert new code between line 27729 (`}` closing `plImportedDocBlur`) and line 27731 (`// ── Historical price snapshot modal ──` comment).

**Interfaces:**
- Consumes: `plData[jobId]` (global, existing), `plPersistJob(jobId)` (existing, async, persists + local-saves), `renderPLView()` (existing).
- Produces: `plLinkInvoiceToQuotedLine(jobId, invoiceId, key)` — sets `matchedQuotedKey` on the matching invoice, persists, re-renders. `plUnlinkInvoiceMatch(jobId, invoiceId)` — clears it, persists, re-renders. Both no-op silently if `jobId`/`invoiceId` don't resolve to real records (matches the existing `plRemoveImportedDoc` no-op-on-miss convention at `dev.html:27706-27716`).

- [ ] **Step 1: Confirm the functions don't exist yet**

Run:
```bash
grep -n "function plLinkInvoiceToQuotedLine\|function plUnlinkInvoiceMatch" /home/dutchman/cutlist_pro/dev.html
```
Expected: no output.

- [ ] **Step 2: Insert the implementation**

In `dev.html`, find this exact text (currently around line 27727-27731):

```
function plImportedDocBlur(jobId) {
  plPersistJob(jobId);
}

// ── Historical price snapshot modal ───────────────────────────────────────────
```

Replace it with:

```
function plImportedDocBlur(jobId) {
  plPersistJob(jobId);
}

// ── Manual quoted-line ↔ invoice-line matching (P&L HARDWARE section) ────────
// key format: "<category>::<label>" — see _findActualForLine / _plSuggestMatches.
function plLinkInvoiceToQuotedLine(jobId, invoiceId, key) {
  const pd = plData[jobId];
  if (!pd) return;
  const inv = (pd.invoices || []).find(i => i.id === invoiceId);
  if (!inv) return;
  inv.matchedQuotedKey = key;
  plPersistJob(jobId);
  const view = document.getElementById('pl-view');
  if (view) { view._selectedJobId = jobId; renderPLView(); }
}

function plUnlinkInvoiceMatch(jobId, invoiceId) {
  const pd = plData[jobId];
  if (!pd) return;
  const inv = (pd.invoices || []).find(i => i.id === invoiceId);
  if (!inv) return;
  delete inv.matchedQuotedKey;
  plPersistJob(jobId);
  const view = document.getElementById('pl-view');
  if (view) { view._selectedJobId = jobId; renderPLView(); }
}

// ── Historical price snapshot modal ───────────────────────────────────────────
```

- [ ] **Step 3: Confirm the functions exist and follow the established re-render pattern**

Run:
```bash
grep -n "function plLinkInvoiceToQuotedLine\|function plUnlinkInvoiceMatch" /home/dutchman/cutlist_pro/dev.html
grep -A10 "function plLinkInvoiceToQuotedLine" /home/dutchman/cutlist_pro/dev.html | grep -c "view._selectedJobId = jobId; renderPLView();"
```
Expected: both function names found; the second command prints `1` (confirms the re-render call is present — mirrors `plRemoveImportedDoc` at `dev.html:27706-27716`).

- [ ] **Step 4: Commit**

```bash
git add dev.html
git commit -m "$(cat <<'EOF'
feat: add manual link/unlink actions for P&L hardware line matching

plLinkInvoiceToQuotedLine / plUnlinkInvoiceMatch let a user confirm or
undo a suggested match between a quoted hardware line and an invoice
line, storing the link as matchedQuotedKey on the invoice record.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Resolution-order rewrite of `_findActualForLine`

**Files:**
- Modify: `dev.html` (currently lines 28456-28463, inside the HARDWARE comparison IIFE within `_renderPLView()`). Note: exact line numbers will have shifted down by however many lines Tasks 1 and 2 added — locate by the code content below, not the line number.

**Interfaces:**
- Consumes: `_invInclVAT(inv)` (existing, `dev.html:27233-27237`), `invs` (closure variable, array of invoice objects for the selected job).
- Produces: `_findActualForLine(cat, label) -> { amount: number, invoiceIds: string[], isManual: boolean } | null`. **Breaking change from current signature** (which returned `number | null`) — Task 4 updates the one call site.

- [ ] **Step 1: Write the vm verification script**

Create `/tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-task3.js`:

```js
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('/home/dutchman/cutlist_pro/dev.html', 'utf8');

function extract(name) {
  let start = src.indexOf('function ' + name + '(');
  if (start === -1) start = src.indexOf('const ' + name + ' = ');
  if (start === -1) throw new Error('missing: ' + name);
  const braceStart = src.indexOf('{', start);
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

const invInclVAT = extract('_invInclVAT');
const findLine = extract('_findActualForLine');

const ctx = { invs: [] };
vm.createContext(ctx);
vm.runInContext(invInclVAT + '\n\n' + 'const invs = ' + JSON.stringify([]) + ';\n' + findLine, ctx);
// _findActualForLine closes over `invs` — rebuild context per test case instead
// of reusing one `invs` binding, since `const` can't be reassigned.

function run(invsData, cat, label) {
  const localCtx = {};
  vm.createContext(localCtx);
  vm.runInContext(
    invInclVAT + '\n\nconst invs = ' + JSON.stringify(invsData) + ';\n\n' + findLine,
    localCtx
  );
  return localCtx._findActualForLine(cat, label);
}

// No match at all.
const r1 = run([{ id: 'a', category: 'Hardware – Other', desc: 'Something else', amount: 100, vatIncluded: true }], 'Hardware – Other', 'Plinth 150mm x 3m');
console.log('r1 (expect null):', r1);
if (r1 !== null) throw new Error('expected null, got ' + JSON.stringify(r1));

// Exact match (existing behavior preserved).
const r2 = run([{ id: 'a', category: 'Hardware – Other', desc: 'Plinth 150mm x 3m', amount: 115, vatIncluded: true }], 'Hardware – Other', 'Plinth 150mm x 3m');
console.log('r2 (expect amount=100, isManual=false):', r2);
if (!r2 || Math.abs(r2.amount - 100) > 0.01 || r2.isManual !== false || r2.invoiceIds.join() !== 'a') throw new Error('exact-match case failed: ' + JSON.stringify(r2));

// Manual match takes priority over exact match when both exist.
const r3 = run(
  [
    { id: 'a', category: 'Hardware – Other', desc: 'Plinth 150mm x 3m', amount: 115, vatIncluded: true }, // exact-name match
    { id: 'b', category: 'Hardware – Other', desc: 'ALI COVERED PLINTH 150x3m', amount: 230, vatIncluded: true, matchedQuotedKey: 'Hardware – Other::Plinth 150mm x 3m' }, // manual link
  ],
  'Hardware – Other', 'Plinth 150mm x 3m'
);
console.log('r3 (expect amount=200, isManual=true, invoiceIds=[b]):', r3);
if (!r3 || Math.abs(r3.amount - 200) > 0.01 || r3.isManual !== true || r3.invoiceIds.join() !== 'b') throw new Error('manual-priority case failed: ' + JSON.stringify(r3));

console.log('ALL PASS');
```

- [ ] **Step 2: Run it, confirm it fails (RED)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-task3.js`
Expected: `r1` prints `null` (passes, since the current implementation already returns null for no-match) but the script throws on `r2` or `r3` — `r2` fails because current `_findActualForLine` returns a bare number (`100`), not `{amount, invoiceIds, isManual}`, so `r2.amount` is `undefined`. This confirms the old implementation is in place.

- [ ] **Step 3: Replace the implementation**

In `dev.html`, find this exact text:

```
      const _findActualForLine = (cat, label) => {
        const matches = invs.filter(inv =>
          (inv.category || '') === cat &&
          (inv.desc || '').trim().toLowerCase() === (label || '').trim().toLowerCase()
        );
        if (matches.length === 0) return null;
        return matches.reduce((s, inv) => s + _invInclVAT(inv), 0) / 1.15;
      };
```

Replace it with:

```
      // Resolution order: (1) explicit manual link (matchedQuotedKey) always
      // wins if present — the user confirmed it, so it overrides wording-based
      // matching even if an exact-string match also exists. (2) exact
      // case-insensitive label==desc match (original behavior, zero-friction
      // for well-named items). (3) no match — caller computes suggestions.
      const _findActualForLine = (cat, label) => {
        const key = `${cat}::${label}`;
        const manual = invs.filter(inv => inv.matchedQuotedKey === key);
        if (manual.length > 0) {
          return {
            amount: manual.reduce((s, inv) => s + _invInclVAT(inv), 0) / 1.15,
            invoiceIds: manual.map(inv => inv.id),
            isManual: true,
          };
        }
        const exact = invs.filter(inv =>
          (inv.category || '') === cat &&
          (inv.desc || '').trim().toLowerCase() === (label || '').trim().toLowerCase()
        );
        if (exact.length === 0) return null;
        return {
          amount: exact.reduce((s, inv) => s + _invInclVAT(inv), 0) / 1.15,
          invoiceIds: exact.map(inv => inv.id),
          isManual: false,
        };
      };
```

- [ ] **Step 4: Run the verification script again, confirm it passes (GREEN)**

Run: `node /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/test-task3.js`
Expected: prints `r1 (expect null): null`, `r2 (expect amount=100, isManual=false): { amount: 100, invoiceIds: [ 'a' ], isManual: false }`, `r3 (expect amount=200, isManual=true, invoiceIds=[b]): { amount: 200, invoiceIds: [ 'b' ], isManual: true }`, `ALL PASS`.

- [ ] **Step 5: Confirm the only call site still compiles (will be fixed properly in Task 4)**

Run:
```bash
grep -n "_findActualForLine(" /home/dutchman/cutlist_pro/dev.html
```
Expected: two lines — the `const _findActualForLine = (cat, label) => {` definition, and the one call site inside `detailRows` (currently `const lineAct = _findActualForLine(k, d.label);`). Note this call site now receives an object instead of a number — Task 4 fixes it. This is expected to be visually broken in the app between Task 3 and Task 4; that's fine since both land in the same PR/session before anyone uses the app.

- [ ] **Step 6: Commit**

```bash
git add dev.html
git commit -m "$(cat <<'EOF'
refactor: _findActualForLine checks manual links before exact match

Resolution order is now: explicit manual link (matchedQuotedKey) first,
then the existing exact-string match, then no match. Return shape changed
from a bare number to {amount, invoiceIds, isManual} so the renderer
(next commit) can show which invoices contributed and offer unlink.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Wire suggestions + unlink into the HARDWARE table renderer

**Files:**
- Modify: `dev.html` — inside the HARDWARE comparison IIFE in `_renderPLView()`. Two edits: (a) insert a claimed-invoice-ids precompute pass plus a new `_plRenderSuggestionRow` local helper right after the `_findActualForLine` definition from Task 3; (b) rewrite the `detailRows` map to consume `_lineMatches`, add the unlink control, and append suggestion rows.

**Interfaces:**
- Consumes: `_findActualForLine` (Task 3 shape), `_plSuggestMatches` (Task 1), `plLinkInvoiceToQuotedLine` / `plUnlinkInvoiceMatch` (Task 2), `R`, `_invInclVAT`, `invs`, `selJobId`, `hwExtrasByCat`, `_hwExpTip`, `profitColor`, `varTip`, `pctTip` (all existing closure variables/functions in `_renderPLView()`).
- Produces: no new externally-visible interface — this is the render wiring, the final integration point.

- [ ] **Step 1: Confirm current call site (pre-edit baseline)**

Run:
```bash
grep -n "const lineAct = _findActualForLine" /home/dutchman/cutlist_pro/dev.html
```
Expected: one match, e.g. `            const lineAct = _findActualForLine(k, d.label);` — confirms the Task 3 signature change hasn't been consumed yet.

- [ ] **Step 2: Insert the claimed-set precompute + suggestion-row helper**

In `dev.html`, find this exact text (the end of the `_findActualForLine` block from Task 3, followed by the existing `_hwExpTip` const):

```
      const _hwExpTip = escTitle(
        `Raw supplier cost (excl VAT). Excludes the ${Math.round(HW_HANDLING*100)}% handling markup ` +
        `applied on the Quote tab, because that markup is not part of the supplier's invoice cost.`
      );
```

Replace it with:

```
      const _hwExpTip = escTitle(
        `Raw supplier cost (excl VAT). Excludes the ${Math.round(HW_HANDLING*100)}% handling markup ` +
        `applied on the Quote tab, because that markup is not part of the supplier's invoice cost.`
      );

      // Pre-pass: resolve every quoted hardware detail line's actual cost across
      // ALL categories (not just the visible `rows`) before rendering, so
      // invoices already matched (manually or exactly) are excluded from
      // suggestions offered to OTHER lines. Keyed by object identity since
      // hardwareExtrasDetail entries are freshly rebuilt each render.
      const _allDetailItems = Object.values(hwExtrasByCat).flat();
      const _lineMatches = new Map();
      const _claimedInvoiceIds = new Set();
      _allDetailItems.forEach(d => {
        const result = _findActualForLine(d.category, d.label);
        _lineMatches.set(d, result);
        if (result) result.invoiceIds.forEach(id => _claimedInvoiceIds.add(id));
      });

      // Renders the "possible match" row shown under an unmatched quoted line.
      // Single candidate -> inline chip + Link button. 2+ tied candidates ->
      // dropdown + Link button. No candidates -> ''.
      const _plRenderSuggestionRow = (cat, label) => {
        const candidates = _plSuggestMatches(cat, label, invs, _claimedInvoiceIds);
        if (candidates.length === 0) return '';
        const key = `${cat}::${label}`;
        const safeJobId = (selJobId || '').replace(/'/g, "\\'");
        const safeKey   = key.replace(/'/g, "\\'");
        if (candidates.length === 1) {
          const c = candidates[0];
          const amt = _invInclVAT(c.inv) / 1.15;
          return `<tr style="background:rgba(255,190,90,0.06)">
            <td colspan="9" style="padding:5px 12px 5px 40px;color:var(--amber-dim);font-size:11px;font-style:italic">
              ↳ possible match: "${c.inv.desc || ''}" — ${R(amt)}
              <button onclick="plLinkInvoiceToQuotedLine('${safeJobId}', '${c.inv.id}', '${safeKey}')" style="margin-left:8px;background:none;border:1px solid var(--amber-dim);color:var(--amber-dim);font-size:10px;padding:1px 8px;cursor:pointer;border-radius:3px">Link</button>
            </td>
          </tr>`;
        }
        const selectId = `pl-match-sel-${(selJobId||'').replace(/[^a-zA-Z0-9]/g,'')}-${cat.replace(/[^a-zA-Z0-9]/g,'')}-${label.replace(/[^a-zA-Z0-9]/g,'')}`;
        const options = candidates.map(c => {
          const amt = _invInclVAT(c.inv) / 1.15;
          return `<option value="${c.inv.id}">${(c.inv.desc||'').replace(/"/g,'&quot;')} — ${R(amt)}</option>`;
        }).join('');
        return `<tr style="background:rgba(255,190,90,0.06)">
          <td colspan="9" style="padding:5px 12px 5px 40px;color:var(--amber-dim);font-size:11px;font-style:italic">
            ↳ possible match:
            <select id="${selectId}" style="font-size:11px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:3px;padding:1px 4px">${options}</select>
            <button onclick="plLinkInvoiceToQuotedLine('${safeJobId}', document.getElementById('${selectId}').value, '${safeKey}')" style="margin-left:8px;background:none;border:1px solid var(--amber-dim);color:var(--amber-dim);font-size:10px;padding:1px 8px;cursor:pointer;border-radius:3px">Link</button>
          </td>
        </tr>`;
      };
```

- [ ] **Step 3: Rewrite the `detailRows` map to consume `_lineMatches` and append suggestion/unlink UI**

In `dev.html`, find this exact text:

```
            const detailRows = (hwExtrasByCat[k] || []).map(d => {
              const lineExp = d.rawTotal || 0;
              const lineAct = _findActualForLine(k, d.label);
              const lineHasA = lineAct !== null && lineAct > 0;
              const lineVar  = lineHasA ? (lineExp - lineAct) : null;
              const linePct  = (lineHasA && lineExp > 0) ? (lineVar / lineExp * 100) : null;
              return `<tr style="border-bottom:1px solid var(--border-inner,rgba(255,255,255,0.03));background:rgba(255,255,255,0.015)">
                <td style="padding:6px 12px 6px 28px;color:var(--text-muted);font-size:11px;font-style:italic">↳ ${d.label}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--text-muted);font-size:11px">${d.qty || '—'}</td>
                <td style="padding:6px 10px;text-align:right;color:var(--text-muted)"><span style="font-size:10px">—</span></td>
                <td style="padding:6px 10px;text-align:right;color:var(--text-muted)"><span style="font-size:10px">—</span></td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--text-muted);font-size:11px">${d.unitPrice > 0 ? R(d.unitPrice) : '—'}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:#6aaad4;font-size:11px" title="${_hwExpTip}">${R(lineExp)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${lineHasA?'var(--text)':'var(--text-muted)'};font-size:11px">${lineHasA ? R(lineAct) : '<span style="font-size:10px">—</span>'}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px">${lineHasA?`<span style="color:${profitColor(lineVar)}" title="${varTip(lineVar)}">${profitArrow(lineVar)} ${R(Math.abs(lineVar))}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px">${linePct!==null?`<span style="color:${profitColor(linePct)}" title="${pctTip(linePct,lineVar)}">${linePct>=0?'+':''}${linePct.toFixed(1)}%</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
              </tr>`;
            }).join('');
```

Replace it with:

```
            const detailRows = (hwExtrasByCat[k] || []).map(d => {
              const lineExp = d.rawTotal || 0;
              const match    = _lineMatches.get(d);
              const lineAct  = match ? match.amount : null;
              const lineHasA = lineAct !== null && lineAct > 0;
              const lineVar  = lineHasA ? (lineExp - lineAct) : null;
              const linePct  = (lineHasA && lineExp > 0) ? (lineVar / lineExp * 100) : null;
              const unlinkBtns = (match && match.isManual)
                ? match.invoiceIds.map(id => ` <button onclick="plUnlinkInvoiceMatch('${(selJobId||'').replace(/'/g,"\\'")}', '${id}')" title="Unlink manual match" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:10px;padding:0 0 0 4px">✕</button>`).join('')
                : '';
              const mainRow = `<tr style="border-bottom:1px solid var(--border-inner,rgba(255,255,255,0.03));background:rgba(255,255,255,0.015)">
                <td style="padding:6px 12px 6px 28px;color:var(--text-muted);font-size:11px;font-style:italic">↳ ${d.label}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--text-muted);font-size:11px">${d.qty || '—'}</td>
                <td style="padding:6px 10px;text-align:right;color:var(--text-muted)"><span style="font-size:10px">—</span></td>
                <td style="padding:6px 10px;text-align:right;color:var(--text-muted)"><span style="font-size:10px">—</span></td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:var(--text-muted);font-size:11px">${d.unitPrice > 0 ? R(d.unitPrice) : '—'}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:#6aaad4;font-size:11px" title="${_hwExpTip}">${R(lineExp)}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${lineHasA?'var(--text)':'var(--text-muted)'};font-size:11px">${lineHasA ? R(lineAct) + unlinkBtns : '<span style="font-size:10px">—</span>'}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px">${lineHasA?`<span style="color:${profitColor(lineVar)}" title="${varTip(lineVar)}">${profitArrow(lineVar)} ${R(Math.abs(lineVar))}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px">${linePct!==null?`<span style="color:${profitColor(linePct)}" title="${pctTip(linePct,lineVar)}">${linePct>=0?'+':''}${linePct.toFixed(1)}%</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
              </tr>`;
              const suggestionRow = match ? '' : _plRenderSuggestionRow(d.category, d.label);
              return mainRow + suggestionRow;
            }).join('');
```

- [ ] **Step 4: Confirm wiring is complete**

Run:
```bash
grep -n "_lineMatches.get(d)\|_plRenderSuggestionRow(d.category, d.label)\|plLinkInvoiceToQuotedLine(\|plUnlinkInvoiceMatch(" /home/dutchman/cutlist_pro/dev.html
```
Expected: matches for `_lineMatches.get(d)` and `_plRenderSuggestionRow(d.category, d.label)` (the call site), plus `plLinkInvoiceToQuotedLine(` and `plUnlinkInvoiceMatch(` each appearing at least twice (their `function` definitions from Task 2, plus the `onclick="..."` usages added here).

- [ ] **Step 5: Confirm no stale call sites remain from before the Task 3 signature change**

Run:
```bash
grep -n "_findActualForLine(k, d.label)" /home/dutchman/cutlist_pro/dev.html
```
Expected: no output — the old bare-number call site from before Step 3 no longer exists (it's now accessed via `_lineMatches.get(d)`, precomputed in Step 2).

- [ ] **Step 6: Manual browser verification (cannot be automated in this environment — no Chrome/Firefox/Playwright available here per project verification notes)**

Serve the app locally: `python3 -m http.server 7823 --directory /home/dutchman/cutlist_pro`, open `http://localhost:7823/dev.html` in a real browser, then:
1. Open a job with a quoted custom-hardware line whose name won't literally match an invoice (e.g. "Plinth 150mm x 3m").
2. Import an invoice (JPG or PDF) with a differently-worded line for the same item in the same P&L category (e.g. "ALI COVERED PLINTH 150x3m").
3. On the P&L tab, HARDWARE section: confirm the quoted line shows "—" for ACT and a suggestion row appears below it with the invoice desc, amount, and a Link button.
4. Click Link — confirm ACT populates, Δ COST and ±% recompute, and the category TOTAL row is unchanged (it already counted the invoice amount before linking).
5. Click the ✕ unlink control — confirm it reverts to "—" and the suggestion row reappears.
6. Import a second invoice line in the same category with a similarly-scoring desc to create a tie — confirm the dropdown variant renders and linking the non-default option works.
7. Confirm an invoice already exact-matched (identical desc/label) to one quoted line never appears as a suggestion for a different quoted line in the same category.

This step has no pass/fail command to run in this environment — record the outcome directly with the user.

- [ ] **Step 7: Commit**

```bash
git add dev.html
git commit -m "$(cat <<'EOF'
feat: suggest + confirm invoice matches for P&L hardware lines

Unmatched quoted hardware lines now show a fuzzy-suggested invoice match
(single chip, or a dropdown when candidates tie) with a one-click Link
action, plus an unlink control on confirmed manual matches. Closes the
gap where differently-worded invoices (e.g. "ALI COVERED PLINTH 150x3m"
vs quoted "Plinth 150mm x 3m") silently showed no actual cost.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```
