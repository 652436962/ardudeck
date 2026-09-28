import { RESERVED_CARGO_SLUGS } from './reserved-slugs.js';

export type DevLoadCheck = { ok: true } | { ok: false; error: string };

export function checkDevSlug(
  slug: string,
  installedSlugs: readonly string[],
  reserved: ReadonlySet<string> = RESERVED_CARGO_SLUGS,
): DevLoadCheck {
  if (!slug) return { ok: false, error: 'The manifest has no slug' };
  if (reserved.has(slug)) {
    return { ok: false, error: `${slug} gates a built-in feature and cannot be dev-loaded` };
  }
  if (installedSlugs.includes(slug)) {
    return { ok: false, error: `${slug} is already installed. Remove it first.` };
  }
  return { ok: true };
}
