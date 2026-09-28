/**
 * CalibrationView - Sensor Calibration Screen
 *
 * Full-screen view for calibrating flight controller sensors.
 * Supports MSP (iNav/Betaflight) and MAVLink (ArduPilot) protocols.
 */

import { useEffect } from 'react';
import { useCalibrationStore } from '../../stores/calibration-store';
import { CalibrationHeader } from './CalibrationHeader';
import { SelectCalibrationStep } from './steps/SelectCalibrationStep';
import { PrepareCalibrationStep } from './steps/PrepareCalibrationStep';
import { CalibratingStep } from './steps/CalibratingStep';
import { CalibrationCompleteStep } from './steps/CalibrationCompleteStep';
import { VehicleCalibrationPanel } from './VehicleCalibrationPanel';
import { useActiveVehicleStore } from '../../stores/active-vehicle-store';
import { useVehicleProfileStore } from '../../stores/vehicle-profile-store';
import { AD_FEAT, hasFeature } from '../../../shared/vehicle-profile';

export function CalibrationView() {
  const { currentStep, open } = useCalibrationStore();
  const activeVehicleKey = useActiveVehicleStore((s) => s.activeVehicleKey);
  const profile = useVehicleProfileStore(
    (s) => (activeVehicleKey ? s.byVehicle[activeVehicleKey] : undefined),
  );

  // Initialize calibration state when view mounts
  useEffect(() => {
    open();
  }, [open]);

  // A vehicle that described its own calibrations gets those, driven by its own routine.
  // ArduPilot's six-point and compass logic would send messages it has never heard of.
  if (profile && hasFeature(profile, AD_FEAT.CALIBRATION)) {
    return (
      <div className="h-full flex flex-col">
        <CalibrationHeader />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <VehicleCalibrationPanel profile={profile} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <CalibrationHeader />

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {currentStep === 'select' && <SelectCalibrationStep />}
          {currentStep === 'prepare' && <PrepareCalibrationStep />}
          {currentStep === 'calibrating' && <CalibratingStep />}
          {currentStep === 'complete' && <CalibrationCompleteStep />}
        </div>
      </div>
    </div>
  );
}

export default CalibrationView;
