/**
 * Parameter metadata that came from the vehicle rather than a download.
 *
 * ArduPilot and PX4 publish tables and ArduDeck fetches them by vehicle type. A third
 * firmware has no published table, so it sends the metadata itself, and without this the
 * parameter screen is a list of names and numbers with no units, no bounds and no
 * explanation of what any of them do.
 */

import { AD_PARAM_FLAG } from '../../shared/vehicle-profile';
import { useActiveVehicleStore } from './active-vehicle-store';
import { useVehicleProfileStore } from './vehicle-profile-store';

export interface DeclaredMeta {
  range?: { min: number; max: number };
  increment?: number;
  values?: Record<number, string>;
  units?: string;
  bitmask?: Record<number, string>;
  rebootRequired?: boolean;
  volatile?: boolean;
  /** One line from the vehicle. The bundled tables call this a description. */
  description?: string;
}

export function getDeclaredParamMeta(paramId: string): DeclaredMeta | null {
  const key = useActiveVehicleStore.getState().activeVehicleKey;
  if (!key) return null;

  const profile = useVehicleProfileStore.getState().byVehicle[key];
  const p = profile?.params[paramId];
  if (!p) return null;

  return {
    // An inverted or empty range means the vehicle did not really have one, and a
    // slider built from it would refuse every value the operator types.
    range: p.max > p.min ? { min: p.min, max: p.max } : undefined,
    increment: p.increment > 0 ? p.increment : undefined,
    values: p.options && Object.keys(p.options).length > 0 ? p.options : undefined,
    units: p.unit || undefined,
    rebootRequired: (p.flags & AD_PARAM_FLAG.REBOOT) !== 0,
    description: p.help || undefined,
  };
}
