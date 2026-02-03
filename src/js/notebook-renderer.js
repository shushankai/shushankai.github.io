/**
 * @file Notebook Renderer — client-side Jupyter notebook cell renderer.
 * @description Fetches pre-processed notebook JSON from tutorials/_rendered/,
 * renders markdown and code cells with syntax highlighting, builds a TOC,
 * and handles code-copy functionality via event delegation.
 * HTML outputs are sanitized with DOMPurify before insertion.
 * @module notebook-renderer
 */

import DOMPurify from 'dompurify';

// ---- Lightweight Markdown Parser ----

/**
 * Escape HTML special characters for safe insertion.
 * @param {string} str - Raw string.
 * @returns {string} Escaped string.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parse a Markdown string into HTML. Handles headings, lists, code fences,
 * images, and paragraphs with inline formatting.
 * @param {string} md - Markdown source.
 * @returns {string} Rendered HTML string.
 */
function parseMarkdown(md) {
  // Collect code fences first to protect them from inline processing
  const fences = [];
  md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = fences.length;
    fences.push({ lang: lang || 'text', code: code.replace(/\n$/, '') });
    return `\x00FENCE${idx}\x00`;
  });

  // Split into blocks by blank lines
  const blocks = md.split(/\n{2,}/);
  const html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';

    // Code fence placeholder
    const fenceMatch = block.match(/^\0FENCE(\d+)\0$/);
    if (fenceMatch) {
      const f = fences[parseInt(fenceMatch[1])];
      return `<div class="code-block"><div class="code-block-header"><span class="code-block-lang">${escapeHtml(f.lang)}</span></div><pre><code>${escapeHtml(f.code)}</code></pre></div>`;
    }

    // Headings (# to ######)
    const headingMatch = block.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = parseInline(headingMatch[2]);
      const id = headingMatch[2].toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return `<h${level} id="${id}">${text}</h${level}>`;
    }

    // Unordered list
    if (/^[-*]\s/.test(block)) {
      const items = block.split(/\n/).filter(l => l.trim());
      const lis = items.map(item => {
        const text = item.replace(/^[-*]\s+/, '');
        return `<li>${parseInline(text)}</li>`;
      }).join('');
      return `<ul>${lis}</ul>`;
    }

    // Ordered list
    if (/^\d+\.\s/.test(block)) {
      const items = block.split(/\n/).filter(l => l.trim());
      const lis = items.map(item => {
        const text = item.replace(/^\d+\.\s+/, '');
        return `<li>${parseInline(text)}</li>`;
      }).join('');
      return `<ol>${lis}</ol>`;
    }

    // Image (standalone)
    const imgMatch = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      return `<img src="${escapeHtml(imgMatch[2])}" alt="${escapeHtml(imgMatch[1])}">`;
    }

    // Paragraph
    return `<p>${parseInline(block)}</p>`;
  }).join('\n');

  return html;
}

/**
 * Parse inline Markdown: images, links, bold, italic, code, line breaks.
 * @param {string} text - Inline text to process.
 * @returns {string} HTML with inline formatting.
 */
