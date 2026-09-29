/**
 * Live 3D orientation target for six-point calibration.
 *
 * Replaces a static line drawing per side. The solid aircraft is the vehicle's
 * REAL attitude, streamed from telemetry; the wireframe ghost is where it has
 * to go. The operator turns the aircraft and watches the two converge, which is
 * feedback a caption cannot give, and it makes a sloppy position visible before
 * it becomes a calibration the flight controller quietly accepts.
 *
 * The scene is deliberately small and hand-built: no model loading, no asset
 * pipeline, nothing to fail on a field laptop.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  matchOrientation,
  targetForPosition,
  ORIENTATION_TOLERANCE_DEG,
} from '../../../../shared/calibration-orientation';
import type { AccelPosition } from '../../../../shared/calibration-types';
import { useResolvedTheme } from '../../../hooks/useTheme';
import { buildVehicleModel, vehiclePalette, type VehicleKind } from './vehicle-models';

interface OrientationSceneProps {
  /** Which of the six ArduPilot positions. Ignored when `target` is given. */
  position?: AccelPosition;
  shape?: VehicleKind;
  /**
   * An explicit attitude to hold, in degrees, overriding `position`.
   *
   * A vehicle running the ArduDeck Vehicle SDK names its own poses and they need not be
   * any of ArduPilot's six, so the target cannot always be looked up from a position id.
   */
  target?: { rollDeg: number; pitchDeg: number };
  /** Live vehicle attitude in radians. */
  roll: number;
  pitch: number;
  /** False when attitude telemetry is stale or absent. */
  live: boolean;
  size?: number;
}

const COLOR_TARGET = 0x64748b;
const COLOR_MOVING = 0x38bdf8;
const COLOR_LOCKED = 0x22c55e;

// Callers scale the returned group for the lock-on pulse, so the size fit lives on the inner model.
function buildVehicle(kind: VehicleKind, color: number, ghost: boolean, ghostOpacity = 0.35): THREE.Group {
  const { group: model } = buildVehicleModel(kind, vehiclePalette(false));
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (ghost) {
      mesh.visible = !mesh.userData.disc;
      mesh.material = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: ghostOpacity });
    } else if (!mesh.userData.keepColor && !mesh.userData.disc) {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
    }
  });
  model.scale.setScalar(0.48);
  model.position.y = 0.2;
  const group = new THREE.Group();
  group.add(model);
  return group;
}

/**
 * Apply a body attitude to a three.js object.
 *
 * three.js is Y-up while the vehicle frame is Z-down with X forward, so roll
 * turns about the scene's X axis and pitch about its Z axis. Getting this pair
 * wrong is what makes an indicator move the wrong way, which is worse than no
 * indicator at all.
 */
export function applyAttitude(object: THREE.Object3D, roll: number, pitch: number): void {
  object.rotation.set(0, 0, 0);
  object.rotateZ(pitch);
  object.rotateX(roll);
}

export function OrientationScene({ position, roll, pitch, live, size = 220, shape = 'copter', target: explicitTarget }: OrientationSceneProps) {
  const isLight = useResolvedTheme() === 'light';
  const mountRef = useRef<HTMLDivElement | null>(null);
  const vehicleRef = useRef<THREE.Group | null>(null);
  const ghostRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  // Latest attitude, read by the animation loop without re-running the effect.
  const attitudeRef = useRef({ roll, pitch, live, position, explicitTarget });
  attitudeRef.current = { roll, pitch, live, position, explicitTarget };

  const DEG = Math.PI / 180;
  const target = useMemo(
    () =>
      explicitTarget
        ? { roll: explicitTarget.rollDeg * DEG, pitch: explicitTarget.pitchDeg * DEG }
        : targetForPosition(position ?? 0),
    [position, explicitTarget, DEG],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(2.6, 2.0, 3.2);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // No WebGL (remote desktop, software rendering): the caller's static
      // fallback stays on screen rather than a black box.
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 5, 2);
    scene.add(key);

    const ghost = buildVehicle(shape, COLOR_TARGET, true, isLight ? 0.6 : 0.35);
    applyAttitude(ghost, target.roll, target.pitch);
    ghost.scale.setScalar(1.08);
    scene.add(ghost);
    ghostRef.current = ghost;

    const vehicle = buildVehicle(shape, COLOR_MOVING, false);
    scene.add(vehicle);
    vehicleRef.current = vehicle;

    // Ground reference, so "level" has something to be level against.
    const gridMain = isLight ? 0x94a3b8 : 0x334155;
    const gridSub = isLight ? 0xcbd5e1 : 0x1e293b;
    const grid = new THREE.GridHelper(4, 8, gridMain, gridSub);
    grid.position.y = -1.2;
    scene.add(grid);

    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      const current = attitudeRef.current;
      const currentTarget = current.explicitTarget
        ? {
            roll: current.explicitTarget.rollDeg * (Math.PI / 180),
            pitch: current.explicitTarget.pitchDeg * (Math.PI / 180),
          }
        : targetForPosition(current.position ?? 0);

      applyAttitude(ghost, currentTarget.roll, currentTarget.pitch);

      if (current.live) {
        applyAttitude(vehicle, current.roll, current.pitch);
        const { matched, closeness } = matchOrientation(
          { roll: current.roll, pitch: current.pitch },
          currentTarget,
          ORIENTATION_TOLERANCE_DEG,
        );
        // Colour is the lock-on signal: it goes green only when the position
        // is genuinely held, never on a timer.
        const colour = new THREE.Color(matched ? COLOR_LOCKED : COLOR_MOVING);
        vehicle.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.userData.keepColor || mesh.userData.disc) return;
          const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
          if (mat && 'color' in mat) {
            mat.color.copy(colour);
            mat.emissive?.setRGB(0, 0, 0);
            if (matched && mat.emissive) mat.emissive.setHex(0x14532d);
          }
        });
        ghost.visible = !matched;
        vehicle.scale.setScalar(1 + closeness * 0.04);
      } else {
        // No attitude: show the target only. Never draw a confident aircraft
        // sitting level when we have no idea where it is.
        applyAttitude(vehicle, currentTarget.roll, currentTarget.pitch);
        vehicle.visible = false;
        ghost.visible = true;
      }

      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose?.();
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      rendererRef.current = null;
    };
    // target is derived from position, which the loop reads from the ref.
  }, [size, target.pitch, target.roll, isLight, shape]);

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size }}
      className="mx-auto shrink-0 overflow-hidden"
    />
  );
}
