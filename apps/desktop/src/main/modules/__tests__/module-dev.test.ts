import { describe, it, expect } from 'vitest';
import { checkDevSlug } from '../../../shared/dev-load-guard';
import { RESERVED_CARGO_SLUGS } from '../../../shared/reserved-slugs';

describe('checkDevSlug', () => {
  it('allows a slug of your own', () => {
    expect(checkDevSlug('com.example.mycargo', [])).toEqual({ ok: true });
  });

  it('refuses every slug that gates a built-in surface', () => {
    for (const slug of RESERVED_CARGO_SLUGS) {
      const r = checkDevSlug(slug, []);
      expect(r.ok, slug).toBe(false);
    }
  });

  it('refuses a slug that is already installed', () => {
    const r = checkDevSlug('tech.topas.coverage', ['tech.topas.coverage']);
    expect(r.ok).toBe(false);
    expect(r).toHaveProperty('error', expect.stringContaining('already installed'));
  });

  it('refuses an empty slug', () => {
    expect(checkDevSlug('', []).ok).toBe(false);
  });
});

describe('entry resolution', () => {
  const root = '/Users/x/work/cargo';
  const check = (entry: string, present: string[]) => {
    const has = (p: string) => present.includes(p);
    if (has(`${root}/${entry}`)) return { ok: true as const };
    return {
      ok: false as const,
      error: has(`${root}/dist/${entry}`)
        ? `module.json points at ${entry}, which is in dist/. Choose the dist folder instead.`
        : `module.json points at ${entry}, which is not in this folder. Build the cargo first.`,
    };
  };

  it('points at dist when the entry only exists there', () => {
    const r = check('renderer.js', [`${root}/module.json`, `${root}/dist/renderer.js`]);
    expect(r.ok).toBe(false);
    expect(r).toHaveProperty('error', expect.stringContaining('Choose the dist folder'));
  });

  it('says build it when the entry is nowhere', () => {
    const r = check('renderer.js', [`${root}/module.json`]);
    expect(r).toHaveProperty('error', expect.stringContaining('Build the cargo first'));
  });

  it('accepts a folder that holds its own entry', () => {
    expect(check('renderer.js', [`${root}/module.json`, `${root}/renderer.js`]).ok).toBe(true);
  });
});

describe('reserved slug list', () => {
  it('covers every slug the capability map gates', async () => {
    const caps = await import('../../../renderer/modules/capabilities');
    for (const cap of caps.CAPABILITIES) {
      expect(RESERVED_CARGO_SLUGS.has(cap.slug), cap.slug).toBe(true);
    }
    for (const slug of [caps.VAULT_CARGO_SLUG, caps.WEATHER_CARGO_SLUG, caps.MISSION_LIBRARY_CARGO_SLUG, caps.LUA_GRAPH_CARGO_SLUG, caps.ADVISOR_CARGO_SLUG]) {
      expect(RESERVED_CARGO_SLUGS.has(slug), slug).toBe(true);
    }
  });
});
