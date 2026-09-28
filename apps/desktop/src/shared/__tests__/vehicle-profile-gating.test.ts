import { describe, it, expect } from 'vitest';
import {
  AD_FEAT,
  allowedMissionCommands,
  emptyProfile,
  viewAllowedForVehicle,
  type VehicleProfile,
} from '../vehicle-profile';
import { modesFromProfile } from '../flight-mode-meta';

function boat(overrides: Partial<VehicleProfile> = {}): VehicleProfile {
  return {
    ...emptyProfile(),
    vendor: 'rctestflight',
    model: 'boat kit',
    profileVersion: 1,
    features: AD_FEAT.PARAMS | AD_FEAT.MISSION | AD_FEAT.COMMANDS,
    missionCmds: [16, 20],
    ...overrides,
  };
}

describe('screens a vehicle cannot serve', () => {
  it('keeps every screen for a vehicle with no profile', () => {
    // ArduPilot and PX4 never send one, so this is the path almost every user is on.
    for (const view of ['parameters', 'mission', 'calibration', 'logs', 'telemetry']) {
      expect(viewAllowedForVehicle(view, null)).toBe(true);
    }
  });

  it('hides calibration when the vehicle never declared it', () => {
    expect(viewAllowedForVehicle('calibration', boat())).toBe(false);
  });

  it('shows calibration once the vehicle declares it', () => {
    const withCal = boat({ features: boat().features | AD_FEAT.CALIBRATION });
    expect(viewAllowedForVehicle('calibration', withCal)).toBe(true);
  });

  it('never hides the ground station its own screens', () => {
    // A vehicle cannot take away logs, settings or telemetry by staying quiet.
    const bare = boat({ features: 0 });
    for (const view of ['telemetry', 'logs', 'settings', 'inspector', 'sitl']) {
      expect(viewAllowedForVehicle(view, bare)).toBe(true);
    }
  });

  it('hides parameters and missions when they are not declared', () => {
    const bare = boat({ features: 0, missionCmds: [] });
    expect(viewAllowedForVehicle('parameters', bare)).toBe(false);
    expect(viewAllowedForVehicle('mission', bare)).toBe(false);
  });
});

describe('mission commands the vehicle will accept', () => {
  it('is null for a vehicle that never said, so the full list stays', () => {
    expect(allowedMissionCommands(null)).toBeNull();
    expect(allowedMissionCommands(boat({ missionCmds: [] }))).toBeNull();
  });

  it('is exactly what the vehicle declared', () => {
    const allowed = allowedMissionCommands(boat());
    expect(allowed?.has(16)).toBe(true);  // NAV_WAYPOINT
    expect(allowed?.has(20)).toBe(true);  // NAV_RETURN_TO_LAUNCH
    expect(allowed?.has(22)).toBe(false); // NAV_TAKEOFF, which a boat cannot do
    expect(allowed?.has(82)).toBe(false); // NAV_SPLINE_WAYPOINT
  });
});

describe('modes the vehicle named', () => {
  it('uses the vehicle ids, not ArduPilot ones', () => {
    const modes = modesFromProfile([
      { id: 0, name: 'Idle', flags: 0 },
      { id: 1, name: 'Running', flags: 0 },
      { id: 4, name: 'Returning', flags: 0 },
    ]);
    expect(modes.map((m) => m.modeNum)).toEqual([0, 1, 4]);
    expect(modes.map((m) => m.name)).toEqual(['Idle', 'Running', 'Returning']);
  });

  it('drops a mode the vehicle said may not be commanded remotely', () => {
    // The boat's manual screen owns the motors through a deadman on its own link.
    const modes = modesFromProfile([
      { id: 0, name: 'Idle', flags: 0 },
      { id: 6, name: 'Manual', flags: 1 },
    ]);
    expect(modes.map((m) => m.name)).toEqual(['Idle']);
  });

  it('drops an unnamed mode rather than showing a blank row', () => {
    const modes = modesFromProfile([
      { id: 0, name: 'Idle', flags: 0 },
      { id: 1, name: '', flags: 0 },
    ]);
    expect(modes).toHaveLength(1);
  });

  it('puts return and land in the return group so the picker stays readable', () => {
    const modes = modesFromProfile([
      { id: 1, name: 'Running', flags: 0 },
      { id: 4, name: 'Returning', flags: 0 },
    ]);
    expect(modes.find((m) => m.name === 'Returning')?.group).toBe('return');
    expect(modes.find((m) => m.name === 'Running')?.group).toBe('auto');
  });
});
