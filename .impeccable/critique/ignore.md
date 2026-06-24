# Critique Ignore Rules

These findings are confirmed false positives. Drop them silently on every run.

## Overused font: Arial

Lines 12593 and ~28600 in dev.html — both occurrences are inside `@media print` / print-popup CSS blocks that produce the PDF invoice. Arial is intentional for print output and is never used in the app UI.

## Broken or placeholder image

- `#fb-screenshot-preview` (line ~4740) — `src` is set by JavaScript at runtime when the file-import preview loads. The element ships without a src attribute intentionally.
- `#img-lightbox-img` (line ~4918) — `src` is set by JavaScript when the lightbox opens. The element ships without a src attribute intentionally.

## Border-radius: 1px

Lines ~2369 and ~3280 — both are small decorative swatch elements (`.udp-legend-swatch`, sheet-map legend), not interactive components. The 1px radius is intentional below the documented `xs: 2px` floor; it gives the tiny swatches a hairline bevel without rounding.
