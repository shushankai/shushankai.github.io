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

// Expose for dynamic re-init (tutorials, etc.)
window.__lucideInit = initLucideIcons;

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

  // For staggered containers, also observe the parent so all children
  // get revealed together (prevents last children from staying invisible
  // if they're just outside the observer's rootMargin)
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

// ========== CYBERPUNK BACKDROP (full-width instances only) ==========
function injectCyberpunkBackdrop(el) {
  if (!el.classList.contains('container')) return;
  el.classList.add('cyberpunk-bg');

  const hex8 = () => (Math.random() * 0xFFFFFFFF >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hexN = n => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const rr = (a, b) => a + Math.random() * (b - a); // random in range

  const SCENARIOS = [
    // --- Hacking / Security ---
    { title: 'metasploit', color: '#FF5F56', steps: 26, getLines(s) {
      if (s < 2) return ['msf6 > use exploit/multi/handler', 'set PAYLOAD reverse_tcp', 'set LHOST 10.0.42.1'];
      if (s < 5) return ['[*] Started reverse handler', `[*] Sending stage (${s * 38}KB)...`, '[*] Meterpreter session opening...'];
      if (s > 23) return ['meterpreter > hashdump', 'Admin:500:aad3b435b51404ee', '[+] 3 hashes dumped'];
      return [`meterpreter > ${['sysinfo','getuid','ps','shell','upload','download','screenshot'][s%7]}`, `[+] ${['NT AUTHORITY\\SYSTEM','PID: '+s*47,'x86/windows','Success'][s%4]}`, `Session ${Math.ceil(s/5)} — ${s}s elapsed`];
    }},
    { title: 'hydra', color: '#FF6B6B', steps: 22, getLines(s) {
      const ips = ['192.168.1.42','10.0.0.17','172.16.4.99'];
      if (s > 19) return ['[22][ssh] host: 10.0.0.17', 'login: root  pass: toor', '[STATUS] attack finished'];
      return [`[ATTEMPT] target ${ips[s%3]}:22`, `login: admin  pass: ${'*'.repeat(5+s%6)}`, `[STATUS] ${s*47}/14344 tries  ${(s*2.1).toFixed(0)}/min`];
    }},
    { title: 'sqlmap', color: '#FF9F43', steps: 24, getLines(s) {
      if (s < 3) return ['$ sqlmap -u "site.com/?id=1"', "[*] testing 'AND boolean-based'", '[*] testing connection...'];
      if (s > 21) return ["[+] VULNERABLE: id param", "Type: UNION query", "Payload: id=1' UNION SELECT--"];
      const techs = ['boolean-blind','time-blind','error-based','UNION','stacked'];
      return [`[*] testing '${techs[s%5]}'`, `[${s}/${24}] payloads tested`, `[*] ${s%3===0?'possible injection point!':'not injectable'}`];
    }},
    { title: 'wireshark', color: '#4ECDC4', steps: 28, getLines(s) {
      const protos = ['TCP','UDP','HTTP','DNS','TLS','ARP','ICMP','SSH'];
      const src = `${10+s%5}.0.${s%3}.${s*7%255}`;
      return [`${src} → ${protos[s%8]} [${['SYN','ACK','PSH','FIN','RST'][s%5]}]`, `Len: ${Math.floor(rr(40,1500))}  TTL: ${64-s%8}`, `#${s*147}  ${protos[s%8]}  ${(rr(0.1,2.4)).toFixed(3)}s`];
    }},
    { title: 'rev_shell', color: '#FF5F56', steps: 20, getLines(s) {
      if (s < 3) return ['$ nc -lvp 4444', 'listening on 0.0.0.0:4444', 'waiting for connection...'];
      if (s < 5) return ['connect from 10.0.42.7:52341', 'id', 'uid=0(root) gid=0(root)'];
      const cmds = ['cat /etc/shadow','ls /root/.ssh','whoami','uname -a','cat /proc/version','ifconfig','netstat -an'];
      return [`# ${cmds[s%7]}`, `  ${['root','Linux srv 5.15.0','3 files','2 interfaces'][s%4]}`, s>17?'# exfil complete':'# ...'];
    }},
    { title: 'john', color: '#FFBD2E', steps: 24, getLines(s) {
      const h = () => hexN(12);
      if (s > 21) return ['3 passwords cracked', `admin:${h().slice(0,8)}`, 'Session completed'];
      return [`Loaded ${Math.min(50,s*3)} hashes (SHA-512)`, `g/s: ${(s*340).toFixed(0)}  p/s: ${(s*1200).toFixed(0)}`, `${s%4===0?'CRACKED → '+h():'testing... '+h()}`];
    }},
    { title: 'nmap', color: '#FFBD2E', steps: 24, getLines(s) {
      if (s < 2) return ['$ nmap -sV -A 10.0.42.0/24', 'Starting Nmap 7.94...', ''];
      const ports = [22,80,443,3306,6379,8080,5432,27017];
      const svcs = ['ssh','http','https','mysql','redis','proxy','postgres','mongo'];
      const st = ['open','closed','filtered','open'];
      return [`${ports[s%8]}/tcp ${st[s%4].padEnd(9)} ${svcs[s%8]}`, `Scanned: ${Math.min(254,s*14)}/254 hosts`, s>22?'Nmap done: 12 hosts up':'scanning...'];
    }},
    { title: 'gobuster', color: '#4ADE80', steps: 22, getLines(s) {
      const paths = ['/admin','/api','/backup','/config','/db','/debug','/env','/login','/panel','/secret','/shell','/test','/upload','/wp-admin'];
      const code = [200,403,301,404,200,403,200,301][s%8];
      return [`/${paths[s%14].slice(1).padEnd(12)} (Status: ${code})`, `Size: ${Math.floor(rr(200,15000))}`, `Found: ${Math.floor(s*1.3)}  Scanned: ${s*47}/4614`];
    }},
    // --- Neural / AI ---
    { title: 'train.py', color: '#A78BFA', steps: 28, getLines(s) {
      if (s < 3) return ['$ python train.py --gpu', 'Loading CIFAR-10...', 'ResNet-18 [11.7M params]'];
      const e = Math.floor((s-3)/2.5)+1, loss = (2.4*Math.exp(-0.1*(s-3))).toFixed(4);
      const acc = Math.min(97.3,30+(s-3)*2.8).toFixed(1);
      const n = Math.min(10,Math.floor((s-3)/2.5));
      return [`Epoch ${e}/20 [${'█'.repeat(n)}${'░'.repeat(10-n)}]`, `loss:${loss} acc:${acc}%`, s>25?'✓ Model saved':'training...'];
    }},
    { title: 'gan.py', color: '#A78BFA', steps: 26, getLines(s) {
      const gl = (2.0*Math.exp(-0.05*s)).toFixed(3), dl = (0.5+0.3*Math.sin(s*0.5)).toFixed(3);
      const fid = Math.max(12,180-s*7).toFixed(1);
      return [`Step ${s*500}/15000`, `G_loss:${gl} D_loss:${dl}`, `FID: ${fid}  ${s>23?'✓ converged':'generating...'}`];
    }},
    // --- System / Infra ---
    { title: 'wget', color: '#4ECDC4', steps: 22, getLines(s) {
      if (s < 2) return ['$ wget cdn.ai/weights.bin', 'Resolving...', ''];
      const pct = Math.min(100,Math.floor((s-2)*5.2)), mb = (pct*2.4).toFixed(1);
      const n = Math.floor(pct/10);
      return [`weights.bin ${pct}%`, `[${'#'.repeat(n)}${'-'.repeat(10-n)}] ${mb}/240MB`, pct>=100?'✓ Download complete':`${rr(1,2).toFixed(1)}MB/s`];
    }},
    { title: 'docker', color: '#60A5FA', steps: 22, getLines(s) {
      if (s < 3) return ['$ docker build -t app .', 'Sending context...', ''];
      if (s > 19) return ['Built a1b2c3d4','Tagged app:latest','847 MB'];
      const n = Math.min(8,s-3);
      return [`Step ${Math.floor(s/2)}/12 RUN install`, `[${'█'.repeat(n)}${'░'.repeat(8-n)}]`, `${s*38}MB downloaded`];
    }},
    { title: 'stream.hex', color: '#4ECDC4', steps: 30, getLines(s) {
      return [`0x${hex8()} 0x${hex8()}`, `0x${hex8()} 0x${hex8()}`, `>> pkts:${s*47} ${(s*1.2).toFixed(1)}KB/s`];
    }},
    { title: 'make -j8', color: '#4ADE80', steps: 20, getLines(s) {
      const f = ['main.c','render.c','net.c','audio.c','crypto.c','db.c','ui.c','init.c'];
      if (s>18) return ['Linking build/engine','✓ Build OK (0 err)',`${f.length} objects 1.2s`];
      return [`[${Math.min(100,s*6)}%] CC ${f[s%8]}`, s%3===0?`⚠ unused '${f[s%8][0]}'`:`→ ${f[s%8].replace('.c','.o')} OK`, `[${Math.min(8,Math.floor(s/2.5))}/8] built`];
    }},
    { title: 'ssh root@srv', color: '#FFBD2E', steps: 18, getLines(s) {
      if (s < 3) return ['$ ssh root@10.0.42.1', 'ECDH key exchange...', 'Authenticated.'];
      if (s > 15) return ['root@srv:~# exit', 'Connection closed.', ''];
      const c = ['ls -la','df -h','ps aux','uptime','free -m','top -bn1','netstat -tlnp'];
      return [`root@srv:~# ${c[s%7]}`, `  ${Math.floor(rr(1,99))} entries`, `up ${s*12}m load:${rr(0,4).toFixed(2)}`];
    }},
    { title: 'api.mon', color: '#FF9F43', steps: 26, getLines(s) {
      const m = ['GET','POST','PUT','DELETE','PATCH'], p = ['/users','/auth','/data','/config','/health'];
      const code = [200,201,200,404,200,500,200,200,301,200][s%10];
      return [`${m[s%5]} /api${p[s%5]} → ${code}`, `${Math.floor(rr(20,200))}ms`, `rps:${1200+Math.floor(rr(0,300))} ${code>=400?'▲ alert':'OK'}`];
    }},
  ];

  // --- Random placement engine ---
  function randomPlacement(count) {
    const placements = [];
    for (let i = 0; i < count; i++) {
      const w = Math.floor(rr(160, 260));
      const x = rr(-2, 98);
      const y = rr(-5, 90);
      const rot = rr(-3.5, 3.5);
      const opacity = rr(0.35, 0.7);
      const z = Math.floor(rr(0, 10));
      placements.push({ w, x, y, rot, opacity, z });
    }
    return placements;
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'cyberpunk-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const TERM_COUNT = 30;
  const placements = randomPlacement(TERM_COUNT);
  const states = [];

  for (let i = 0; i < TERM_COUNT; i++) {
    const si = i % SCENARIOS.length;
    const sc = SCENARIOS[si];
    const pl = placements[i];

    const term = document.createElement('div');
    term.className = 'cyber-terminal';
    term.style.cssText = `left:${pl.x}%;top:${pl.y}%;width:${pl.w}px;opacity:${pl.opacity};transform:rotate(${pl.rot}deg);z-index:${pl.z};box-shadow:0 0 ${Math.floor(rr(10,30))}px rgba(0,0,0,${rr(0.3,0.6).toFixed(2)});`;

    const bar = document.createElement('div');
    bar.className = 'cyber-terminal-bar';
    bar.innerHTML =
      `<span class="cyber-dot" style="background:${sc.color}"></span>` +
      '<span class="cyber-dot" style="background:#333"></span>' +
      '<span class="cyber-dot" style="background:#2a2a2a"></span>' +
      `<span class="cyber-title">${sc.title}</span>`;

    const body = document.createElement('div');
    body.className = 'cyber-terminal-body';
    for (let l = 0; l < 3; l++) {
      const line = document.createElement('div');
      line.className = 'cyber-line';
      line.style.color = sc.color;
      body.appendChild(line);
    }

    term.appendChild(bar);
    term.appendChild(body);
    backdrop.appendChild(term);

    states.push({
      el: term, body, si, pl,
      step: Math.floor(Math.random() * sc.steps * 0.7),
      phase: 'active',
      timer: 0,
    });
  }

  el.insertBefore(backdrop, el.firstChild);

  function updateLines(state) {
    const lines = SCENARIOS[state.si].getLines(state.step);
    const els = state.body.querySelectorAll('.cyber-line');
    els.forEach((el, i) => { el.textContent = lines[i] || ''; });
  }

  function recycle(state) {
    state.el.classList.remove('cyber-closing');
    state.si = Math.floor(Math.random() * SCENARIOS.length);
    const sc = SCENARIOS[state.si];
    state.step = 0;
    state.phase = 'active';

    // Randomize position on recycle for more chaos
    const newX = rr(-2, 98), newY = rr(-5, 90), newRot = rr(-3.5, 3.5);
    const newOp = rr(0.35, 0.7);
    state.el.style.left = newX + '%';
    state.el.style.top = newY + '%';
    state.el.style.transform = `rotate(${newRot}deg)`;
    state.el.style.opacity = newOp;

    const titleEl = state.el.querySelector('.cyber-title');
    if (titleEl) titleEl.textContent = sc.title;
    const dot = state.el.querySelector('.cyber-dot');
    if (dot) dot.style.background = sc.color;
    state.body.querySelectorAll('.cyber-line').forEach(el => { el.style.color = sc.color; });
    updateLines(state);

    state.el.classList.add('cyber-spawning');
    setTimeout(() => state.el.classList.remove('cyber-spawning'), 600);
  }

  states.forEach(updateLines);

  setInterval(() => {
    states.forEach(s => {
      if (s.phase === 'active') {
        s.step++;
        if (s.step >= SCENARIOS[s.si].steps) {
          s.phase = 'closing';
          s.timer = 3;
          s.el.classList.add('cyber-closing');
        } else {
          updateLines(s);
        }
      } else if (s.phase === 'closing') {
        if (--s.timer <= 0) { s.phase = 'dead'; s.timer = Math.floor(rr(1, 4)); }
      } else if (s.phase === 'dead') {
        if (--s.timer <= 0) recycle(s);
      }
    });
  }, 250);
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
