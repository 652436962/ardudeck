// Pose = ArduPilot's sensor-to-body matrix, R = Rz*Ry*Rx (roll first, NED); turning the board by Q gives Q*R.

import { ALL_ORIENTATIONS, orientationRotation } from './board-orientation';

/** Row-major 3x3. */
export type Mat3 = readonly number[];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function clean(v: number): number {
  const r = Math.round(v * 1e9) / 1e9;
  return r === 0 ? 0 : r;
}

export function mul(a: Mat3, b: Mat3): Mat3 {
  const out: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out.push(clean(a[r * 3]! * b[c]! + a[r * 3 + 1]! * b[3 + c]! + a[r * 3 + 2]! * b[6 + c]!));
    }
  }
  return out;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

export function rotX(deg: number): Mat3 {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [1, 0, 0, 0, c, -s, 0, s, c].map(clean);
}
export function rotY(deg: number): Mat3 {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [c, 0, s, 0, 1, 0, -s, 0, c].map(clean);
}
export function rotZ(deg: number): Mat3 {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [c, -s, 0, s, c, 0, 0, 0, 1].map(clean);
}

export function apply(m: Mat3, v: readonly [number, number, number]): [number, number, number] {
  return [
    clean(m[0]! * v[0] + m[1]! * v[1] + m[2]! * v[2]),
    clean(m[3]! * v[0] + m[4]! * v[1] + m[5]! * v[2]),
    clean(m[6]! * v[0] + m[7]! * v[1] + m[8]! * v[2]),
  ];
}

// 38+ are approximate or custom, no exact matrix
const MATCHABLE = Object.keys(ALL_ORIENTATIONS).map(Number).filter((v) => v < 38).sort((a, b) => a - b);

export function poseForValue(value: number): Mat3 | null {
  if (!(value in ALL_ORIENTATIONS) || value >= 100) return null;
  const { yaw, pitch, roll } = orientationRotation(value);
  return mul(rotZ(yaw), mul(rotY(pitch), rotX(roll)));
}

function same(a: Mat3, b: Mat3): boolean {
  return a.every((v, i) => Math.abs(v - b[i]!) < 1e-6);
}

export function valueForPose(pose: Mat3): number | null {
  for (const v of MATCHABLE) {
    const m = poseForValue(v);
    if (m && same(m, pose)) return v;
  }
  return null;
}

export type MountMove = 'turnLeft' | 'turnRight' | 'rollLeft' | 'rollRight' | 'tipNoseDown' | 'tipNoseUp';

const MOVES: Record<MountMove, Mat3> = {
  turnRight: rotZ(90),
  turnLeft: rotZ(-90),
  rollRight: rotX(90),
  rollLeft: rotX(-90),
  tipNoseUp: rotY(90),
  tipNoseDown: rotY(-90),
};

export function moveBoard(pose: Mat3, move: MountMove): Mat3 {
  return mul(MOVES[move], pose);
}

/** Which way a board-frame direction ends up in the vehicle, in words. */
export function sideInVehicle(pose: Mat3, boardDir: readonly [number, number, number]): 'front' | 'back' | 'right' | 'left' | 'down' | 'up' {
  const [x, y, z] = apply(pose, boardDir);
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  if (ax >= ay && ax >= az) return x > 0 ? 'front' : 'back';
  if (ay >= az) return y > 0 ? 'right' : 'left';
  return z > 0 ? 'down' : 'up';
}
