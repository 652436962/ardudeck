/** Cargo slugs that gate built-in surfaces. A dev load may never claim one. */
export const RESERVED_CARGO_SLUGS: ReadonlySet<string> = new Set([
  'com.ardudeck.vault',
  'com.ardudeck.weather',
  'com.ardudeck.mission-library',
  'com.ardudeck.lua-graph',
  'ardudeck.advisor',
]);
