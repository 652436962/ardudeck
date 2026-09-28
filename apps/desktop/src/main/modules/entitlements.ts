import { verifyReceipt } from './license-validator.js';

export interface EntitlementInput {
  receipts: string[];
  deviceId: string;
  grandfathered: boolean;
  installedSlugs: string[];
  now?: Date;
}

export interface Entitlements {
  slugs: Set<string>;
  provisional: boolean;
}

export function entitledSlugs(input: EntitlementInput): Entitlements {
  const slugs = new Set<string>();
  let anyValid = false;

  for (const receipt of input.receipts) {
    const r = verifyReceipt(receipt, input.deviceId, { now: input.now });
    if (!r.valid || !r.payload) continue;
    anyValid = true;
    for (const slug of r.payload.slugs) slugs.add(slug);
  }

  if (!anyValid && input.grandfathered) {
    for (const slug of input.installedSlugs) slugs.add(slug);
    return { slugs, provisional: true };
  }

  return { slugs, provisional: false };
}