function parseInline(text) {
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

// ---- Notebook Renderer ----

/**
 * Render Python code source with basic syntax highlighting.
 * @param {string} source - Python code string.
 * @returns {string} HTML with syntax-highlighted spans.
 */
function renderCodeSource(source) {
  let html = escapeHtml(source);

  // Keywords
  html = html.replace(/\b(import|from|as|def|class|return|if|elif|else|for|while|in|not|and|or|with|try|except|finally|raise|yield|lambda|pass|break|continue|True|False|None|print|self)\b/g,
    '<span class="keyword">$1</span>');

  // Function calls
  html = html.replace(/\b(\w+)(\s*\()/g, '<span class="function">$1</span>$2');

  // Strings (double-quoted)
  html = html.replace(/(f?&quot;.*?&quot;)/g, '<span class="string">$1</span>');
  // Strings (single-quoted, HTML-escaped)
  html = html.replace(/(f?&#39;.*?&#39;)/g, '<span class="string">$1</span>');
  // Strings (single-quoted, unescaped fallback)
  html = html.replace(/(f?'[^']*')/g, '<span class="string">$1</span>');

  // Comments
  html = html.replace(/(#.*?)(<br>|$)/g, '<span class="comment">$1</span>$2');

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

  return html;
}

/**
 * Render a single notebook cell (markdown or code) to HTML.
 * HTML outputs are sanitized with DOMPurify. Code cells use a copy button
 * with a data attribute instead of an inline onclick handler.
 * @param {object} cell - Processed cell object { type, source, outputs, executionCount }.
 * @param {number} index - Cell index (used for execution count fallback).
 * @returns {string} Rendered HTML string.
 */
function renderCell(cell, index) {
  if (cell.type === 'markdown') {
    return `<div class="nb-cell nb-cell-markdown">${parseMarkdown(cell.source)}</div>`;
  }

  if (cell.type === 'code') {
    const hasOutput = cell.outputs && cell.outputs.length > 0;
    const execNum = cell.executionCount != null ? cell.executionCount : index + 1;
    const noOutputClass = hasOutput ? '' : ' no-output';

    let outputHtml = '';
    if (hasOutput) {
      outputHtml = cell.outputs.map(output => {
        if (output.type === 'text') {
          return `<div class="nb-output">${escapeHtml(output.text)}</div>`;
        }
        if (output.type === 'image') {
          return `<div class="nb-output nb-output-image"><img src="${output.data}" alt="Output"></div>`;
        }
        if (output.type === 'html') {
          // Sanitize HTML output before rendering
          return `<div class="nb-output nb-output-html">${DOMPurify.sanitize(output.html)}</div>`;
        }
        if (output.type === 'error') {
          // Strip ANSI escape codes from traceback
          const tb = (output.traceback || '').replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
          return `<div class="nb-output nb-output-error">${escapeHtml(output.ename)}: ${escapeHtml(output.evalue)}\n${escapeHtml(tb)}</div>`;
        }
        return '';
      }).join('');
    }

    // Use data-action attribute instead of inline onclick for CSP compliance
    return `
      <div class="nb-cell nb-cell-code">
        <div class="code-block${noOutputClass}">
          <div class="code-block-header">
            <span class="code-block-lang">python</span>
            <button class="code-copy-btn" data-action="copy-code">
              <i data-lucide="copy"></i> Copy
            </button>
          </div>
          <span class="nb-cell-number">[${execNum}]</span>
          <pre><code>${renderCodeSource(cell.source)}</code></pre>
        </div>
        ${outputHtml}
      </div>`;
  }

  return '';
}

/**
 * Copy code to clipboard with fallback for older browsers.
 * @param {HTMLElement} btn - The copy button that was clicked.
 */
function handleCopyCode(btn) {
  const code = btn.closest('.code-block')?.querySelector('code');
  if (!code) return;
  const text = code.textContent;

  const onSuccess = () => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check"></i> Copied!';
    if (window.__lucideInit) window.__lucideInit();
    setTimeout(() => {
      btn.innerHTML = original;
      if (window.__lucideInit) window.__lucideInit();
    }, 2000);
  };

  // Use Clipboard API if available, otherwise fall back to execCommand
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {});
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
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
}

// Set up event delegation for copy buttons (works for dynamically rendered cells)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="copy-code"]');
  if (btn) handleCopyCode(btn);
});

// ---- Main ----

/**
 * Initialize the notebook viewer: fetch rendered JSON, populate page, build TOC.
 */
async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('nb');

  // Validate slug to prevent path traversal
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    window.location.href = '/tutorials/';
    return;
  }

  try {
    const res = await fetch(`/tutorials/_rendered/${encodeURIComponent(slug)}.json`);
    if (!res.ok) throw new Error('Notebook not found');
    const data = await res.json();
    const { meta, cells } = data;

    // Update page title
    document.title = `${meta.title} - sushi.lab`;

    // Update meta description for SEO
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', meta.description || `${meta.title} - sushi.lab tutorial`);

    // Populate hero
    document.getElementById('tutorial-title').textContent = meta.title;
    document.getElementById('tutorial-desc').textContent = meta.description;

    // Tags
    const tagsEl = document.getElementById('tutorial-tags');
    const tagColors = ['tag-accent', 'tag-purple', 'tag-green', 'tag-default'];
    tagsEl.innerHTML = (meta.tags || []).map((tag, i) => {
      const safeTag = escapeHtml(tag);
      return `<span class="tag ${tagColors[i % tagColors.length]}">${safeTag}</span>`;
    }).join('');

    // Meta row
    const dateStr = meta.date ? new Date(meta.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }) : '';
    const diffClass = meta.difficulty ? `difficulty-${meta.difficulty.toLowerCase()}` : '';

    document.getElementById('tutorial-meta').innerHTML = [
      meta.difficulty ? `<span class="difficulty-badge ${diffClass}">${escapeHtml(meta.difficulty)}</span>` : '',
      meta.duration ? `<span><i data-lucide="clock"></i> ${escapeHtml(meta.duration)}</span>` : '',
      dateStr ? `<span><i data-lucide="calendar"></i> ${dateStr}</span>` : '',
      `<span><i data-lucide="code"></i> ${cells.length} cells</span>`
    ].filter(Boolean).join('');

    // Render cells (DOMPurify sanitizes HTML outputs inside renderCell)
    const body = document.getElementById('tutorial-body');
    body.innerHTML = DOMPurify.sanitize(
      cells.map((cell, i) => renderCell(cell, i)).join(''),
      { ADD_TAGS: ['span'], ADD_ATTR: ['data-action', 'data-lucide', 'class'] }
    );

    // Build TOC from h2 headings
    const tocList = document.getElementById('tutorial-toc-list');
    const h2s = body.querySelectorAll('.nb-cell-markdown h2');
    if (h2s.length > 0) {
      tocList.innerHTML = Array.from(h2s).map((h2, i) => {
        const id = h2.id || `section-${i}`;
        h2.id = id;
        return `<a href="#${id}" class="toc-link${i === 0 ? ' active' : ''}">${escapeHtml(h2.textContent)}</a>`;
      }).join('');
    } else {
      document.getElementById('tutorial-toc').style.display = 'none';
    }

    // Sidebar info (optional element)
    const infoList = document.getElementById('tutorial-info-list');
    if (infoList) {
      infoList.innerHTML = [
        meta.difficulty ? `<li><i data-lucide="signal"></i> ${escapeHtml(meta.difficulty)}</li>` : '',
        meta.duration ? `<li><i data-lucide="clock"></i> ${escapeHtml(meta.duration)}</li>` : '',
        `<li><i data-lucide="code"></i> ${cells.length} cells</li>`,
        dateStr ? `<li><i data-lucide="calendar"></i> ${dateStr}</li>` : ''
      ].filter(Boolean).join('');
    }

    // Re-init lucide icons for all new DOM elements
    if (window.__lucideInit) window.__lucideInit();

  } catch (_err) {
    document.getElementById('tutorial-title').textContent = 'Tutorial Not Found';
    document.getElementById('tutorial-desc').textContent = 'The requested tutorial could not be loaded.';
    document.getElementById('tutorial-body').innerHTML = `<p style="color: var(--color-text-muted);">Could not load this tutorial. <a href="/tutorials/">Return to tutorials listing.</a></p>`;
  }
}

init();
