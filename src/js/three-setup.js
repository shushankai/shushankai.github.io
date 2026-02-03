/**
 * @file Three.js Fluid Gradient — shader-based animated background.
 * @description Creates a full-screen fluid gradient effect using Three.js with
 * custom GLSL shaders. Features simplex noise for organic movement, triple domain
 * warping for viscous fluid simulation, mouse-reactive displacement, and an
 * 8-color cycling palette. Includes WebGL detection and reduced-motion support.
 * @module three-setup
 */

import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  Vector2,
  Color,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
} from 'three';

/** Time increment per animation frame (controls overall animation speed) */
const TIME_INCREMENT = 0.0004;

/** Mouse interpolation speed (lower = more viscous lag) */
const MOUSE_LERP_SPEED = 0.03;

// ========== GLSL SHADERS ==========

/**
 * Vertex Shader — passes UV coordinates to the fragment shader.
 * Uses a fullscreen quad (PlaneGeometry(2,2)) so position maps directly to clip space.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/**
 * Fragment Shader — generates the fluid gradient effect.
 *
 * Algorithm overview:
 * 1. Simplex Noise: 3D simplex noise (Ashima Arts implementation) generates organic,
 *    continuous noise values. Uses tetrahedral decomposition of 3D space for efficiency.
 *
 * 2. Domain Warping: Three layers of domain warping create the viscous fluid appearance:
 *    - Layer 1 (slow, large-scale): Overall flow direction
 *    - Layer 2 (medium): Viscous folding patterns
 *    - Layer 3 (fine): Detailed tendrils and wisps
 *    Each layer uses the previous layer's output as input coordinates.
 *
 * 3. Color Blending: Two independent noise fields (n1, n2) sample from an 8-color
 *    palette with time-varying offsets. A cross-mix noise blends between them
 *    for rich, non-repetitive color transitions.
 *
 * 4. Mouse Interaction: Gaussian falloff around mouse position displaces UV coordinates
 *    and brightens the noise values, creating a subtle "push" effect.
 *
 * Uniforms:
 * - u_time: Accumulated time (incremented by TIME_INCREMENT per frame)
 * - u_resolution: Canvas dimensions in pixels (for aspect ratio correction)
 * - u_mouse: Normalized mouse position (0..1, y-flipped for WebGL convention)
 * - u_colors[8]: The 8-color palette as vec3 RGB values
 */
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform vec3 u_colors[8];

  varying vec2 vUv;

  // --- 3D Simplex noise (Ashima Arts) ---
  // Modular arithmetic helpers for hash function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  // Permutation polynomial for pseudo-random hashing
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  // Fast inverse square root approximation for gradient normalization
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  // Main simplex noise function: maps a 3D point to a noise value in [-1, 1].
  // Uses tetrahedral decomposition of 3D space (simplex lattice) for efficiency
  // compared to classic Perlin noise (4 corners vs 8 in a cube).
  float snoise(vec3 v) {
    // Skew constants: transform from simplex to cubic lattice and back
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // Skew input to determine which simplex cell we're in
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Determine which of the 6 tetrahedra in the cube we're in
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    // Offsets for the 4 corners of the tetrahedron
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Hash the corner positions for gradient selection
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Compute gradients from hash values
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

    // Normalize gradients
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    // Radial falloff and final weighted sum
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Rotate a 2D point around the origin by angle a (radians)
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

    // --- Mouse interaction ---
    // Gaussian falloff around mouse position creates a soft "push" effect
    vec2 mouseUV = u_mouse;
    mouseUV.x *= aspect;
    float mouseDist = length(uv - mouseUV);
    float mouseInfluence = exp(-mouseDist * mouseDist * 6.0) * 0.25;
    vec2 mouseDisplace = normalize(uv - mouseUV + 0.001) * mouseInfluence * 0.3;

    // --- Triple domain warping for viscous fluid effect ---
    // Layer 1: slow, large-scale flow direction
    float warp1x = snoise(vec3(uv * 1.0, t * 0.6)) * 0.5;
    float warp1y = snoise(vec3(uv * 1.0 + 100.0, t * 0.6)) * 0.5;
    vec2 warped = uv + vec2(warp1x, warp1y) + mouseDisplace;

    // Layer 2: medium-scale viscous folding
    float warp2x = snoise(vec3(warped * 0.7, t * 0.4 + 50.0)) * 0.4;
    float warp2y = snoise(vec3(warped * 0.7 + 200.0, t * 0.4 + 50.0)) * 0.4;
    vec2 doubleWarped = warped + vec2(warp2x, warp2y);

    // Layer 3: fine detail tendrils and wisps
    float warp3x = snoise(vec3(doubleWarped * 1.5, t * 0.8 + 150.0)) * 0.15;
    float warp3y = snoise(vec3(doubleWarped * 1.5 + 300.0, t * 0.8 + 150.0)) * 0.15;
    vec2 tripleWarped = doubleWarped + vec2(warp3x, warp3y);

    // Slowly rotating coordinate adds extra organic movement
    vec2 rotUV = rotate2D(tripleWarped - 0.5, t * 0.15) + 0.5;

    // --- Multi-octave noise for color channel separation ---
    // Channel 1: 4 octaves at different scales and speeds
    float n1 = 0.0;
    n1 += snoise(vec3(tripleWarped * 0.5, t * 0.25)) * 0.5;
    n1 += snoise(vec3(tripleWarped * 1.2, t * 0.5 + 10.0)) * 0.3;
    n1 += snoise(vec3(tripleWarped * 2.5, t * 0.9 + 20.0)) * 0.15;
    n1 += snoise(vec3(tripleWarped * 4.0, t * 1.2 + 30.0)) * 0.05;
    n1 = n1 * 0.5 + 0.5; // Remap from [-1,1] to [0,1]

    // Channel 2: independent noise using rotated coordinates
    float n2 = 0.0;
    n2 += snoise(vec3(rotUV * 0.6, t * 0.3 + 500.0)) * 0.5;
    n2 += snoise(vec3(rotUV * 1.4, t * 0.55 + 510.0)) * 0.3;
    n2 += snoise(vec3(rotUV * 2.8, t * 0.85 + 520.0)) * 0.15;
    n2 += snoise(vec3(rotUV * 4.5, t * 1.1 + 530.0)) * 0.05;
    n2 = n2 * 0.5 + 0.5;

    // Mouse brightening on both channels
    n1 += mouseInfluence * 0.6;
    n2 += mouseInfluence * 0.4;

    // --- 8-color palette cycling ---
    // Time-varying offset makes colors cycle continuously
    float paletteShift = t * 0.12;

    // Map noise [0,1] to palette index [0,7]
    float idx1 = n1 * 7.0;
    float idx2 = n2 * 7.0;

    // Shift indices over time for continuous color cycling
    idx1 = mod(idx1 + paletteShift, 7.0);
    idx2 = mod(idx2 + paletteShift * 1.3 + 3.5, 7.0);

    // Smooth interpolation between adjacent palette colors (channel 1)
    int i1 = int(floor(idx1));
    float f1 = fract(idx1);
    vec3 col1;
    // Manual indexing required for WebGL1 compatibility (no dynamic array indexing)
    vec3 ca, cb;
    if (i1 == 0) { ca = u_colors[0]; cb = u_colors[1]; }
    else if (i1 == 1) { ca = u_colors[1]; cb = u_colors[2]; }
    else if (i1 == 2) { ca = u_colors[2]; cb = u_colors[3]; }
    else if (i1 == 3) { ca = u_colors[3]; cb = u_colors[4]; }
    else if (i1 == 4) { ca = u_colors[4]; cb = u_colors[5]; }
    else if (i1 == 5) { ca = u_colors[5]; cb = u_colors[6]; }
    else { ca = u_colors[6]; cb = u_colors[7]; }
    col1 = mix(ca, cb, smoothstep(0.0, 1.0, f1));

    // Smooth interpolation between adjacent palette colors (channel 2)
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

    // Cross-mix the two channels using another noise field
    float crossMix = snoise(vec3(tripleWarped * 0.4, t * 0.2 + 800.0)) * 0.5 + 0.5;
    vec3 color = mix(col1, col2, crossMix);

    // --- Vignette ---
    // Soft darkening toward edges for depth
    vec2 vignetteUV = vUv * 2.0 - 1.0;
    float vignette = 1.0 - dot(vignetteUV * 0.5, vignetteUV * 0.5);
    vignette = smoothstep(0.0, 0.7, vignette);

    float alpha = 0.45 * vignette;

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Fluid gradient renderer using Three.js WebGL shaders.
 * Creates a fullscreen quad with custom fragment shader for the animated effect.
 */
class FluidGradient {
  /**
   * @param {HTMLElement} container - DOM element to render into.
   * @param {object} [options] - Configuration options.
   */
  constructor(container, _options = {}) {
    this.container = container;
    this.disposed = false;
    this.targetMouse = { x: 0.5, y: 0.5 };
    this.smoothMouse = { x: 0.5, y: 0.5 };

    // Check for reduced motion preference
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

    this.init();

    if (!this.reducedMotion) {
      this.animate();
      this.addEventListeners();
    } else {
      // Render a single static frame for reduced-motion users
      this.uniforms.u_time.value = 5.0;
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Set up Three.js scene, camera, renderer, and shader material.
   */
  init() {
    const { container } = this;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 600;

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new WebGLRenderer({ alpha: true, antialias: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    // 8-color palette: coral -> orange -> gold -> teal -> sky -> indigo -> lavender -> pink
    this.uniforms = {
      u_time: { value: 0.0 },
      u_resolution: { value: new Vector2(width, height) },
      u_mouse: { value: new Vector2(0.5, 0.5) },
      u_colors: {
        value: [
          new Color('#FF6B6B'),
          new Color('#FF8E53'),
          new Color('#FFE66D'),
          new Color('#4ECDC4'),
          new Color('#45B7D1'),
          new Color('#6C5CE7'),
          new Color('#A78BFA'),
          new Color('#F472B6'),
        ],
      },
    };

    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  /** Animation loop — updates time, interpolates mouse, renders frame. */
  animate() {
    if (this.disposed) return;
    requestAnimationFrame(() => this.animate());

    this.uniforms.u_time.value += TIME_INCREMENT;

    // Smooth mouse interpolation for viscous lag effect
    this.smoothMouse.x += (this.targetMouse.x - this.smoothMouse.x) * MOUSE_LERP_SPEED;
    this.smoothMouse.y += (this.targetMouse.y - this.smoothMouse.y) * MOUSE_LERP_SPEED;
    this.uniforms.u_mouse.value.set(this.smoothMouse.x, this.smoothMouse.y);

    this.renderer.render(this.scene, this.camera);
  }

  /** Register mouse, touch, and resize event listeners. */
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

  /** Clean up all Three.js resources and event listeners. */
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

/**
 * Initialize the Three.js fluid gradient scene with WebGL detection.
 * Returns null if WebGL is not available (caller should show CSS fallback).
 *
 * @param {HTMLElement} container - DOM element to render into.
 * @param {object} [options] - Configuration options.
 * @returns {FluidGradient|null} The gradient instance, or null if WebGL unavailable.
 */
export function initThreeScene(container, options = {}) {
  // WebGL availability check
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
  } catch {
    return null;
  }

  try {
    return new FluidGradient(container, options);
  } catch {
    return null;
  }
}
