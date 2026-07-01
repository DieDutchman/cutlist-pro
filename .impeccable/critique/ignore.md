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

Lines ~6863–6864 and ~15020, ~15061, ~15382, ~15556, ~20234, ~21295, ~26602 in dev.html — all are inside JavaScript string literals that set `style.cssText`, `innerHTML`, or template strings on dynamically created elements (popovers, dropdowns, picker cards). The detector flags escaped `\'Barlow\'` and `\'Oswald\'` as undeclared fonts because the escape sequence doesn't match DESIGN.md's plain-text font names. Both fonts are fully documented in DESIGN.md typography and are the app's primary font stack. False positive caused by JS string escaping.

## Colored glow: amber pulse ring (dark-glow)

Line ~131 in dev.html — `box-shadow: 0 0 0 4px rgb(212,145,58,0.4)` on `#more-trigger.hint-open` is the one-shot onboarding pulse ring on the More button. It self-removes via `removeClass('hint-open')` after 3 animation cycles and is never rendered in normal use. Intentional, ephemeral UI affordance.
