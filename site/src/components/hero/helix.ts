import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * The hero DNA helix.
 *   build  — nucleotide rods float in from outside and snap onto the backbone,
 *            pairing up left -> right, end to end (the strand runs off both edges).
 *   settle — soft glow blooms on the bases; the helix spins + breathes; the
 *            camera drifts a touch for parallax.
 * Premium look: physically-based backbone with environment reflections, ACES
 * tone mapping, atmospheric fog that melts the ends into the page, additive
 * base glow, and a faint depth-particle field.
 *
 * Pure: hand it a <canvas> and it runs. Returns a controller with destroy().
 * Caller must not invoke this under reduced-motion / no-WebGL.
 */

const NT = { a: 0x3df06b, t: 0xff4d6d, g: 0xffc83d, c: 0x28e0f5 };
const BACKBONE = 0x5fb4d8;
const FOG = 0x070b14;

const L = 110;
const R = 5;
const TURNS = 9;
const RUNGS = 36;
const FOV = 42;
const BUILD = 4.2;
const REVEAL_WIN = 0.16;
const ROD_LEN = R * 0.84;

type Controller = { destroy: () => void };

export function initHelix(canvas: HTMLCanvasElement): Controller {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, 30, 120);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);

  // environment map for glossy reflections (no HDR file needed)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0x22364a, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(-9, 11, 16);
  scene.add(key);
  const rim = new THREE.PointLight(0x39c6ff, 0.6, 240);
  rim.position.set(12, -7, 18);
  scene.add(rim);

  const helix = new THREE.Group();
  scene.add(helix);

  const point = (u: number, phase: number) => {
    const x = -L / 2 + u * L;
    const ang = u * TURNS * Math.PI * 2 + phase;
    return new THREE.Vector3(x, R * Math.cos(ang), R * Math.sin(ang));
  };

  // ---- backbone tubes (glossy, reveal left->right) ----
  const buildStrand = (phase: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 360; i++) pts.push(point(i / 360, phase));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 420, 0.3, 12, false);
    const mat = new THREE.MeshPhysicalMaterial({
      color: BACKBONE,
      roughness: 0.22,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.35,
      emissive: 0x0b2a3a,
      emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.indexCount = geo.index ? geo.index.count : 0;
    geo.setDrawRange(0, 0);
    helix.add(mesh);
    return mesh;
  };
  const strandA = buildStrand(0);
  const strandB = buildStrand(Math.PI);

  // ---- nucleotide rods (rounded capsules that fly in) ----
  const rodGeo = new THREE.CapsuleGeometry(0.32, ROD_LEN - 0.64, 6, 14);
  const UP = new THREE.Vector3(0, 1, 0);
  const pairs: Array<[number, number]> = [
    [NT.a, NT.t],
    [NT.g, NT.c],
  ];
  type Rod = { obj: THREE.Mesh; start: THREE.Vector3; final: THREE.Vector3; u: number };
  const rods: Rod[] = [];
  const glowPos: number[] = [];
  const glowCol: number[] = [];
  const col = new THREE.Color();

  const addRod = (base: THREE.Vector3, color: number, u: number) => {
    const inward = new THREE.Vector3(base.x, 0, 0).sub(base).normalize();
    const final = base.clone().add(inward.clone().multiplyScalar(ROD_LEN / 2));
    const mesh = new THREE.Mesh(
      rodGeo,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.85,
        roughness: 0.35,
        metalness: 0,
      })
    );
    mesh.quaternion.setFromUnitVectors(UP, inward);
    const out = inward.clone().multiplyScalar(-1);
    const start = final
      .clone()
      .add(out.multiplyScalar(11 + Math.random() * 9))
      .add(new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9));
    mesh.position.copy(start);
    mesh.scale.setScalar(0);
    helix.add(mesh);
    rods.push({ obj: mesh, start, final, u });
    glowPos.push(final.x, final.y, final.z);
    col.set(color);
    glowCol.push(col.r, col.g, col.b);
  };

  for (let i = 0; i < RUNGS; i++) {
    const u = (i + 0.5) / RUNGS;
    const [c1, c2] = pairs[i % 2];
    addRod(point(u, 0), c1, u);
    addRod(point(u, Math.PI), c2, u);
  }

  // ---- additive base glow (one draw call; fades in after the build) ----
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(glowCol, 3));
  const glowMat = new THREE.PointsMaterial({
    map: glowTex,
    size: 4.2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Points(glowGeo, glowMat);
  helix.add(glow);

  // ---- faint depth particles ----
  const dustN = 200;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * L * 0.9;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * R * 5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * R * 5;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0x49a7c9,
      size: 0.14,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(dust);

  // ---- camera framing (centred => both ends off-screen) ----
  let width = 1;
  let height = 1;
  let baseCamZ = 50;
  const fit = () => {
    const aspect = Math.max(width / height, 0.0001);
    camera.aspect = aspect;
    const halfTan = Math.tan((FOV / 2) * (Math.PI / 180)) * aspect;
    baseCamZ = Math.max(24, (L * 0.34) / halfTan);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = baseCamZ * 0.92;
      scene.fog.far = baseCamZ * 1.75;
    }
    camera.position.set(0, 0, baseCamZ);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  const resize = () => {
    width = canvas.clientWidth || canvas.offsetWidth || 1;
    height = canvas.clientHeight || canvas.offsetHeight || 1;
    renderer.setSize(width, height, false);
    fit();
  };
  resize();

  // ---- timeline ----
  const clock = new THREE.Clock();
  let t = 0;
  let running = true;
  let visible = true;
  let built = false;
  let rafId = 0;
  const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
  const tmp = new THREE.Vector3();

  const setReveal = (mesh: THREE.Mesh, p: number) =>
    mesh.geometry.setDrawRange(0, Math.floor(p * (mesh.userData.indexCount as number)));

  const frame = () => {
    rafId = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;

    const bp = Math.min(t / BUILD, 1);
    setReveal(strandA, bp);
    setReveal(strandB, bp);

    for (const rod of rods) {
      const s = Math.max(0, Math.min(1, (bp - rod.u * (1 - REVEAL_WIN)) / REVEAL_WIN));
      const e = easeOut(s);
      rod.obj.position.copy(tmp.copy(rod.start).lerp(rod.final, e));
      rod.obj.scale.setScalar(e);
    }

    // glow blooms in once the strand is mostly built
    if (t > BUILD * 0.85) glowMat.opacity = Math.min(0.75, glowMat.opacity + dt * 0.6);

    if (t > BUILD) {
      helix.rotation.x += dt * 0.26;
      if (!built) {
        built = true;
        canvas.dispatchEvent(new CustomEvent('helix:built', { bubbles: true }));
      }
    }
    // organic breathing + drift
    helix.position.y = Math.sin(t * 0.5) * 0.35;
    helix.rotation.z = Math.sin(t * 0.28) * 0.03;
    dust.rotation.x = t * 0.02;
    camera.position.set(Math.sin(t * 0.16) * 1.4, Math.cos(t * 0.21) * 0.9, baseCamZ);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  };
  frame();

  // ---- pause when offscreen / tab hidden ----
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      running = visible && !document.hidden;
      if (running) clock.getDelta();
    },
    { threshold: 0.04 }
  );
  io.observe(canvas);
  const onVisibility = () => {
    running = visible && !document.hidden;
    if (running) clock.getDelta();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);

  // ---- GPU context loss ----
  const onLost = (e: Event) => {
    e.preventDefault();
    running = false;
  };
  const onRestored = () => {
    running = true;
    clock.getDelta();
  };
  canvas.addEventListener('webglcontextlost', onLost as EventListener);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost as EventListener);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      glowTex.dispose();
      envTex.dispose();
      renderer.dispose();
    },
  };
}
