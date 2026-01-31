# sushi.lab Design Rules

Reference sheet for maintaining visual consistency across the site. All tokens are defined in `src/css/variables.css`.

---

## Color Palette

### Text

| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#1A1A1A` | Body text |
| `--color-text-heading` | `#1A1A2E` | Headings, strong emphasis |
| `--color-text-secondary` | `#666666` | Paragraphs, descriptions |
| `--color-text-muted` | `#64748B` | Captions, metadata, timestamps |

### Accent

| Token | Hex | Usage |
|---|---|---|
| `--color-accent` | `#FF6B6B` | Primary accent (coral red). CTAs, labels, active states, logo dot |
| `--color-accent-alt` | `#FF6B5B` | Accent variation for hover/pressed states |
| `--color-accent-yellow` | `#FFE66D` | Secondary accent (golden yellow). Sparkles, gradient endpoints |
| `--color-green` | `#4ECDC4` | Teal. Tags, project highlights, gradient endpoints |
| `--color-green-alt` | `#059669` | Dark green. Check icons, success states |
| `--color-purple` | `#7C3AED` | Purple. Tags, tertiary accent |
| `--color-purple-light` | `#A78BFA` | Light purple. Blobs, soft backgrounds |

### Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-white` | `#FFFFFF` | Default page background |
| `--color-bg-light` | `#F9FAFB` | Alternating sections, card backgrounds |
| `--color-bg-dark` | `#1A1A1A` | Footer, dark sections |
| `--color-bg-dark-secondary` | `#2A2A2A` | Dark section cards, footer icon backgrounds |

### Dark Section Colors (not tokenized, used inline)

| Hex | Usage |
|---|---|
| `#0A0A0A` | Dark section and header background |
| `#111` | Dark card hover state |
| `#222` | Dark card grid borders |
| `#333` | Dark card CTA button borders |
| `#9CA3AF` | Muted text on dark backgrounds |
| `#D1D5DB` | Body text on dark backgrounds |

### Borders

| Token | Hex | Usage |
|---|---|---|
| `--color-border` | `#E5E7EB` | Card borders, dividers, form inputs |
| `--color-border-alt` | `#E5E5E5` | Secondary border variation |

### Tag Tint Backgrounds

| Color | Background | Text |
|---|---|---|
| Accent (coral) | `#FEF2F2` | `--color-accent` |
| Green | `#ECFDF5` | `--color-green-alt` |
| Purple | `#F5F3FF` | `--color-purple` |
| Yellow | `#FFFBEB` | `#D97706` |
| Default | `--color-bg-light` | `--color-text-secondary` |

### Fluid Shader Palette (8 colors)

Used in `three-setup.js` for the background fluid animation. These cycle and blend over time.

| Index | Hex | Name |
|---|---|---|
| 0 | `#FF6B6B` | Coral red |
| 1 | `#FF8E53` | Warm orange |
| 2 | `#FFE66D` | Golden yellow |
| 3 | `#4ECDC4` | Teal |
| 4 | `#45B7D1` | Sky blue |
| 5 | `#6C5CE7` | Indigo |
| 6 | `#A78BFA` | Lavender purple |
| 7 | `#F472B6` | Pink |

---

## Gradients

| Token | Value | Usage |
|---|---|---|
| `--gradient-accent` | `135deg, #FF6B6B, #FFE66D` | Buttons, card thumbnails, gradient text |
| `--gradient-progress` | `90deg, #FF6B6B, #FFE66D, #4ECDC4` | Reading progress bar |
| `--gradient-rainbow` | `90deg, #FF6B6B, #FFE66D, #4ECDC4, #7C3AED` | Section dividers, decorative elements |
| Icon hover | `135deg, #FF6B6B, #FFE66D, #4ECDC4` | Social icons, header actions on hover |

---

## Typography

### Font Families

| Token | Stack | Usage |
|---|---|---|
| `--font-body` | `'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif` | All body text, headings, UI elements |
| `--font-mono` | `'Space Mono', 'Fira Code', monospace` | Labels, code, tags, quotes, CTAs |

Load from Google Fonts:
```
Space Grotesk: 300, 400, 500, 600, 700
Space Mono: 400, 700
```

### Font Sizes

