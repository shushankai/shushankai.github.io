import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform vec3 u_colors[8];

  varying vec2 vUv;

  // --- 3D Simplex noise (Ashima Arts) ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Rotate 2D point
  vec2 rotate2D(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    float t = u_time;

    // Mouse influence — wider gaussian falloff, displaces UV
    vec2 mouseUV = u_mouse;
    mouseUV.x *= aspect;
    float mouseDist = length(uv - mouseUV);
    float mouseInfluence = exp(-mouseDist * mouseDist * 6.0) * 0.25;
    vec2 mouseDisplace = normalize(uv - mouseUV + 0.001) * mouseInfluence * 0.3;

    // First domain warp — slow large-scale flow
    float warp1x = snoise(vec3(uv * 1.0, t * 0.6)) * 0.5;
    float warp1y = snoise(vec3(uv * 1.0 + 100.0, t * 0.6)) * 0.5;
    vec2 warped = uv + vec2(warp1x, warp1y) + mouseDisplace;

    // Second domain warp — viscous folding
    float warp2x = snoise(vec3(warped * 0.7, t * 0.4 + 50.0)) * 0.4;
    float warp2y = snoise(vec3(warped * 0.7 + 200.0, t * 0.4 + 50.0)) * 0.4;
    vec2 doubleWarped = warped + vec2(warp2x, warp2y);

    // Third domain warp — fine viscous tendrils
    float warp3x = snoise(vec3(doubleWarped * 1.5, t * 0.8 + 150.0)) * 0.15;
    float warp3y = snoise(vec3(doubleWarped * 1.5 + 300.0, t * 0.8 + 150.0)) * 0.15;
    vec2 tripleWarped = doubleWarped + vec2(warp3x, warp3y);

    // Slowly rotating coordinate for extra organic movement
    vec2 rotUV = rotate2D(tripleWarped - 0.5, t * 0.15) + 0.5;

    // Two independent noise fields for color channel separation
    float n1 = 0.0;
    n1 += snoise(vec3(tripleWarped * 0.5, t * 0.25)) * 0.5;
    n1 += snoise(vec3(tripleWarped * 1.2, t * 0.5 + 10.0)) * 0.3;
    n1 += snoise(vec3(tripleWarped * 2.5, t * 0.9 + 20.0)) * 0.15;
    n1 += snoise(vec3(tripleWarped * 4.0, t * 1.2 + 30.0)) * 0.05;
    n1 = n1 * 0.5 + 0.5;

    float n2 = 0.0;
    n2 += snoise(vec3(rotUV * 0.6, t * 0.3 + 500.0)) * 0.5;
    n2 += snoise(vec3(rotUV * 1.4, t * 0.55 + 510.0)) * 0.3;
    n2 += snoise(vec3(rotUV * 2.8, t * 0.85 + 520.0)) * 0.15;
    n2 += snoise(vec3(rotUV * 4.5, t * 1.1 + 530.0)) * 0.05;
    n2 = n2 * 0.5 + 0.5;

    // Mouse brightening on both channels
    n1 += mouseInfluence * 0.6;
    n2 += mouseInfluence * 0.4;

    // Time-varying palette offset — colors cycle slowly
    float paletteShift = t * 0.12;

    // 8-color palette blend using two noise channels
    // Channel 1: selects base color pair
    // Channel 2: cross-mixes with adjacent colors
    float idx1 = n1 * 7.0; // maps 0..1 to 0..7 (8 colors)
    float idx2 = n2 * 7.0;

    // Shift indices over time for continuous color cycling
    idx1 = mod(idx1 + paletteShift, 7.0);
    idx2 = mod(idx2 + paletteShift * 1.3 + 3.5, 7.0);

    // Blend from palette using idx1
    int i1 = int(floor(idx1));
    float f1 = fract(idx1);
    vec3 col1;
    // Manual indexing for WebGL1 compatibility
    vec3 ca, cb;
    if (i1 == 0) { ca = u_colors[0]; cb = u_colors[1]; }
    else if (i1 == 1) { ca = u_colors[1]; cb = u_colors[2]; }
    else if (i1 == 2) { ca = u_colors[2]; cb = u_colors[3]; }
    else if (i1 == 3) { ca = u_colors[3]; cb = u_colors[4]; }
    else if (i1 == 4) { ca = u_colors[4]; cb = u_colors[5]; }
    else if (i1 == 5) { ca = u_colors[5]; cb = u_colors[6]; }
    else { ca = u_colors[6]; cb = u_colors[7]; }
    col1 = mix(ca, cb, smoothstep(0.0, 1.0, f1));

    // Blend from palette using idx2
    int i2 = int(floor(idx2));
    float f2 = fract(idx2);
    vec3 col2;
    vec3 cc, cd;
    if (i2 == 0) { cc = u_colors[0]; cd = u_colors[1]; }
    else if (i2 == 1) { cc = u_colors[1]; cd = u_colors[2]; }
    else if (i2 == 2) { cc = u_colors[2]; cd = u_colors[3]; }
    else if (i2 == 3) { cc = u_colors[3]; cd = u_colors[4]; }
    else if (i2 == 4) { cc = u_colors[4]; cd = u_colors[5]; }
    else if (i2 == 5) { cc = u_colors[5]; cd = u_colors[6]; }
    else { cc = u_colors[6]; cd = u_colors[7]; }
    col2 = mix(cc, cd, smoothstep(0.0, 1.0, f2));

    // Cross-mix the two color channels for richer blending
    float crossMix = snoise(vec3(tripleWarped * 0.4, t * 0.2 + 800.0)) * 0.5 + 0.5;
    vec3 color = mix(col1, col2, crossMix);

    // Vignette edge fade
    vec2 vignetteUV = vUv * 2.0 - 1.0;
    float vignette = 1.0 - dot(vignetteUV * 0.5, vignetteUV * 0.5);
    vignette = smoothstep(0.0, 0.7, vignette);

    float alpha = 0.45 * vignette;

    gl_FragColor = vec4(color, alpha);
  }
