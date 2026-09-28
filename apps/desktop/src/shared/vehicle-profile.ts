/**
 * What a vehicle says about itself over the ArduDeck Vehicle SDK.
 *
 * ArduPilot and PX4 are known quantities: their modes, parameter metadata and
 * capabilities are baked into tables here. A third firmware is not, so it sends them,
 * and this is where that arrives.
 *
 * The rule the whole contract rests on: a capability the vehicle does not declare is a
 * screen we do not show. Absent is not "assume ArduPilot".
 */

export const AD_PROFILE_VERSION = 1;

/** The profile carries at most this many coverage tracks per calibration. */
export const AD_CAL_MAX_TRACKS = 3;

export const AD_FEAT = {
  PARAMS: 1 << 0,
  MISSION: 1 << 1,
  COMMANDS: 1 << 2,
  HOME: 1 << 3,
  CALIBRATION: 1 << 5,
  TERRAIN: 1 << 8,
  MISSION_READ: 1 << 9,
  RC_REPORT: 1 << 10,
} as const;

/** Bit numbers are fixed, but v1 defines no protocol for these. Declaring one is a bug. */
export const AD_FEAT_RESERVED = (1 << 4) | (1 << 6) | (1 << 7);

export const AD_MODE_FLAG = {
  LOCAL_ONLY: 1 << 0,
  ARMED_ONLY: 1 << 1,
  TERMINAL: 1 << 2,
} as const;

export const AD_PARAM_FLAG = {
  REBOOT: 1 << 0,
  READONLY: 1 << 1,
  OPTIONS: 1 << 2,
  ADVANCED: 1 << 3,
} as const;

export type AdCalKind = 'positional' | 'coverage' | 'sweep' | 'instant';

export const AD_CAL_KINDS: AdCalKind[] = ['positional', 'coverage', 'sweep', 'instant'];

export const AD_CAL_REQ = {
  DISARMED: 1 << 0,
  STATIONARY: 1 << 1,
  PROPS_OFF: 1 << 2,
  MOTORS_LIVE: 1 << 3,
  LOCAL_ONLY: 1 << 4,
  LEVEL_SURFACE: 1 << 5,
} as const;

/** Frame ids the vehicle may declare. Picks the icon and whether altitude is first class. */
export const AD_FRAME_NAMES: Record<number, string> = {
  0: 'Unknown',
  1: 'Multirotor',
  2: 'Fixed wing',
  3: 'VTOL',
  4: 'Helicopter',
  5: 'Rover',
  6: 'Surface boat',
  7: 'Submarine',
  8: 'Antenna tracker',
};

export interface VehicleMode {
  id: number;
  name: string;
  flags: number;
}

export interface VehicleParamMeta {
  name: string;
  index: number;
  min: number;
  max: number;
  increment: number;
  unit: string;
  help: string;
  flags: number;
  /** Index-keyed labels, so the editor offers words instead of numbers. */
  options?: Record<number, string>;
  optionCount: number;
}

export interface VehicleCalPose {
  name: string;
  rollDeg: number;
  pitchDeg: number;
}

export interface VehicleCalTrack {
  label: string;
  unit: string;
  needed: number;
}

export interface VehicleCalibration {
  id: string;
  name: string;
  kind: AdCalKind;
  requirements: number;
  warning: string;
  prompt: string;
  poses: VehicleCalPose[];
  tracks: VehicleCalTrack[];
  poseCount: number;
  trackCount: number;
}

export interface VehicleProfile {
  vendor: string;
  model: string;
  firmwareVersion: string;
  uid: string;
  frame: number;
  features: number;
  profileVersion: number;
  missionCapacity: number;
  paramCount: number;
  modes: VehicleMode[];
  missionCmds: number[];
  calibrations: VehicleCalibration[];
  params: Record<string, VehicleParamMeta>;
  /**
   * What the manifest promised, so a half-arrived profile is visibly half-arrived.
   * Modes and calibrations trickle in one message per tick, which on a slow link is
   * seconds, and a screen that renders three of seven modes as if that were all of
   * them is worse than one that waits.
   */
  expected: { modes: number; missionCmds: number; calibrations: number; params: number };
  /** Everything the manifest promised has arrived. */
  complete: boolean;
}

export function emptyProfile(): VehicleProfile {
  return {
    vendor: '', model: '', firmwareVersion: '', uid: '',
    frame: 0, features: 0, profileVersion: 0,
    missionCapacity: 0, paramCount: 0,
    modes: [], missionCmds: [], calibrations: [], params: {},
    expected: { modes: 0, missionCmds: 0, calibrations: 0, params: 0 },
    complete: false,
  };
}

export function hasFeature(profile: VehicleProfile | null | undefined, bit: number): boolean {
  return !!profile && (profile.features & bit) !== 0;
}

/**
 * Whether a screen should be shown for this vehicle.
 *
 * No profile means an ArduPilot or PX4 vehicle, which keeps the behaviour it has always
 * had. A profile means the vehicle told us, and we believe it.
 */
export function supports(profile: VehicleProfile | null | undefined, bit: number): boolean {
  if (!profile) return true;
  return hasFeature(profile, bit);
}

export function frameName(frame: number): string {
  return AD_FRAME_NAMES[frame] ?? `Frame ${frame}`;
}

export function describeVehicle(profile: VehicleProfile): string {
  const parts = [profile.vendor, profile.model].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Unidentified vehicle';
}

/** Reserved bits a vehicle should never set. Surfaced so the operator can report it. */
export function declaredReservedFeatures(profile: VehicleProfile): number {
  return profile.features & AD_FEAT_RESERVED;
}

/**
 * Which capability a screen needs, for vehicles that declare their own.
 *
 * Only screens a third firmware can genuinely lack are listed. Telemetry, logs, settings
 * and the like are the ground station's own and are never hidden. A screen not listed
 * here stays visible for every vehicle, which is the safe direction to be wrong in.
 */
export const VIEW_REQUIRES: Readonly<Record<string, number>> = {
  parameters: AD_FEAT.PARAMS,
  mission: AD_FEAT.MISSION,
  calibration: AD_FEAT.CALIBRATION,
};

/**
 * Whether a screen should appear for this vehicle.
 *
 * A vehicle with no profile is ArduPilot, PX4 or nothing connected, and keeps every
 * screen it has always had. A vehicle with a profile is taken at its word: hiding a
 * screen it cannot serve is better than showing one that fails on first use.
 */
export function viewAllowedForVehicle(
  viewId: string,
  profile: VehicleProfile | null | undefined,
): boolean {
  if (!profile) return true;
  const required = VIEW_REQUIRES[viewId];
  if (required === undefined) return true;
  return hasFeature(profile, required);
}

/** Mission commands the vehicle will accept, or null when it never said. */
export function allowedMissionCommands(
  profile: VehicleProfile | null | undefined,
): ReadonlySet<number> | null {
  if (!profile || profile.missionCmds.length === 0) return null;
  return new Set(profile.missionCmds);
}
