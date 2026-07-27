# Critique Follow-up: Modal A11y, Delete-Confirm, P&L Discoverability, Icon Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the P1/P2 issues from the 2026-07-26 impeccable critique of `dev.html` (score 27/40): inconsistent modal accessibility across 13 modals, a non-blocking toast used for irreversible-delete confirmation, a newly-added P&L match feature with no discoverability signal, and a split icon vocabulary (emoji vs. monochrome glyph) in the tab bar — including one real bug (the ✦ glyph is reused for two different tabs).

**Architecture:** All changes live in the single `dev.html` file (no build step, no framework). One new shared pair of a11y-wiring helper functions gets built once and reused everywhere a modal needs `role="dialog"`, a focus trap, Escape-to-close, and trigger-focus-restore — including inside a rewritten `confirmAction()`, which changes from a dismissable toast to a real blocking modal while keeping its exact external `(message, opts) → Promise<boolean>` contract so none of its 25 call sites need to change.

**Tech Stack:** Vanilla JS, no framework, no build step, no test framework. Supabase backend (unaffected by this plan — no persisted-data changes).

## Global Constraints

- Single file: all changes go into `/home/dutchman/cutlist_pro/dev.html`.
- No automated test framework exists in this project, and no browser is available in this environment (no Chrome/Firefox, Playwright unsupported on this host — documented, permanent constraint). Verification uses `grep` for structural/wiring checks and a full-file `node --check` syntax pass after each task, per this project's established pattern this session.
- Reuse the existing `_usersModalTrapFocus(modal)` helper (`dev.html:15458-15476`) for the Tab-trap mechanism — do not write a second trap implementation. Despite its name, it is already generic (operates on whatever `modal` element is passed in).
- `confirmAction(message, opts)` must keep its exact current signature and `Promise<boolean>` return contract. All 25 existing call sites pass only `message` and (optionally) `opts.confirmLabel`/`opts.cancelLabel` — none override `opts.type` or `opts.duration`, so those two fields may go unused internally without any call site needing to change.
- Do not modify `showToast()` itself. `confirmAction()` is being changed to stop calling it, but `showToast`'s own `actions` handling stays untouched — removing it would be an unrelated, out-of-scope cleanup (nothing else currently depends on it either way, but touching working code outside this plan's scope is unnecessary risk).
- The DESIGN.md "never pure white text" rule does not apply to solid-fill button label text (DESIGN.md's own Buttons section documents "solid danger red with white text" as the one intentional solid-red state) — the confirm-modal's destructive button follows that existing convention, it is not a new violation.
- Icon replacements (Task 6) must not collide with any emoji/glyph already in use elsewhere in the tab bar / more-menu / header (checked against the full current inventory in Task 6's brief).

---

### Task 1: Shared modal a11y helper functions

**Files:**
- Modify: `dev.html` — insert new code immediately after `_usersModalTrapFocus` (ends at line 15476, immediately before `function openUsersModal() {` at line 15478).

**Interfaces:**
- Consumes: `_usersModalTrapFocus(modal)` (existing, `dev.html:15458-15476`, returns a keydown handler function).
- Produces: `_openModalA11y(modal, state, closeFn)` — call once when a modal opens. `state` is a plain object the caller owns (module-level `{}` for static/reused modals, a local `{}` closure var for dynamically created-and-destroyed modals); the SAME object must be passed to `_closeModalA11y` on teardown. Captures `document.activeElement` into `state.trigger`, moves focus to the first focusable element inside `modal` (preferring one inside a `[role="dialog"]`/`[role="alertdialog"]` shell if present), wires the Tab-trap, and wires Escape to call `closeFn`. `_closeModalA11y(modal, state)` — call once when a modal closes (before or after removing/hiding it). Removes the trap and Escape listeners and restores focus to `state.trigger`. Both are used by Tasks 2-4.

- [ ] **Step 1: Confirm the functions don't exist yet**

Run:
```bash
grep -n "function _openModalA11y\|function _closeModalA11y" /home/dutchman/cutlist_pro/dev.html
```
Expected: no output.

- [ ] **Step 2: Insert the implementation**

In `dev.html`, find this exact text (currently lines 15473-15478):

```
  modal.addEventListener('keydown', handler);
  return handler;
}

function openUsersModal() {
```

Replace it with:

```
  modal.addEventListener('keydown', handler);
  return handler;
}

// ── Shared modal a11y wiring (focus trap + Escape + trigger capture/restore) ──
// Works for both static modals (a pre-existing DOM node toggled via
// display:none <-> display:flex) and dynamic modals (created and destroyed
// via document.createElement/.remove()). The caller owns `state` — a plain
// object, module-level for a reused static modal or a local closure var for
// a dynamic one — and must pass the SAME object to _closeModalA11y so the
// right listeners get removed.
function _openModalA11y(modal, state, closeFn) {
  state.trigger = document.activeElement;
  requestAnimationFrame(() => {
    const shell = modal.querySelector('[role="dialog"], [role="alertdialog"]');
    const target = (shell || modal).querySelector(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (target) target.focus();
  });
  if (state.trapHandler) modal.removeEventListener('keydown', state.trapHandler);
  state.trapHandler = _usersModalTrapFocus(modal);
  if (state.escHandler) document.removeEventListener('keydown', state.escHandler);
  state.escHandler = function(ev) { if (ev.key === 'Escape') closeFn(); };
  document.addEventListener('keydown', state.escHandler);
}

function _closeModalA11y(modal, state) {
  if (state.trapHandler) {
    modal.removeEventListener('keydown', state.trapHandler);
    state.trapHandler = null;
  }
  if (state.escHandler) {
    document.removeEventListener('keydown', state.escHandler);
    state.escHandler = null;
  }
  if (state.trigger) {
    try { state.trigger.focus(); } catch(_) {}
    state.trigger = null;
  }
}

function openUsersModal() {
```

- [ ] **Step 3: Confirm both functions exist**

Run:
```bash
grep -n "function _openModalA11y\|function _closeModalA11y" /home/dutchman/cutlist_pro/dev.html
```
Expected: both function names found, each exactly once.

- [ ] **Step 4: Full-file syntax check**

```bash
TMPJS=/tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/dev-check-t1.js
grep -n "^<script" /home/dutchman/cutlist_pro/dev.html
```
Note the line numbers of the two `<script>` (no `src=`) blocks and their matching `</script>` lines (there are two inline blocks; the rest are external `<script src=...>` tags on their own single lines and can be ignored). Extract each inline block and check it:
```bash
sed -n '<first_script_open_line+1>,<first_script_close_line-1>p' /home/dutchman/cutlist_pro/dev.html > "$TMPJS" && node --check "$TMPJS" && echo "BLOCK1 OK"
sed -n '<second_script_open_line+1>,<second_script_close_line-1>p' /home/dutchman/cutlist_pro/dev.html > /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/dev-check-t1b.js && node --check /tmp/claude-1000/-home-dutchman-cutlist-pro/9fe7d739-b91b-48da-b444-18524869e61c/scratchpad/dev-check-t1b.js && echo "BLOCK2 OK"
```
Expected: `BLOCK1 OK` and `BLOCK2 OK`.

- [ ] **Step 5: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
feat: add shared modal a11y helper (focus trap + Escape + trigger restore)

_openModalA11y/_closeModalA11y wrap the existing _usersModalTrapFocus
helper with Escape-to-close and trigger-capture/restore, so every modal
in the app can get the same dialog semantics with two function calls
instead of hand-rolling the pattern per modal. No call sites yet — this
commit only adds the helpers.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Retrofit the 6 static modals with dialog semantics

**Files:**
- Modify: `dev.html` — 6 modals: `feedback-modal` (~4863), `plan-import-modal` (~4924), `bulk-adjust-modal` (~4937), `import-prices-modal` (~4979), `board-cleanup-modal` (~5059), `qm-modal`/`qm-overlay` (~4808). Each gets: `role="dialog" aria-modal="true" aria-label="..."` on its inner content div, a call to `_openModalA11y` at the end of its open function, and a call to `_closeModalA11y` at the start of its close function. `qm-overlay` additionally needs a click-outside handler (missing today, unlike the other 5).

**Interfaces:**
- Consumes: `_openModalA11y(modal, state, closeFn)` / `_closeModalA11y(modal, state)` (Task 1).

- [ ] **Step 1: feedback-modal**

Find this exact text (currently line 4864):
```
    <div style="background:var(--bg2);border:1px solid var(--border);width:500px;max-width:95vw;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```
This line appears identically for `feedback-modal`. To target only this one, match on the surrounding context — find:
```
  <div id="feedback-modal" onclick="if(event.target===this)closeFeedbackModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9200;align-items:center;justify-content:center">
    <div style="background:var(--bg2);border:1px solid var(--border);width:500px;max-width:95vw;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```
Replace with:
```
  <div id="feedback-modal" onclick="if(event.target===this)closeFeedbackModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9200;align-items:center;justify-content:center">
    <div role="dialog" aria-modal="true" aria-label="Feedback" style="background:var(--bg2);border:1px solid var(--border);width:500px;max-width:95vw;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```

Find this exact text (currently `dev.html:15628-15631`):
```
function openFeedbackModal() {
  if (canManageUsers()) { openUsersModal(); showUsersTab('feedback'); return; }
  const modal = document.getElementById('feedback-modal');
  modal.style.display = 'flex';
```
Replace with:
```
const _feedbackModalA11y = {};
function openFeedbackModal() {
  if (canManageUsers()) { openUsersModal(); showUsersTab('feedback'); return; }
  const modal = document.getElementById('feedback-modal');
  modal.style.display = 'flex';
  _openModalA11y(modal, _feedbackModalA11y, closeFeedbackModal);
```
(This adds the a11y wiring right after the existing lines shown; the rest of `openFeedbackModal`'s body — resetting fields, the `setTimeout` that focuses `fb-message` — is unchanged below it and still runs after, refining the generic first-focusable-element focus with the more specific one 100ms later.)

Find this exact text (currently `dev.html:15684-15686`):
```
function closeFeedbackModal() {
  document.getElementById('feedback-modal').style.display = 'none';
}
```
Replace with:
```
function closeFeedbackModal() {
  const modal = document.getElementById('feedback-modal');
  _closeModalA11y(modal, _feedbackModalA11y);
  modal.style.display = 'none';
}
```

- [ ] **Step 2: plan-import-modal**

Find:
```
  <div id="plan-import-modal" onclick="if(event.target===this)closePlanImportModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9200;align-items:center;justify-content:center">
    <div style="background:var(--bg2);border:1px solid var(--border);width:680px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```
Replace with:
```
  <div id="plan-import-modal" onclick="if(event.target===this)closePlanImportModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9200;align-items:center;justify-content:center">
    <div role="dialog" aria-modal="true" aria-label="Import Floor Plan" style="background:var(--bg2);border:1px solid var(--border);width:680px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```

Find (currently `dev.html:30250-30257`):
```
function openPlanImportModal() {
  _planImportRooms = [];
  _planImportLastFile = null;
  const modal = document.getElementById('plan-import-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderPlanImportState('upload');
}

function closePlanImportModal() {
  const modal = document.getElementById('plan-import-modal');
  if (modal) modal.style.display = 'none';
```
Replace with:
```
const _planImportModalA11y = {};
function openPlanImportModal() {
  _planImportRooms = [];
  _planImportLastFile = null;
  const modal = document.getElementById('plan-import-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  _openModalA11y(modal, _planImportModalA11y, closePlanImportModal);
  renderPlanImportState('upload');
}

function closePlanImportModal() {
  const modal = document.getElementById('plan-import-modal');
  if (modal) { _closeModalA11y(modal, _planImportModalA11y); modal.style.display = 'none'; }
```
(Leave the rest of `closePlanImportModal`'s body — whatever follows this line — unchanged.)

- [ ] **Step 3: bulk-adjust-modal**

Find:
```
  <div id="bulk-adjust-modal" onclick="if(event.target===this)closeBulkAdjustModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9050;align-items:center;justify-content:center">
    <div style="background:var(--bg2);border:1px solid var(--border);width:600px;max-width:95vw;max-height:88vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```
Replace with:
```
  <div id="bulk-adjust-modal" onclick="if(event.target===this)closeBulkAdjustModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9050;align-items:center;justify-content:center">
    <div role="dialog" aria-modal="true" aria-label="Bulk Price Adjustment" style="background:var(--bg2);border:1px solid var(--border);width:600px;max-width:95vw;max-height:88vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```

Find (currently `dev.html:18551-18560`, note the `await` a few lines down — the a11y call must go right after `style.display = 'flex'`, before the `try`):
```
async function openBulkAdjustModal() {
  _bulkAdjCats = { boards: true, edges: true, services: true };
  document.getElementById('bulk-adjust-pct').value = '0';
  document.getElementById('bulk-adjust-error').style.display = 'none';
  updateBulkToggleStyles();
  // Show modal immediately with current snapshot so the user gets feedback,
  // then refresh from Supabase so the list reflects the supplier's live
  // price rows (boards/edges deleted or renamed in the DB are filtered out).
  updateBulkAdjustPreview();
  document.getElementById('bulk-adjust-modal').style.display = 'flex';
  try {
```
Replace with:
```
const _bulkAdjustModalA11y = {};
async function openBulkAdjustModal() {
  _bulkAdjCats = { boards: true, edges: true, services: true };
  document.getElementById('bulk-adjust-pct').value = '0';
  document.getElementById('bulk-adjust-error').style.display = 'none';
  updateBulkToggleStyles();
  // Show modal immediately with current snapshot so the user gets feedback,
  // then refresh from Supabase so the list reflects the supplier's live
  // price rows (boards/edges deleted or renamed in the DB are filtered out).
  updateBulkAdjustPreview();
  const _bulkModal = document.getElementById('bulk-adjust-modal');
  _bulkModal.style.display = 'flex';
  _openModalA11y(_bulkModal, _bulkAdjustModalA11y, closeBulkAdjustModal);
  try {
```

Find (currently `dev.html:18571-18573`):
```
function closeBulkAdjustModal() {
  document.getElementById('bulk-adjust-modal').style.display = 'none';
}
```
Replace with:
```
function closeBulkAdjustModal() {
  const modal = document.getElementById('bulk-adjust-modal');
  _closeModalA11y(modal, _bulkAdjustModalA11y);
  modal.style.display = 'none';
}
```

- [ ] **Step 4: import-prices-modal**

Find:
```
  <div id="import-prices-modal" onclick="if(event.target===this)closeImportPricesModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9050;align-items:center;justify-content:center">
    <div style="background:var(--bg2);border:1px solid var(--border);width:720px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```
Replace with:
```
  <div id="import-prices-modal" onclick="if(event.target===this)closeImportPricesModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9050;align-items:center;justify-content:center">
    <div role="dialog" aria-modal="true" aria-label="Import Price List" style="background:var(--bg2);border:1px solid var(--border);width:720px;max-width:95vw;max-height:90vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```

Find (currently `dev.html:18753-18773`):
```
function openImportPricesModal() {
  if (!canEditPrices()) return;
  _importParsedRows = [];
  document.getElementById('import-file-name').textContent = '';
  document.getElementById('import-error').style.display = 'none';
  document.getElementById('import-summary').style.display = 'none';
  document.getElementById('import-preview-wrap').style.display = 'none';
  document.getElementById('import-preview').innerHTML = '';
  const btn = document.getElementById('import-prices-confirm-btn');
  btn.disabled = true;
  btn.style.opacity = '0.4';
  btn.style.cursor = 'not-allowed';
  btn.textContent = 'IMPORT';
  const inp = document.getElementById('import-file-input');
  if (inp) inp.value = '';
  document.getElementById('import-prices-modal').style.display = 'flex';
}

function closeImportPricesModal() {
  document.getElementById('import-prices-modal').style.display = 'none';
}
```
Replace with:
```
const _importPricesModalA11y = {};
function openImportPricesModal() {
  if (!canEditPrices()) return;
  _importParsedRows = [];
  document.getElementById('import-file-name').textContent = '';
  document.getElementById('import-error').style.display = 'none';
  document.getElementById('import-summary').style.display = 'none';
  document.getElementById('import-preview-wrap').style.display = 'none';
  document.getElementById('import-preview').innerHTML = '';
  const btn = document.getElementById('import-prices-confirm-btn');
  btn.disabled = true;
  btn.style.opacity = '0.4';
  btn.style.cursor = 'not-allowed';
  btn.textContent = 'IMPORT';
  const inp = document.getElementById('import-file-input');
  if (inp) inp.value = '';
  const modal = document.getElementById('import-prices-modal');
  modal.style.display = 'flex';
  _openModalA11y(modal, _importPricesModalA11y, closeImportPricesModal);
}

function closeImportPricesModal() {
  const modal = document.getElementById('import-prices-modal');
  _closeModalA11y(modal, _importPricesModalA11y);
  modal.style.display = 'none';
}
```

- [ ] **Step 5: board-cleanup-modal**

Find:
```
    <div id="board-cleanup-modal" onclick="if(event.target===this)closeBoardCleanupModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9100;align-items:center;justify-content:center">
    <div style="background:var(--bg2);border:1px solid var(--border);width:520px;max-width:95vw;max-height:82vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```
Replace with:
```
    <div id="board-cleanup-modal" onclick="if(event.target===this)closeBoardCleanupModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9100;align-items:center;justify-content:center">
    <div role="dialog" aria-modal="true" aria-label="Manage Supabase Boards" style="background:var(--bg2);border:1px solid var(--border);width:520px;max-width:95vw;max-height:82vh;display:flex;flex-direction:column;font-family:'Barlow',sans-serif">
```

Find (currently `dev.html:15517-15521`):
```
async function openBoardCleanupModal() {
  const modal = document.getElementById('board-cleanup-modal');
  modal.style.display = 'flex';
  const body = document.getElementById('board-cleanup-body');
  body.innerHTML = `<div style="color:var(--text-muted);padding:20px 0">Loading from Supabase…</div>`;
```
Replace with:
```
const _boardCleanupModalA11y = {};
async function openBoardCleanupModal() {
  const modal = document.getElementById('board-cleanup-modal');
  modal.style.display = 'flex';
  _openModalA11y(modal, _boardCleanupModalA11y, closeBoardCleanupModal);
  const body = document.getElementById('board-cleanup-body');
  body.innerHTML = `<div style="color:var(--text-muted);padding:20px 0">Loading from Supabase…</div>`;
```

Find (currently `dev.html:15888-15891`):
```
function closeBoardCleanupModal() {
  document.getElementById('board-cleanup-modal').style.display = 'none';
  loadSupplierPrices(); // re-sync after cleanup
}
```
Replace with:
```
function closeBoardCleanupModal() {
  const modal = document.getElementById('board-cleanup-modal');
  _closeModalA11y(modal, _boardCleanupModalA11y);
  modal.style.display = 'none';
  loadSupplierPrices(); // re-sync after cleanup
}
```

- [ ] **Step 6: qm-modal (also add the missing click-outside)**

Find (currently `dev.html:4808-4809`):
```
<div id="qm-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:600;align-items:center;justify-content:center">
  <div id="qm-modal" style="background:var(--bg2);border:1px solid var(--border);width:520px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column">
```
Replace with:
```
<div id="qm-overlay" onclick="if(event.target===this)closeQuoteManager()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:600;align-items:center;justify-content:center">
  <div id="qm-modal" role="dialog" aria-modal="true" aria-label="Quote Manager" style="background:var(--bg2);border:1px solid var(--border);width:520px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column">
```

Find (currently `dev.html:22779-22792`):
```
function openQuoteManager() {
  const nameInput = document.getElementById('qm-save-name');
  if (!nameInput.value) {
    const client = document.getElementById('job-client')?.value.trim();
    const house  = document.getElementById('job-house')?.value.trim();
    if (client || house) nameInput.value = [client, house].filter(Boolean).join(' – ');
  }
  renderQMList();
  document.getElementById('qm-overlay').style.display = 'flex';
}

function closeQuoteManager() {
  document.getElementById('qm-overlay').style.display = 'none';
}
```
Replace with:
```
const _qmModalA11y = {};
function openQuoteManager() {
  const nameInput = document.getElementById('qm-save-name');
  if (!nameInput.value) {
    const client = document.getElementById('job-client')?.value.trim();
    const house  = document.getElementById('job-house')?.value.trim();
    if (client || house) nameInput.value = [client, house].filter(Boolean).join(' – ');
  }
  renderQMList();
  const overlay = document.getElementById('qm-overlay');
  overlay.style.display = 'flex';
  _openModalA11y(overlay, _qmModalA11y, closeQuoteManager);
}

function closeQuoteManager() {
  const overlay = document.getElementById('qm-overlay');
  _closeModalA11y(overlay, _qmModalA11y);
  overlay.style.display = 'none';
}
```

- [ ] **Step 7: Confirm all 6 modals are wired**

```bash
grep -c 'role="dialog"' /home/dutchman/cutlist_pro/dev.html
grep -n "_feedbackModalA11y\|_planImportModalA11y\|_bulkAdjustModalA11y\|_importPricesModalA11y\|_boardCleanupModalA11y\|_qmModalA11y" /home/dutchman/cutlist_pro/dev.html
```
Expected: the `role="dialog"` count increased by 6 versus before this task (it already existed on 6 other modals per the critique, so the new total should be 12); each of the 6 new state-object names appears at least twice (declaration + open + close = 3 times each, but at minimum 2).

- [ ] **Step 8: Full-file syntax check** (same method as Task 1 Step 4)

- [ ] **Step 9: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
fix: retrofit 6 static modals with dialog a11y (role, focus trap, Escape)

feedback, plan-import, bulk-adjust, import-prices, board-cleanup, and
quote-manager modals now get the same role="dialog"/aria-modal/focus-trap/
Escape-to-close/trigger-restore treatment the newer scenario-compare and
users modals already had, via the shared _openModalA11y/_closeModalA11y
helpers. Also adds qm-overlay's previously-missing click-outside-to-close.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Retrofit hist-price-modal (dynamic modal)

**Files:**
- Modify: `dev.html` (`openHistoricalPriceModal`, `dev.html:27798-27950+`, the dynamically-created `hist-price-modal`).

**Interfaces:**
- Consumes: `_openModalA11y` / `_closeModalA11y` (Task 1).

- [ ] **Step 1: Add role=dialog, click-outside, and wire a11y**

Find this exact text (currently `dev.html:27861-27866`):
```
  const el = document.createElement('div');
  el.id = 'hist-price-modal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99990;display:flex;align-items:center;justify-content:center;font-family:\'Barlow\',sans-serif';
  el.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--amber);max-width:520px;width:92%;max-height:85vh;display:flex;flex-direction:column">
```
Replace with:
```
  const el = document.createElement('div');
  el.id = 'hist-price-modal';
  el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:99990;display:flex;align-items:center;justify-content:center;font-family:\'Barlow\',sans-serif';
  el.addEventListener('click', e => { if (e.target === el) _histPriceClose(); });
  el.innerHTML = `
    <div role="dialog" aria-modal="true" aria-label="Set Historical Prices" style="background:var(--bg2);border:1px solid var(--amber);max-width:520px;width:92%;max-height:85vh;display:flex;flex-direction:column">
```

Find this exact text (currently `dev.html:27891-27893`):
```
  document.body.appendChild(el);

  el.querySelector('#hist-price-cancel').onclick = () => el.remove();
```
Replace with:
```
  document.body.appendChild(el);

  const _histPriceA11y = {};
  function _histPriceClose() { _closeModalA11y(el, _histPriceA11y); el.remove(); }
  _openModalA11y(el, _histPriceA11y, _histPriceClose);

  el.querySelector('#hist-price-cancel').onclick = _histPriceClose;
```

Find this exact text (currently, inside the save button's success path):
```
      el.remove();
      renderPLView();
```
Replace with:
```
      _histPriceClose();
      renderPLView();
```

- [ ] **Step 2: Confirm wiring**

```bash
grep -n "_histPriceClose\|_histPriceA11y" /home/dutchman/cutlist_pro/dev.html
```
Expected: `_histPriceA11y` declared once and passed to `_openModalA11y`/`_closeModalA11y`; `_histPriceClose` defined once and referenced by the cancel button's `onclick`, the click-outside handler, and the save-success path (4 references total: 1 definition + 3 uses).

- [ ] **Step 3: Full-file syntax check** (same method as Task 1 Step 4)

- [ ] **Step 4: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
fix: retrofit hist-price-modal with dialog a11y and click-outside

Dynamically-created modal (create/destroy pattern, like scenario-compare)
gets the same _openModalA11y/_closeModalA11y treatment as the static
modals in the previous commit, plus a click-outside-to-close handler it
was missing entirely.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Rewrite `confirmAction()` as a blocking modal

**Files:**
- Modify: `dev.html` (`confirmAction`, `dev.html:5206-5225`).

**Interfaces:**
- Consumes: `_openModalA11y` / `_closeModalA11y` (Task 1), `escHtml` (existing, `dev.html:23295`).
- Produces: `confirmAction(message, opts)` — **signature and return contract unchanged** (`Promise<boolean>`, `opts.confirmLabel`/`opts.cancelLabel` still respected). Internals change from a dismissable `showToast` to a blocking modal. `opts.type` and `opts.duration` are no longer read (confirmed via `grep confirmAction\(` that no existing call site passes them).

- [ ] **Step 1: Confirm no call site currently overrides `type` or `duration`**

```bash
grep -n "confirmAction(" /home/dutchman/cutlist_pro/dev.html | grep -E "type:|duration:"
```
Expected: no output (confirms it's safe to drop internal handling of these two fields).

- [ ] **Step 2: Replace the implementation**

Find this exact text (currently `dev.html:5206-5225`):
```
function confirmAction(message, opts) {
  opts = opts || {};
  const confirmLabel = opts.confirmLabel || 'CONFIRM';
  const cancelLabel  = opts.cancelLabel  || 'CANCEL';
  const type = opts.type || 'warning';
  const triggerEl = document.activeElement;
  const handle = showToast(message, type, {
    duration: opts.duration === undefined ? 10000 : opts.duration,
    actions: [
      { label: cancelLabel, value: false },
      { label: confirmLabel, value: true, primary: true }
    ]
  });
  if (!handle || !handle.actionPromise) return Promise.resolve(false);
  return handle.actionPromise.then(v => {
    try { if (triggerEl && triggerEl.focus) triggerEl.focus(); } catch(_) {}
    return v === true;
  });
}
```
Replace with:
```
function confirmAction(message, opts) {
  opts = opts || {};
  const confirmLabel = opts.confirmLabel || 'CONFIRM';
  const cancelLabel  = opts.cancelLabel  || 'CANCEL';

  return new Promise(resolve => {
    const state = {};
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center';
    const settle = (val) => {
      _closeModalA11y(modal, state);
      modal.remove();
      resolve(val);
    };
    modal.addEventListener('click', e => { if (e.target === modal) settle(false); });
    modal.innerHTML = `
      <div role="alertdialog" aria-modal="true" aria-label="Confirm action" style="background:var(--bg2);border:1px solid var(--border);border-top:2px solid var(--danger, #e06060);max-width:420px;width:92%;font-family:'Barlow',sans-serif;padding:20px">
        <div style="font-size:13px;color:var(--text);line-height:1.6;margin-bottom:18px">${escHtml(message)}</div>
        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button id="ca-cancel" style="font-weight:500;background:none;border:1px solid var(--border);color:var(--text-muted);padding:8px 20px;font-family:'Barlow',sans-serif;font-size:11px;letter-spacing:0.3px;cursor:pointer">${escHtml(cancelLabel)}</button>
          <button id="ca-confirm" style="background:var(--danger, #e06060);border:none;color:#fff;padding:8px 20px;font-family:'Barlow',sans-serif;font-size:11px;letter-spacing:0.3px;cursor:pointer;font-weight:600">${escHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#ca-cancel').onclick = () => settle(false);
    modal.querySelector('#ca-confirm').onclick = () => settle(true);
    _openModalA11y(modal, state, () => settle(false));
  });
}
```

- [ ] **Step 3: Confirm the rewrite landed and the old toast-based path is gone**

```bash
grep -n "function confirmAction" -A 5 /home/dutchman/cutlist_pro/dev.html
grep -n "confirmAction" /home/dutchman/cutlist_pro/dev.html | wc -l
```
Expected: the function body shows `new Promise(resolve =>` (not `showToast(`); the total `confirmAction` occurrence count is unchanged from before this task (25 call sites + 1 definition — confirming no call site needed editing).

- [ ] **Step 4: Full-file syntax check** (same method as Task 1 Step 4)

- [ ] **Step 5: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
fix: confirmAction() is now a blocking modal, not a dismissable toast

Destructive-action confirmation (job delete, archive, CLEAR ALL, etc.)
previously showed a corner toast with a 10s auto-cancel timeout — easy to
miss or click past given it didn't block the rest of the UI. Now uses the
same dialog a11y helpers as the modal retrofit in the previous two
commits. External contract is unchanged: confirmAction(message, opts)
still returns Promise<boolean>, so none of the 25 existing call sites
needed to change.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: P&L HARDWARE section — pending-suggestion count, match score, tooltip migration

**Files:**
- Modify: `dev.html` — inside the HARDWARE comparison IIFE in `_renderPLView()` (`dev.html:28556-28660` region).

**Interfaces:**
- Consumes: `_plSuggestMatches` (existing), `_lineMatches`/`_claimedInvoiceIds`/`_allDetailItems` (existing, this task's pre-pass extension), `escHtml` (existing).

- [ ] **Step 1: Extend the pre-pass to count pending suggestions**

Find this exact text (currently `dev.html:28556-28568`):
```
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
```
Replace with:
```
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
      // Count how many unmatched lines have at least one suggested candidate,
      // for the HARDWARE section header badge (critique: feature had zero
      // discoverability signal — you only found suggestions by scrolling).
      let _pendingSuggestionCount = 0;
      _allDetailItems.forEach(d => {
        if (_lineMatches.get(d)) return;
        if (_plSuggestMatches(d.category, d.label, invs, _claimedInvoiceIds).length > 0) _pendingSuggestionCount++;
      });
```

- [ ] **Step 2: Show the count as a badge on the HARDWARE subhead**

Find this exact text (currently `dev.html:28605-28606`):
```
      return `
    <div class="pp-table-subhead">HARDWARE</div>
```
Replace with:
```
      const _pendingBadge = _pendingSuggestionCount > 0
        ? ` <span style="background:rgba(212,145,58,0.15);color:var(--amber);border-radius:10px;padding:2px 8px;font-size:9px;letter-spacing:0.3px;text-transform:none">${_pendingSuggestionCount} match${_pendingSuggestionCount === 1 ? '' : 'es'} to review</span>`
        : '';
      return `
    <div class="pp-table-subhead">HARDWARE${_pendingBadge}</div>
```

- [ ] **Step 3: Show the match confidence score in both suggestion branches**

Find this exact text (currently `dev.html:28579-28587`):
```
        if (candidates.length === 1) {
          const c = candidates[0];
          const amt = _invInclVAT(c.inv) / 1.15;
          return `<tr style="background:rgba(255,190,90,0.06)">
            <td colspan="9" style="padding:5px 12px 5px 40px;color:var(--amber-dim);font-size:11px;font-style:italic">
              ↳ possible match: "${escHtml(c.inv.desc || '')}" — ${R(amt)}
              <button onclick="plLinkInvoiceToQuotedLine('${safeJobId}', '${c.inv.id.replace(/'/g,"\\'")}', '${safeKey}')" style="margin-left:8px;background:none;border:1px solid var(--amber-dim);color:var(--amber-dim);font-size:10px;padding:1px 8px;cursor:pointer;border-radius:3px">Link</button>
            </td>
          </tr>`;
        }
```
Replace with:
```
        if (candidates.length === 1) {
          const c = candidates[0];
          const amt = _invInclVAT(c.inv) / 1.15;
          const pctMatch = Math.round(c.score * 100);
          return `<tr style="background:rgba(255,190,90,0.06)">
            <td colspan="9" style="padding:5px 12px 5px 40px;color:var(--amber-dim);font-size:11px;font-style:italic">
              ↳ possible match (${pctMatch}%): "${escHtml(c.inv.desc || '')}" — ${R(amt)}
              <button onclick="plLinkInvoiceToQuotedLine('${safeJobId}', '${c.inv.id.replace(/'/g,"\\'")}', '${safeKey}')" style="margin-left:8px;background:none;border:1px solid var(--amber-dim);color:var(--amber-dim);font-size:10px;padding:1px 8px;cursor:pointer;border-radius:3px">Link</button>
            </td>
          </tr>`;
        }
```

Find this exact text (currently `dev.html:28593-28596`):
```
        const options = candidates.map(c => {
          const amt = _invInclVAT(c.inv) / 1.15;
          return `<option value="${c.inv.id}">${escHtml(c.inv.desc||'')} — ${R(amt)}</option>`;
        }).join('');
```
Replace with:
```
        const options = candidates.map(c => {
          const amt = _invInclVAT(c.inv) / 1.15;
          const pctMatch = Math.round(c.score * 100);
          return `<option value="${c.inv.id}">${escHtml(c.inv.desc||'')} — ${R(amt)} (${pctMatch}%)</option>`;
        }).join('');
```

- [ ] **Step 4: Migrate the 6 number-explaining `title=` tooltips to `[data-tip]`**

Find this exact text (currently `dev.html:28638`, inside the detail-row template):
```
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:#6aaad4;font-size:11px" title="${_hwExpTip}">${R(lineExp)}</td>
```
Replace with:
```
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:#6aaad4;font-size:11px" data-tip="${_hwExpTip}">${R(lineExp)}</td>
```

Find this exact text (currently `dev.html:28640`):
```
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px">${lineHasA?`<span style="color:${profitColor(lineVar)}" title="${varTip(lineVar)}">${profitArrow(lineVar)} ${R(Math.abs(lineVar))}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```
Replace with:
```
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px">${lineHasA?`<span style="color:${profitColor(lineVar)}" data-tip="${varTip(lineVar)}">${profitArrow(lineVar)} ${R(Math.abs(lineVar))}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```

Find this exact text (currently `dev.html:28641`):
```
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px">${linePct!==null?`<span style="color:${profitColor(linePct)}" title="${pctTip(linePct,lineVar)}">${linePct>=0?'+':''}${linePct.toFixed(1)}%</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```
Replace with:
```
                <td style="padding:6px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:10px">${linePct!==null?`<span style="color:${profitColor(linePct)}" data-tip="${pctTip(linePct,lineVar)}">${linePct>=0?'+':''}${linePct.toFixed(1)}%</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```

Find this exact text (currently `dev.html:28652`, the category-row expected-cost cell):
```
              <td style="padding:9px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${hasE?'#6aaad4':'var(--text-muted)'}" title="${_hwExpTip}">${hasE ? R(exp) : '<span style="font-size:10px">—</span>'}</td>
```
Replace with:
```
              <td style="padding:9px 10px;text-align:right;font-family:'JetBrains Mono',monospace;color:${hasE?'#6aaad4':'var(--text-muted)'}" data-tip="${_hwExpTip}">${hasE ? R(exp) : '<span style="font-size:10px">—</span>'}</td>
```

Find this exact text (currently `dev.html:28654`):
```
              <td style="padding:9px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${(hasA && hasE)?`<span style="color:${profitColor(v)}" title="${varTip(v)}">${profitArrow(v)} ${R(Math.abs(v))}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```
Replace with:
```
              <td style="padding:9px 10px;text-align:right;font-family:'JetBrains Mono',monospace">${(hasA && hasE)?`<span style="color:${profitColor(v)}" data-tip="${varTip(v)}">${profitArrow(v)} ${R(Math.abs(v))}</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```

Find this exact text (currently `dev.html:28655`):
```
              <td style="padding:9px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px">${(pct!==null && hasA)?`<span style="color:${profitColor(pct)}" title="${pctTip(pct,v)}">${pct>=0?'+':''}${pct.toFixed(1)}%</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```
Replace with:
```
              <td style="padding:9px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px">${(pct!==null && hasA)?`<span style="color:${profitColor(pct)}" data-tip="${pctTip(pct,v)}">${pct>=0?'+':''}${pct.toFixed(1)}%</span>`:'<span style="color:var(--text-muted)">—</span>'}</td>
```

**Do not migrate** the `title="Unlink manual match"` tooltip on the ✕ button (`dev.html:28630`) — it's a short static icon hint, not a number-explaining tooltip, and the critique specifically called out the number-explaining ones as the migration priority. Leave it as `title=`.

- [ ] **Step 5: Confirm all changes landed**

```bash
grep -c 'data-tip="\${_hwExpTip}"\|data-tip="\${varTip\|data-tip="\${pctTip' /home/dutchman/cutlist_pro/dev.html
grep -n "_pendingSuggestionCount\|pctMatch" /home/dutchman/cutlist_pro/dev.html
grep -n 'title="\${_hwExpTip}"\|title="\${varTip\|title="\${pctTip' /home/dutchman/cutlist_pro/dev.html
```
Expected: first command shows 6 matches (2× `_hwExpTip`, 2× `varTip`, 2× `pctTip`, now as `data-tip`); second command shows multiple hits confirming the count and score wiring; third command shows **no output** (confirms none of the 6 targeted `title=` attributes remain — only the intentionally-untouched `title="Unlink manual match"` and any tooltips outside this section remain as `title=`).

- [ ] **Step 6: Full-file syntax check** (same method as Task 1 Step 4)

- [ ] **Step 7: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
feat: P&L HARDWARE section shows pending-match count and confidence score

The invoice-matching feature had no discoverability signal — the only
way to find a suggested match was to scroll the table and notice an
italic sub-row. Adds a count badge to the section header ("N matches to
review") and surfaces the already-computed _plMatchScore as a percentage
next to each suggestion, so a user can judge how much to trust a one-
click Link. Also migrates the 6 number-explaining tooltips in this
section from native title= to the app's themed [data-tip] component,
which (unlike title=) works on touch.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Unify tab-bar icon vocabulary

**Files:**
- Modify: `dev.html` — 5 tab labels in the nav bar (`dev.html:4777, 4785, 4787, 4788, 4789`).

**Interfaces:** None — pure text/markup change, no functions consume or produce anything new. Confirmed via `grep` (this plan's research phase) that no JS logic anywhere matches on these tab label glyphs as string literals, so this is a purely cosmetic, risk-free change.

**Icon assignments** (chosen to fix the real ✦/✦ duplicate-icon bug and bring the 4 monochrome-glyph tabs in line with the tab bar's otherwise-consistent full-color emoji vocabulary; checked against the full current icon inventory — 🍳🛏🚪🚿📎🪵💰📐📊🧾🔧🔨📥📋💾 — for zero collisions):

| Tab | Old | New |
|---|---|---|
| Custom (room row) | ✦ | 🏠 |
| Cutlist (tool row) | ✦ | ✂️ |
| Sheet Optimizer | ▦ | 🧩 |
| Edit Units | ✏ | ✏️ (same pencil, forced to color/emoji presentation by adding the U+FE0F variation selector) |
| Summary | ☰ | 📄 |

- [ ] **Step 1: Apply the 5 replacements**

Find this exact text (currently `dev.html:4777`):
```
    <button class="tab" role="tab" aria-selected="false" data-section="custom" onclick="switchTab(this,'custom')">✦ Custom <span class="count" id="cnt-custom">0</span></button>
```
Replace with:
```
    <button class="tab" role="tab" aria-selected="false" data-section="custom" onclick="switchTab(this,'custom')">🏠 Custom <span class="count" id="cnt-custom">0</span></button>
```

Find this exact text (currently `dev.html:4785`):
```
    <button class="tab" role="tab" aria-selected="false" data-section="__cutlist__" onclick="switchTab(this,'__cutlist__')" id="cutlist-tab" aria-controls="cutlist-view" title="Cutlist (Alt+2)">✦ Cutlist</button>
```
Replace with:
```
    <button class="tab" role="tab" aria-selected="false" data-section="__cutlist__" onclick="switchTab(this,'__cutlist__')" id="cutlist-tab" aria-controls="cutlist-view" title="Cutlist (Alt+2)">✂️ Cutlist</button>
```

Find this exact text (currently `dev.html:4787`):
```
    <button class="tab" role="tab" aria-selected="false" data-section="__optimize__" onclick="switchTab(this,'__optimize__')" id="optimize-tab" aria-controls="optimize-view" title="Sheet Optimizer (Alt+4)">▦ Sheet Optimizer</button>
```
Replace with:
```
    <button class="tab" role="tab" aria-selected="false" data-section="__optimize__" onclick="switchTab(this,'__optimize__')" id="optimize-tab" aria-controls="optimize-view" title="Sheet Optimizer (Alt+4)">🧩 Sheet Optimizer</button>
```

Find this exact text (currently `dev.html:4788`):
```
    <button class="tab" role="tab" aria-selected="false" data-section="__editor__" onclick="switchTab(this,'__editor__')" id="editor-tab" aria-controls="editor-view" title="Edit Units (Alt+5)">✏ Edit Units</button>
```
Replace with:
```
    <button class="tab" role="tab" aria-selected="false" data-section="__editor__" onclick="switchTab(this,'__editor__')" id="editor-tab" aria-controls="editor-view" title="Edit Units (Alt+5)">✏️ Edit Units</button>
```

Find this exact text (currently `dev.html:4789`):
```
    <button class="tab" role="tab" aria-selected="false" data-section="__summary__" onclick="switchTab(this,'__summary__')" id="summary-tab" aria-controls="summary-view" title="Summary (Alt+6)">☰ Summary</button>
```
Replace with:
```
    <button class="tab" role="tab" aria-selected="false" data-section="__summary__" onclick="switchTab(this,'__summary__')" id="summary-tab" aria-controls="summary-view" title="Summary (Alt+6)">📄 Summary</button>
```

- [ ] **Step 2: Confirm the old glyphs are gone from the tab bar and no duplicate remains**

```bash
sed -n '4769,4790p' /home/dutchman/cutlist_pro/dev.html | grep -o '^[^<]*<button[^>]*>[^<]*' 
sed -n '4769,4790p' /home/dutchman/cutlist_pro/dev.html | grep -c "✦\|▦\|☰"
```
Expected: the second command prints `0` (all three old glyphs gone from this line range); a visual scan of the first command's output shows 7 distinct room icons and 7 distinct tool icons with no repeats.

- [ ] **Step 3: Full-file syntax check** (same method as Task 1 Step 4 — this task doesn't change JS logic, but confirms the HTML-embedded emoji didn't break anything containing them, e.g. an unescaped character inside a JS template literal elsewhere).

- [ ] **Step 4: Commit**

```bash
cd /home/dutchman/cutlist_pro && git add dev.html
git commit -m "$(cat <<'EOF'
fix: unify tab-bar icon vocabulary, fix duplicate glyph on 2 tabs

The Custom (room) and Cutlist (tool) tabs both used the same ✦ glyph for
different meanings — a real bug, not just an inconsistency. Converts the
4 remaining monochrome-glyph tabs (Custom, Cutlist, Sheet Optimizer, Edit
Units, Summary) to themed emoji matching the tab bar's otherwise-
consistent full-color icon vocabulary, checked against the full current
icon set for zero collisions.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```
