/**
 * @file Interactive grid background — canvas-based dotted grid with mouse proximity glow.
 * @description Replaces the static CSS dotted grid with an interactive canvas that
 * highlights dots, lines, and cells near the cursor. Uses requestAnimationFrame with
 * lerped mouse tracking for smooth animation. Pauses when tab is hidden. Disabled on
 * touch devices and when prefers-reduced-motion is set.
 * @module interactive-grid
 */

/* ========== CONSTANTS ========== */

const GRID_SIZE = 60;
const DOT_RADIUS = 1.5;
const DOT_BASE_ALPHA = 0.08;
const LINE_BASE_ALPHA = 0.035;
const GLOW_RADIUS = 280;
const GLOW_COLOR = [99, 102, 241]; // indigo
const MOUSE_LERP_SPEED = 0.12;
const OFF_SCREEN = -9999;

/* ========== MAIN ========== */

/**
 * Initialize the interactive grid canvas on dark-background pages.
 * @returns {function|null} Cleanup function, or null if initialization was skipped.
 */
export function initInteractiveGrid() {
  // Skip on touch-only devices — no hover to interact with
  if (window.matchMedia('(hover: none)').matches) return null;

  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);

  // Signal CSS to hide the static dotted grid
  document.body.classList.add('has-interactive-grid');

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let mouseX = OFF_SCREEN;
  let mouseY = OFF_SCREEN;
  let targetX = OFF_SCREEN;
  let targetY = OFF_SCREEN;
  let rafId = 0;
  let visible = true;
  let w = 0;
  let h = 0;

  /** Resize canvas to match device pixel ratio for crisp rendering. */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Main draw call — base grid + glow effect. */
  function draw() {
    ctx.clearRect(0, 0, w, h);

    const cols = Math.ceil(w / GRID_SIZE) + 1;
    const rows = Math.ceil(h / GRID_SIZE) + 1;

    // --- Base grid lines (batched into single path for performance) ---
    ctx.beginPath();
    for (let i = 0; i <= cols; i++) {
      const x = i * GRID_SIZE;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * GRID_SIZE);
    }
    for (let j = 0; j <= rows; j++) {
      const y = j * GRID_SIZE;
      ctx.moveTo(0, y);
      ctx.lineTo(cols * GRID_SIZE, y);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${LINE_BASE_ALPHA})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Base dots (batched) ---
    ctx.fillStyle = `rgba(255, 255, 255, ${DOT_BASE_ALPHA})`;
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        ctx.beginPath();
        ctx.arc(i * GRID_SIZE, j * GRID_SIZE, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Mouse glow effect ---
    if (mouseX <= OFF_SCREEN + 1) return;

    const glowR = GLOW_RADIUS;
    const startCol = Math.max(0, Math.floor((mouseX - glowR) / GRID_SIZE) - 1);
    const endCol = Math.min(cols, Math.ceil((mouseX + glowR) / GRID_SIZE) + 1);
    const startRow = Math.max(0, Math.floor((mouseY - glowR) / GRID_SIZE) - 1);
    const endRow = Math.min(rows, Math.ceil((mouseY + glowR) / GRID_SIZE) + 1);

    const gc = GLOW_COLOR;

    // Glow on dots near cursor
    for (let i = startCol; i <= endCol; i++) {
      for (let j = startRow; j <= endRow; j++) {
        const x = i * GRID_SIZE;
        const y = j * GRID_SIZE;
        const dist = Math.hypot(x - mouseX, y - mouseY);
        const t = Math.max(0, 1 - dist / glowR);
        if (t <= 0) continue;

        const eased = t * t;

        // Brighter white dot
        ctx.beginPath();
        ctx.arc(x, y, DOT_RADIUS + eased * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + eased * 0.55})`;
        ctx.fill();

        // Colored halo around dot
        if (eased > 0.04) {
          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS + 5 * eased, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${eased * 0.2})`;
          ctx.fill();
        }
      }
    }

    // Glow on line segments near cursor
    for (let i = startCol; i <= endCol; i++) {
      for (let j = startRow; j <= endRow; j++) {
        const x = i * GRID_SIZE;
        const y = j * GRID_SIZE;

        // Horizontal segment →
        if (i < cols) {
          const mx = x + GRID_SIZE * 0.5;
          const dist = Math.hypot(mx - mouseX, y - mouseY);
          const t = Math.max(0, 1 - dist / glowR);
          if (t > 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + GRID_SIZE, y);
            ctx.strokeStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${t * t * 0.18})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Vertical segment ↓
        if (j < rows) {
          const my = y + GRID_SIZE * 0.5;
          const dist = Math.hypot(x - mouseX, my - mouseY);
          const t = Math.max(0, 1 - dist / glowR);
          if (t > 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + GRID_SIZE);
            ctx.strokeStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${t * t * 0.18})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    // Highlight the cell directly under the cursor
    const cellX = Math.floor(mouseX / GRID_SIZE) * GRID_SIZE;
    const cellY = Math.floor(mouseY / GRID_SIZE) * GRID_SIZE;

    // Cell fill
    ctx.fillStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0.04)`;
    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

    // Cell border
    ctx.strokeStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0.35)`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

    // Adjacent cells — subtle border
    const adj = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    ctx.strokeStyle = `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0.1)`;
    ctx.lineWidth = 1;
    for (const [dx, dy] of adj) {
      const ax = cellX + dx * GRID_SIZE;
      const ay = cellY + dy * GRID_SIZE;
      if (ax >= 0 && ay >= 0 && ax < w && ay < h) {
        ctx.strokeRect(ax, ay, GRID_SIZE, GRID_SIZE);
      }
    }
  }

  /** Animation loop — lerps mouse position for smooth glow movement. */
  function tick() {
    if (!visible) return;

    mouseX += (targetX - mouseX) * MOUSE_LERP_SPEED;
    mouseY += (targetY - mouseY) * MOUSE_LERP_SPEED;

    draw();

    // Keep animating while mouse is moving toward target
    if (Math.abs(targetX - mouseX) > 0.3 || Math.abs(targetY - mouseY) > 0.3) {
      rafId = requestAnimationFrame(tick);
    } else {
      // Settled — do one final draw and stop
      mouseX = targetX;
      mouseY = targetY;
      draw();
      rafId = 0;
    }
  }

  /** Start the animation loop if not already running. */
  function startLoop() {
    if (!rafId && visible) {
      rafId = requestAnimationFrame(tick);
    }
  }

  // --- Event listeners ---

  function onMouseMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
    startLoop();
  }

  function onMouseLeave() {
    targetX = OFF_SCREEN;
    targetY = OFF_SCREEN;
    startLoop();
  }

  function onResize() {
    resize();
    draw();
  }

  function onVisibility() {
    visible = !document.hidden;
    if (visible) {
      resize();
      draw();
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  // Initial draw
  resize();
  draw();

  // Return cleanup function
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.remove();
    document.body.classList.remove('has-interactive-grid');
  };
}
