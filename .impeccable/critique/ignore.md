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
