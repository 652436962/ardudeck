import { describe, it, expect } from 'vitest';
import { cropRectFor } from './region-crop';

describe('cropRectFor', () => {
  it('scales the CSS box to frame pixels', () => {
    expect(cropRectFor({ left: 826, top: 100, width: 686, height: 750 }, { width: 1512, height: 949 }, { width: 3024, height: 1898 }))
      .toEqual({ x: 1652, y: 200, width: 1372, height: 1500 });
  });

  it('uses the frame scale, not the device pixel ratio, when capture is downscaled', () => {
    expect(cropRectFor({ left: 500, top: 0, width: 500, height: 700 }, { width: 1000, height: 700 }, { width: 1000, height: 700 }))
      .toEqual({ x: 500, y: 0, width: 500, height: 700 });
  });

  it('keeps every value even', () => {
    const r = cropRectFor({ left: 10.3, top: 5.7, width: 301.4, height: 199.9 }, { width: 1000, height: 700 }, { width: 1500, height: 1050 })!;
    for (const v of [r.x, r.y, r.width, r.height]) expect(v % 2).toBe(0);
  });

  it('clamps a box that runs past the frame edge', () => {
    expect(cropRectFor({ left: 900, top: 600, width: 300, height: 300 }, { width: 1000, height: 700 }, { width: 1000, height: 700 }))
      .toEqual({ x: 900, y: 600, width: 100, height: 100 });
  });

  it('returns null for a hidden or collapsed element', () => {
    expect(cropRectFor({ left: 0, top: 0, width: 0, height: 0 }, { width: 1000, height: 700 }, { width: 1000, height: 700 })).toBeNull();
  });
});
