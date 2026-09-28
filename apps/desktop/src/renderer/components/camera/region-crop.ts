export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Maps an element's CSS box onto a captured window frame. Values are even so the
 * crop lands on chroma boundaries of the I420/NV12 frames tab capture produces.
 */
export function cropRectFor(
  box: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number },
  frame: { width: number; height: number },
): CropRect | null {
  if (viewport.width <= 0 || viewport.height <= 0) return null;
  const sx = frame.width / viewport.width;
  const sy = frame.height / viewport.height;
  const even = (v: number) => Math.max(0, Math.round(v) & ~1);
  const x = Math.min(even(box.left * sx), frame.width & ~1);
  const y = Math.min(even(box.top * sy), frame.height & ~1);
  const width = Math.min(even(box.width * sx), (frame.width - x) & ~1);
  const height = Math.min(even(box.height * sy), (frame.height - y) & ~1);
  return width >= 2 && height >= 2 ? { x, y, width, height } : null;
}
