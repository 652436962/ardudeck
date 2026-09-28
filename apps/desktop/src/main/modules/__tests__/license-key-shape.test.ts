import { describe, it, expect } from 'vitest';
import { isLicenseKeyShaped } from '../license-validator';

describe('license key shape', () => {
  it('accepts a real three-part key', () => {
    expect(isLicenseKeyShaped('ARDUDECK.eyJwcm9kdWN0IjoieCJ9.c2ln')).toBe(true);
  });

  it('rejects the empty key a free install leaves behind', () => {
    // This is the whole point: a free cargo has no key, and asking the crypto
    // to verify one produced "Invalid key format" when updating it.
    expect(isLicenseKeyShaped('')).toBe(false);
    expect(isLicenseKeyShaped(null)).toBe(false);
    expect(isLicenseKeyShaped(undefined)).toBe(false);
  });

  it('rejects keys that are the wrong shape', () => {
    expect(isLicenseKeyShaped('ARDUDECK.payload')).toBe(false);
    expect(isLicenseKeyShaped('SOMETHINGELSE.payload.sig')).toBe(false);
    expect(isLicenseKeyShaped('ARDUDECK..sig')).toBe(false);
    expect(isLicenseKeyShaped('ARDUDECK.payload.')).toBe(false);
  });
});
