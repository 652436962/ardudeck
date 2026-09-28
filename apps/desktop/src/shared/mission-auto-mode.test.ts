/**
 * Which mode a mission starts in.
 *
 * The regression this guards: fleet and formation mission start used to derive the mode
 * from MAV_TYPE alone, with ArduPilot's numbers, and send it to every vehicle regardless
 * of firmware. A third-party boat got 10 (Rover's AUTO) for a mode table it never agreed
 * to, and PX4 got a raw number its own encoding reads as main_mode 0.
 */
import { describe, it, expect } from 'vitest';
import { missionAutoMode } from './flight-mode-meta';
import { encodePx4CustomMode } from './telemetry-types';
import { missionModeId, AD_MODE_FLAG, type VehicleProfile } from './vehicle-profile';

/** Exactly what shipped before this split existed, kept here as the thing to match. */
const legacyAutoMode = (mavType: number): number =>
  [2, 3, 4, 12, 13, 14, 15, 29].includes(mavType) ? 3 : 10;

/** Every MAV_TYPE ArduPilot actually reports. */
const ARDUPILOT_TYPES = [
  1,                              // fixed wing
  2, 3, 4, 13, 14, 15, 29,        // copter family + heli
  10, 11,                         // rover, boat
  12,                             // sub
  19, 20, 21, 22, 23, 24, 25,     // VTOL family
];

const profileWith = (modes: { id: number; flags: number }[]): VehicleProfile =>
  ({ modes: modes.map((m) => ({ ...m, name: 'x' })) } as unknown as VehicleProfile);

describe('missionAutoMode', () => {
  it('sends ArduPilot exactly what it sent before, for every type it reports', () => {
    for (const mt of ARDUPILOT_TYPES) {
      expect(missionAutoMode(3, mt, null), `MAV_TYPE ${mt}`).toBe(legacyAutoMode(mt));
    }
  });

  it('treats an unrecognised autopilot as ArduPilot, which is what it got before', () => {
    for (const mt of ARDUPILOT_TYPES) {
      expect(missionAutoMode(7, mt, null), `MAV_TYPE ${mt}`).toBe(legacyAutoMode(mt));
    }
  });

  it('ignores a declared mode when the vehicle is ArduPilot', () => {
    expect(missionAutoMode(3, 2, 99)).toBe(3);
  });

  it('gives PX4 its own AUTO_MISSION encoding rather than a raw number', () => {
    expect(missionAutoMode(12, 2, null)).toBe(encodePx4CustomMode(4, 4));
    // The old path sent 3 or 10, which PX4 decodes as main_mode 0.
    expect(missionAutoMode(12, 2, null)).not.toBe(3);
    expect(missionAutoMode(12, 11, null)).not.toBe(10);
  });

  it('gives a third-party vehicle the mode it declared, whatever the frame', () => {
    expect(missionAutoMode(0, 11, 4)).toBe(4);
  });

  it('refuses to guess for a third-party vehicle that declared nothing', () => {
    expect(missionAutoMode(0, 11, null)).toBeNull();
  });
});

describe('missionModeId', () => {
  it('finds the one marked mode', () => {
    expect(missionModeId(profileWith([
      { id: 0, flags: 0 },
      { id: 4, flags: AD_MODE_FLAG.MISSION },
    ]))).toBe(4);
  });

  it('is null when nothing is marked', () => {
    expect(missionModeId(profileWith([{ id: 0, flags: 0 }]))).toBeNull();
  });

  it('is null when several are marked, rather than picking one', () => {
    expect(missionModeId(profileWith([
      { id: 1, flags: AD_MODE_FLAG.MISSION },
      { id: 2, flags: AD_MODE_FLAG.MISSION },
    ]))).toBeNull();
  });

  it('is null for a vehicle with no profile at all', () => {
    expect(missionModeId(null)).toBeNull();
  });
});
