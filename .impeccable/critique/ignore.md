# Critique Ignore Rules

These findings are confirmed false positives. Drop them silently on every run.

## Overused font: Arial

Any occurrence inside `@media print` / print-popup CSS blocks that produce the PDF invoice. Arial is intentional for print output and is never used in the app UI. Match by context (print block), not line number — line numbers drift with code insertions.

## Broken or placeholder image

- `#fb-screenshot-preview` — `src` is set by JavaScript at runtime when the file-import preview loads. Ships without a src attribute intentionally.
- `#img-lightbox-img` — `src` is set by JavaScript when the lightbox opens. Ships without a src attribute intentionally.

## Border-radius: 1px

Two small decorative swatch elements (`.udp-legend-swatch`, sheet-map legend) — not interactive components. The 1px radius is intentional below the documented `xs: 2px` floor; gives the tiny swatches a hairline bevel without rounding.

## Border-radius: 2px / 3px in JS template strings

Numerous occurrences of `border-radius: 2px` or `border-radius: 3px` inside JavaScript template literals that generate HTML strings (cabinet dimension badge pills, icon chips, picker row chips, etc.). The detector flags these because the values fall outside DESIGN.md's documented radius scale, but the detector is reading them as CSS in markup context when they are actually JS string content that gets compiled into runtime DOM. All are intentional small-radius chips — not interactive components requiring the full radius token scale. Match by description pattern (JS template string context), not line number.

## Font-family in inline JS strings: Barlow and Oswald

All occurrences of `font-family: \'Barlow\'` or `\'Oswald\'` inside JavaScript string literals (style.cssText, innerHTML, template strings on dynamically created elements — popovers, dropdowns, picker cards). The detector flags escaped font names because the escape sequence doesn't match DESIGN.md's plain-text font names. Both fonts are fully documented in DESIGN.md typography and are the app's primary font stack. False positive caused by JS string escaping. Match by description pattern, not line number.

## Colored glow: amber pulse ring (dark-glow)

`box-shadow: 0 0 0 4px rgb(212,145,58,0.4)` on `#more-trigger.hint-open` — the one-shot onboarding pulse ring on the More button. Self-removes after 3 animation cycles and is never rendered in normal use. Intentional, ephemeral UI affordance.

## Em-dash usage

Em-dashes in UI label strings (`— Select a job —`, `— New Job —`) are intentional typographic choices, not overuse. These are placeholder labels in picker/select elements where the em-dash is a common convention for "no selection made."

## Note on line numbers

All line-number references above are removed intentionally — they drift ~100–250 lines with each major feature addition. Rules match by description pattern and context, not by line number.

## Colored glow: primary button amber shadow

`box-shadow: 0 3px 10px rgba(212,145,58,0.25)` on `.btn-primary` (and its `0 5px 14px rgba(212,145,58,0.35)` hover escalation). This is the documented "Amber Glow" in DESIGN.md's Elevation section — "the only shadow with a hue," an intentional brand signature tying the primary button to the amber accent. Not decorative drift.

## Border-radius: 1px on .pp-title-mark

`.pp-title-mark` (8×22px amber title bar mark) uses `border-radius: 1px` — same family as the 1px swatch rule above: a tiny decorative non-interactive element given a hairline bevel. Intentional.

## Confirmed design-system-radius: all remaining findings

