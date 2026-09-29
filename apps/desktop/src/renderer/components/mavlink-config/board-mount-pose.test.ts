import { describe, it, expect } from 'vitest';
import {
  IDENTITY,
  apply,
  poseForValue,
  valueForPose,
  moveBoard,
  sideInVehicle,
  type Mat3,
  type MountMove,
} from './board-mount-pose';

type V = [number, number, number];

// ArduPilot's Vector3::rotate, as ported in MissionPlanner-ref ExtLibs/Utilities/Vector3.cs.
const AP_ROTATE: Record<number, (v: V) => V> = {
  0: ([x, y, z]) => [x, y, z],
  2: ([x, y, z]) => [-y, x, z],
  4: ([x, y, z]) => [-x, -y, z],
  6: ([x, y, z]) => [y, -x, z],
  8: ([x, y, z]) => [x, -y, -z],
  10: ([x, y, z]) => [y, x, -z],
  12: ([x, y, z]) => [-x, y, -z],
  14: ([x, y, z]) => [-y, -x, -z],
  16: ([x, y, z]) => [x, -z, y],
  20: ([x, y, z]) => [x, z, -y],
  24: ([x, y, z]) => [z, y, -x],
  25: ([x, y, z]) => [-z, y, x],
};

describe('board mount pose', () => {
  it('matches ArduPilot rotate() for every quarter-turn value it defines', () => {
    const probe: V = [0.3, -0.7, 0.9];
    for (const [value, rotate] of Object.entries(AP_ROTATE)) {
      const pose = poseForValue(Number(value))!;
      expect(apply(pose, probe)).toEqual(rotate(probe).map((n) => n + 0));
    }
  });

  it('round-trips every exact value back to itself or its lowest twin', () => {
    for (let v = 0; v < 38; v++) {
      const pose = poseForValue(v);
      if (!pose) continue;
      const back = valueForPose(pose)!;
      expect(back).not.toBeNull();
      expect(poseForValue(back)).toEqual(pose);
      expect(back).toBeLessThanOrEqual(v);
    }
  });

  // The case that started this: a Cube turned a quarter clockwise on the frame.
  it('turns right once to arrow right, board still upright, AHRS_ORIENTATION 2', () => {
    const pose = moveBoard(IDENTITY, 'turnRight');
    expect(valueForPose(pose)).toBe(2);
    expect(sideInVehicle(pose, [1, 0, 0])).toBe('right');
    expect(sideInVehicle(pose, [0, 0, -1])).toBe('up');
  });

  it('turns left once to Yaw270', () => {
    expect(valueForPose(moveBoard(IDENTITY, 'turnLeft'))).toBe(6);
  });

  it('flips over sideways to Roll180 and nose over tail to Pitch180', () => {
    const sideways = moveBoard(moveBoard(IDENTITY, 'rollRight'), 'rollRight');
    expect(valueForPose(sideways)).toBe(8);
    const endOver = moveBoard(moveBoard(IDENTITY, 'tipNoseDown'), 'tipNoseDown');
    expect(valueForPose(endOver)).toBe(12);
  });

  it('tipping the nose up stands the arrow up, which is Pitch90', () => {
    const pose = moveBoard(IDENTITY, 'tipNoseUp');
    expect(valueForPose(pose)).toBe(24);
    expect(sideInVehicle(pose, [1, 0, 0])).toBe('up');
  });

  it('undoes each move with its opposite', () => {
    const pairs: [MountMove, MountMove][] = [
      ['turnLeft', 'turnRight'], ['rollLeft', 'rollRight'], ['tipNoseDown', 'tipNoseUp'],
    ];
    for (const [a, b] of pairs) {
      expect(moveBoard(moveBoard(IDENTITY, a), b)).toEqual(IDENTITY);
    }
  });

  it('names which of the 24 axis-aligned mountings ArduPilot can express', () => {
    const seen = new Map<string, Mat3>();
    const queue: Mat3[] = [IDENTITY];
    const moves: MountMove[] = ['turnLeft', 'turnRight', 'rollLeft', 'rollRight', 'tipNoseDown', 'tipNoseUp'];
    while (queue.length) {
      const p = queue.shift()!;
      const key = p.join(',');
      if (seen.has(key)) continue;
      seen.set(key, p);
      for (const m of moves) queue.push(moveBoard(p, m));
    }
    expect(seen.size).toBe(24);
    const covered = [...seen.values()].filter((p) => valueForPose(p) !== null).length;
    expect(covered).toBe(24);
  });
});
