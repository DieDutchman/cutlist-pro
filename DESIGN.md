---
name: CutList Pro
description: Quoting, estimation, and job management for the cabinet and joinery trade.
colors:
  amber: "#d4913a"
  amber-light: "#e8a84e"
  amber-dim: "#c07838"
  bg-void: "#141414"
  bg-surface: "#1e1e1e"
  bg-input: "#252525"
  bg-raised: "#2e2e2e"
  text-primary: "#e8e0d0"
  text-secondary: "#a0927f"
  text-muted: "#9c8470"
  border: "#333028"
  border-light: "#4a4438"
  success: "#6aaa64"
  danger: "#e06060"
  amber-gradient-mid: "#b8852a"
  cutmap-grain: "#66aa88"
  cutmap-offcut: "#aaaa66"
  cutmap-waste: "#cc7766"
  bg-light: "#f0ede8"
  bg-light-surface: "#faf8f5"
  bg-light-input: "#edeae4"
  bg-light-raised: "#e4e0d8"
  text-light: "#1a1612"
  text-light-dim: "#4a3f30"
  text-light-muted: "#6a5e50"
  border-light-theme: "#9a8e7e"
  amber-light-theme: "#b87030"
  bg-light-unit-card: "#f5f2ee"
  bg-light-ticker: "#f5e8d0"
  bg-light-nav: "#e8e4dc"
  excel-green: "#1d6f42"
  excel-green-dark: "#217a4b"
typography:
  display:
    fontFamily: "Oswald, sans-serif"
    fontWeight: 700
    letterSpacing: "2px"
  headline:
    fontFamily: "Oswald, sans-serif"
    fontWeight: 600
    letterSpacing: "1.5px"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    letterSpacing: "0.3px"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 400
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
  lg: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.bg-void}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-primary-hover:
    backgroundColor: "{colors.amber-light}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  input:
    backgroundColor: "{colors.bg-input}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
  card:
    backgroundColor: "{colors.bg-surface}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: CutList Pro

## 1. Overview

**Creative North Star: "The Master's Ledger"**

CutList Pro is a dark, amber-lit precision instrument — the kind of tool a master tradesperson would trust with real numbers. The visual system mirrors a craftsman's record book: near-black surfaces that recede so the data reads clearly, amber ink that signals authority without decoration, and a typographic hierarchy that makes dimensions and costs legible at a glance. Nothing is here to impress; everything is here to be useful.

The system is built on restraint. The amber accent appears where it earns its place — active states, totals, primary actions, section headings — and nowhere else. Supporting surfaces step back through a disciplined background scale. Inputs are visible without being loud. The grid and dot patterns on the body are a barely-perceptible nod to workshop drawings, never competing with the content above them.

This is not a startup tool, and it's not a consumer app. It's a professional instrument for skilled tradespeople who make their living off accurate numbers. The design should feel like premium software that gets out of the way.