| Token | Size | Typical Usage |
|---|---|---|
| `--text-xs` | `0.75rem` (12px) | Tags, metadata, small labels |
| `--text-sm` | `0.875rem` (14px) | Nav links, card descriptions, footer text |
| `--text-base` | `1rem` (16px) | Body text, paragraphs |
| `--text-lg` | `1.125rem` (18px) | Card titles, logo, section descriptions |
| `--text-xl` | `1.25rem` (20px) | Sub-headings, dark card titles |
| `--text-2xl` | `1.5rem` (24px) | h3 |
| `--text-3xl` | `1.875rem` (30px) | Medium headings |
| `--text-4xl` | `2.25rem` (36px) | h2, section titles |
| `--text-5xl` | `3rem` (48px) | h1, page titles |
| `--text-6xl` | `3.75rem` (60px) | Hero name (largest) |

### Heading Rules

- All headings: `font-weight: 700`, `line-height: 1.2`, `color: --color-text-heading`
- Body paragraphs: `color: --color-text-secondary`, `line-height: 1.7`
- Section labels: mono font, `--text-sm`, uppercase, `letter-spacing: 0.05em`, coral accent color
- Dark card CTAs: mono font, `--text-xs`, `font-weight: 700`, `letter-spacing: 0.1em`, uppercase

---

## Spacing Scale

All spacing uses a consistent `rem` scale:

| Token | Value |
|---|---|
| `--space-1` | `0.25rem` (4px) |
| `--space-2` | `0.5rem` (8px) |
| `--space-3` | `0.75rem` (12px) |
| `--space-4` | `1rem` (16px) |
| `--space-5` | `1.25rem` (20px) |
| `--space-6` | `1.5rem` (24px) |
| `--space-8` | `2rem` (32px) |
| `--space-10` | `2.5rem` (40px) |
| `--space-12` | `3rem` (48px) |
| `--space-16` | `4rem` (64px) |
| `--space-20` | `5rem` (80px) |
| `--space-24` | `6rem` (96px) |

### Common Patterns

- Section padding: `--space-24` vertical
- Card internal padding: `--space-6` to `--space-8`
- Element gap in flex/grid: `--space-2` to `--space-4`
- Section header margin-bottom: `--space-12`

---

## Layout

| Token | Value |
|---|---|
| `--max-width` | `1440px` |
| `--padding-x` | `80px` (desktop), `48px` (tablet), `24px` (mobile), `16px` (small mobile) |
| `--header-height` | `80px` (desktop), `64px` (mobile) |

### Container

```css
.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding-left: var(--padding-x);
  padding-right: var(--padding-x);
}
```

### Grid Patterns

- **2 column split** (sidebar + content): `320px 1fr` or `280px 1fr`
- **3 column cards**: `repeat(3, 1fr)` with `--space-8` gap
- **2 column cards**: `repeat(2, 1fr)` with `--space-8` gap
- **Footer**: `1.5fr 1fr 1fr 1fr`

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Small elements, code blocks |
| `--radius-md` | `8px` | Icon buttons, search inputs, thumbnails |
| `--radius-lg` | `12px` | Cards, sidebar items, tag icons |
| `--radius-xl` | `16px` | Large cards, interest cards |
| `--radius-2xl` | `24px` | Hero images, avatars, preview panels |
| `--radius-full` | `9999px` | Buttons, tags, pills, search box |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle card rest state |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Button hover, speech bubbles |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | Card hover state |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | Prominent floating elements |

---

## Transitions

| Token | Value | Usage |
|---|---|---|
| `--transition-fast` | `150ms ease` | Color changes, opacity, icon hover |
| `--transition-base` | `250ms ease` | Card hover, general UI transitions |
| `--transition-slow` | `350ms ease` | Layout shifts, section reveals |

### Easing

- UI interactions: `ease` (default)
- Scroll animations: `cubic-bezier(0.16, 1, 0.3, 1)` (decelerate curve)
- Animation duration for scroll reveals: `0.7s`
- Stagger delay between children: `100ms` increments

---

## Buttons

Four variants, all pill-shaped (`border-radius: --radius-full`):

