# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (runs pre-build scripts, then Vite)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
```

Pre-build hooks (`predev`/`prebuild`) automatically run before dev/build:
1. `node src/js/build-notebooks.js` — scans `tutorials/notebooks/*.ipynb`, generates `tutorials/_notebooks.json` and `tutorials/_rendered/`
2. `node src/js/build-blog.js` — fetches Substack RSS feed, generates `blog/_posts.json` and `blog/_rendered/`

Generated files (`_notebooks.json`, `_rendered/`, `_posts.json`) are gitignored and must be rebuilt.

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to main.

## Architecture

**No frameworks.** Pure HTML + vanilla CSS + vanilla JS, bundled by Vite.

### Multi-Page Setup

Vite is configured with 7 HTML entry points in `vite.config.js`:

| Entry | Page |
|-------|------|
| `index.html` | Home — centered hero ("yo!" + name + subtitle + CTAs) over Three.js gradient, Latest Articles (2 real posts), Tutorials (2 cards), Recent Work (2 projects) |
| `about/index.html` | About |
| `blog/index.html` | Blog listing — split layout (sidebar + preview panel with blobs), search, filter pills |
| `blog/post.html` | Blog post template (reading progress, TOC). Subtitle uses HTML entity decoding via temporary DOM element. |
| `projects/index.html` | Projects |
| `tutorials/index.html` | Tutorials listing — split layout (sidebar + preview panel with blobs), filter pills by difficulty |
| `tutorials/view.html` | Jupyter notebook viewer — sidebar has TOC only (no Notebook Info card) |

Each page imports `src/js/main.js` (shared) plus page-specific CSS. Vite code-splits per entry.

### CSS Cascade Order

Files are imported in this order — each layer builds on the previous:

1. **`variables.css`** — All design tokens (colors, spacing, typography, radii, shadows, transitions). This is the single source of truth for the design system. See `DESIGN_RULES.md` for the full reference.
2. **`reset.css`** — Box-sizing, margin resets
3. **`base.css`** — Global typography, `.container`, `.section`, utility classes
4. **`components.css`** — Shared components: header (dark, uppercase mono nav links, gradient rainbow bottom border, GitHub text link), footer, buttons, cards, tags, blobs, search, sidebar cards, literary quotes (terminal-style), cyberpunk backdrop, custom cursor, mobile nav
5. **`animations.css`** — Scroll-triggered animations (`data-animate`), hover effects, `prefers-reduced-motion` support
6. **Page-specific CSS** — Each page has its own file with responsive overrides at the bottom

### JS Module Structure

`src/js/main.js` is the app entry point. On DOMContentLoaded it initializes:
- Lucide icons (`data-lucide` attributes → SVGs, re-init via `window.__lucideInit()`)
- Mobile hamburger nav (dynamically created at 768px)
- Scroll animations (IntersectionObserver, `data-animate`/`data-delay`/`data-stagger`). Stagger containers (`data-stagger`) have a dedicated parent observer with `rootMargin: '0px 0px 80px 0px'` that reveals all children together to prevent late-appearing items.
- Parallax blobs (`data-parallax` attribute)
- Header hide/show on scroll
- Literary quote rotation — typewriter + glitch transition effect inside terminal chrome wrappers
- Cyberpunk backdrop — grid of 24 animated mini-terminals behind quote sections (only on pages with `.container` class)

`src/js/three-setup.js` — Three.js shader-based fluid gradient with simplex noise, domain warping, and mouse tracking. Runs on `.three-canvas-container` elements.

`src/js/notebook-renderer.js` — Client-side Markdown→HTML renderer for Jupyter notebook cells. Guards against optional sidebar elements (e.g., `tutorial-info-list`) that may not exist in the HTML.

### Content Pipeline

Blog posts and tutorials are generated at build time, not authored as static HTML:
- **Blog**: Fetched from Substack RSS → parsed → rendered to `blog/_rendered/` with metadata in `blog/_posts.json`
- **Tutorials**: Jupyter `.ipynb` files in `tutorials/notebooks/` → processed → metadata in `tutorials/_notebooks.json`, cells in `tutorials/_rendered/`
- Client-side JS reads the JSON indexes and renders content dynamically

### Literary Quote System

The `.literary-quote` component uses `data-quotes` JSON attributes for rotating quotes. JS wraps content in `.terminal-chrome` (terminal UI). On full-width pages (those with `.container` parent — home, about, projects), `injectCyberpunkBackdrop()` adds a grid of animated background terminals. Blog sidebar instances are excluded.

### Header

Dark background (`#0A0A0A`) with a gradient rainbow bottom border (`var(--gradient-rainbow)` via `::after` pseudo-element). Nav links use uppercase mono font (`font-family: var(--font-mono)`, `text-transform: uppercase`, `letter-spacing: 0.1em`). Right side has a GitHub text link (`.header-link`). The header HTML is duplicated across all 7 pages — changes must be applied to every file.

### Home Page Sections

The home page (`index.html`) has 4 dark card sections stacked vertically, each using `.dark-section` + `.dark-card-grid`:
1. **Hero** — centered layout: "yo!" greeting, massive name (`clamp(3rem, 8vw, 6rem)`), subtitle, CTA buttons over Three.js canvas
2. **Latest Articles** — `cols-2`, 2 real blog post cards linking to actual Substack slugs
3. **Tutorials** — `cols-2`, 2 tutorial cards linking to notebook viewer
4. **Recent Work** — `cols-2`, 2 project cards

Adjacent `.dark-section + .dark-section` collapses top padding via `padding-top: 0`.

### Split Layout Pattern

Both the blog index (`blog/index.html`) and tutorials index (`tutorials/index.html`) use the same split layout pattern:
- **Left sidebar** (320px) — clickable `.sidebar-card` items with gradient thumbnails
- **Right preview panel** — `.blob-container` with parallax blobs, showing selected item details + CTA
- Inline `<script type="module">` fetches JSON data, renders sidebar, handles card clicks to update preview
- Filter pills filter the sidebar list and auto-select the first visible card
- Responsive: at 768px collapses to single column (preview on top, sidebar below as 2-col grid)

## Key Conventions

- **Design tokens**: Always use CSS custom properties from `variables.css`. See `DESIGN_RULES.md` for the complete reference.
- **Fonts**: Space Grotesk (body), Space Mono (mono/code/labels/nav). Loaded from Google Fonts.
- **Responsive breakpoints**: 1200px (tablet), 768px (mobile), 640px (projects sidebar single-col), 480px (small mobile). Mobile nav activates at 768px.
- **Animations**: Use `data-animate` attributes, not inline JS. Scroll reveals fire once via IntersectionObserver. Easing: `cubic-bezier(0.16, 1, 0.3, 1)`. Stagger delays use 60ms intervals (not 100ms) to prevent late-appearing items.
- **Overflow prevention**: `body` has `overflow-x: hidden` in `base.css` to prevent horizontal scrollbar from `100vw` elements (which include scrollbar width). All preview panels and article bodies use `overflow-wrap: break-word`, `word-break: break-word`, and `min-width: 0` on grid children to prevent horizontal overflow on mobile.
- **TOC sidebar**: Uses a minimal left-border style (`border-left: 2px solid`) with plain text links, no card box. Title is hidden. Active link is bold with heading color.
- **Custom cursor**: SVG data-URI cursors in `components.css`. Disabled on touch devices.
- **CSS section markers**: Each section in CSS files is delimited with `/* ========== SECTION NAME ========== */` comments.
- **Dark sections**: Background `#0A0A0A`, card borders `#222`, text `#9CA3AF`/`#D1D5DB`.
- **Header changes**: The header is duplicated in all 7 HTML files. Any navbar change must be applied to every page.
