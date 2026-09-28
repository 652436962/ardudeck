/**
 * Assembles what a vehicle says about itself into one profile.
 *
 * The vehicle sends its manifest and then one message per mode, per parameter, per
 * calibration, spread over several seconds so a slow link is never flooded. Nothing
 * arrives atomically, so this holds the partial picture and reports when it changed.
 */

import {
  ARDUDECK_MANIFEST_ID,
  ARDUDECK_MODE_ID,
  ARDUDECK_MISSION_CMDS_ID,
  ARDUDECK_PARAM_META_ID,
  ARDUDECK_PARAM_OPTION_ID,
  ARDUDECK_CAL_DECLARE_ID,
  ARDUDECK_CAL_POSE_ID,
  ARDUDECK_CAL_TRACK_ID,
  deserializeArdudeckManifest,
  deserializeArdudeckMode,
  deserializeArdudeckMissionCmds,
  deserializeArdudeckParamMeta,
  deserializeArdudeckParamOption,
  deserializeArdudeckCalDeclare,
  deserializeArdudeckCalPose,
  deserializeArdudeckCalTrack,
} from '@ardudeck/mavlink-ts/dialect';
import {
  AD_CAL_KINDS,
  emptyProfile,
  type VehicleCalibration,
  type VehicleCalPose,
  type VehicleCalTrack,
  type VehicleMode,
  type VehicleProfile,
} from '../../shared/vehicle-profile.js';

/** A v2 sender truncates trailing zeros, so a short payload is padded, never rejected. */
function pad(payload: Uint8Array, length: number): Uint8Array {
  if (payload.length >= length) return payload;
  const out = new Uint8Array(length);
  out.set(payload);
  return out;
}

const LENGTHS: Record<number, number> = {
  [ARDUDECK_MANIFEST_ID]: 94,
  [ARDUDECK_MODE_ID]: 21,
  [ARDUDECK_MISSION_CMDS_ID]: 65,
  [ARDUDECK_PARAM_META_ID]: 124,
  [ARDUDECK_PARAM_OPTION_ID]: 52,
  [ARDUDECK_CAL_DECLARE_ID]: 186,
  [ARDUDECK_CAL_POSE_ID]: 50,
  [ARDUDECK_CAL_TRACK_ID]: 66,
};

export function isProfileMessage(msgid: number): boolean {
  return msgid in LENGTHS;
}

function findCal(profile: VehicleProfile, id: string): VehicleCalibration | undefined {
  return profile.calibrations.find((c) => c.id === id);
}

function recomputeComplete(p: VehicleProfile): void {
  const e = p.expected;
  p.complete =
    p.profileVersion > 0 &&
    p.modes.length >= e.modes &&
    p.missionCmds.length >= e.missionCmds &&
    p.calibrations.length >= e.calibrations &&
    Object.keys(p.params).length >= e.params &&
    p.calibrations.every(
      (c) => c.poses.length >= c.poseCount && c.tracks.length >= c.trackCount,
    );
}

/**
 * Indexed slots, kept beside the profile.
 *
 * Modes, poses and tracks each carry their own index and can arrive in any order, or
 * twice. Writing them into a dense array and compacting as they land loses whichever
 * ones have not arrived yet, so the sparse form is held here and the profile's arrays
 * are rebuilt from it.
 */
interface Slots {
  modes: (VehicleMode | undefined)[];
  poses: Map<string, (VehicleCalPose | undefined)[]>;
  tracks: Map<string, (VehicleCalTrack | undefined)[]>;
}

function emptySlots(): Slots {
  return { modes: [], poses: new Map(), tracks: new Map() };
}

function dense<T>(sparse: (T | undefined)[]): T[] {
  return sparse.filter((x): x is T => x !== undefined);
}

export class ProfileCollector {
  private byVehicle = new Map<string, VehicleProfile>();
  private slotsByVehicle = new Map<string, Slots>();

