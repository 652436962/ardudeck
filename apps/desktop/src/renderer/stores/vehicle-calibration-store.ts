/**
 * A calibration running on a vehicle that declared its own.
 *
 * The routine lives in the firmware, so this holds nothing but what the vehicle last
 * said about it. Progress is not derived here and must never be guessed at: a bar that
 * advances on a timer tells the operator a calibration is going well when it may not be.
 */

import { create } from 'zustand';
import { AD_CAL_MAX_TRACKS } from '../../shared/vehicle-profile';

export const CAL_ACTION = { START: 0, ACCEPT: 1, CANCEL: 2, SAVE: 3 } as const;

export interface CalProgress {
  step: number;
  stepDone: boolean;
  track: number[];
  percent: number;
  hint: string;
}

export interface CalResult {
  ok: boolean;
  quality: number;
  detail: string;
}

interface State {
  activeId: string | null;
  progress: CalProgress | null;
  result: CalResult | null;
  start: (calId: string) => Promise<boolean>;
  accept: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
  save: () => Promise<boolean>;
  reset: () => void;
}

type Api = {
  vehicleCalControl?: (calId: string, action: number) => Promise<boolean>;
  onVehicleCalProgress?: (cb: (p: Record<string, unknown>) => void) => (() => void) | void;
  onVehicleCalResult?: (cb: (p: Record<string, unknown>) => void) => (() => void) | void;
};

function api(): Api {
  return (window.electronAPI ?? {}) as unknown as Api;
}

async function send(calId: string | null, action: number): Promise<boolean> {
  if (!calId) return false;
  return (await api().vehicleCalControl?.(calId, action)) ?? false;
}

export const useVehicleCalibrationStore = create<State>((set, get) => ({
  activeId: null,
  progress: null,
  result: null,

  start: async (calId) => {
    set({ activeId: calId, progress: null, result: null });
    const ok = await send(calId, CAL_ACTION.START);
    if (!ok) set({ activeId: null });
    return ok;
  },
  accept: () => send(get().activeId, CAL_ACTION.ACCEPT),
  save: () => send(get().activeId, CAL_ACTION.SAVE),
  cancel: async () => {
    const ok = await send(get().activeId, CAL_ACTION.CANCEL);
    set({ activeId: null, progress: null });
    return ok;
  },
  reset: () => set({ activeId: null, progress: null, result: null }),
}));

export function initVehicleCalibration(): () => void {
  const offProgress = api().onVehicleCalProgress?.((raw) => {
    const calId = String(raw.calId ?? '');
    const s = useVehicleCalibrationStore.getState();
    // A stale frame from a routine the operator already cancelled must not repaint.
    if (!s.activeId || s.activeId !== calId) return;
    const track = Array.isArray(raw.track) ? (raw.track as number[]) : [];
    useVehicleCalibrationStore.setState({
      progress: {
        step: Number(raw.step ?? 0),
        stepDone: Number(raw.stepDone ?? 0) === 1,
        track: Array.from({ length: AD_CAL_MAX_TRACKS }, (_, i) => Number(track[i] ?? 0)),
        percent: Number(raw.percent ?? 255),
        hint: String(raw.hint ?? ''),
      },
    });
  });

  const offResult = api().onVehicleCalResult?.((raw) => {
    const calId = String(raw.calId ?? '');
    const s = useVehicleCalibrationStore.getState();
    if (!s.activeId || s.activeId !== calId) return;
    useVehicleCalibrationStore.setState({
      result: {
        ok: Number(raw.ok ?? 0) === 1,
        quality: Number(raw.quality ?? Number.NaN),
        detail: String(raw.detail ?? ''),
      },
      activeId: null,
    });
  });

  return () => {
    if (typeof offProgress === 'function') offProgress();
    if (typeof offResult === 'function') offResult();
  };
}
