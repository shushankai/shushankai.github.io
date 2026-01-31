import { icons, createElement } from 'lucide';

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
  initReadingProgress();
  initSidebarCards();
  initSmoothScroll();
  initTocHighlight();
});

// Reading progress bar (blog post page)
function initReadingProgress() {
  const progressBar = document.querySelector('.reading-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (window.scrollY / docHeight) * 100;
    progressBar.style.width = `${Math.min(scrolled, 100)}%`;
  });
}

// Sidebar card selection (blog index + projects)
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

// Smooth scroll for TOC links
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

// TOC active state based on scroll position
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

// Code copy button
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
