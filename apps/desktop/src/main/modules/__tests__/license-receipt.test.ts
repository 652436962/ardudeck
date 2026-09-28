import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { verifyReceipt } from '../license-validator';

const DEVICE = 'device-abc';
let priv: KeyObject;
let pub: string;

function b64(o: unknown): string {
  return Buffer.from(JSON.stringify(o), 'utf-8').toString('base64url');
}

function receipt(payload: unknown, key: KeyObject = priv): string {
  const p = b64(payload);
  const s = sign(null, Buffer.from(`receipt.v1.${p}`, 'utf-8'), key);
  return `ADRCPT.${p}.${s.toString('base64url')}`;
}

function licenceStyle(payload: unknown): string {
  const p = b64(payload);
  const s = sign(null, Buffer.from(p, 'utf-8'), priv);
  return `ADRCPT.${p}.${s.toString('base64url')}`;
}

const good = {
  v: 1 as const,
  slugs: ['com.ardudeck.vault'],
  deviceId: DEVICE,
  licenseId: 'lic-1',
  issuedAt: '2026-09-01T00:00:00.000Z',
};

beforeAll(() => {
  const pair = generateKeyPairSync('ed25519');
  priv = pair.privateKey;
  pub = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
});

describe('verifyReceipt', () => {
  it('accepts a receipt signed for this device', () => {
    const r = verifyReceipt(receipt(good), DEVICE, { publicKeyPem: pub });
    expect(r.valid).toBe(true);
    expect(r.payload?.slugs).toEqual(['com.ardudeck.vault']);
  });

  it('rejects a receipt minted for another device', () => {
    const r = verifyReceipt(receipt(good), 'someone-elses-device', { publicKeyPem: pub });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/another device/);
  });

  it('rejects a licence-key style signature over the same payload', () => {
    const r = verifyReceipt(licenceStyle(good), DEVICE, { publicKeyPem: pub });
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Invalid signature');
  });

  it('rejects a receipt signed by a different key', () => {
    const other = generateKeyPairSync('ed25519').privateKey;
    const r = verifyReceipt(receipt(good, other), DEVICE, { publicKeyPem: pub });
    expect(r.valid).toBe(false);
    expect(r.error).toBe('Invalid signature');
  });

  it('rejects a payload edited after signing', () => {
    const r = receipt(good);
    const parts = r.split('.');
    const tampered = `ADRCPT.${b64({ ...good, slugs: ['com.ardudeck.vault', 'tech.topas.coverage'] })}.${parts[2]}`;
    expect(verifyReceipt(tampered, DEVICE, { publicKeyPem: pub }).valid).toBe(false);
  });

  it('treats an absent expiry as no expiry', () => {
    const far = new Date('2099-01-01T00:00:00.000Z');
    expect(verifyReceipt(receipt(good), DEVICE, { publicKeyPem: pub, now: far }).valid).toBe(true);
  });

  it('enforces an expiry when the Hangar does start setting one', () => {
    const expiring = { ...good, expiresAt: '2026-10-01T00:00:00.000Z' };
    const before = new Date('2026-09-30T00:00:00.000Z');
    const after = new Date('2026-10-02T00:00:00.000Z');
    expect(verifyReceipt(receipt(expiring), DEVICE, { publicKeyPem: pub, now: before }).valid).toBe(true);
    const late = verifyReceipt(receipt(expiring), DEVICE, { publicKeyPem: pub, now: after });
    expect(late.valid).toBe(false);
    expect(late.error).toMatch(/expired/);
  });

  it('rejects junk and wrong prefixes without throwing', () => {
    for (const bad of ['', 'nonsense', 'ARDUDECK.a.b', 'ADRCPT.only-two', 'ADRCPT..']) {
      expect(verifyReceipt(bad, DEVICE, { publicKeyPem: pub }).valid).toBe(false);
    }
  });

  it('rejects a future receipt version rather than guessing', () => {
    const r = verifyReceipt(receipt({ ...good, v: 2 }), DEVICE, { publicKeyPem: pub });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/version/);
  });
});
