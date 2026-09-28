// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode, act, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('./whip-publish', () => ({
  MAX_STREAM_EDGE: 1920,
  streamDownscale: () => 1,
  publishWhip: vi.fn(async () => ({
    pc: new EventTarget(),
    codec: 'H264',
    stats: async () => null,
    close: async () => {},
  })),
}));

import { useCanvasStream, type CanvasStreamSnapshot } from './useCanvasStream';

let latest: CanvasStreamSnapshot | null = null;

function AutoStart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stream = useCanvasStream(canvasRef, 'vision');
  const { start } = stream;
  latest = stream;
  useEffect(() => { void start(); }, [start]);
  return <canvas ref={canvasRef} />;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('useCanvasStream', () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    latest = null;
    const track = { stop: vi.fn() };
    HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({ getVideoTracks: () => [track] })) as never;
    HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 640, height: 360 }) as DOMRect;
    (window as unknown as { electronAPI: unknown }).electronAPI = {
      canvasStreamStart: vi.fn(async () => ({ ok: true, whipUrl: 'http://hub/vision/whip', rtspUrl: 'rtsp://hub/vision' })),
      canvasStreamStop: vi.fn(async () => {}),
      canvasStreamStatus: vi.fn(async () => ({ publishing: true, readers: 0 })),
    };
    host = document.createElement('div');
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('goes live when an effect starts it under StrictMode (mount, unmount, remount)', async () => {
    await act(async () => {
      root.render(<StrictMode><AutoStart /></StrictMode>);
    });
    for (let i = 0; i < 10 && latest?.state !== 'live'; i++) {
      await act(flush);
    }
    expect(latest?.state).toBe('live');
  });
});
