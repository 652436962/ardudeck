// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { acquirePicking, PICKING_CLASS } from '../map-picking';

let el: HTMLElement;
beforeEach(() => {
  el = document.createElement('div');
});

describe('acquirePicking', () => {
  it('marks the map while a tool is drawing', () => {
    const release = acquirePicking(el);
    expect(el.classList.contains(PICKING_CLASS)).toBe(true);
    release();
    expect(el.classList.contains(PICKING_CLASS)).toBe(false);
  });

  it('keeps the mark until the last tool finishes', () => {
    const a = acquirePicking(el);
    const b = acquirePicking(el);
    a();
    expect(el.classList.contains(PICKING_CLASS)).toBe(true);
    b();
    expect(el.classList.contains(PICKING_CLASS)).toBe(false);
  });

  it('ignores a release called twice', () => {
    const a = acquirePicking(el);
    const b = acquirePicking(el);
    a();
    a();
    expect(el.classList.contains(PICKING_CLASS)).toBe(true);
    b();
    expect(el.classList.contains(PICKING_CLASS)).toBe(false);
  });

  it('can be armed again after everything released', () => {
    acquirePicking(el)();
    const again = acquirePicking(el);
    expect(el.classList.contains(PICKING_CLASS)).toBe(true);
    again();
    expect(el.classList.contains(PICKING_CLASS)).toBe(false);
  });

  it('tracks maps independently', () => {
    const other = document.createElement('div');
    const a = acquirePicking(el);
    acquirePicking(other);
    a();
    expect(el.classList.contains(PICKING_CLASS)).toBe(false);
    expect(other.classList.contains(PICKING_CLASS)).toBe(true);
  });
});
