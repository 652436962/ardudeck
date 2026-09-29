import { describe, it, expect } from 'vitest';
import { deserializeRxConfig, INAV_SERIALRX_PROVIDER_NAMES } from './config.js';

const payload = (provider: number) => {
  const p = new Uint8Array(24);
  p[0] = provider;
  p[23] = 1; // receiver_type SERIAL
  return p;
};

describe('deserializeRxConfig', () => {
  it('names an INAV provider from INAV\'s enum, not Betaflight\'s', () => {
    // INAV rx.h: SERIALRX_CRSF = 6. On Betaflight 6 is XBUS_MODE_B_RJ01.
    expect(deserializeRxConfig(payload(6), 'inav').serialrxProviderName).toBe('CRSF');
    expect(deserializeRxConfig(payload(12), 'inav').serialrxProviderName).toBe('MAVLINK');
  });

  it('keeps Betaflight names by default', () => {
    expect(deserializeRxConfig(payload(9)).serialrxProviderName).toBe('CRSF');
    expect(deserializeRxConfig(payload(6)).serialrxProviderName).toBe('XBUS_MODE_B_RJ01');
  });

  it('matches the serial_rx table in INAV settings.yaml', () => {
    expect(Object.values(INAV_SERIALRX_PROVIDER_NAMES)).toEqual([
      'SPEK1024', 'SPEK2048', 'SBUS', 'SUMD', 'IBUS', 'JETIEXBUS', 'CRSF', 'FPORT',
      'SBUS_FAST', 'FPORT2', 'SRXL2', 'GHST', 'MAVLINK', 'FBUS', 'SBUS2',
    ]);
  });
});
