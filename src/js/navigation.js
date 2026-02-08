/**
 * @file Mobile Navigation — hamburger menu creation and toggle logic.
 * @description Creates the mobile hamburger toggle button at 768px breakpoint,
 * manages open/close state, and closes on link click or Escape key.
 * @module navigation
 */

/**
 * Initialize the mobile navigation hamburger menu.
 * Creates toggle button, manages open/close state, handles Escape key.
 * @returns {void}
 */
export function initMobileNav() {
  const header = document.querySelector('.header');
  const nav = document.querySelector('.header-nav');
  if (!header || !nav) return;

  // Create hamburger toggle button (3 animated spans)
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

  function closeNav() {
    nav.classList.remove('nav-open');
    toggle.classList.remove('active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('nav-open');
    toggle.classList.toggle('active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close nav when clicking a link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

  // Close nav on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
      closeNav();
    }
  });
}