**Key Characteristics:**
- Dark-first: near-black base (#141414) with stepped surface layers up to #2e2e2e
- Single amber accent family (3 tones: dim / base / light) — used only for primary actions, active states, and data emphasis
- Three-font system: Oswald (display authority), Barlow (UI clarity), JetBrains Mono (numeric precision)
- Minimal border radius — nearly square (2–6px) — reflects tooling, not consumer apps
- Amber focus rings and glow shadows tie keyboard and interactive states to the brand
- Both dark (default) and light (supplier/client) themes are first-class; neither is an afterthought

## 2. Colors: The Ledger Palette

A single warm accent punctuates an otherwise near-achromatic dark system — the palette reads like ink on aged paper in low workshop light.

### Primary
- **Measured Amber** (#d4913a / `--amber`): The brand accent. Used for active tab underlines, total values in summaries, primary CTA backgrounds, section headers, and focus indicators. Its rarity is the point — it signals "this matters."
- **Amber Glow** (#e8a84e / `--amber-light`): Hover state for amber elements; also used for count badge text on active tabs. One step brighter, never used at rest.
- **Amber Shadow** (#c07838 / `--amber-dim`): Subdued amber for section-level headers (Oswald labels), material group labels, card titles. Less assertive than the base; provides hierarchy within amber usage.

### Secondary
- **Site Green** (#6aaa64 / `--green`): Success and positive states only. Applied to positive profit margins, completed job indicators, and the "go" end of status flows. Never decorative.

### Tertiary
- **Alert Red** (#e06060 / `--red`): Danger and error states only. Remove buttons (hover fill), error indicators, negative margins. Never used for decoration.

### Neutral
- **Forge Black** (#141414 / `--bg`): The body surface. Near-black with a faint amber-tinted grid overlay (3% opacity) that reads like graph paper under workshop light.
- **Panel Charcoal** (#1e1e1e / `--bg2`): Cards, header bar, nav tabs, sidebar. One visible step above the body — the surface things sit on.
- **Input Slate** (#252525 / `--bg3`): Input backgrounds, selects, count badge fills. Slightly raised from the panel surface so form controls read as interactive areas.
- **Raised Charcoal** (#2e2e2e / `--bg4`): Hovered or elevated panel states; the top of the neutral stack before amber appears.
- **Warm Parchment** (#e8e0d0 / `--text`): Primary body text. Warm white, not pure white — sits harmoniously in the amber-tinted system without harshness.
- **Aged Ink** (#a0927f / `--text-dim`): Secondary labels, summary line text, table cell content. The workhorse text color for non-primary data.
- **Worn Chalk** (#9c8470 / `--text-muted`): Tertiary labels, column headers, placeholder text, muted metadata. Lowest-priority readable text.
- **Amber-Tinted Dark** (#333028 / `--border`): Default border between surfaces. Has a warm cast; prevents the UI from reading cold.
- **Raised Border** (#4a4438 / `--border-light`): Ghost button borders, slightly lighter dividers. One step above the default.

### Named Rules
**The One Voice Rule.** Amber is used on ≤15% of any given screen at rest. It speaks once per surface — as the active tab underline, as the total value, as the primary button. Its authority comes from its restraint. Do not apply it to secondary labels, inactive icons, or decorative fills.

**The No-Pure-White Rule.** Body text is never #ffffff or #f0f0f0. Warm parchment (#e8e0d0) is the ceiling. Pure white reads as a glitch in the amber-tinted system.

### Functional Palette

Colors used for specific semantic purposes in discrete app features. These are not brand colors and must not be borrowed for decorative use.

**Amber Gradient Mid** (`#b8852a` / `--amber-gradient-mid`): The midpoint stop in the primary button gradient (`#d4913a → #b8852a`). Exists only inside gradient definitions — not a standalone token for any other use.

**Sheet Optimizer Off-Cut Map:** The optimizer uses a fixed 3-color legend to distinguish cut types on the layout diagram. The colors carry functional meaning, not brand identity.

| Token | Hex | Meaning |
|---|---|---|
| `--cutmap-grain` | `#66aa88` | Grain-aligned or premium cut |
| `--cutmap-offcut` | `#aaaa66` | Usable off-cut / secondary board |
| `--cutmap-waste` | `#cc7766` | Waste / off-fall |

> **Colorblind caveat:** The `#66aa88` (green) and `#cc7766` (red-orange) pair fails the deuteranopia test. If the optimizer is ever used as a physical workshop guide (printed sheet or tablet beside the saw), these colors must be supplemented with pattern fills or shape markers — color alone is not sufficient.

### Light Theme (supplier-theme / user-light-theme)

The warm light theme is used by suppliers and in client-facing views. All dark-theme CSS variables are overridden; the amber accent shifts slightly warmer.

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#f0ede8` | Body surface |
| `--bg2` | `#faf8f5` | Card / panel surface |
| `--bg3` | `#edeae4` | Input / raised surface |
| `--bg4` | `#e4e0d8` | Hovered panel |
| `--text` | `#1a1612` | Primary text |
| `--text-dim` | `#4a3f30` | Secondary text |
| `--text-muted` | `#6a5e50` | Muted / labels |
| `--border` | `#9a8e7e` | Default border |
| `--amber` | `#b87030` | Amber accent (warmer in light mode) |

Component-specific literals not mapped to CSS vars:

| Hex | Used for |
|---|---|
| `#f5f2ee` | Unit card background |
| `#f5e8d0` | Price ticker background |
| `#e8e4dc` | Nav tab bar background |

**Exception color — Excel export:** `#1d6f42` (Excel green). Used only on the Excel export button. Never borrowed for other actions.

## 3. Typography

**Display Font:** Oswald (condensed display sans, 400 / 600 / 700)
**Body Font:** Barlow (humanist sans, 300 / 400 / 500 / 600)
**Mono Font:** JetBrains Mono (monospace, 400 / 500)

**Character:** Oswald's condensed geometry gives section headers and CTAs authority without taking space; Barlow's humanist warmth makes the UI readable and approachable at dense information scales; JetBrains Mono makes dimensions and cost values tabular and instantly scannable. The three fonts never compete — Oswald owns headings, Barlow owns UI text, Mono owns numbers.

### Hierarchy
- **Display** (Oswald 700, 20–28px, letter-spacing 3–4px, uppercase): App logo, primary section titles (cutlist headers), generate/CTA button labels. Reserved for the most prominent typographic moments.
- **Headline** (Oswald 600, 13–14px, letter-spacing 1.5px, uppercase): Tab section headers, card section dividers, module labels. The workhorse Oswald weight — authoritative but compact.
- **Title** (Barlow 600, 14–15px): Primary content labels, unit row names, key form field values. Not uppercase; reads as a real content title.
- **Body** (Barlow 400, 13–14px, line-height 1.5): Table cells, summary lines, form input text, general content. The base reading size. Max line length 65–75ch for prose contexts.
- **Label** (Barlow 500, 10–11px, letter-spacing 0.3px, uppercase): Column headers, field labels, stat labels, meta text. The smallest readable text in the system; always uppercased and tracked for legibility.
- **Mono** (JetBrains Mono 400–500, 13–18px): All numeric values — dimensions (L × W), quantities, costs, totals. The size scales with emphasis: stat totals at 18px, table cells at 15px, metadata at 13px.

### Named Rules
**The Mono Rule.** Every dimension, quantity, and currency value is set in JetBrains Mono, not Barlow. The monospace grid makes columns align and numbers scannable. If a number is mixed with prose, the number is still Mono. No exceptions.

**The Oswald Ceiling.** Oswald is used only for display-level labels (section titles, CTA buttons, the logo). It must never appear in body text, table cells, tooltips, or form labels. Its condensed letterforms read as a heading, not a reading size.

## 4. Elevation

CutList Pro uses a tonal layering system for depth, with targeted shadow use for interactive states. Surfaces are flat at rest; shadows appear as a response to elevation (panels above content) or state (hover, focus). The shadow palette is warm-dark, consistent with the amber-tinted system.

### Shadow Vocabulary
- **Ambient Surface** (`0 1px 4px rgba(0,0,0,0.2)`): Applied to cards, stats bars, and material selector bars at rest. A diffuse, barely-perceptible lift that separates surface from body.
- **Elevated Panel** (`0 6px 24px rgba(0,0,0,0.45)`): Dropdown menus and overlay panels. A stronger lift that clearly separates the floating layer from the content beneath.
- **Amber Glow** (`0 3px 10px rgba(212,145,58,0.25)`): Primary button at rest. The only shadow with a hue — amber-tinted to tie the button shadow to the brand accent.
- **Amber Glow Hover** (`0 5px 14px rgba(212,145,58,0.35)`): Primary button on hover. Intensifies with the lift, reinforcing the amber connection.
- **Action Hover** (`0 2px 6px rgba(0,0,0,0.25)`): Unit action buttons and icon buttons on hover. Neutral lift, no hue.
- **Focus Glow** (`0 0 0 2px rgba(212,145,58,0.15–0.30)`): Inputs and selects on focus. Amber ring with 15% opacity; action buttons at 30%.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. The shadow vocabulary activates on state transitions (hover, focus, elevation). A card that casts a big shadow at rest is a card pretending to be a modal.

## 5. Components

Components are quietly confident: every state is accounted for, nothing is accidental. Interactive states communicate through amber colour-shift and a micro lift (1px translateY), not animation choreography.

### Buttons
- **Shape:** Nearly square edges (4px radius — `rounded.md`) — reflects tooling, not consumer UI
- **Primary:** Amber gradient fill (`#d4913a → #b8852a`), near-black text (#141414), amber box-shadow at rest. Full-width variant (`.generate-btn`) uses Oswald 700 for the label instead of Barlow
- **Hover / Focus:** Gradient brightens to amber-light, 1px lift (`translateY(-1px)`), shadow intensifies. Focus: 2px amber outline, 2px offset
- **Ghost:** Transparent fill, `text-secondary` (#a0927f), `border-light` (#4a4438) border. Hover shifts text to `text-primary`, border to `text-secondary`
- **Danger:** Transparent fill, danger red text and border. Hover fills solid danger red with white text — the only solid-red state in the UI
- **Excel Export:** Exception variant — uses #1d6f42 (Excel green) fill, white text. Scoped to export actions only; never borrowed for other actions

### Action Buttons (unit-action-btn)
The signature interactive component. A compact 28px-tall ghost button used for row-level actions (Edit, Parts, Copy, Remove, etc.).
- **Default:** Ghost, `text-muted`, `border` hairline, 4px radius
- **Hover:** Amber text, amber-dim border, 10% amber background tint, 1px lift, neutral shadow
- **Active / Selected state:** Amber text, amber border, 18% amber tint (e.g. when a material override is applied)
- **Active-Green state:** #4caf82 text, border and 18% tint (e.g. when special services are assigned)
- **Danger state:** Dark red text/border at rest, solid danger fill with white text on hover
- **Focus:** No default outline; amber ring via box-shadow instead (0 0 0 2px rgba(212,145,58,0.30))

### Cards / Containers
- **Corner Style:** Gently rounded (6px — `rounded.lg`)
- **Background:** `bg-surface` (#1e1e1e)
- **Shadow:** Ambient Surface shadow at rest (`0 1px 4px rgba(0,0,0,0.2)`)
- **Border:** `border` (#333028) hairline — warm-cast, not neutral gray
- **Internal Padding:** 20px (`spacing.md + spacing.sm`)
- **Card Title:** `label` style in `amber-dim`, uppercase, with a `border` divider below

### Inputs / Fields
- **Style:** `bg-input` (#252525) fill, `border` (#333028) stroke, `rounded.sm` (3px), `body` font size (13px)
- **Hover:** Border shifts to `text-muted` (#9c8470)
- **Focus:** Amber border (#d4913a), amber glow ring (`0 0 0 2px rgba(212,145,58,0.15)`), 0.15s transition
- **Placeholder:** `text-muted` (#9c8470)
- **Number inputs:** JetBrains Mono, spinner controls suppressed — uniform appearance across browsers
- **Quantity input (active):** `amber-dim` border, 8% amber background tint, `amber-light` text — signals "a value has been entered"

### Navigation / Tabs
The primary navigation is a two-row horizontal tab bar (tools row + sections row) with amber active indicators.
- **Container:** `bg-surface` (#1e1e1e) background, `border` bottom divider
- **Tab default:** `text-secondary` (#a0927f), Barlow 600, 12px, 0.3px tracking, uppercase, 3px solid transparent bottom border
- **Hover:** Text shifts to `text-primary`
- **Active:** `amber` (#d4913a) text + 3px `amber` bottom border
- **Count badge:** Dark amber fill (#7a5020), `amber-light` text at rest; full amber fill, near-black text when tab is active
- **Overflow (More…) dropdown:** `bg-surface` fill, `border` hairline, 2px amber top accent, `elevated-panel` shadow

### Edge Tags
Small inline chips used in the cutlist table to indicate edge banding.
- **Default:** `bg-input` fill, `border` hairline, `text-secondary` text, JetBrains Mono
- **Has-edge:** `amber-dim` border and text — signals that banding is applied

### Stat Display
A label + large mono number pairing used in the stats bar.
- **Label:** `stat-label` style (Barlow 500, 10px, 0.3px tracking, uppercase, `text-muted`)
- **Value:** JetBrains Mono 18px, `amber` (#d4913a) — the largest mono value in the system

## 6. Do's and Don'ts

### Do:
- **Do** use JetBrains Mono for every dimension, quantity, and currency value — alignment and scanability depend on it.
- **Do** apply amber (#d4913a) only to active states, primary actions, totals, and focus indicators. Its scarcity is load-bearing.
- **Do** use border-radius ≤6px (rounded.lg) across all components. The nearly-square aesthetic is intentional.
- **Do** use the amber glow focus ring (`0 0 0 2px rgba(212,145,58,0.15–0.30)`) for focus states on inputs and selects, alongside the 2px amber outline for buttons and links.
- **Do** keep transitions at 0.15s. Users are in a task flow; longer transitions interrupt momentum.
- **Do** maintain both dark and light theme contrast compliance independently. Test --text (#e8e0d0) on --bg (#141414) and --text-light (#1a1612) on --bg-light (#f0ede8) separately.
- **Do** use Oswald only for display-level labels: section titles, CTA buttons, the logo. Never in table cells, body text, or form labels.
- **Do** use the 32px amber-grid body background pattern (`rgba(212,145,58,0.03)`) on the body only — it reinforces the workshop-drawing aesthetic without competing with content.

### Don't:
- **Don't** use old-school trade software patterns (Excel-like dense grids, Windows-era form controls, zero visual hierarchy). CutList Pro is premium, not legacy.
- **Don't** add over-designed or flashy elements: hero sections, gradient overlays, heavy motion choreography, decorative animations. Design serves the work, not itself.
- **Don't** use pure white (#ffffff) for any text. The ceiling is warm parchment (#e8e0d0). Pure white reads as a mistake in this system.
- **Don't** apply the amber accent to inactive states, secondary labels, or decorative fills. It loses its authority the moment it's everywhere.
- **Don't** exceed 6px border-radius on any component. Larger radii push the UI toward consumer app territory.
- **Don't** use gradient text (`background-clip: text`). Emphasis is achieved through color (amber), weight (600), or size — never decoration.
- **Don't** use side-stripe borders (border-left or border-right > 1px as a colored accent). Use full borders, tint backgrounds, or the action button's amber hover state instead.
- **Don't** break the three-font contract: Oswald for display, Barlow for UI text, JetBrains Mono for numbers. A fourth font is never needed.
- **Don't** use motion for decoration. The 1px hover lift and 0.15s color transitions are the motion vocabulary. No entrances, no scroll-driven sequences, no orchestrated page loads.
- **Don't** show full-saturation amber (#d4913a) on inactive states or low-priority elements. `amber-dim` (#c07838) is the correct tone for subdued amber contexts (card titles, section labels).
