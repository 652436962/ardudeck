import * as THREE from 'three';

export type VehicleKind = 'copter' | 'plane' | 'vtol' | 'rover' | 'boat' | 'sub';

interface Palette {
  body: number;
  carbon: number;
  metal: number;
  rubber: number;
  prop: number;
  nose: number;
}

export function vehiclePalette(isLight: boolean): Palette {
  return isLight
    ? { body: 0xcbd5e1, carbon: 0x64748b, metal: 0xe5e7eb, rubber: 0x1f2937, prop: 0x475569, nose: 0xf59e0b }
    : { body: 0x94a3b8, carbon: 0x475569, metal: 0xd1d5db, rubber: 0x111827, prop: 0x94a3b8, nose: 0xf59e0b };
}

const mat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.55, ...o });

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

/** Outline drawn in X (forward) / Y (right), extruded upward from y=0. */
function slab(points: [number, number][], thickness: number, material: THREE.Material, bevel = 0.02): THREE.Mesh {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
  });
  const m = new THREE.Mesh(geometry, material);
  m.rotation.x = -Math.PI / 2;
  return m;
}

function roundedRect(w: number, d: number, r: number): [number, number][] {
  const pts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 90], [-w / 2 + r, -d / 2 + r, 180], [w / 2 - r, -d / 2 + r, 270],
  ];
  for (const [cx, cz, start] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = ((start + i * 15) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  }
  return pts;
}

function rotor(p: Palette, front: boolean, x: number, y: number, z: number, radius = 0.55): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.2, 24), mat(p.metal, { metalness: 0.8, roughness: 0.3 })));
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 24), mat(p.rubber), 0, 0.13, 0));
  const blade = mesh(new THREE.BoxGeometry(radius * 1.9, 0.014, 0.09), mat(front ? p.nose : p.prop), 0, 0.17, 0);
  blade.rotation.y = Math.PI / 5;
  g.add(blade);
  const disc = mesh(
    new THREE.CircleGeometry(radius, 40),
    new THREE.MeshBasicMaterial({ color: front ? p.nose : p.prop, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    0, 0.17, 0,
  );
  disc.rotation.x = -Math.PI / 2;
  g.add(disc);
  return g;
}

function copter(p: Palette): THREE.Group {
  const g = new THREE.Group();
  const carbon = mat(p.carbon, { metalness: 0.35, roughness: 0.4 });
  const lower = slab(roundedRect(1.7, 1.25, 0.3), 0.05, carbon);
  lower.position.y = -0.36;
  g.add(lower);
  const upper = slab(roundedRect(1.55, 1.1, 0.28), 0.04, carbon);
  upper.position.y = -0.1;
  g.add(upper);
  for (const [sx, sz] of [[0.6, 0.4], [0.6, -0.4], [-0.6, 0.4], [-0.6, -0.4]]) {
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 10), mat(p.metal, { metalness: 0.8 }), sx, -0.2, sz));
  }
  const reach = 1.75;
  for (const deg of [45, 135, 225, 315]) {
    const a = (deg * Math.PI) / 180;
    const front = Math.cos(a) > 0;
    const arm = mesh(new THREE.BoxGeometry(reach, 0.07, 0.16), front ? mat(p.nose) : carbon, (Math.cos(a) * reach) / 2, -0.3, (Math.sin(a) * reach) / 2);
    arm.rotation.y = -a;
    g.add(arm);
    g.add(rotor(p, front, Math.cos(a) * reach, -0.18, Math.sin(a) * reach));
  }
  for (const z of [-0.5, 0.5]) {
    const skid = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 12), carbon, 0, -0.85, z);
    skid.rotation.z = Math.PI / 2;
    g.add(skid);
    for (const x of [-0.4, 0.4]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 10), carbon, x, -0.6, z));
  }
  return g;
}

function plane(p: Palette, vtol: boolean): THREE.Group {
  const g = new THREE.Group();
  const body = mat(p.body, { roughness: 0.4 });
  const fuselage = mesh(new THREE.CapsuleGeometry(0.27, 2.5, 10, 24), body, 0, -0.3, 0);
  fuselage.rotation.z = Math.PI / 2;
  g.add(fuselage);
  const spinner = mesh(new THREE.ConeGeometry(0.17, 0.36, 24), mat(p.nose), 1.72, -0.3, 0);
  spinner.rotation.z = -Math.PI / 2;
  g.add(spinner);
  const blade = mesh(new THREE.BoxGeometry(0.03, 1.2, 0.1), mat(p.prop), 1.58, -0.3, 0);
  g.add(blade);

  const wing = slab([[0.45, 0], [0.25, 2.3], [-0.2, 2.3], [-0.45, 0], [-0.2, -2.3], [0.25, -2.3]], 0.05, body);
  wing.position.set(0.15, -0.42, 0);
  g.add(wing);
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.06), mat(0xdc2626, { emissive: 0x7f1d1d }), 0.05, -0.37, -2.3));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.06), mat(0x16a34a, { emissive: 0x14532d }), 0.05, -0.37, 2.3));

  const stab = slab([[0.2, 0], [0.1, 0.85], [-0.15, 0.85], [-0.25, 0], [-0.15, -0.85], [0.1, -0.85]], 0.04, body);
  stab.position.set(-1.35, -0.28, 0);
  g.add(stab);
  const finShape = new THREE.Shape([
    new THREE.Vector2(-1.05, 0), new THREE.Vector2(-1.6, 0), new THREE.Vector2(-1.65, 0.62), new THREE.Vector2(-1.4, 0.62),
  ]);
  const fin = mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.04, bevelEnabled: false }), body, 0, -0.2, -0.02);
  g.add(fin);

  if (vtol) {
    for (const z of [-1.15, 1.15]) {
      const boom = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 12), mat(p.carbon), 0, -0.47, z);
      boom.rotation.z = Math.PI / 2;
      g.add(boom);
      g.add(rotor(p, true, 1.1, -0.37, z, 0.45));
      g.add(rotor(p, false, -1.1, -0.37, z, 0.45));
    }
  }
  return g;
}

