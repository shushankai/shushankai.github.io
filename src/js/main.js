import { icons, createElement } from 'lucide';
import { initThreeScene } from './three-setup.js';

function toPascalCase(str) {
  return str.replace(/(^|-)([a-z])/g, (_, _sep, c) => c.toUpperCase());
}

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

// Initialize all
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

  // Dynamic quote rotation
  initQuoteRotation();

  // Three.js fluid gradient background
  const heroCanvas = document.querySelector('.three-canvas-container');
  if (heroCanvas) {
    initThreeScene(heroCanvas, { count: heroCanvas.dataset.particles || 60 });
  }
});

// ========== MOBILE NAVIGATION ==========
function initMobileNav() {
  const header = document.querySelector('.header');
  const nav = document.querySelector('.header-nav');
  if (!header || !nav) return;

  // Create hamburger toggle button
  const toggle = document.createElement('button');
  toggle.className = 'mobile-nav-toggle';
  toggle.setAttribute('aria-label', 'Toggle navigation');
  toggle.innerHTML = '<span></span><span></span><span></span>';

  // Insert before header-actions (or at end of header .container)
  const container = header.querySelector('.container');
  const actions = header.querySelector('.header-actions');
  if (actions) {
    container.insertBefore(toggle, actions);
  } else {
    container.appendChild(toggle);
  }

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    toggle.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close nav when clicking a link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav-open');
      toggle.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// ========== SCROLL-TRIGGERED ANIMATIONS ==========
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('[data-animate]');
  if (animatedElements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // only animate once
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  animatedElements.forEach(el => observer.observe(el));

  // Also observe rainbow dividers
  const dividers = document.querySelectorAll('.rainbow-divider');
  const dividerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          dividerObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  dividers.forEach(el => dividerObserver.observe(el));
}

// ========== PARALLAX BLOBS ==========
function initParallaxBlobs() {
  const blobs = document.querySelectorAll('.blob[data-parallax]');
  if (blobs.length === 0) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        blobs.forEach(blob => {
          const speed = parseFloat(blob.dataset.parallax) || 0.1;
          const rect = blob.closest('section, .hero, .post-hero, .blog-preview, .projects-preview')?.getBoundingClientRect();
          if (rect && rect.bottom > 0 && rect.top < window.innerHeight) {
            const yOffset = scrollY * speed;
            blob.style.transform = `translateY(${yOffset}px)`;
          }
        });
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ========== HEADER HIDE/SHOW ON SCROLL ==========
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastScrollY = 0;
  let ticking = false;
  const threshold = 80; // pixels before header hides

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        // Add shadow when scrolled
        if (currentScrollY > 10) {
          header.classList.add('header-scrolled');
        } else {
          header.classList.remove('header-scrolled');
        }

        // Hide/show based on scroll direction
        if (currentScrollY > threshold && currentScrollY > lastScrollY) {
          header.classList.add('header-hidden');
        } else {
          header.classList.remove('header-hidden');
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ========== BLOB FLOATING ANIMATION ==========
function initBlobFloating() {
  const blobs = document.querySelectorAll('.blob');
  blobs.forEach(blob => {
    blob.classList.add('blob-animated');
  });
}

// ========== READING PROGRESS BAR ==========
function initReadingProgress() {
  const progressBar = document.querySelector('.reading-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (window.scrollY / docHeight) * 100;
    progressBar.style.width = `${Math.min(scrolled, 100)}%`;
  });
}

// ========== SIDEBAR CARD SELECTION ==========
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

// ========== SMOOTH SCROLL FOR TOC ==========
function initSmoothScroll() {
  const tocLinks = document.querySelectorAll('.toc-link');
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        const headerOffset = 100;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    });
  });
}

// ========== TOC ACTIVE STATE ==========
function initTocHighlight() {
  const tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length === 0) return;

  const headings = [];
  tocLinks.forEach(link => {
    const id = link.getAttribute('href')?.slice(1);
    if (id) {
      const heading = document.getElementById(id);
      if (heading) headings.push({ el: heading, link });
    }
  });

  if (headings.length === 0) return;

  window.addEventListener('scroll', () => {
    let current = headings[0];
    for (const h of headings) {
      if (h.el.getBoundingClientRect().top <= 120) {
        current = h;
      }
    }
    tocLinks.forEach(l => l.classList.remove('active'));
    current.link.classList.add('active');
  });
}

// ========== TYPEWRITER + GLITCH QUOTE ROTATION ==========
function initQuoteRotation() {
  const quoteElements = document.querySelectorAll('[data-quotes]');
  if (quoteElements.length === 0) return;

  quoteElements.forEach(el => {
    let quotes;
    try { quotes = JSON.parse(el.dataset.quotes); } catch { return; }
    if (!quotes || quotes.length < 2) return;

    const blockquote = el.querySelector('blockquote');
    const cite = el.querySelector('cite');
    if (!blockquote || !cite) return;

    let index = 0;

    function typeQuote() {
      const quote = quotes[index];
      const fullText = `"${quote.text}"`;
      let charIdx = 0;

      blockquote.textContent = '';
      cite.textContent = '';
      cite.classList.remove('cite-visible');

      const typeInterval = setInterval(() => {
        if (charIdx < fullText.length) {
          blockquote.textContent += fullText[charIdx];
          charIdx++;
        } else {
          clearInterval(typeInterval);
          // Show author after typing completes
          cite.textContent = `\u2014 ${quote.author}`;
          cite.classList.add('cite-visible');

          // Hold, then glitch, then next quote
          setTimeout(() => {
            el.classList.add('quote-glitching');

            setTimeout(() => {
              el.classList.remove('quote-glitching');
              blockquote.textContent = '';
              cite.textContent = '';
              cite.classList.remove('cite-visible');
              index = (index + 1) % quotes.length;

              setTimeout(typeQuote, 350);
            }, 450);
          }, 5000);
        }
      }, 35);
    }

    // Stagger start so multiple quotes on same page don't sync
    setTimeout(typeQuote, Math.random() * 800);
  });
}

// ========== CODE COPY BUTTON ==========
document.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.code-copy-btn');
  if (!copyBtn) return;

  const codeBlock = copyBtn.closest('.code-block');
  const code = codeBlock?.querySelector('code')?.textContent;
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      const original = copyBtn.innerHTML;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.innerHTML = original; }, 2000);
    });
  }
});