  /** The updated profile when this packet changed it, otherwise null. */
  ingest(vehicleKey: string, msgid: number, payload: Uint8Array): VehicleProfile | null {
    const length = LENGTHS[msgid];
    if (length === undefined) return null;

    const p = this.byVehicle.get(vehicleKey) ?? emptyProfile();
    const slots = this.slotsByVehicle.get(vehicleKey) ?? emptySlots();
    const bytes = pad(payload, length);

    try {
      switch (msgid) {
        case ARDUDECK_MANIFEST_ID: {
          const m = deserializeArdudeckManifest(bytes);
          p.vendor = m.vendor;
          p.model = m.model;
          p.firmwareVersion = m.firmware;
          p.uid = m.uid;
          p.frame = m.frame;
          p.features = m.features;
          p.profileVersion = m.profileVersion;
          p.missionCapacity = m.missionCapacity;
          p.paramCount = m.paramCount;
          p.expected = {
            modes: m.modeCount,
            missionCmds: m.missionCmdCount,
            calibrations: m.calCount,
            params: (m.features & 1) !== 0 ? m.paramCount : 0,
          };
          // Fewer than we hold means the vehicle was reflashed with a smaller table.
          if (p.modes.length > m.modeCount) p.modes = p.modes.slice(0, m.modeCount);
          if (p.calibrations.length > m.calCount) {
            p.calibrations = p.calibrations.slice(0, m.calCount);
          }
          break;
        }
        case ARDUDECK_MODE_ID: {
          const m = deserializeArdudeckMode(bytes);
          slots.modes[m.index] = { id: m.modeId, name: m.name, flags: m.flags };
          p.modes = dense(slots.modes);
          break;
        }
        case ARDUDECK_MISSION_CMDS_ID: {
          const m = deserializeArdudeckMissionCmds(bytes);
          p.missionCmds = m.cmds.slice(0, Math.min(m.count, 32));
          break;
        }
        case ARDUDECK_PARAM_META_ID: {
          const m = deserializeArdudeckParamMeta(bytes);
          if (!m.paramId) break;
          const existing = p.params[m.paramId];
          p.params = {
            ...p.params,
            [m.paramId]: {
              name: m.paramId,
              index: m.paramIndex,
              min: m.minValue,
              max: m.maxValue,
              increment: m.increment,
              unit: m.unit,
              help: m.help,
              flags: m.flags,
              optionCount: m.optionCount,
              options: existing?.options,
            },
          };
          break;
        }
        case ARDUDECK_PARAM_OPTION_ID: {
          const m = deserializeArdudeckParamOption(bytes);
          const target = p.params[m.paramId];
          if (!target) break;
          p.params = {
            ...p.params,
            [m.paramId]: {
              ...target,
              options: { ...(target.options ?? {}), [m.optionIndex]: m.label },
            },
          };
          break;
        }
        case ARDUDECK_CAL_DECLARE_ID: {
          const m = deserializeArdudeckCalDeclare(bytes);
          if (!m.calId) break;
          const existing = findCal(p, m.calId);
          const cal: VehicleCalibration = {
            id: m.calId,
            name: m.name || m.calId,
            kind: AD_CAL_KINDS[m.kind] ?? 'instant',
            requirements: m.requirements,
            warning: m.warning,
            prompt: m.prompt,
            poseCount: m.poseCount,
            trackCount: m.trackCount,
            poses: dense(slots.poses.get(m.calId) ?? []),
            tracks: dense(slots.tracks.get(m.calId) ?? []),
          };
          p.calibrations = existing
            ? p.calibrations.map((c) => (c.id === cal.id ? cal : c))
            : [...p.calibrations, cal];
          break;
        }
        case ARDUDECK_CAL_POSE_ID: {
          const m = deserializeArdudeckCalPose(bytes);
          if (!findCal(p, m.calId)) break;
          const poses = slots.poses.get(m.calId) ?? [];
          poses[m.poseIndex] = { name: m.name, rollDeg: m.rollDeg, pitchDeg: m.pitchDeg };
          slots.poses.set(m.calId, poses);
          p.calibrations = p.calibrations.map((c) =>
            c.id === m.calId ? { ...c, poses: dense(poses) } : c,
          );
          break;
        }
        case ARDUDECK_CAL_TRACK_ID: {
          const m = deserializeArdudeckCalTrack(bytes);
          if (!findCal(p, m.calId)) break;
          const tracks = slots.tracks.get(m.calId) ?? [];
          tracks[m.trackIndex] = { label: m.label, unit: m.unit, needed: m.needed };
          slots.tracks.set(m.calId, tracks);
          p.calibrations = p.calibrations.map((c) =>
            c.id === m.calId ? { ...c, tracks: dense(tracks) } : c,
          );
          break;
        }
        default:
          return null;
      }
    } catch {
      // A malformed payload is one bad frame, not a reason to lose the whole profile.
      return null;
    }

    recomputeComplete(p);
    this.byVehicle.set(vehicleKey, p);
    this.slotsByVehicle.set(vehicleKey, slots);
    return p;
  }

  get(vehicleKey: string): VehicleProfile | null {
    return this.byVehicle.get(vehicleKey) ?? null;
  }

  /** A reconnect may be a different vehicle on the same key, so the old profile goes. */
  clear(vehicleKey?: string): void {
    if (vehicleKey) {
      this.byVehicle.delete(vehicleKey);
      this.slotsByVehicle.delete(vehicleKey);
    } else {
      this.byVehicle.clear();
      this.slotsByVehicle.clear();
    }
  }
}
