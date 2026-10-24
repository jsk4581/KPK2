// three.js hero phone: modelled in code (no downloaded model, no licence to track).
// mount(el, { screen }) renders into el. screen may be an image URL (a screenshot of the real app);
// without it a drawn placeholder UI is used. Returns { setScreen(urlOrCanvas), dispose() }.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Real-world proportions (mm / 10) of a 6.1" phone
const W = 7.15, H = 14.66, D = 0.78, R = 1.1, BEVEL = 0.3;
const SCREEN_W = 6.38, SCREEN_H = 13.88, SCREEN_R = 0.86;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

// ShapeGeometry UVs are in shape units; remap them to 0..1 so a texture fills the face.
function flatFace(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 32);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

// Row icons: Phosphor Icons, regular weight (MIT License, Copyright (c) 2023 Phosphor Icons)
const ICONS = {
  transfers: 'M213.66,181.66l-32,32a8,8,0,0,1-11.32-11.32L188.69,184H48a8,8,0,0,1,0-16H188.69l-18.35-18.34a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,213.66,181.66Zm-139.32-64a8,8,0,0,0,11.32-11.32L67.31,88H208a8,8,0,0,0,0-16H67.31L85.66,53.66A8,8,0,0,0,74.34,42.34l-32,32a8,8,0,0,0,0,11.32Z',
  missing: 'M220.27,158.54a8,8,0,0,0-7.7-.46,20,20,0,1,1,0-36.16A8,8,0,0,0,224,114.69V72a16,16,0,0,0-16-16H171.78a35.36,35.36,0,0,0,.22-4,36.11,36.11,0,0,0-11.36-26.24,36,36,0,0,0-60.55,23.62,36.56,36.56,0,0,0,.14,6.62H64A16,16,0,0,0,48,72v32.22a35.36,35.36,0,0,0-4-.22,36.12,36.12,0,0,0-26.24,11.36,35.7,35.7,0,0,0-9.69,27,36.08,36.08,0,0,0,33.31,33.6,35.68,35.68,0,0,0,6.62-.14V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V165.31A8,8,0,0,0,220.27,158.54ZM208,208H64V165.31a8,8,0,0,0-11.43-7.23,20,20,0,1,1,0-36.16A8,8,0,0,0,64,114.69V72h46.69a8,8,0,0,0,7.23-11.43,20,20,0,1,1,36.16,0A8,8,0,0,0,161.31,72H208v32.23a35.68,35.68,0,0,0-6.62-.14A36,36,0,0,0,204,176a35.36,35.36,0,0,0,4-.22Z',
  week: 'M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z',
};

