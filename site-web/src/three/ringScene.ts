import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { PALETTE } from '../motion/palette';

// MASTER.md tokens, from the shared palette.
const BLUE = new Color(PALETTE.blue);
const BLUE_TINT = new Color(PALETTE.blueTint);
const SIGNAL_DIM = new Color(PALETTE.signalDim);

// Inner to outer. speed is MASTER.md "ring speeds" in revolutions per second.
const RINGS = [
  { radius: 1.0, width: 0.03, segments: 3, gap: 0.5, opacity: 0.85, speed: 0.025, blue: true },
  { radius: 1.38, width: 0.014, segments: 24, gap: 0.55, opacity: 0.55, speed: -0.045, blue: false },
  { radius: 1.74, width: 0.04, segments: 5, gap: 0.25, opacity: 0.75, speed: 0.07, blue: true },
  { radius: 2.12, width: 0.012, segments: 60, gap: 0.6, opacity: 0.4, speed: -0.025, blue: false },
];
const PARTICLES = 160;
// MASTER.md parallax: 6px max. At this camera distance 0.05 units is about 6px.
const PARALLAX = 0.05;

export interface RingScene {
  start(): void;
  stop(): void;
  renderOnce(): void;
  setPointer(x: number, y: number): void;
  resize(): void;
  dispose(): void;
}

export function createRingScene(canvas: HTMLCanvasElement): RingScene {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0, 7.2);

  const tilt = new Group();
  tilt.rotation.set(-0.42, 0.28, 0);
  scene.add(tilt);

  const disposables: { dispose(): void }[] = [];
  const spinners: { group: Group; omega: number }[] = [];

  for (const ring of RINGS) {
    const group = new Group();
    const step = (Math.PI * 2) / ring.segments;
    const arc = step * (1 - ring.gap);
    const material = new MeshBasicMaterial({
      color: ring.blue ? BLUE : BLUE_TINT,
      transparent: true,
      opacity: ring.opacity,
      depthWrite: false,
    });
    disposables.push(material);
    const thetaSegments = Math.max(4, Math.ceil(arc / 0.05));
    const geometry = new RingGeometry(ring.radius - ring.width / 2, ring.radius + ring.width / 2, thetaSegments, 1, 0, arc);
    disposables.push(geometry);
    for (let i = 0; i < ring.segments; i++) {
      const mesh = new Mesh(geometry, material);
      mesh.rotation.z = i * step;
      group.add(mesh);
    }
    tilt.add(group);
    spinners.push({ group, omega: ring.speed * Math.PI * 2 });
  }

  // Circuit particles: a loose annulus that drifts slower than the rings.
  const positions = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.9 + Math.random() * 1.7;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  const pointsGeometry = new BufferGeometry();
  pointsGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const pointsMaterial = new PointsMaterial({
    color: SIGNAL_DIM,
    size: 0.02,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  disposables.push(pointsGeometry, pointsMaterial);
  const points = new Points(pointsGeometry, pointsMaterial);
  tilt.add(points);
  const pointsOmega = 0.01 * Math.PI * 2;

  // The core: a small blue dot, no halo.
  const coreGeometry = new RingGeometry(0, 0.07, 32);
  const coreMaterial = new MeshBasicMaterial({ color: BLUE });
  disposables.push(coreGeometry, coreMaterial);
  tilt.add(new Mesh(coreGeometry, coreMaterial));

  let raf = 0;
  let last = 0;
  let pointerX = 0;
  let pointerY = 0;
  let camX = 0;
  let camY = 0;

  const frame = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    for (const s of spinners) s.group.rotation.z += s.omega * dt;
    points.rotation.z += pointsOmega * dt;
    camX += (pointerX * PARALLAX - camX) * 0.08;
    camY += (pointerY * PARALLAX - camY) * 0.08;
    camera.position.x = camX;
    camera.position.y = camY;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
    renderOnce() {
      renderer.render(scene, camera);
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    resize() {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      cancelAnimationFrame(raf);
      raf = 0;
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}
