import { describe, it, expect } from 'vitest';
import { orderPublishCodecs, streamDownscale, readPublishStats, candidateSummary } from './whip-publish';

const c = (mimeType: string, sdpFmtpLine?: string) => ({ mimeType, ...(sdpFmtpLine ? { sdpFmtpLine } : {}) });

describe('orderPublishCodecs', () => {
  it('puts H.264 constrained baseline with packetization-mode 1 first', () => {
    const out = orderPublishCodecs([
      c('video/VP8'),
      c('video/H264', 'level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640c1f'),
      c('video/H264', 'level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f'),
      c('video/H264', 'level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f'),
      c('video/rtx', 'apt=96'),
    ]);
    expect(out.map((x) => `${x.mimeType} ${x.sdpFmtpLine ?? ''}`)).toEqual([
      'video/H264 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
      'video/H264 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=640c1f',
      'video/H264 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f',
      'video/VP8 ',
      'video/rtx apt=96',
    ]);
  });

  it('drops codecs RTSP readers cannot rely on', () => {
    const out = orderPublishCodecs([c('video/VP9'), c('video/AV1'), c('video/VP8'), c('video/H265')]);
    expect(out.map((x) => x.mimeType)).toEqual(['video/VP8']);
  });
});

describe('streamDownscale', () => {
  it('leaves frames within the limit alone', () => {
    expect(streamDownscale(1280, 720)).toBe(1);
    expect(streamDownscale(1920, 1080)).toBe(1);
  });

  it('scales the longest edge down to the limit', () => {
    expect(streamDownscale(3840, 2160)).toBe(2);
    expect(streamDownscale(1200, 2400)).toBe(1.25);
  });
});

describe('readPublishStats', () => {
  it('reads the video outbound-rtp entry', () => {
    const stats = readPublishStats([
      { type: 'codec', mimeType: 'video/H264' },
      { type: 'outbound-rtp', kind: 'video', encoderImplementation: 'VideoToolbox', powerEfficientEncoder: true, framesPerSecond: 29.7, frameWidth: 1280, frameHeight: 720, qualityLimitationReason: 'none' },
    ]);
    expect(stats).toEqual({ encoder: 'VideoToolbox', hardware: true, fps: 29.7, width: 1280, height: 720, limitedBy: 'none' });
  });

  it('returns null fields the browser has not reported yet', () => {
    expect(readPublishStats([{ type: 'outbound-rtp', kind: 'video' }])).toEqual({
      encoder: null, hardware: null, fps: null, width: null, height: null, limitedBy: null,
    });
  });

  it('returns null without a video sender', () => {
    expect(readPublishStats([{ type: 'outbound-rtp', kind: 'audio' }])).toBeNull();
  });
});

describe('candidateSummary', () => {
  it('lists protocol, address and type per candidate', () => {
    const sdp = [
      'v=0',
      'a=candidate:1 1 udp 2122260223 10.45.216.207 52803 typ host generation 0',
      'a=candidate:2 1 tcp 1518280447 10.45.216.207 9 typ host tcptype active',
      'a=candidate:3 1 udp 2130706431 127.0.0.1 8189 typ host ufrag x',
    ].join('\r\n');
    expect(candidateSummary(sdp)).toBe('udp 10.45.216.207:52803 host, tcp 10.45.216.207:9 host, udp 127.0.0.1:8189 host');
  });

  it('says so when an SDP has none', () => {
    expect(candidateSummary('v=0\r\n')).toBe('no candidates');
  });
});
