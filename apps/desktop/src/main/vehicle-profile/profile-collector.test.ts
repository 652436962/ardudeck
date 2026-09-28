import { describe, it, expect } from 'vitest';
import { MAVLinkParser, getAllMessageInfos } from '@ardudeck/mavlink-ts';
import { registerArduDeckDialect } from '@ardudeck/mavlink-ts/dialect';
import { ProfileCollector, isProfileMessage } from './profile-collector.js';
import { AD_FEAT, hasFeature, supports, declaredReservedFeatures } from '../../shared/vehicle-profile.js';

registerArduDeckDialect();

/** Frames captured from a vehicle running the ArduDeck Vehicle SDK, over a real socket. */
const MANIFEST = new Uint8Array([
  0xfd, 0x3b, 0x00, 0x00, 0x62, 0x01, 0x01, 0xf8, 0xa7, 0x00, 0x27, 0x02, 0x00, 0x00, 0x01,
  0x00, 0x10, 0x00, 0x05, 0x00, 0x05, 0x04, 0x02, 0x03, 0x61, 0x63, 0x6d, 0x65, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x74,
  0x65, 0x73, 0x74, 0x20, 0x72, 0x6f, 0x76, 0x65, 0x72, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x31, 0x2e, 0x30, 0x2e, 0x30, 0x8d, 0x7c,
]);

function payloadOf(frame: Uint8Array): { msgid: number; payload: Uint8Array } {
  const parser = new MAVLinkParser();
  parser.registerMessages(getAllMessageInfos());
  parser.feed(frame);
  const packet = parser.parseNext();
  if (!packet) throw new Error('frame did not parse');
  return { msgid: packet.msgid, payload: packet.payload };
}

function collectorWithManifest() {
  const c = new ProfileCollector();
  const { msgid, payload } = payloadOf(MANIFEST);
  const profile = c.ingest('v1', msgid, payload);
  if (!profile) throw new Error('manifest was not ingested');
  return { c, profile };
}

