/**
 * @file Quote System — typewriter + glitch quote rotation in terminal chrome.
 * @description Rotates quotes from `data-quotes` JSON attribute on `.literary-quote`
 * elements. Wraps content in terminal chrome UI, types out quotes character by
 * character, shows author, applies glitch transition, then advances to next quote.
 * @module quote-system
 */

import { injectCyberpunkBackdrop } from './cyberpunk-backdrop.js';

/** Milliseconds between each character typed in the typewriter effect */
const TYPEWRITER_SPEED_MS = 35;

/** How long a quote stays visible before glitch transition (ms) */
const QUOTE_HOLD_MS = 5000;

/**
 * Initialize the quote rotation system for all elements with `data-quotes`.
 * Each element gets wrapped in terminal chrome and begins a typewriter loop.
 * Full-width instances (with `.container` parent) also get the cyberpunk backdrop.
 * @returns {void}
 */
export function initQuoteRotation() {
  const quoteElements = document.querySelectorAll('[data-quotes]');
  if (quoteElements.length === 0) return;

  quoteElements.forEach(el => {
    let quotes;
    try { quotes = JSON.parse(el.dataset.quotes); } catch { return; }
    if (!quotes || quotes.length < 2) return;

    const blockquote = el.querySelector('blockquote');
    const cursor = el.querySelector('.quote-cursor');
    const cite = el.querySelector('cite');
    if (!blockquote || !cite) return;

    // Inject terminal chrome wrapper
    const chrome = document.createElement('div');
    chrome.className = 'terminal-chrome';
    chrome.innerHTML = `
      <div class="terminal-titlebar">
        <div class="terminal-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <span class="terminal-title">sushi.terminal</span>
      </div>
      <div class="terminal-body">
        <div class="terminal-line"></div>
      </div>
    `;

    const terminalLine = chrome.querySelector('.terminal-line');
    const prompt = document.createElement('span');
    prompt.className = 'terminal-prompt';
    prompt.textContent = '>';
    terminalLine.appendChild(prompt);
    terminalLine.appendChild(blockquote);
    if (cursor) terminalLine.appendChild(cursor);

    const terminalBody = chrome.querySelector('.terminal-body');
    terminalBody.appendChild(cite);

    el.innerHTML = '';
    el.appendChild(chrome);
    injectCyberpunkBackdrop(el);

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
          cite.textContent = `// ${quote.author}`;
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
          }, QUOTE_HOLD_MS);
        }
      }, TYPEWRITER_SPEED_MS);
    }

    // Stagger start so multiple quotes on same page don't sync
    setTimeout(typeQuote, Math.random() * 800);
  });
}