A fresh detector pass after the above two radius rules were written still reports every `design-system-radius` finding as `1px`, `2px`, or `3px` (the `ignoreValue` sometimes includes trailing template-string characters like `2px">W<` — that's the detector capturing into the next HTML tag inside a JS template literal, not a different radius value). Spot-checked a representative sample across the file (`.udp-legend-swatch`, `.pp-title-mark`, cabinet dimension-badge pills, P&L "Link" buttons, Unit Builder top-type/shelf-span toggle chips) and every one is either already covered by the two rules above or is the same category: a small chip/pill/button generated inside a JS template literal, not a primary interactive component needing the full `rounded.*` scale. No new radius value or component-class violation found. Re-verify with a similar spot-check on future sweeps rather than assuming line-for-line.

## Literal colors inside print-only output

Plain black/white/gray CSS literals (`#333`, `#666`, `#eee`, `#f5f5f5`, `white`, `black`, `#ccc`, `#fafafa`, `#ddd`, `#111`) in three contexts, all of which intentionally render an undyed black-on-white printed page rather than the amber-tinted screen theme — the same precedent as the existing "Arial in print context" rule:
- The two in-page `@media print { … }` blocks (cutlist section/table overrides; summary-unit page-break rules).
- The dynamically-generated print-window stylesheets written via `window.open(...).document.write(...)` in `printQuotePDF()`, the cutlist print-window builder (the function that renders the `gparts` table into a new window), and the Sheet Optimizer's "Export PDF" sheet-layout print window.
Match by context (inside a `@media print` block, or inside a template literal passed to `win.document.write` that defines a standalone print document's `<style>`), not by line number or specific hex — new print-only literals in these same three contexts are the same exception.

## White-alpha hairline family

`rgba(255,255,255, 0.04–0.5)` used as inner-divider/border hairlines and hover-state washes inside JS-generated markup (toast action buttons, unit-editor chrome, costing/quote table dividers, etc.). This is DESIGN.md's documented "White-alpha hairlines" family (Semantic State Ramps section) — "the standard family for inner dividers and subtle borders inside dark surfaces... acceptable inside JS-generated markup." The detector's allow-list only reads DESIGN.md's YAML frontmatter `colors:` map (named hex tokens), not prose-documented rgba tonal families, so it will always flag these even though they're sanctioned. Confirmed false positive by design; match by value pattern (`rgba(255,255,255, …)`), not line number.

## White text on solid saturated fill

`#fff` / `#ffffff` used as foreground text/icon color on top of a solid accent-colored fill, not on a bare surface color — the No-Pure-White Rule's named exception (see DESIGN.md Buttons section for the full confirmed list and rationale). Confirmed instances: `.btn-excel`, `.unit-action-btn.is-danger:hover` (`--uab-fg`), `#fb-unread-dot`, `#ca-confirm` (confirm-action modal), `#sau-confirm-btn` (save-unit confirm), and `body.supplier-theme`/`.user-light-theme .toast-primary`. Match by context (white text color declared alongside a solid, non-transparent, saturated background on the same element/selector), not line number. Any `#fff` found as text/border color on a bare surface (card, modal, input) is still drift, not this exception — the icon-hover case on `.udp-close` was exactly that and was fixed to `var(--text)` rather than added here.

## SVG piece-label halo (Sheet Optimizer)

`.opt-piece-label { fill: #fff; stroke: rgba(0,0,0,0.6); }` — the piece-size label drawn inside each placed piece on the Sheet Optimizer's sheet diagram. Documented in DESIGN.md's Functional Palette as a label-on-variable-background technique (the label sits on top of whichever Off-Cut Map color the piece was assigned, so warm parchment doesn't reliably clear contrast against all three). Not body text; the No-Pure-White Rule doesn't apply to canvas-drawn labels needing guaranteed contrast against an unpredictable fill.

## Unit Detail Panel construction-type chip background/border washes

The seven `.chip-*` rules' `rgba()` backgrounds and borders (e.g. `rgba(100,120,200, …)` for `.chip-nailers`, `rgba(80,100,160, …)` for `.chip-masonite`, `rgba(150,100,60, …)` for `.chip-solidback`, plus the reused-hue washes on `.chip-supports`/`.chip-shelves`/`.chip-estimated`). Documented in DESIGN.md's "Unit Detail Panel Construction-Type Chip Legend" — each chip's background is a separately-tuned muted wash, not an alpha-blend of its own text color, so it doesn't register against the named text token. Confirmed intentional, functional legend; match by selector (`.chip-*` rule bodies), not line number.

## Opaque badge-tint backgrounds

`#3a1a1a`, `#2a3a2a`, `#1a2a3a` (+ its paired text `#6a9adc`), `#3a2a1a`, `#1a3a1a`, `#3a2a0a` — flat near-black tint backgrounds paired with an existing accent color as the badge text (see DESIGN.md's "Opaque Badge-Tint Backgrounds" section for the full table: no-parts warning badges, summary category tags, the custom-unit editor badge, and the half-size dimension badge). These render opaque on purpose (they sit inside table rows/cards with variable backgrounds, where an `rgba()` wash would pick up whatever is underneath) and are structural rather than independent brand colors, same category as the already-documented "Contextual rgba Overlays." Match by the specific hex values above, wherever they appear as a badge background.

## Toast notification & job-sync-status ink/background literals

The toast-notification component (`.toast-success/-error/-warning/-info` and their light-theme overrides) and the `#job-sync-status` pill's light-theme overrides use a self-contained, per-state background+text(+border) palette, independently tuned per state per theme for AA contrast — documented in DESIGN.md's Light Theme section ("Light-theme state variants"). The three values reused across multiple components (`danger-light` #c04040, `success-light` #5a9a54, `warning-light` #b87030) are promoted to named DESIGN.md tokens; the following single-use background/ink pairs are not, and remain flagged by the raw detector forever since they're not in frontmatter — confirmed intentional regardless: dark-theme `#18221a`/`#d8ecd2` (success bg/text), `#241818`/`#f0d0d0` (error bg/text), `#241e16`/`#f0e0c8` (warning bg/text), `#f07070` (toast-primary hover, already = `--danger-soft` value but not written as the var); light-theme `#e8f3e0`/`#1a3a18` (success bg/text), `#f7e0e0`/`#4a1818` (error bg/text), `#2a5a24`/`#6a1818` (job-sync success/error ink). Match by selector context (`.toast-*` rules or `#job-sync-status.sync-*` rules), not line number.

## Hardware-type include/exclude toggle pill

The per-section hardware include/exclude pill (Costing tab) uses a small on/off pair not drawn from any documented ramp: included state = `#3fc77a` text, `#2a5a3c` border, `rgba(40,160,90, …)` gradient fill, `rgba(63,199,122,0.7)` dot glow; excluded state = `#9a6060` text, `#7a3838` dot. A binary toggle, not a multi-value legend — confirmed intentional, documented in DESIGN.md's Functional Palette, not promoted to named tokens given it's used in exactly one component.

## P&L invoice "possible match" row tint

`rgba(255,190,90,0.06)` — the soft-gold row background marking a suggested-but-unconfirmed invoice-line match in the Job P&L reconciliation view. Distinct from the amber-tint family on purpose (a *suggestion*, not a confirmed/selected state). Documented in DESIGN.md's Functional Palette. Single-purpose, two occurrences, confirmed intentional.

## Login page tagline

`.lp-tagline { color: #564a36; }` — the small uppercase tagline under the logo on the login screen. A muted amber-brown dimmer than any documented amber token, used exactly once, purely decorative/atmospheric. Documented in DESIGN.md's Functional Palette.
