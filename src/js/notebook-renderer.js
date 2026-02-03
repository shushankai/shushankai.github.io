// notebook-renderer.js — Client-side Jupyter notebook renderer

// ---- Lightweight Markdown Parser ----

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseMarkdown(md) {
  // Collect code fences first to protect them
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
    const fenceMatch = block.match(/^\x00FENCE(\d+)\x00$/);
    if (fenceMatch) {
      const f = fences[parseInt(fenceMatch[1])];
      return `<div class="code-block"><div class="code-block-header"><span class="code-block-lang">${escapeHtml(f.lang)}</span></div><pre><code>${escapeHtml(f.code)}</code></pre></div>`;
    }

    // Headings
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

function parseInline(text) {
  // Images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}

// ---- Notebook Renderer ----

function renderCodeSource(source) {
  // Basic Python syntax highlighting
  let html = escapeHtml(source);

  // Keywords
  html = html.replace(/\b(import|from|as|def|class|return|if|elif|else|for|while|in|not|and|or|with|try|except|finally|raise|yield|lambda|pass|break|continue|True|False|None|print|self)\b/g,
    '<span class="keyword">$1</span>');

  // Function calls
  html = html.replace(/\b(\w+)(\s*\()/g, '<span class="function">$1</span>$2');

  // Strings (double-quoted)
  html = html.replace(/(f?&quot;.*?&quot;)/g, '<span class="string">$1</span>');
  // Strings (single-quoted)
  html = html.replace(/(f?&#39;.*?&#39;)/g, '<span class="string">$1</span>');
  // Fallback for single quotes that aren't HTML-escaped
  html = html.replace(/(f?'[^']*')/g, '<span class="string">$1</span>');

  // Comments
  html = html.replace(/(#.*?)(<br>|$)/g, '<span class="comment">$1</span>$2');

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');

  return html;
}

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
          return `<div class="nb-output nb-output-html">${output.html}</div>`;
        }
        if (output.type === 'error') {
          // Strip ANSI codes from traceback
          const tb = (output.traceback || '').replace(/\x1b\[[0-9;]*m/g, '');
          return `<div class="nb-output nb-output-error">${escapeHtml(output.ename)}: ${escapeHtml(output.evalue)}\n${escapeHtml(tb)}</div>`;
        }
        return '';
      }).join('');
    }

    return `
      <div class="nb-cell nb-cell-code">
        <div class="code-block${noOutputClass}">
          <div class="code-block-header">
            <span class="code-block-lang">python</span>
            <button class="code-copy-btn" onclick="copyCode(this)">
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

// Copy code button handler
window.copyCode = function(btn) {
  const code = btn.closest('.code-block').querySelector('code');
  navigator.clipboard.writeText(code.textContent).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check"></i> Copied!';
    if (window.__lucideInit) window.__lucideInit();
    setTimeout(() => {
      btn.innerHTML = original;
      if (window.__lucideInit) window.__lucideInit();
    }, 2000);
  });
};

// ---- Main ----

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('nb');

  if (!slug) {
    window.location.href = '/tutorials/';
    return;
  }

  try {
    const res = await fetch(`/tutorials/_rendered/${slug}.json`);
    if (!res.ok) throw new Error('Notebook not found');
    const data = await res.json();
    const { meta, cells } = data;

    // Update page title
    document.title = `${meta.title} - sushi.lab`;

    // Populate hero
    document.getElementById('tutorial-title').textContent = meta.title;
    document.getElementById('tutorial-desc').textContent = meta.description;

    // Tags
    const tagsEl = document.getElementById('tutorial-tags');
    const tagColors = ['tag-accent', 'tag-purple', 'tag-green', 'tag-default'];
    tagsEl.innerHTML = (meta.tags || []).map((tag, i) =>
      `<span class="tag ${tagColors[i % tagColors.length]}">${tag}</span>`
    ).join('');

    // Meta row
    const dateStr = meta.date ? new Date(meta.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }) : '';
    const diffClass = meta.difficulty ? `difficulty-${meta.difficulty.toLowerCase()}` : '';

    document.getElementById('tutorial-meta').innerHTML = [
      meta.difficulty ? `<span class="difficulty-badge ${diffClass}">${meta.difficulty}</span>` : '',
      meta.duration ? `<span><i data-lucide="clock"></i> ${meta.duration}</span>` : '',
      dateStr ? `<span><i data-lucide="calendar"></i> ${dateStr}</span>` : '',
      `<span><i data-lucide="code"></i> ${cells.length} cells</span>`
    ].filter(Boolean).join('');

    // Render cells
    const body = document.getElementById('tutorial-body');
    body.innerHTML = cells.map((cell, i) => renderCell(cell, i)).join('');

    // Build TOC from h2 headings
    const tocList = document.getElementById('tutorial-toc-list');
    const h2s = body.querySelectorAll('.nb-cell-markdown h2');
    if (h2s.length > 0) {
      tocList.innerHTML = Array.from(h2s).map((h2, i) => {
        const id = h2.id || `section-${i}`;
        h2.id = id;
        return `<a href="#${id}" class="toc-link${i === 0 ? ' active' : ''}">${h2.textContent}</a>`;
      }).join('');
    } else {
      document.getElementById('tutorial-toc').style.display = 'none';
    }

    // Sidebar info (optional — element may not exist)
    const infoList = document.getElementById('tutorial-info-list');
    if (infoList) {
      infoList.innerHTML = [
        meta.difficulty ? `<li><i data-lucide="signal"></i> ${meta.difficulty}</li>` : '',
        meta.duration ? `<li><i data-lucide="clock"></i> ${meta.duration}</li>` : '',
        `<li><i data-lucide="code"></i> ${cells.length} cells</li>`,
        dateStr ? `<li><i data-lucide="calendar"></i> ${dateStr}</li>` : ''
      ].filter(Boolean).join('');
    }

    // Re-init lucide icons for all new DOM elements
    if (window.__lucideInit) window.__lucideInit();

  } catch (err) {
    document.getElementById('tutorial-title').textContent = 'Tutorial Not Found';
    document.getElementById('tutorial-desc').textContent = 'The requested tutorial could not be loaded.';
    document.getElementById('tutorial-body').innerHTML = `<p style="color: var(--color-text-muted);">Could not load this tutorial. <a href="/tutorials/">Return to tutorials listing.</a></p>`;
  }
}

init();
