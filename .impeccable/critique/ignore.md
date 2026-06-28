# Critique Ignore Rules

These findings are confirmed false positives. Drop them silently on every run.

## Overused font: Arial

Lines 12593 and ~28600 in dev.html — both occurrences are inside `@media print` / print-popup CSS blocks that produce the PDF invoice. Arial is intentional for print output and is never used in the app UI.

## Broken or placeholder image

- `#fb-screenshot-preview` (line ~4740) — `src` is set by JavaScript at runtime when the file-import preview loads. The element ships without a src attribute intentionally.
- `#img-lightbox-img` (line ~4918) — `src` is set by JavaScript when the lightbox opens. The element ships without a src attribute intentionally.

## Border-radius: 1px

Lines ~2369 and ~3280 — both are small decorative swatch elements (`.udp-legend-swatch`, sheet-map legend), not interactive components. The 1px radius is intentional below the documented `xs: 2px` floor; it gives the tiny swatches a hairline bevel without rounding.

## Font-family in inline JS strings: Barlow and Oswald

Lines ~6863–6864 in dev.html — both are inside JavaScript string literals that set `style.cssText` or `innerHTML` on a dynamically created popover. The detector flags escaped `\'Barlow\'` and `\'Oswald\'` as undeclared fonts because the escape sequence doesn't match DESIGN.md's plain-text font names. Both fonts are fully documented in DESIGN.md typography and are the app's primary font stack. False positive caused by JS string escaping.