| Variant | Background | Text | Border |
|---|---|---|---|
| `.btn-primary` | `--color-text-heading` | white | none |
| `.btn-outline` | transparent | `--color-text-heading` | `1.5px solid --color-border` |
| `.btn-accent` | `--color-accent` | white | none |
| `.btn-ghost` | transparent | `--color-text-secondary` | none |

- Padding: `12px 24px` (ghost: `8px 16px`)
- Font: `--text-sm`, weight `500`
- Hover: `translateY(-1px)` lift + shadow (primary/accent) or border darken (outline)
- Active: `scale(0.98)` press effect

---

## Tags / Pills

Pill-shaped (`border-radius: --radius-full`), mono font, `--text-xs`, weight `500`.

Padding: `4px 12px`.

Use the tag tint background table above for color pairing.

---

## Icons

- Library: **Lucide** (tree-shakeable, via `data-lucide` attributes)
- Default size: `20px` in nav/social, `16px` in buttons/meta, `24px` in interest cards, `40px` in dark cards
- Stroke width: `1.5` (dark cards), default elsewhere
- Hover effect on social icons: gradient `::before` pseudo-element fades in

---

## Responsive Breakpoints

| Breakpoint | Target | `--padding-x` |
|---|---|---|
| `> 1200px` | Desktop | `80px` |
| `768px - 1200px` | Tablet | `48px` |
| `480px - 768px` | Mobile | `24px` |
| `< 480px` | Small mobile | `16px` |

### Responsive Rules

- Grids collapse: 3-col to 2-col at 768px, to 1-col at 480px
- Font sizes scale down at each breakpoint (see `variables.css`)
- Section spacing reduces: `--space-24` becomes `4rem` at 768px, `3rem` at 480px
- Header height: `80px` desktop, `64px` mobile
- Mobile nav: fullscreen overlay triggered by hamburger at 768px
- Custom cursor disabled on touch devices (`@media (hover: none), (pointer: coarse)`)

---

## Animation Guidelines

### Scroll Reveals

Use `data-animate` attribute on elements:

| Value | Effect |
|---|---|
| `fade-up` | Fade in + slide up 40px |
| `fade-in` | Fade in only |
| `slide-left` | Fade in + slide from right 60px |
| `slide-right` | Fade in + slide from left 60px |
| `scale-in` | Fade in + scale from 0.9 |
| `text-reveal` | Clip-path wipe left to right |

- Add `data-delay="100"` through `data-delay="600"` for manual stagger
- Add `data-stagger` on parent for automatic 100ms child stagger
- All animations fire once (unobserved after visible)

### Hover Effects

- Cards: `translateY(-6px)` lift + deeper shadow
- Interest cards: `translateY(-4px)` lift
- Buttons: `translateY(-1px)` lift
- Social icons: gradient `::before` fade-in + `translateY(-2px)` + glow shadow
- Links: underline width animation from 0 to 100%

### Reduced Motion

All animations disabled via `@media (prefers-reduced-motion: reduce)`. Elements render in their final visible state with no transitions.

---

## Dark Sections

Background `#0A0A0A`. Card grid with `1px solid #222` borders. Cards hover to `#111`.

- Titles: `#FFFFFF`
- Body text: `#9CA3AF`
- Feature list text: `#D1D5DB`
- CTA buttons: white text, `#333` border, pill shape, mono font

---

## Cursor

Custom SVG cursors embedded as data URIs:

- **Default**: White arrow cursor with black outline
- **Pointer**: Hand cursor (white fill, black outline) on interactive elements
- **Touch devices**: Falls back to system default (`cursor: auto`)

---

## File Organization

```
src/css/
  variables.css    Tokens only. All colors, sizes, spacing defined here.
  reset.css        Box-sizing, margin reset.
  base.css         Global typography, .container, section patterns, utility classes.
  components.css   Shared components: header, footer, buttons, cards, tags, blobs,
                   search, sidebar, cursor, mobile nav, literary quotes.
  animations.css   All scroll/hover/transition animations and reduced-motion.
  home.css         Home page: hero, dark card sections.
  blog.css         Blog listing + post layout.
  projects.css     Projects listing.
  about.css        About page sections.
```

Each page-specific CSS file contains its own responsive overrides at the bottom. Shared responsive rules live in `components.css`.
