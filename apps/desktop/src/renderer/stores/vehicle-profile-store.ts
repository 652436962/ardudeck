/**
 * Profiles from vehicles running the ArduDeck Vehicle SDK.
 *
 * ArduPilot and PX4 have no profile and never will: their modes, parameter metadata and
 * capabilities are baked into tables. So a missing profile means "the vehicle we already
 * knew how to talk to", and every consumer has to treat it that way rather than as a
 * vehicle that supports nothing.
 */

import { create } from 'zustand';
import {
  AD_FEAT,
  hasFeature,
  supports,
  type VehicleProfile,
} from '../../shared/vehicle-profile';

interface VehicleProfileState {
  byVehicle: Record<string, VehicleProfile>;
  setProfile: (vehicleKey: string, profile: VehicleProfile) => void;
  clear: (vehicleKey?: string) => void;
}

export const useVehicleProfileStore = create<VehicleProfileState>((set) => ({
  byVehicle: {},
  setProfile: (vehicleKey, profile) =>
    set((s) => ({ byVehicle: { ...s.byVehicle, [vehicleKey]: profile } })),
  clear: (vehicleKey) =>
    set((s) => {
      if (!vehicleKey) return { byVehicle: {} };
      const next = { ...s.byVehicle };
      delete next[vehicleKey];
      return { byVehicle: next };
    }),
}));

export function getVehicleProfile(vehicleKey: string | null | undefined): VehicleProfile | null {
  if (!vehicleKey) return null;
  return useVehicleProfileStore.getState().byVehicle[vehicleKey] ?? null;
}

/** True when the vehicle declared this capability, or when it is not an SDK vehicle. */
export function vehicleSupports(vehicleKey: string | null | undefined, bit: number): boolean {
  return supports(getVehicleProfile(vehicleKey), bit);
}

export { AD_FEAT, hasFeature };
export type { VehicleProfile };

export function initVehicleProfiles(): () => void {
  const api = window.electronAPI as unknown as {
    onVehicleProfile?: (
      cb: (payload: { vehicleKey: string; profile: VehicleProfile }) => void,
    ) => (() => void) | void;
  };
  const off = api?.onVehicleProfile?.((payload) => {
    if (!payload?.vehicleKey || !payload.profile) return;
    useVehicleProfileStore.getState().setProfile(payload.vehicleKey, payload.profile);
  });
  return typeof off === 'function' ? off : () => {};
}
