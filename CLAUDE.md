# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (runs pre-build scripts, then Vite)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint (flat config, ESM)
npm run format       # Prettier (auto-fix)
```

Pre-build hooks (`predev`/`prebuild`) automatically run before dev/build:
1. `node src/js/build-notebooks.js` — scans `tutorials/notebooks/*.ipynb`, generates `tutorials/_notebooks.json` and `tutorials/_rendered/`
2. `node src/js/build-blog.js` — fetches Substack RSS feed, generates `blog/_posts.json` and `blog/_rendered/`
3. `node src/js/build-sitemap.js` — generates `public/sitemap.xml` from static pages + blog/tutorial slugs

Generated files (`_notebooks.json`, `_rendered/`, `_posts.json`, `sitemap.xml`) are gitignored and must be rebuilt.

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to main. CI runs `npm audit`, `npm run lint`, build, and output verification before deploying.

## Architecture

**No frameworks.** Pure HTML + vanilla CSS + vanilla JS, bundled by Vite.

### Multi-Page Setup

Vite is configured with 7 HTML entry points in `vite.config.js`:

| Entry | Page |
|-------|------|
| `index.html` | Home — centered hero ("yo!" + name + subtitle + CTAs) over Three.js gradient, Latest Articles (2 real posts), Tutorials (2 cards), Recent Work (2 projects) |
| `about/index.html` | About — hero, Career Arc (Three.js DNA helix + prose), tech stack marquee, art inspirations, current interests, learning philosophy |
| `blog/index.html` | Blog listing — centered hero, filter pills, search box, split layout (sidebar + preview panel with blobs) |
| `blog/post.html` | Blog post — dark editorial hero (dotted grid bg, L-connector, author row), sticky TOC sidebar, dark theme article body. Subtitle uses HTML entity decoding via temporary DOM element. |
| `projects/index.html` | Projects listing — centered hero, filter pills (ML/Tools/Viz), split layout (sidebar + preview panel with blobs), inline JS with project data |
| `tutorials/index.html` | Tutorials listing — centered hero, filter pills by difficulty, split layout (sidebar + preview panel with blobs) |
| `tutorials/view.html` | Jupyter notebook viewer — sidebar has TOC only (no Notebook Info card) |

Each page imports `src/js/main.js` (shared) plus page-specific CSS. Vite code-splits per entry. Three.js is isolated into its own chunk via `manualChunks` in `vite.config.js`.

### CSS Cascade Order

Files are imported in this order — each layer builds on the previous:

1. **`variables.css`** — All design tokens (colors, spacing, typography, radii, shadows, transitions). This is the single source of truth for the design system. See `DESIGN_RULES.md` for the full reference.
2. **`reset.css`** — Box-sizing, margin resets
3. **`base.css`** — Global typography, `.container`, `.section`, utility classes
4. **`components.css`** — Shared components: header, footer (3-column grid with `//` prefixed mono labels, vertical border separators), buttons (glow line effects), cards, tags, blobs, search, sidebar cards, literary quotes (terminal-style), cyberpunk backdrop, custom cursor, mobile nav, `:focus-visible` accessibility styles
5. **`animations.css`** — Scroll-triggered animations (`data-animate`), hover effects, `prefers-reduced-motion` support
6. **Page-specific CSS** — Each page has its own file with responsive overrides at the bottom

### JS Module Structure

`src/js/main.js` is a slim orchestrator (~175 lines) that imports and initializes all modules on DOMContentLoaded:

| Module | Exports | Description |
|--------|---------|-------------|
| `main.js` | — | Entry point. Lucide icons, sidebar cards, blob floating, code copy (with clipboard fallback), global error handlers. Lazy-loads `three-setup.js` when `.three-canvas-container` exists and `dna-helix.js` when `#dna-canvas` exists. |
| `navigation.js` | `initMobileNav()` | Mobile hamburger nav (created at 768px). Escape key closes nav. |
| `scroll-effects.js` | `initScrollAnimations()`, `initParallaxBlobs()`, `initHeaderScroll()`, `initReadingProgress()`, `initTocHighlight()`, `initSmoothScroll()` | All scroll-related behaviors. IntersectionObserver with fallback for older browsers. Named constants: `HEADER_HIDE_THRESHOLD`, `SCROLL_OFFSET`, `TOC_ACTIVE_OFFSET`. |
| `quote-system.js` | `initQuoteRotation()` | Typewriter + glitch quote rotation in terminal chrome. Named constants: `TYPEWRITER_SPEED_MS`, `QUOTE_HOLD_MS`. |
| `cyberpunk-backdrop.js` | `injectCyberpunkBackdrop()` | Grid of animated mini-terminals behind quote sections (full-width pages only). Pauses when tab is hidden (`visibilitychange`). Reduced terminal count on mobile (15 vs 30). Named constants: `CYBERPUNK_UPDATE_MS`, `DESKTOP_TERMINAL_COUNT`, `MOBILE_TERMINAL_COUNT`. |
| `three-setup.js` | `initThreeScene()` | Three.js shader-based fluid gradient with simplex noise, domain warping, and mouse tracking. WebGL detection with graceful fallback. Uses named imports (tree-shaken). Named constants: `TIME_INCREMENT`, `MOUSE_LERP_SPEED`. |
| `dna-helix.js` | `initDnaHelix()` | Three.js 3D DNA double helix for the about page Career Arc section. White spheres (`MeshStandardMaterial`) connected by thin white rungs. Transparent renderer so CSS dotted-grid background shows through. Dynamically sizes pair count to fill container height. Slow Y-axis rotation (`0.003 rad/frame`). Pauses when tab hidden. Respects `prefers-reduced-motion`. Named constants: `HELIX_RADIUS`, `TWIST_PER_STEP`, `ROTATION_SPEED`. |
| `notebook-renderer.js` | — (self-executing) | Client-side Markdown→HTML renderer for Jupyter notebook cells. DOMPurify sanitization. Event delegation for code copy (no inline onclick). Slug validation. |
| `utils.js` | `escapeHtml()`, `sanitizeUrl()`, `validateSlug()` | Shared security utilities for XSS prevention and input validation. |

### Build Scripts

| Script | Description |
|--------|-------------|
| `build-blog.js` | Fetches Substack RSS → parses XML → sanitizes HTML with DOMPurify (jsdom) → writes rendered JSON |
| `build-notebooks.js` | Processes `.ipynb` files → sanitizes HTML outputs with DOMPurify (jsdom) → writes rendered JSON |
| `build-sitemap.js` | Generates `public/sitemap.xml` from static pages + blog slugs + tutorial slugs |

### Content Pipeline

Blog posts and tutorials are generated at build time, not authored as static HTML:
- **Blog**: Fetched from Substack RSS → parsed → sanitized with DOMPurify → rendered to `blog/_rendered/` with metadata in `blog/_posts.json`
- **Tutorials**: Jupyter `.ipynb` files in `tutorials/notebooks/` → processed → sanitized with DOMPurify → metadata in `tutorials/_notebooks.json`, cells in `tutorials/_rendered/`
- Client-side JS reads the JSON indexes and renders content dynamically

### Literary Quote System

The `.literary-quote` component uses `data-quotes` JSON attributes for rotating quotes. JS wraps content in `.terminal-chrome` (terminal UI). On full-width pages (those with `.container` parent — home, about), `injectCyberpunkBackdrop()` adds a grid of animated background terminals. Blog sidebar instances are excluded. Projects page no longer has a literary quote section.

### Blog Post Dark Theme

`blog/post.html` uses a dark editorial layout with comprehensive `body:has(.post-hero)` overrides in `blog.css`: dotted grid background, white headings, `#D1D5DB` body text, dark code blocks, dark blockquotes, and dark table styles. The hero has an L-connector (`.post-connector`) linking title to the author bio area. The sidebar (`.post-sidebar`) is `position: sticky` with `max-height` and `overflow-y: auto`.

### About Page Career Arc

Two-column grid: left side has a Three.js DNA helix (`dna-helix.js`, lazy-loaded into `#dna-canvas`), right side has a large title, L-connector, and monospace prose paragraphs. The DNA canvas uses a transparent renderer so the page's dotted grid background shows through. Below is a scrolling tech stack marquee with centered "Tech Stack" title.

### Footer

3-column grid with vertical border separators. Column 1: brand + `//About` tagline. Column 2: `//Pages` and `//More` nav links. Column 3: `//Social` links. All monospace, `//` prefixed labels. Responsive: 2-col at 768px, single column at 480px. Footer HTML is duplicated across all 7 pages.

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

All three listing pages — blog (`blog/index.html`), tutorials (`tutorials/index.html`), and projects (`projects/index.html`) — share the same unified UI pattern:
- **Centered hero** with Three.js canvas, section label/title/description, and centered filter pills
- **Left sidebar** (320px) — clickable `.sidebar-card` items with gradient thumbnails, dynamically populated by JS
- **Right preview panel** — `.blob-container` with parallax blobs (pink/yellow/green/purple order), showing selected item details + CTA
- Inline `<script type="module">` fetches JSON data (blog/tutorials) or uses inline data (projects), renders sidebar, handles card clicks to update preview. All dynamic content is HTML-escaped via `esc()` helper. Async loaders have `.catch()` error boundaries with user-friendly messages.
- Filter pills filter the sidebar list and auto-select the first visible card
- Blog additionally has a search box below filter pills for text search
- Responsive: at 768px collapses to single column (preview on top, sidebar below as 2-col grid)

## Security

- **Content Security Policy**: All 7 HTML files include a `<meta http-equiv="Content-Security-Policy">` tag. Pages with inline scripts use `'unsafe-inline'` for `script-src`.
- **DOMPurify**: All HTML content from external sources (Substack RSS, Jupyter notebook outputs) is sanitized at build time (`build-blog.js`, `build-notebooks.js`) and at render time (`notebook-renderer.js`).
- **HTML escaping**: Inline scripts in blog/index, blog/post, tutorials/index, and projects/index use a DOM-based `esc()` helper for all dynamic text interpolation.
- **Slug validation**: `blog/post.html` and `notebook-renderer.js` validate URL parameters against `/^[a-zA-Z0-9_-]+$/` before fetching data.
- **Event delegation**: No inline `onclick` handlers. Code copy uses `data-action="copy-code"` with event delegation.

## SEO & Structured Data

- All 7 pages have `<meta name="description">`, `<meta name="author">`, Open Graph tags (`og:title`, `og:description`, `og:type`, `og:url`, `og:site_name`), Twitter card meta, and `theme-color`.
- `blog/post.html` dynamically updates meta description and OG tags after loading post data, and injects `BlogPosting` JSON-LD structured data.
- `index.html` has static `Person` JSON-LD structured data.
- `public/robots.txt` and `public/sitemap.xml` (auto-generated) are included.

## Key Conventions

- **Design tokens**: Always use CSS custom properties from `variables.css`. See `DESIGN_RULES.md` for the complete reference.
- **Fonts**: Space Grotesk (body), Space Mono (mono/code/labels/nav). Loaded from Google Fonts (weights 400–700, no 300).
- **Responsive breakpoints**: 1200px (tablet), 768px (mobile), 480px (small mobile). Mobile nav activates at 768px.
- **Animations**: Use `data-animate` attributes, not inline JS. Scroll reveals fire once via IntersectionObserver. Easing: `cubic-bezier(0.16, 1, 0.3, 1)`. Stagger delays use 60ms intervals (not 100ms) to prevent late-appearing items.
- **Overflow prevention**: Both `html` (in `reset.css`) and `body` (in `base.css`) have `overflow-x: hidden` to prevent horizontal scrollbar from `100vw` elements (which include scrollbar width). All preview panels and article bodies use `overflow-wrap: break-word`, `word-break: break-word`, and `min-width: 0` on grid children to prevent horizontal overflow on mobile.
- **TOC sidebar**: Uses a minimal left-border style (`border-left: 2px solid`) with plain text links, no card box. Title is hidden. Active link is bold with heading color.
- **Custom cursor**: SVG data-URI cursors in `components.css`. Disabled on touch devices.
- **CSS section markers**: Each section in CSS files is delimited with `/* ========== SECTION NAME ========== */` comments.
- **Dark sections**: Background `#0A0A0A`, card borders `#222`, text `#9CA3AF`/`#D1D5DB`.
- **Header changes**: The header is duplicated in all 7 HTML files. Any navbar change must be applied to every page.
- **Accessibility**: `:focus-visible` outlines on interactive elements in `components.css`. `aria-hidden="true"` on decorative blobs. `aria-label` on search inputs. Escape key closes mobile nav.
- **Error handling**: Global `window.error` and `unhandledrejection` handlers in `main.js`. All async data loaders have `.catch()` error boundaries. WebGL and IntersectionObserver have feature-detection fallbacks.
- **Dependencies**: `dompurify` (production), `jsdom` (dev, for Node.js DOMPurify), `eslint`, `prettier` (dev). Three.js and Lucide are dev dependencies bundled by Vite.

## Tooling

- **ESLint**: Flat config in `eslint.config.js` (ESLint 9+). Run via `npm run lint`.
- **Prettier**: Config in `.prettierrc`. Run via `npm run format`.
- **Browserslist**: `.browserslistrc` — `> 1%, last 2 versions, not dead, not ie 11`.
- **Dependabot**: `.github/dependabot.yml` — weekly npm dependency updates.
- **CI/CD**: `.github/workflows/deploy.yml` — audit, lint, build, verify dist output, then deploy to GitHub Pages.
