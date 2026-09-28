// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode, act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('./whip-publish', () => ({
  MAX_STREAM_EDGE: 1920,
  streamDownscale: () => 1,
  publishWhip: vi.fn(async () => ({
    pc: new EventTarget(),
    codec: 'H264',
    stats: async () => null,
    describe: async () => '',
    close: async () => {},
  })),
}));

import { StreamWindowPublisher } from './VisionStream';
import type { CanvasStreamSnapshot } from '../../../shared/camera-types';

function StreamWindow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <div>
      <canvas ref={canvasRef} />
      <StreamWindowPublisher canvasRef={canvasRef} regionRef={null} />
    </div>
  );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('Vision stream window publisher', () => {
  let root: Root;
  let api: Record<string, ReturnType<typeof vi.fn>>;
  const reported = (): CanvasStreamSnapshot[] => api.visionStreamReport!.mock.calls.map((c) => c[0] as CanvasStreamSnapshot);

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const track = { stop: vi.fn() };
    HTMLCanvasElement.prototype.captureStream = vi.fn(() => ({ getVideoTracks: () => [track] })) as never;
    HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ width: 1280, height: 720 }) as DOMRect;
    api = {
      canvasStreamStart: vi.fn(async () => ({ ok: true, whipUrl: 'http://hub/vision/whip', rtspUrl: 'rtsp://hub/vision' })),
      canvasStreamStop: vi.fn(async () => {}),
      canvasStreamStatus: vi.fn(async () => ({ publishing: true, readers: 0 })),
      visionStreamReport: vi.fn(async () => {}),
    };
    (window as unknown as { electronAPI: unknown }).electronAPI = api;
    root = createRoot(document.createElement('div'));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  const settle = async () => {
    for (let i = 0; i < 10; i++) await act(flush);
  };

  it('starts on mount under StrictMode and reports live to the main process', async () => {
    await act(async () => {
      root.render(<StrictMode><StreamWindow /></StrictMode>);
    });
    await settle();
    expect(reported().at(-1)?.state).toBe('live');
    // StrictMode starts twice and cancels one; exactly one publisher is left registered.
    expect(api.canvasStreamStart!.mock.calls.length - api.canvasStreamStop!.mock.calls.length).toBe(1);
  });

  it('reports a failed start with its reason', async () => {
    api.canvasStreamStart!.mockResolvedValue({ ok: false, error: 'Media hub failed to start' });
    await act(async () => {
      root.render(<StrictMode><StreamWindow /></StrictMode>);
    });
    await settle();
    const last = reported().at(-1);
    expect(last?.state).toBe('error');
    expect(last?.error).toBe('Media hub failed to start');
  });
});
