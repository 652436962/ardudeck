/**
 * The ArduDeck dialect, generated from the Vehicle SDK's profile/ardudeck.xml.
 *
 * DO NOT EDIT. Regenerate with:
 *   python3 tools/gen_ts.py --out <this file>
 * in the ardudeck-vehicle-sdk repository, which is upstream of this one: the
 * contract a vendor implements cannot change because the application changed.
 *
 * Without these the messages still reach the parser (unknown ids are queued, not
 * dropped) but show up as MSG_42000 with no fields, because a message the registry
 * does not know cannot be decoded.
 */

import type { MessageInfo } from '../core/types.js';
import { MESSAGE_REGISTRY } from '../generated/message-registry.js';

export const ARDUDECK_PROFILE_VERSION = 1;

/**
 * ARDUDECK_MANIFEST
 * Message ID: 43000
 * CRC Extra: 144
 */
export interface ArdudeckManifest {
  features: number;
  profileVersion: number;
  missionCapacity: number;
  paramCount: number;
  frame: number;
  modeCount: number;
  missionCmdCount: number;
  calCount: number;
  vendor: string;
  model: string;
  firmware: string;
  uid: string;
}

export const ARDUDECK_MANIFEST_ID = 43000;
export const ARDUDECK_MANIFEST_CRC_EXTRA = 144;
export const ARDUDECK_MANIFEST_LENGTH = 94;

export function serializeArdudeckManifest(msg: ArdudeckManifest): Uint8Array {
  const buffer = new Uint8Array(94);
  const view = new DataView(buffer.buffer);

  view.setUint32(0, msg.features, true);
  view.setUint16(4, msg.profileVersion, true);
  view.setUint16(6, msg.missionCapacity, true);
  view.setUint16(8, msg.paramCount, true);
  buffer[10] = msg.frame & 0xff;
  buffer[11] = msg.modeCount & 0xff;
  buffer[12] = msg.missionCmdCount & 0xff;
  buffer[13] = msg.calCount & 0xff;
  buffer.set(new TextEncoder().encode(msg.vendor || '').slice(0, 20), 14);
  buffer.set(new TextEncoder().encode(msg.model || '').slice(0, 20), 34);
  buffer.set(new TextEncoder().encode(msg.firmware || '').slice(0, 16), 54);
  buffer.set(new TextEncoder().encode(msg.uid || '').slice(0, 24), 70);

  return buffer;
}

