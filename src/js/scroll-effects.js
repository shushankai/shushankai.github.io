/**
 * @file Scroll Effects — all scroll-related behaviors consolidated.
 * @description Manages IntersectionObserver-based scroll animations, parallax blobs,
 * header hide/show, reading progress bar, and TOC active state highlighting.
 * Falls back gracefully when IntersectionObserver is unavailable.
 * @module scroll-effects
 */

/** Pixels user must scroll before header hides on downward scroll */
const HEADER_HIDE_THRESHOLD = 80;

/** Offset in pixels for smooth-scroll TOC navigation */
const SCROLL_OFFSET = 100;

/** Scroll position (in px) at which TOC heading is considered "current" */
const TOC_ACTIVE_OFFSET = 120;

/**
 * Initialize scroll-triggered reveal animations using IntersectionObserver.
 * Elements with `[data-animate]` are observed and get `.is-visible` when in view.
 * Stagger containers (`[data-stagger]`) reveal all children together.
 * Falls back to showing all elements immediately if IntersectionObserver is missing.
 * @returns {void}
 */
export function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('[data-animate]');
  if (animatedElements.length === 0) return;

  // Fallback: show all elements immediately if IntersectionObserver is unavailable
  if (!('IntersectionObserver' in window)) {
    animatedElements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );

  animatedElements.forEach(el => observer.observe(el));

  // Stagger containers: observe parent so all children reveal together
  // (prevents last children from staying invisible if outside rootMargin)
  const staggerParents = document.querySelectorAll('[data-stagger]');
  const staggerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('[data-animate]').forEach(child => {
            child.classList.add('is-visible');
            observer.unobserve(child);
          });
          staggerObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.01, rootMargin: '0px 0px 80px 0px' }
  );
  staggerParents.forEach(el => staggerObserver.observe(el));

  // Rainbow dividers get their own observer with higher threshold
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

/**
 * Initialize parallax effect on blobs with `[data-parallax]` attribute.
 * Moves blobs vertically based on scroll position with rAF throttling.
 * @returns {void}
 */
export function initParallaxBlobs() {
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

/**
 * Initialize header hide/show behavior on scroll.
 * Hides the header when scrolling down past threshold, shows on scroll up.
 * Adds shadow class when page is scrolled.
 * @returns {void}
 */
export function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  let lastScrollY = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        // Add shadow when scrolled
        header.classList.toggle('header-scrolled', currentScrollY > 10);

        // Hide/show based on scroll direction
        if (currentScrollY > HEADER_HIDE_THRESHOLD && currentScrollY > lastScrollY) {
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

/**
 * Initialize the reading progress bar (for blog posts and tutorials).
 * Updates the width of `.reading-progress` based on scroll position.
 * @returns {void}
 */
export function initReadingProgress() {
  const progressBar = document.querySelector('.reading-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (window.scrollY / docHeight) * 100;
    progressBar.style.width = `${Math.min(scrolled, 100)}%`;
  });
}

/**
 * Initialize TOC active-link highlighting based on scroll position.
 * Highlights the last heading that scrolled past the offset threshold.
 * @returns {void}
 */
export function initTocHighlight() {
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
      if (h.el.getBoundingClientRect().top <= TOC_ACTIVE_OFFSET) {
        current = h;
      }
    }
    tocLinks.forEach(l => l.classList.remove('active'));
    current.link.classList.add('active');
  });
}

/**
 * Initialize smooth scroll for TOC links.
 * Scrolls to the target heading with a fixed offset for the fixed header.
 * @returns {void}
 */
export function initSmoothScroll() {
  const tocLinks = document.querySelectorAll('.toc-link');
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - SCROLL_OFFSET;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    });
  });
}
