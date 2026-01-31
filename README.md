# sushi.lab

Personal website and digital lab — a living archive of explorations in AI, machine learning, and creative coding.

**Live:** [shushankai.github.io](https://shushankai.github.io/)

## Stack

- **Vite** — build tool and dev server
- **Three.js** — shader-based fluid gradient animation (simplex noise, domain warping)
- **Lucide** — icon system
- **Vanilla CSS** — custom properties, responsive breakpoints, animations

No frameworks. No CSS libraries.

## Structure

```
index.html              Home
about/index.html        About
blog/index.html         Blog listing
blog/post.html          Blog post template
projects/index.html     Projects
src/
  css/
    variables.css       Design tokens and responsive overrides
    reset.css           CSS reset
    base.css            Global typography and layout
    components.css      Shared components (header, footer, buttons, cursor)
    animations.css      Scroll and transition animations
    home.css            Home page styles
    blog.css            Blog page styles
    projects.css        Projects page styles
    about.css           About page styles
  js/
    main.js             App entry — icons, nav, scroll animations, quotes
    three-setup.js      Fluid gradient shader (Three.js)
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview   # preview production build locally
```

Output goes to `dist/`.

## License

All rights reserved.