export function deserializeArdudeckManifest(payload: Uint8Array): ArdudeckManifest {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    features: view.getUint32(0, true),
    profileVersion: view.getUint16(4, true),
    missionCapacity: view.getUint16(6, true),
    paramCount: view.getUint16(8, true),
    frame: payload[10],
    modeCount: payload[11],
    missionCmdCount: payload[12],
    calCount: payload[13],
    vendor: new TextDecoder().decode(payload.slice(14, 34)).replace(/\0.*$/, ''),
    model: new TextDecoder().decode(payload.slice(34, 54)).replace(/\0.*$/, ''),
    firmware: new TextDecoder().decode(payload.slice(54, 70)).replace(/\0.*$/, ''),
    uid: new TextDecoder().decode(payload.slice(70, 94)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_MODE
 * Message ID: 43001
 * CRC Extra: 219
 */
export interface ArdudeckMode {
  modeId: number;
  index: number;
  count: number;
  flags: number;
  name: string;
}

export const ARDUDECK_MODE_ID = 43001;
export const ARDUDECK_MODE_CRC_EXTRA = 219;
export const ARDUDECK_MODE_LENGTH = 21;

export function serializeArdudeckMode(msg: ArdudeckMode): Uint8Array {
  const buffer = new Uint8Array(21);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, msg.modeId, true);
  buffer[2] = msg.index & 0xff;
  buffer[3] = msg.count & 0xff;
  buffer[4] = msg.flags & 0xff;
  buffer.set(new TextEncoder().encode(msg.name || '').slice(0, 16), 5);

  return buffer;
}

export function deserializeArdudeckMode(payload: Uint8Array): ArdudeckMode {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    modeId: view.getUint16(0, true),
    index: payload[2],
    count: payload[3],
    flags: payload[4],
    name: new TextDecoder().decode(payload.slice(5, 21)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_MISSION_CMDS
 * Message ID: 43002
 * CRC Extra: 219
 */
export interface ArdudeckMissionCmds {
  cmds: number[];
  count: number;
}

export const ARDUDECK_MISSION_CMDS_ID = 43002;
export const ARDUDECK_MISSION_CMDS_CRC_EXTRA = 219;
export const ARDUDECK_MISSION_CMDS_LENGTH = 65;

export function serializeArdudeckMissionCmds(msg: ArdudeckMissionCmds): Uint8Array {
  const buffer = new Uint8Array(65);
  const view = new DataView(buffer.buffer);

  for (let i = 0; i < 32; i++) {
    view.setUint16(0 + i * 2, msg.cmds?.[i] ?? 0, true);
  }
  buffer[64] = msg.count & 0xff;

  return buffer;
}

export function deserializeArdudeckMissionCmds(payload: Uint8Array): ArdudeckMissionCmds {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    cmds: Array.from({ length: 32 }, (_, i) => view.getUint16(0 + i * 2, true)),
    count: payload[64],
  };
}

/**
 * ARDUDECK_PARAM_META
 * Message ID: 43003
 * CRC Extra: 203
 */
export interface ArdudeckParamMeta {
  minValue: number;
  maxValue: number;
  increment: number;
  paramIndex: number;
  flags: number;
  optionCount: number;
  paramId: string;
  unit: string;
  help: string;
}

export const ARDUDECK_PARAM_META_ID = 43003;
export const ARDUDECK_PARAM_META_CRC_EXTRA = 203;
export const ARDUDECK_PARAM_META_LENGTH = 124;

export function serializeArdudeckParamMeta(msg: ArdudeckParamMeta): Uint8Array {
  const buffer = new Uint8Array(124);
  const view = new DataView(buffer.buffer);

  view.setFloat32(0, msg.minValue, true);
  view.setFloat32(4, msg.maxValue, true);
  view.setFloat32(8, msg.increment, true);
  view.setUint16(12, msg.paramIndex, true);
  buffer[14] = msg.flags & 0xff;
  buffer[15] = msg.optionCount & 0xff;
  buffer.set(new TextEncoder().encode(msg.paramId || '').slice(0, 16), 16);
  buffer.set(new TextEncoder().encode(msg.unit || '').slice(0, 12), 32);
  buffer.set(new TextEncoder().encode(msg.help || '').slice(0, 80), 44);

  return buffer;
}

export function deserializeArdudeckParamMeta(payload: Uint8Array): ArdudeckParamMeta {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    minValue: view.getFloat32(0, true),
    maxValue: view.getFloat32(4, true),
    increment: view.getFloat32(8, true),
    paramIndex: view.getUint16(12, true),
    flags: payload[14],
    optionCount: payload[15],
    paramId: new TextDecoder().decode(payload.slice(16, 32)).replace(/\0.*$/, ''),
    unit: new TextDecoder().decode(payload.slice(32, 44)).replace(/\0.*$/, ''),
    help: new TextDecoder().decode(payload.slice(44, 124)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_PARAM_OPTION
 * Message ID: 43004
 * CRC Extra: 82
 */
export interface ArdudeckParamOption {
  paramIndex: number;
  optionIndex: number;
  optionCount: number;
  paramId: string;
  label: string;
}

export const ARDUDECK_PARAM_OPTION_ID = 43004;
export const ARDUDECK_PARAM_OPTION_CRC_EXTRA = 82;
export const ARDUDECK_PARAM_OPTION_LENGTH = 52;

export function serializeArdudeckParamOption(msg: ArdudeckParamOption): Uint8Array {
  const buffer = new Uint8Array(52);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, msg.paramIndex, true);
  buffer[2] = msg.optionIndex & 0xff;
  buffer[3] = msg.optionCount & 0xff;
  buffer.set(new TextEncoder().encode(msg.paramId || '').slice(0, 16), 4);
  buffer.set(new TextEncoder().encode(msg.label || '').slice(0, 32), 20);

  return buffer;
}

export function deserializeArdudeckParamOption(payload: Uint8Array): ArdudeckParamOption {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    paramIndex: view.getUint16(0, true),
    optionIndex: payload[2],
    optionCount: payload[3],
    paramId: new TextDecoder().decode(payload.slice(4, 20)).replace(/\0.*$/, ''),
    label: new TextDecoder().decode(payload.slice(20, 52)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_CAL_DECLARE
 * Message ID: 43005
 * CRC Extra: 223
 */
export interface ArdudeckCalDeclare {
  index: number;
  count: number;
  kind: number;
  requirements: number;
  poseCount: number;
  trackCount: number;
  calId: string;
  name: string;
  warning: string;
  prompt: string;
}

export const ARDUDECK_CAL_DECLARE_ID = 43005;
export const ARDUDECK_CAL_DECLARE_CRC_EXTRA = 223;
export const ARDUDECK_CAL_DECLARE_LENGTH = 186;

export function serializeArdudeckCalDeclare(msg: ArdudeckCalDeclare): Uint8Array {
  const buffer = new Uint8Array(186);
  const view = new DataView(buffer.buffer);

  buffer[0] = msg.index & 0xff;
  buffer[1] = msg.count & 0xff;
  buffer[2] = msg.kind & 0xff;
  buffer[3] = msg.requirements & 0xff;
  buffer[4] = msg.poseCount & 0xff;
  buffer[5] = msg.trackCount & 0xff;
  buffer.set(new TextEncoder().encode(msg.calId || '').slice(0, 16), 6);
  buffer.set(new TextEncoder().encode(msg.name || '').slice(0, 24), 22);
  buffer.set(new TextEncoder().encode(msg.warning || '').slice(0, 80), 46);
  buffer.set(new TextEncoder().encode(msg.prompt || '').slice(0, 60), 126);

  return buffer;
}

export function deserializeArdudeckCalDeclare(payload: Uint8Array): ArdudeckCalDeclare {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    index: payload[0],
    count: payload[1],
    kind: payload[2],
    requirements: payload[3],
    poseCount: payload[4],
    trackCount: payload[5],
    calId: new TextDecoder().decode(payload.slice(6, 22)).replace(/\0.*$/, ''),
    name: new TextDecoder().decode(payload.slice(22, 46)).replace(/\0.*$/, ''),
    warning: new TextDecoder().decode(payload.slice(46, 126)).replace(/\0.*$/, ''),
    prompt: new TextDecoder().decode(payload.slice(126, 186)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_CAL_POSE
 * Message ID: 43006
 * CRC Extra: 214
 */
export interface ArdudeckCalPose {
  rollDeg: number;
  pitchDeg: number;
  calIndex: number;
  poseIndex: number;
  calId: string;
  name: string;
}

export const ARDUDECK_CAL_POSE_ID = 43006;
export const ARDUDECK_CAL_POSE_CRC_EXTRA = 214;
export const ARDUDECK_CAL_POSE_LENGTH = 50;

export function serializeArdudeckCalPose(msg: ArdudeckCalPose): Uint8Array {
  const buffer = new Uint8Array(50);
  const view = new DataView(buffer.buffer);

  view.setFloat32(0, msg.rollDeg, true);
  view.setFloat32(4, msg.pitchDeg, true);
  buffer[8] = msg.calIndex & 0xff;
  buffer[9] = msg.poseIndex & 0xff;
  buffer.set(new TextEncoder().encode(msg.calId || '').slice(0, 16), 10);
  buffer.set(new TextEncoder().encode(msg.name || '').slice(0, 24), 26);

  return buffer;
}

export function deserializeArdudeckCalPose(payload: Uint8Array): ArdudeckCalPose {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    rollDeg: view.getFloat32(0, true),
    pitchDeg: view.getFloat32(4, true),
    calIndex: payload[8],
    poseIndex: payload[9],
    calId: new TextDecoder().decode(payload.slice(10, 26)).replace(/\0.*$/, ''),
    name: new TextDecoder().decode(payload.slice(26, 50)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_CAL_TRACK
 * Message ID: 43007
 * CRC Extra: 24
 */
export interface ArdudeckCalTrack {
  needed: number;
  calIndex: number;
  trackIndex: number;
  calId: string;
  unit: string;
  label: string;
}

export const ARDUDECK_CAL_TRACK_ID = 43007;
export const ARDUDECK_CAL_TRACK_CRC_EXTRA = 24;
export const ARDUDECK_CAL_TRACK_LENGTH = 66;

export function serializeArdudeckCalTrack(msg: ArdudeckCalTrack): Uint8Array {
  const buffer = new Uint8Array(66);
  const view = new DataView(buffer.buffer);

  view.setFloat32(0, msg.needed, true);
  buffer[4] = msg.calIndex & 0xff;
  buffer[5] = msg.trackIndex & 0xff;
  buffer.set(new TextEncoder().encode(msg.calId || '').slice(0, 16), 6);
  buffer.set(new TextEncoder().encode(msg.unit || '').slice(0, 12), 22);
  buffer.set(new TextEncoder().encode(msg.label || '').slice(0, 32), 34);

  return buffer;
}

export function deserializeArdudeckCalTrack(payload: Uint8Array): ArdudeckCalTrack {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    needed: view.getFloat32(0, true),
    calIndex: payload[4],
    trackIndex: payload[5],
    calId: new TextDecoder().decode(payload.slice(6, 22)).replace(/\0.*$/, ''),
    unit: new TextDecoder().decode(payload.slice(22, 34)).replace(/\0.*$/, ''),
    label: new TextDecoder().decode(payload.slice(34, 66)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_CAL_CONTROL
 * Message ID: 43008
 * CRC Extra: 117
 */
export interface ArdudeckCalControl {
  targetSystem: number;
  targetComponent: number;
  calAction: number;
  calId: string;
}

export const ARDUDECK_CAL_CONTROL_ID = 43008;
export const ARDUDECK_CAL_CONTROL_CRC_EXTRA = 117;
export const ARDUDECK_CAL_CONTROL_LENGTH = 19;

export function serializeArdudeckCalControl(msg: ArdudeckCalControl): Uint8Array {
  const buffer = new Uint8Array(19);
  const view = new DataView(buffer.buffer);

  buffer[0] = msg.targetSystem & 0xff;
  buffer[1] = msg.targetComponent & 0xff;
  buffer[2] = msg.calAction & 0xff;
  buffer.set(new TextEncoder().encode(msg.calId || '').slice(0, 16), 3);

  return buffer;
}

export function deserializeArdudeckCalControl(payload: Uint8Array): ArdudeckCalControl {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    targetSystem: payload[0],
    targetComponent: payload[1],
    calAction: payload[2],
    calId: new TextDecoder().decode(payload.slice(3, 19)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_CAL_PROGRESS
 * Message ID: 43009
 * CRC Extra: 42
 */
export interface ArdudeckCalProgress {
  track: number[];
  step: number;
  stepDone: number;
  percent: number;
  calId: string;
  hint: string;
}

export const ARDUDECK_CAL_PROGRESS_ID = 43009;
export const ARDUDECK_CAL_PROGRESS_CRC_EXTRA = 42;
export const ARDUDECK_CAL_PROGRESS_LENGTH = 79;

export function serializeArdudeckCalProgress(msg: ArdudeckCalProgress): Uint8Array {
  const buffer = new Uint8Array(79);
  const view = new DataView(buffer.buffer);

  for (let i = 0; i < 3; i++) {
    view.setFloat32(0 + i * 4, msg.track?.[i] ?? 0, true);
  }
  buffer[12] = msg.step & 0xff;
  buffer[13] = msg.stepDone & 0xff;
  buffer[14] = msg.percent & 0xff;
  buffer.set(new TextEncoder().encode(msg.calId || '').slice(0, 16), 15);
  buffer.set(new TextEncoder().encode(msg.hint || '').slice(0, 48), 31);

  return buffer;
}

export function deserializeArdudeckCalProgress(payload: Uint8Array): ArdudeckCalProgress {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    track: Array.from({ length: 3 }, (_, i) => view.getFloat32(0 + i * 4, true)),
    step: payload[12],
    stepDone: payload[13],
    percent: payload[14],
    calId: new TextDecoder().decode(payload.slice(15, 31)).replace(/\0.*$/, ''),
    hint: new TextDecoder().decode(payload.slice(31, 79)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_CAL_RESULT
 * Message ID: 43010
 * CRC Extra: 48
 */
export interface ArdudeckCalResult {
  quality: number;
  ok: number;
  calId: string;
  detail: string;
}

export const ARDUDECK_CAL_RESULT_ID = 43010;
export const ARDUDECK_CAL_RESULT_CRC_EXTRA = 48;
export const ARDUDECK_CAL_RESULT_LENGTH = 85;

export function serializeArdudeckCalResult(msg: ArdudeckCalResult): Uint8Array {
  const buffer = new Uint8Array(85);
  const view = new DataView(buffer.buffer);

  view.setFloat32(0, msg.quality, true);
  buffer[4] = msg.ok & 0xff;
  buffer.set(new TextEncoder().encode(msg.calId || '').slice(0, 16), 5);
  buffer.set(new TextEncoder().encode(msg.detail || '').slice(0, 64), 21);

  return buffer;
}

export function deserializeArdudeckCalResult(payload: Uint8Array): ArdudeckCalResult {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    quality: view.getFloat32(0, true),
    ok: payload[4],
    calId: new TextDecoder().decode(payload.slice(5, 21)).replace(/\0.*$/, ''),
    detail: new TextDecoder().decode(payload.slice(21, 85)).replace(/\0.*$/, ''),
  };
}

/**
 * ARDUDECK_REQUEST
 * Message ID: 43011
 * CRC Extra: 70
 */
export interface ArdudeckRequest {
  index: number;
  targetSystem: number;
  targetComponent: number;
  what: number;
}

export const ARDUDECK_REQUEST_ID = 43011;
export const ARDUDECK_REQUEST_CRC_EXTRA = 70;
export const ARDUDECK_REQUEST_LENGTH = 5;

export function serializeArdudeckRequest(msg: ArdudeckRequest): Uint8Array {
  const buffer = new Uint8Array(5);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, msg.index, true);
  buffer[2] = msg.targetSystem & 0xff;
  buffer[3] = msg.targetComponent & 0xff;
  buffer[4] = msg.what & 0xff;

  return buffer;
}

export function deserializeArdudeckRequest(payload: Uint8Array): ArdudeckRequest {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  return {
    index: view.getUint16(0, true),
    targetSystem: payload[2],
    targetComponent: payload[3],
    what: payload[4],
  };
}

/** Every message this dialect adds, keyed by id. */
export const ARDUDECK_MESSAGES: ReadonlyArray<MessageInfo> = [
  {
    msgid: 43000,
    name: 'ARDUDECK_MANIFEST',
    crcExtra: 144,
    minLength: 94,
    maxLength: 94,
    serialize: serializeArdudeckManifest as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckManifest as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43001,
    name: 'ARDUDECK_MODE',
    crcExtra: 219,
    minLength: 21,
    maxLength: 21,
    serialize: serializeArdudeckMode as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckMode as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43002,
    name: 'ARDUDECK_MISSION_CMDS',
    crcExtra: 219,
    minLength: 65,
    maxLength: 65,
    serialize: serializeArdudeckMissionCmds as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckMissionCmds as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43003,
    name: 'ARDUDECK_PARAM_META',
    crcExtra: 203,
    minLength: 124,
    maxLength: 124,
    serialize: serializeArdudeckParamMeta as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckParamMeta as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43004,
    name: 'ARDUDECK_PARAM_OPTION',
    crcExtra: 82,
    minLength: 52,
    maxLength: 52,
    serialize: serializeArdudeckParamOption as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckParamOption as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43005,
    name: 'ARDUDECK_CAL_DECLARE',
    crcExtra: 223,
    minLength: 186,
    maxLength: 186,
    serialize: serializeArdudeckCalDeclare as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckCalDeclare as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43006,
    name: 'ARDUDECK_CAL_POSE',
    crcExtra: 214,
    minLength: 50,
    maxLength: 50,
    serialize: serializeArdudeckCalPose as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckCalPose as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43007,
    name: 'ARDUDECK_CAL_TRACK',
    crcExtra: 24,
    minLength: 66,
    maxLength: 66,
    serialize: serializeArdudeckCalTrack as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckCalTrack as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43008,
    name: 'ARDUDECK_CAL_CONTROL',
    crcExtra: 117,
    minLength: 19,
    maxLength: 19,
    serialize: serializeArdudeckCalControl as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckCalControl as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43009,
    name: 'ARDUDECK_CAL_PROGRESS',
    crcExtra: 42,
    minLength: 79,
    maxLength: 79,
    serialize: serializeArdudeckCalProgress as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckCalProgress as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43010,
    name: 'ARDUDECK_CAL_RESULT',
    crcExtra: 48,
    minLength: 85,
    maxLength: 85,
    serialize: serializeArdudeckCalResult as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckCalResult as (payload: Uint8Array) => unknown,
  },
  {
    msgid: 43011,
    name: 'ARDUDECK_REQUEST',
    crcExtra: 70,
    minLength: 5,
    maxLength: 5,
    serialize: serializeArdudeckRequest as (msg: unknown) => Uint8Array,
    deserialize: deserializeArdudeckRequest as (payload: Uint8Array) => unknown,
  },
];

/**
 * Merge the dialect into the shared registry.
 *
 * Idempotent, and it never replaces a standard message: a dialect that shadowed a
 * common id would break every vehicle that is not using it.
 */
export function registerArduDeckDialect(): void {
  for (const info of ARDUDECK_MESSAGES) {
    if (MESSAGE_REGISTRY.has(info.msgid)) continue;
    MESSAGE_REGISTRY.set(info.msgid, info);
  }
}
