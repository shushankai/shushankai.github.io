/**
 * @file Cyberpunk Backdrop — animated terminal grid background.
 * @description Generates a grid of mini-terminals with rotating code/hacking scenarios
 * behind .literary-quote sections on pages with .container class.
 * Each terminal runs through a scenario (SSH, Nmap, training, Docker, etc.)
 * then recycles with a new scenario and position.
 * Pauses when the page is hidden to prevent wasted CPU.
 * @module cyberpunk-backdrop
 */

/** How often terminal lines update, in milliseconds */
const CYBERPUNK_UPDATE_MS = 500;

/** Number of terminals on desktop */
const DESKTOP_TERMINAL_COUNT = 15;

/** Number of terminals on mobile (reduced for performance) */
const MOBILE_TERMINAL_COUNT = 8;

/**
 * Inject the cyberpunk backdrop into a literary-quote element.
 * Only activates for full-width instances (those with `.container` class).
 * Creates a grid of animated mini-terminals behind the quote.
 *
 * @param {HTMLElement} el - The `.literary-quote` element to inject into.
 * @returns {void}
 */
export function injectCyberpunkBackdrop(el) {
  if (!el.classList.contains('container')) return;
  el.classList.add('cyberpunk-bg');

  const hex8 = () => (Math.random() * 0xFFFFFFFF >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const hexN = n => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const rr = (a, b) => a + Math.random() * (b - a);

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
      const opacity = rr(0.2, 0.4);
      const z = Math.floor(rr(0, 10));
      placements.push({ w, x, y, rot, opacity, z });
    }
    return placements;
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'cyberpunk-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const TERM_COUNT = window.innerWidth < 768 ? MOBILE_TERMINAL_COUNT : DESKTOP_TERMINAL_COUNT;
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

    const newX = rr(-2, 98), newY = rr(-5, 90), newRot = rr(-3.5, 3.5);
    const newOp = rr(0.2, 0.4);
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

  // Animation loop with visibility-based pause to prevent wasted CPU
  let intervalId = setInterval(() => {
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
  }, CYBERPUNK_UPDATE_MS);

  // Pause animation when page is hidden to save CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(intervalId);
      intervalId = null;
    } else if (!intervalId) {
      intervalId = setInterval(() => {
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
      }, CYBERPUNK_UPDATE_MS);
    }
  });
}
