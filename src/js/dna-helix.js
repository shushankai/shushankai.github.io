/**
 * @file Three.js DNA Helix — 3D double helix with white spheres and rungs.
 * @module dna-helix
 */

import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  SphereGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  Mesh,
  Group,
  DirectionalLight,
  AmbientLight,
} from 'three';

/** Helix radius (distance from center to each strand) */
const HELIX_RADIUS = 1.2;

/** Angular twist per step (radians) — controls how tight the helix winds */
const TWIST_PER_STEP = (Math.PI * 2) / 12;

/** Rotation speed (radians per frame at 60fps) */
const ROTATION_SPEED = 0.003;

/**
 * Initialise the DNA helix inside the given container element.
 * @param {HTMLElement} container — the element to render into
 * @returns {boolean} false if WebGL is unavailable
 */
export function initDnaHelix(container) {
  // WebGL check
  try {
    const c = document.createElement('canvas');
    if (!c.getContext('webgl') && !c.getContext('webgl2')) return false;
  } catch {
    return false;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene — no background so CSS dotted grid shows through
  const scene = new Scene();

  // Dynamically size the helix to fill the container height
  const aspect = width / height;
  const fov = 45;
  // Calculate visible height at z=0 for the given camera distance
  const cameraDist = 10;
  const visibleHeight =
    2 * Math.tan(((fov / 2) * Math.PI) / 180) * cameraDist;
  // Leave a small margin so spheres aren't clipped
  const helixHeight = visibleHeight * 0.85;
  const stepHeight = 0.35;
  const pairCount = Math.max(6, Math.round(helixHeight / stepHeight));

  // Camera
  const camera = new PerspectiveCamera(fov, aspect, 0.1, 100);
  camera.position.set(0, 0, cameraDist);
  camera.lookAt(0, 0, 0);

  // Renderer — transparent background
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Lighting
  const ambient = new AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const keyLight = new DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  const fillLight = new DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-3, -2, 2);
  scene.add(fillLight);

  // Materials
  const sphereMat = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.15,
    roughness: 0.3,
  });

  const rungMat = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.5,
    transparent: true,
    opacity: 0.4,
  });

  // Geometries (reused)
  const sphereGeo = new SphereGeometry(0.1, 16, 16);
  const rungGeo = new CylinderGeometry(0.012, 0.012, 1, 6);

  // Build helix group
  const helixGroup = new Group();
  const totalHeight = (pairCount - 1) * stepHeight;

  for (let i = 0; i < pairCount; i++) {
    const angle = i * TWIST_PER_STEP;
    const y = i * stepHeight - totalHeight / 2;

    // Strand 1
    const x1 = HELIX_RADIUS * Math.cos(angle);
    const z1 = HELIX_RADIUS * Math.sin(angle);
    const s1 = new Mesh(sphereGeo, sphereMat);
    s1.position.set(x1, y, z1);
    helixGroup.add(s1);

    // Strand 2 (offset by π)
    const x2 = HELIX_RADIUS * Math.cos(angle + Math.PI);
    const z2 = HELIX_RADIUS * Math.sin(angle + Math.PI);
    const s2 = new Mesh(sphereGeo, sphereMat);
    s2.position.set(x2, y, z2);
    helixGroup.add(s2);

    // Connecting rung (plain white line between the two spheres)
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const rung = new Mesh(rungGeo, rungMat);
    rung.scale.y = dist;
    rung.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = -angle;
    helixGroup.add(rung);
  }

  scene.add(helixGroup);

  // Reduced motion check
  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // Animation loop
  let animId;
  function animate() {
    animId = requestAnimationFrame(animate);
    if (!prefersReduced) {
      helixGroup.rotation.y += ROTATION_SPEED;
    }
    renderer.render(scene, camera);
  }
  animate();

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animate();
    }
  });

  // Resize
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  ro.observe(container);

  return true;
}