function rover(p: Palette): THREE.Group {
  const g = new THREE.Group();
  const chassis = slab(roundedRect(2.3, 1.25, 0.2), 0.1, mat(p.carbon));
  chassis.position.y = -0.62;
  g.add(chassis);
  const shell = slab(roundedRect(1.95, 1.05, 0.32), 0.26, mat(p.body, { roughness: 0.35 }), 0.06);
  shell.position.y = -0.46;
  g.add(shell);
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.74, 0.74]) {
      const tyre = mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 32), mat(p.rubber, { roughness: 0.9 }), x, -0.66, z);
      tyre.rotation.x = Math.PI / 2;
      g.add(tyre);
      const hub = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 20), mat(p.metal, { metalness: 0.7 }), x, -0.66, z);
      hub.rotation.x = Math.PI / 2;
      g.add(hub);
    }
  }
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.16, 1.1), mat(p.nose), 1.2, -0.55, 0));
  for (const z of [-0.36, 0.36]) {
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.1, 0.2), mat(0xfef3c7, { emissive: 0xfde68a, emissiveIntensity: 0.8 }), 1.0, -0.3, z));
  }
  return g;
}

function boat(p: Palette): THREE.Group {
  const g = new THREE.Group();
  const outline: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    outline.push([1.7 - t * 1.5, 0.62 * Math.sin((t * Math.PI) / 2)]);
  }
  outline.push([-1.35, 0.6], [-1.35, -0.6]);
  for (let i = 12; i >= 0; i--) {
    const t = i / 12;
    outline.push([1.7 - t * 1.5, -0.62 * Math.sin((t * Math.PI) / 2)]);
  }
  const hull = slab(outline, 0.4, mat(p.body, { roughness: 0.35 }), 0.05);
  hull.position.y = -0.8;
  g.add(hull);
  const stripe = slab(outline.map(([x, z]) => [x * 1.005, z * 1.02] as [number, number]), 0.05, mat(p.carbon), 0);
  stripe.position.y = -0.82;
  g.add(stripe);
  const bow = slab([[1.7, 0], [1.1, 0.4], [1.0, 0], [1.1, -0.4]], 0.02, mat(p.nose), 0);
  bow.position.y = -0.33;
  g.add(bow);
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.45, 0.2), mat(p.carbon), -1.45, -0.6, 0));
  return g;
}

function sub(p: Palette): THREE.Group {
  const g = new THREE.Group();
  const frame = mat(p.body, { roughness: 0.45 });
  for (const z of [-0.66, 0.66]) g.add(mesh(new THREE.BoxGeometry(2.0, 0.75, 0.06), frame, 0, -0.55, z));
  const float = slab(roundedRect(1.8, 1.2, 0.18), 0.16, mat(0xfacc15, { roughness: 0.6 }), 0.03);
  float.position.y = -0.2;
  g.add(float);
  const tube = mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.5, 28), mat(p.metal, { transparent: true, opacity: 0.55 }), -0.1, -0.62, 0);
  tube.rotation.z = Math.PI / 2;
  g.add(tube);
  g.add(mesh(new THREE.SphereGeometry(0.24, 24, 16), mat(p.nose, { transparent: true, opacity: 0.85 }), 0.65, -0.62, 0));
  for (const x of [-0.8, 0.8]) {
    for (const z of [-0.42, 0.42]) {
      const t = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 20), mat(p.carbon), x, -0.72, z);
      t.rotation.z = Math.PI / 2;
      t.rotation.y = (x > 0) === (z > 0) ? Math.PI / 4 : -Math.PI / 4;
      g.add(t);
    }
  }
  return g;
}

function build(kind: VehicleKind, p: Palette): { group: THREE.Group; noseX: number } {
  switch (kind) {
    case 'plane': return { group: plane(p, false), noseX: 1.9 };
    case 'vtol': return { group: plane(p, true), noseX: 1.9 };
    case 'rover': return { group: rover(p), noseX: 1.3 };
    case 'boat': return { group: boat(p), noseX: 1.75 };
    case 'sub': return { group: sub(p), noseX: 1.0 };
    default: return { group: copter(p), noseX: 2.1 };
  }
}

const SIGNAL_COLOURS = new Set([0xdc2626, 0x16a34a, 0xfef3c7]);

/**
 * Top surface sits near y=0 and `noseX` is where the front ends. Meshes flagged
 * `userData.keepColor` (front cues) and `userData.disc` (prop discs) must keep
 * their own colour when a caller recolours the vehicle.
 */
export function buildVehicleModel(kind: VehicleKind, p: Palette): { group: THREE.Group; noseX: number } {
  const built = build(kind, p);
  built.group.traverse((child) => {
    const m = child as THREE.Mesh;
    if (!m.isMesh) return;
    const colour = (m.material as THREE.MeshStandardMaterial).color?.getHex();
    if (m.material instanceof THREE.MeshBasicMaterial) m.userData.disc = true;
    else if (colour === p.nose || (colour !== undefined && SIGNAL_COLOURS.has(colour))) m.userData.keepColor = true;
  });
  return built;
}
