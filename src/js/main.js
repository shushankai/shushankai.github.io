/**
 * @file Main entry point — orchestrates all site modules.
 * @description Initializes Lucide icons, mobile nav, scroll effects, quote rotation,
 * Three.js gradient (lazy-loaded), and code copy handlers. Registers global error
 * handlers for graceful degradation.
 * @module main
 */

import { icons, createElement } from 'lucide';
import { initMobileNav } from './navigation.js';
import {
  initScrollAnimations,
  initParallaxBlobs,
  initHeaderScroll,
  initReadingProgress,
  initTocHighlight,
  initSmoothScroll,
} from './scroll-effects.js';

// ========== GLOBAL ERROR HANDLERS ==========

/** Catch uncaught errors to prevent full page breakage */
window.addEventListener('error', (e) => {
  console.error('[sushi.lab] Uncaught error:', e.message, e.filename, e.lineno);
});

/** Catch unhandled promise rejections (e.g. fetch failures) */
window.addEventListener('unhandledrejection', (e) => {
  console.error('[sushi.lab] Unhandled rejection:', e.reason);
});

// ========== LUCIDE ICONS ==========

/**
 * Convert a kebab-case string to PascalCase (e.g. "arrow-right" -> "ArrowRight").
 * @param {string} str - Kebab-case string.
 * @returns {string} PascalCase string.
 */
function toPascalCase(str) {
  return str.replace(/(^|-)([a-z])/g, (_, _sep, c) => c.toUpperCase());
}

/**
 * Initialize Lucide icons by replacing all `[data-lucide]` elements with SVGs.
 * @returns {void}
 */
function initLucideIcons() {
  const elements = document.querySelectorAll('[data-lucide]');
  elements.forEach(element => {
    const name = element.getAttribute('data-lucide');
    const iconName = toPascalCase(name);
    const iconNode = icons[iconName];
    if (!iconNode) return;

    const attrs = {};
    for (const attr of element.attributes) {
      if (attr.name !== 'data-lucide') {
        attrs[attr.name] = attr.value;
      }
    }

    const svg = createElement(iconNode, {
      'aria-hidden': 'true',
      ...attrs,
      class: `lucide lucide-${name}${attrs.class ? ' ' + attrs.class : ''}`,
    });
    element.parentNode?.replaceChild(svg, element);
  });
}

// Expose for dynamic re-init (tutorials, blog post pages, etc.)
window.__lucideInit = initLucideIcons;

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', () => {
  initLucideIcons();
  initMobileNav();
  initScrollAnimations();
  initParallaxBlobs();
  initHeaderScroll();
  initReadingProgress();
  initSidebarCards();
  initSmoothScroll();
  initTocHighlight();
  initBlobFloating();
  // Lazy-load Three.js only when a canvas container exists on the page
  const heroCanvas = document.querySelector('.three-canvas-container');
  if (heroCanvas) {
    import('./three-setup.js')
      .then(({ initThreeScene }) => {
        const result = initThreeScene(heroCanvas, { count: heroCanvas.dataset.particles || 60 });
        if (!result) {
          // WebGL unavailable — CSS gradient fallback is already visible behind canvas
          heroCanvas.style.display = 'none';
        }
      })
      .catch(() => {
        // Three.js failed to load — degrade gracefully
        heroCanvas.style.display = 'none';
      });
  }

  // Lazy-load DNA helix when its container exists on the page
  const dnaCanvas = document.getElementById('dna-canvas');
  if (dnaCanvas) {
    import('./dna-helix.js')
      .then(({ initDnaHelix }) => {
        if (!initDnaHelix(dnaCanvas)) {
          dnaCanvas.style.display = 'none';
        }
      })
      .catch(() => {
        dnaCanvas.style.display = 'none';
      });
  }
});

// ========== BLOB FLOATING ANIMATION ==========

/**
 * Add floating animation class to all blobs.
 * @returns {void}
 */
function initBlobFloating() {
  const blobs = document.querySelectorAll('.blob');
  blobs.forEach(blob => {
    blob.classList.add('blob-animated');
  });
}

// ========== SIDEBAR CARD SELECTION ==========

/**
 * Initialize click-to-select behavior on sidebar cards (blog/projects).
 * @returns {void}
 */
function initSidebarCards() {
  const sidebars = document.querySelectorAll('.blog-sidebar, .projects-sidebar');

  sidebars.forEach(sidebar => {
    const cards = sidebar.querySelectorAll('.sidebar-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active', 'active-teal'));
        const activeClass = sidebar.classList.contains('projects-sidebar') ? 'active-teal' : 'active';
        card.classList.add(activeClass);
      });
    });
  });
}

// ========== CODE COPY BUTTON (global event delegation) ==========

document.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.code-copy-btn');
  if (!copyBtn) return;

  const codeBlock = copyBtn.closest('.code-block');
  const code = codeBlock?.querySelector('code')?.textContent;
  if (!code) return;

  const onSuccess = () => {
    const original = copyBtn.innerHTML;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.innerHTML = original; }, 2000);
  };

  // Use Clipboard API if available, fall back to execCommand
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(onSuccess).catch(() => {});
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      onSuccess();
    } catch { /* ignore */ }
    document.body.removeChild(textarea);
  }
});
