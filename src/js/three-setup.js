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
  uniform vec3 u_colors[4];

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

  void main() {
    vec2 uv = vUv;
    float aspect = u_resolution.x / u_resolution.y;
    uv.x *= aspect;

    float t = u_time;

    // Mouse influence — gaussian falloff
    vec2 mouseUV = u_mouse;
    mouseUV.x *= aspect;
    float mouseDist = length(uv - mouseUV);
    float mouseInfluence = exp(-mouseDist * mouseDist * 12.0) * 0.15;

    // First domain warp
    float warp1x = snoise(vec3(uv * 1.2, t * 0.7)) * 0.4;
    float warp1y = snoise(vec3(uv * 1.2 + 100.0, t * 0.7)) * 0.4;
    vec2 warped = uv + vec2(warp1x, warp1y) + vec2(mouseInfluence * 0.5);

    // Second domain warp (viscous folding)
    float warp2x = snoise(vec3(warped * 0.8, t * 0.5 + 50.0)) * 0.3;
    float warp2y = snoise(vec3(warped * 0.8 + 200.0, t * 0.5 + 50.0)) * 0.3;
    vec2 doubleWarped = warped + vec2(warp2x, warp2y);

    // Multi-octave noise
    float n = 0.0;
    n += snoise(vec3(doubleWarped * 0.6, t * 0.3)) * 0.5;        // base blobs
    n += snoise(vec3(doubleWarped * 1.5, t * 0.6 + 10.0)) * 0.3; // medium swirls
    n += snoise(vec3(doubleWarped * 3.0, t * 1.0 + 20.0)) * 0.15; // fine turbulence
    n += snoise(vec3(doubleWarped * 5.0, t * 1.5 + 30.0)) * 0.05; // detail

    // Normalize to 0..1
    n = n * 0.5 + 0.5;

    // Mouse brightening
    n += mouseInfluence * 0.8;

    // 4-color palette blend via smoothstep
    vec3 color;
    color = mix(u_colors[0], u_colors[1], smoothstep(0.0, 0.35, n));
    color = mix(color, u_colors[2], smoothstep(0.35, 0.65, n));
    color = mix(color, u_colors[3], smoothstep(0.65, 1.0, n));

    // Vignette edge fade
    vec2 vignetteUV = vUv * 2.0 - 1.0;
    float vignette = 1.0 - dot(vignetteUV * 0.5, vignetteUV * 0.5);
    vignette = smoothstep(0.0, 0.7, vignette);

    float alpha = 0.4 * vignette;

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
      this.uniforms.u_time.value = 5.0; // offset so static frame looks interesting
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
          new THREE.Color('#FF6B6B'), // coral
          new THREE.Color('#4ECDC4'), // teal
          new THREE.Color('#A78BFA'), // purple
          new THREE.Color('#FFE66D'), // yellow
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

    this.uniforms.u_time.value += 0.0003;

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

    this.onResize = () => {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || 600;
      this.renderer.setSize(width, height);
      this.uniforms.u_resolution.value.set(width, height);
    };

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);
  }

  dispose() {
    this.disposed = true;

    if (this.onMouseMove) window.removeEventListener('mousemove', this.onMouseMove);
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