`;

class FluidGradient {
  constructor(container, options = {}) {
    this.container = container;
    this.disposed = false;
    this.targetMouse = { x: 0.5, y: 0.5 };
    this.smoothMouse = { x: 0.5, y: 0.5 };

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();

    if (!this.reducedMotion) {
      this.animate();
      this.addEventListeners();
    } else {
      this.uniforms.u_time.value = 5.0;
      this.renderer.render(this.scene, this.camera);
    }
  }

  init() {
    const { container } = this;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 600;

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_colors: {
        value: [
          new THREE.Color('#FF6B6B'), // coral red
          new THREE.Color('#FF8E53'), // warm orange
          new THREE.Color('#FFE66D'), // golden yellow
          new THREE.Color('#4ECDC4'), // teal
          new THREE.Color('#45B7D1'), // sky blue
          new THREE.Color('#6C5CE7'), // indigo
          new THREE.Color('#A78BFA'), // lavender purple
          new THREE.Color('#F472B6'), // pink
        ],
      },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  animate() {
    if (this.disposed) return;
    requestAnimationFrame(() => this.animate());

    this.uniforms.u_time.value += 0.0004;

    // Smooth mouse lerp for viscous lag
    this.smoothMouse.x += (this.targetMouse.x - this.smoothMouse.x) * 0.03;
    this.smoothMouse.y += (this.targetMouse.y - this.smoothMouse.y) * 0.03;
    this.uniforms.u_mouse.value.set(this.smoothMouse.x, this.smoothMouse.y);

    this.renderer.render(this.scene, this.camera);
  }

  addEventListeners() {
    this.onMouseMove = (e) => {
      this.targetMouse.x = e.clientX / window.innerWidth;
      this.targetMouse.y = 1.0 - e.clientY / window.innerHeight;
    };

    this.onTouchMove = (e) => {
      if (e.touches.length > 0) {
        this.targetMouse.x = e.touches[0].clientX / window.innerWidth;
        this.targetMouse.y = 1.0 - e.touches[0].clientY / window.innerHeight;
      }
    };

    this.onResize = () => {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || 600;
      this.renderer.setSize(width, height);
      this.uniforms.u_resolution.value.set(width, height);
    };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('resize', this.onResize);
  }

  dispose() {
    this.disposed = true;

    if (this.onMouseMove) window.removeEventListener('mousemove', this.onMouseMove);
    if (this.onTouchMove) window.removeEventListener('touchmove', this.onTouchMove);
    if (this.onResize) window.removeEventListener('resize', this.onResize);

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export function initThreeScene(container, options = {}) {
  return new FluidGradient(container, options);
}