describe('vehicle profile collector', () => {
  it('knows which messages are its own', () => {
    expect(isProfileMessage(43000)).toBe(true);
    expect(isProfileMessage(0)).toBe(false);
    expect(isProfileMessage(24)).toBe(false);
  });

  it('builds a profile from the manifest the vehicle actually sent', () => {
    const { profile } = collectorWithManifest();
    expect(profile.vendor).toBe('acme');
    expect(profile.model).toBe('test rover');
    expect(profile.firmwareVersion).toBe('1.0.0');
    expect(profile.frame).toBe(5);
    expect(profile.missionCapacity).toBe(16);
    expect(profile.paramCount).toBe(5);
    expect(profile.profileVersion).toBe(1);
  });

  it('reads the declared features', () => {
    const { profile } = collectorWithManifest();
    expect(hasFeature(profile, AD_FEAT.PARAMS)).toBe(true);
    expect(hasFeature(profile, AD_FEAT.MISSION)).toBe(true);
    expect(hasFeature(profile, AD_FEAT.CALIBRATION)).toBe(true);
    expect(hasFeature(profile, AD_FEAT.TERRAIN)).toBe(false);
    expect(declaredReservedFeatures(profile)).toBe(0);
  });

  it('assembles modes that arrive one at a time, in any order', () => {
    const { c } = collectorWithManifest();
    const mode = (index: number, id: number, name: string) => {
      const p = new Uint8Array(21);
      new DataView(p.buffer).setUint16(0, id, true);
      p[2] = index;
      p[3] = 4;
      p.set(new TextEncoder().encode(name), 5);
      return c.ingest('v1', 43001, p);
    };
    mode(2, 2, 'Holding');
    mode(0, 0, 'Idle');
    const after = mode(1, 1, 'Running');
    expect(after?.modes.map((m) => m.name)).toEqual(['Idle', 'Running', 'Holding']);
    expect(after?.modes.map((m) => m.id)).toEqual([0, 1, 2]);
  });

  it('keeps parameter metadata and its option labels together', () => {
    const { c } = collectorWithManifest();

    const meta = new Uint8Array(124);
    const mv = new DataView(meta.buffer);
    mv.setFloat32(0, 0, true);
    mv.setFloat32(4, 3, true);
    mv.setUint16(12, 4, true);
    meta[14] = 0x04; // has options
    meta[15] = 2;
    meta.set(new TextEncoder().encode('FS_ACTION'), 16);
    meta.set(new TextEncoder().encode('What to do when the link fails'), 44);
    c.ingest('v1', 43003, meta);

    const option = (index: number, label: string) => {
      const o = new Uint8Array(52);
      new DataView(o.buffer).setUint16(0, 4, true);
      o[2] = index;
      o[3] = 2;
      o.set(new TextEncoder().encode('FS_ACTION'), 4);
      o.set(new TextEncoder().encode(label), 20);
      return c.ingest('v1', 43004, o);
    };
    option(0, 'Hold');
    const after = option(1, 'Return home');

    const p = after?.params['FS_ACTION'];
    expect(p?.help).toBe('What to do when the link fails');
    expect(p?.max).toBe(3);
    expect(p?.options).toEqual({ 0: 'Hold', 1: 'Return home' });
  });

  it('ignores an option for a parameter it has never heard of', () => {
    const { c } = collectorWithManifest();
    const o = new Uint8Array(52);
    o.set(new TextEncoder().encode('NOPE'), 4);
    const after = c.ingest('v1', 43004, o);
    expect(after?.params['NOPE']).toBeUndefined();
  });

  it('attaches poses and tracks to the calibration that declared them', () => {
    const { c } = collectorWithManifest();

    const declare = new Uint8Array(186);
    declare[0] = 0;
    declare[1] = 1;
    declare[2] = 1; // coverage
    declare[3] = 0x01; // disarmed
    declare[5] = 2; // two tracks
    declare.set(new TextEncoder().encode('compass'), 6);
    declare.set(new TextEncoder().encode('Compass'), 22);
    c.ingest('v1', 43005, declare);

    const track = (index: number, label: string, needed: number) => {
      const t = new Uint8Array(66);
      new DataView(t.buffer).setFloat32(0, needed, true);
      t[5] = index;
      t.set(new TextEncoder().encode('compass'), 6);
      t.set(new TextEncoder().encode(label), 34);
      return c.ingest('v1', 43007, t);
    };
    // Deliberately out of order, which is what a lost and re-sent frame looks like.
    track(1, 'Total turning', 720);
    const after = track(0, 'Sectors turned through', 12);

    const cal = after?.calibrations[0];
    expect(cal?.id).toBe('compass');
    expect(cal?.kind).toBe('coverage');
    expect(cal?.tracks).toEqual([
      { label: 'Sectors turned through', unit: '', needed: 12 },
      { label: 'Total turning', unit: '', needed: 720 },
    ]);
  });

  it('is complete only when everything the manifest promised has arrived', () => {
    const { c, profile } = collectorWithManifest();
    // The manifest promises 4 modes, 2 mission commands, 3 calibrations, 5 parameters.
    expect(profile.expected).toEqual({ modes: 4, missionCmds: 2, calibrations: 3, params: 5 });
    expect(profile.complete).toBe(false);
  });

  it('is not complete while a declared track is still missing', () => {
    const { c } = collectorWithManifest();
    const declare = new Uint8Array(186);
    declare[1] = 1;
    declare[2] = 1;
    declare[5] = 3;
    declare.set(new TextEncoder().encode('compass'), 6);
    declare.set(new TextEncoder().encode('Compass'), 22);
    const after = c.ingest('v1', 43005, declare);
    const cal = after?.calibrations[0];
    expect(cal?.trackCount).toBe(3);
    expect(cal?.tracks.length).toBe(0);
    expect(after?.complete).toBe(false);
  });

  it('keeps vehicles apart', () => {
    const { c } = collectorWithManifest();
    expect(c.get('v1')?.vendor).toBe('acme');
    expect(c.get('v2')).toBeNull();
  });

  it('forgets a vehicle on request, because a reconnect may be a different one', () => {
    const { c } = collectorWithManifest();
    c.clear('v1');
    expect(c.get('v1')).toBeNull();
  });

  it('survives a malformed payload without losing what it already had', () => {
    const { c } = collectorWithManifest();
    c.ingest('v1', 43005, new Uint8Array(0));
    expect(c.get('v1')?.vendor).toBe('acme');
  });

  it('treats an ArduPilot vehicle, which has no profile, as supporting everything', () => {
    // Otherwise adding the contract would hide screens from every existing vehicle.
    expect(supports(null, AD_FEAT.MISSION)).toBe(true);
    expect(supports(undefined, AD_FEAT.PARAMS)).toBe(true);
  });
});