// Placeholder screen drawn on a canvas, same look as the CSS demo screen
export function drawPlaceholderScreen() {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = Math.round(1080 * SCREEN_H / SCREEN_W);
  const x = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px Inter, system-ui, sans-serif`;
  const rr = (px, py, w, h, r, fill) => { x.beginPath(); x.roundRect(px, py, w, h, r); x.fillStyle = fill; x.fill(); };

  const bg = x.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, '#f6f0fb'); bg.addColorStop(0.35, '#ffffff');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);

  x.fillStyle = '#0f0f0f'; x.font = font(600, 46); x.fillText('9:41', 120, 112);
  rr(870, 84, 90, 40, 12, '#0f0f0f');

  // The synthetic sample persona's first path
  x.font = font(500, 34); x.fillStyle = '#8e48b1'; x.fillText('[SIMULATION] SAMPLE: DANA', 80, 250);
  x.font = font(700, 76); x.fillStyle = '#0f0f0f'; x.fillText('Your three paths', 80, 345);
  x.font = font(400, 38); x.fillStyle = '#6e6e6e'; x.fillText('Seven years of copy, carried into new work.', 80, 410);

  rr(80, 480, 920, 340, 44, '#8e48b1');
  x.fillStyle = '#ffffff'; x.font = font(500, 34); x.fillText('PATH 1 OF 3 \u00b7 67% SKILL MATCH', 130, 555);
  x.font = font(700, 56); x.fillText('Messaging & Positioning', 130, 640); x.fillText('Consultant', 130, 705);
  x.font = font(400, 32); x.globalAlpha = 0.8; x.fillText('Synthetic persona \u00b7 example', 130, 770); x.globalAlpha = 1;

  const rows = [
    ['What carries over', 'Discovery calls, positioning, workshops', '#e2f3e8', '#1f8a4c', ICONS.transfers],
    ["What you'd need to build", 'Case studies, project pricing', '#fdf0d8', '#b46d00', ICONS.missing],
    ['This week', '3 actions \u00b7 30 minutes or less', '#f1e6f8', '#8e48b1', ICONS.week],
  ];
  rows.forEach(([t, s, tile, ink, icon], i) => {
    const y = 870 + i * 190;
    rr(80, y, 920, 160, 36, '#f4f5f5');
    rr(120, y + 35, 90, 90, 24, tile);
    x.save(); x.translate(138, y + 53); x.scale(54 / 256, 54 / 256); x.fillStyle = ink; x.fill(new Path2D(icon)); x.restore();
    x.fillStyle = '#0f0f0f'; x.font = font(600, 42); x.fillText(t, 250, y + 75);
    x.fillStyle = '#858585'; x.font = font(400, 32); x.fillText(s, 250, y + 123);
  });

  rr(80, c.height - 330, 920, 140, 70, '#0f0f0f');
  x.fillStyle = '#fff'; x.font = font(600, 44); x.textAlign = 'center';
  x.fillText('Show my paths', 540, c.height - 245);
  rr(380, c.height - 70, 320, 14, 7, '#0f0f0f');
  return c;
}

export function mount(el, { screen } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 31);

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-6, 8, 10);
  scene.add(key, new THREE.AmbientLight(0xf3e8ff, 0.4));

  const phone = new THREE.Group();
  scene.add(phone);

  const metal = new THREE.MeshPhysicalMaterial({ color: 0xd2d2d8, metalness: 1, roughness: 0.32, envMapIntensity: 2.2, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const body = new THREE.ExtrudeGeometry(roundedRect(W - 2 * BEVEL, H - 2 * BEVEL, R - BEVEL), {
    depth: D - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 10, curveSegments: 40,
  });
  body.center();
  phone.add(new THREE.Mesh(body, metal));

  const glass = new THREE.Mesh(flatFace(W - 0.36, H - 0.36, R - 0.18),
    new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.06, metalness: 0, clearcoat: 1 }));
  glass.position.z = D / 2 + 0.002;
  phone.add(glass);

  const screenMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const screenMesh = new THREE.Mesh(flatFace(SCREEN_W, SCREEN_H, SCREEN_R), screenMat);
  screenMesh.position.z = D / 2 + 0.004;
  phone.add(screenMesh);

  // Glare sheet over the screen
  const glare = new THREE.Mesh(flatFace(SCREEN_W, SCREEN_H, SCREEN_R), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.06, roughness: 0, metalness: 0, clearcoat: 1,
  }));
  glare.position.z = D / 2 + 0.006;
  phone.add(glare);

  const island = new THREE.Mesh(flatFace(2.0, 0.58, 0.29), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  island.position.set(0, SCREEN_H / 2 - 0.58, D / 2 + 0.008);
  phone.add(island);

  const btn = (h, y, side) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.14, h, 0.24, 4, 0.06), metal);
    m.position.set(side * (W / 2 + 0.02), y, 0);
    phone.add(m);
  };
  btn(0.55, 3.9, -1); btn(1.0, 2.75, -1); btn(1.0, 1.55, -1); btn(1.7, 2.3, 1);

  function setScreen(src) {
    const apply = (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      screenMat.map?.dispose();
      screenMat.map = tex; screenMat.needsUpdate = true;
    };
    if (typeof src === 'string') new THREE.TextureLoader().load(src, apply);
    else apply(new THREE.CanvasTexture(src));
  }
  setScreen(screen || drawPlaceholderScreen());

  function resize() {
    const { clientWidth: w, clientHeight: h } = el;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  // Pointer tilt with easing, plus an idle float
  const target = { x: 0, y: 0 };
  const onMove = (e) => {
    target.x = (e.clientX / innerWidth) * 2 - 1;
    target.y = (e.clientY / innerHeight) * 2 - 1;
  };
  if (!reduce) addEventListener('pointermove', onMove);

  const clock = new THREE.Clock();
  let raf = 0;
  const base = { x: 0.1, y: -0.32, z: 0.08 };
  function frame() {
    const t = clock.getElapsedTime();
    phone.rotation.y += (base.y + target.x * 0.35 - phone.rotation.y) * 0.06;
    phone.rotation.x += (base.x + target.y * 0.18 - phone.rotation.x) * 0.06;
    phone.rotation.z = base.z;
    phone.position.y = reduce ? 0 : Math.sin(t * 1.1) * 0.18;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  phone.rotation.set(base.x, base.y, base.z);
  frame();

  return {
    setScreen,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('pointermove', onMove);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
