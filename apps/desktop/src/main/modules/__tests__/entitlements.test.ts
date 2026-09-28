import { describe, it, expect } from 'vitest';
import { entitledSlugs } from '../entitlements';

const DEVICE = 'device-abc';

const FORGED = 'ADRCPT.eyJ2IjoxfQ.bm90LWEtc2lnbmF0dXJl';

describe('entitledSlugs', () => {
  it('grants nothing from an unverifiable receipt', () => {
    const r = entitledSlugs({
      receipts: [FORGED],
      deviceId: DEVICE,
      grandfathered: false,
      installedSlugs: ['com.ardudeck.vault'],
    });
    expect(r.slugs.size).toBe(0);
    expect(r.provisional).toBe(false);
  });

  it('grants nothing to a hand-written record with no receipt at all', () => {
    const r = entitledSlugs({
      receipts: [],
      deviceId: DEVICE,
      grandfathered: false,
      installedSlugs: ['com.ardudeck.vault', 'tech.topas.coverage'],
    });
    expect(r.slugs.size).toBe(0);
  });

  it('keeps a pre-receipt install working, and says the answer is provisional', () => {
    const r = entitledSlugs({
      receipts: [],
      deviceId: DEVICE,
      grandfathered: true,
      installedSlugs: ['com.ardudeck.vault'],
    });
    expect(r.slugs.has('com.ardudeck.vault')).toBe(true);
    expect(r.provisional).toBe(true);
  });

  it('stops grandfathering once a real receipt has arrived', () => {
    const r = entitledSlugs({
      receipts: [FORGED],
      deviceId: DEVICE,
      grandfathered: true,
      installedSlugs: ['com.ardudeck.vault'],
    });
    expect(r.provisional).toBe(true);
    expect(r.slugs.has('com.ardudeck.vault')).toBe(true);
  });

  it('does not invent slugs that are not installed when grandfathering', () => {
    const r = entitledSlugs({
      receipts: [],
      deviceId: DEVICE,
      grandfathered: true,
      installedSlugs: [],
    });
    expect(r.slugs.size).toBe(0);
  });
});
