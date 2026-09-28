import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  app: { isPackaged: true, getPath: () => '/tmp' },
}));
vi.mock('electron-store', () => ({
  default: class {
    get() {
      return [{ slug: 'com.example.sneaky', name: 'x', version: '1', path: '/tmp/x' }];
    }
    set() {}
  },
}));

import { app } from 'electron';
import {
  isDevLoadAvailable,
  getDevModules,
  getDevModulePath,
  loadDevModule,
} from '../module-dev';

beforeEach(() => {
  (app as { isPackaged: boolean }).isPackaged = true;
});

describe('a packaged build', () => {
  it('reports dev loading unavailable', () => {
    expect(isDevLoadAvailable()).toBe(false);
  });

  it('ignores a hand-written dev record', () => {
    expect(getDevModules()).toEqual([]);
    expect(getDevModulePath('com.example.sneaky')).toBeNull();
  });

  it('refuses to load one', () => {
    const r = loadDevModule('/tmp/x', []);
    expect(r.ok).toBe(false);
  });
});

describe('an unpackaged build', () => {
  beforeEach(() => {
    (app as { isPackaged: boolean }).isPackaged = false;
  });

  it('does offer it', () => {
    expect(isDevLoadAvailable()).toBe(true);
    expect(getDevModules()).toHaveLength(1);
    expect(getDevModulePath('com.example.sneaky')).toBe('/tmp/x');
  });
});
