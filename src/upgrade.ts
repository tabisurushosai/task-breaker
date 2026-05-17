/**
 * Premium upgrade flow.
 *
 * Constraints (SPEC.md):
 *  - No outbound HTTP from the extension itself — payment happens on a Stripe
 *    Payment Link in a regular browser tab.
 *  - chrome.storage.local only.
 *  - No host permissions, so a JS-side return URL handshake is not possible.
 *
 * Flow:
 *  1. openCheckout() opens the Stripe Payment Link in a new tab, passing a
 *     stable per-install instance id as `client_reference_id` so the seller
 *     can later issue an unlock code tied to that purchase.
 *  2. The Stripe success page (configured outside this codebase) shows the
 *     buyer a one-time unlock code.
 *  3. The buyer pastes the code into the options page; redeemUnlockCode()
 *     verifies it locally and sets premium_unlocked = true.
 *
 * Verification is intentionally lightweight: the code is a Base32 string with
 * a SHA-256 prefix checksum. This is honest-user friction, not anti-piracy —
 * an open-source extension can't keep a real secret, and the price point
 * ($3 lifetime) doesn't justify a license server.
 */

import { getStorage, setStorage } from './storage';
import { unlockPremium } from './premium';

/**
 * Stripe Payment Link URL. Replace with the real Payment Link before the
 * Web Store release. Kept as a constant (not env var) so the built ZIP is
 * self-contained.
 */
export const STRIPE_PAYMENT_LINK =
  'https://buy.stripe.com/00gtaskbreakerplaceholder';

/**
 * Prefix every well-formed unlock code carries. Helps users recognize the
 * code visually and rejects obvious noise without a hash computation.
 */
export const UNLOCK_CODE_PREFIX = 'TBP-';

/**
 * SHA-256(normalized code) must start with this hex prefix for the code to
 * be accepted. 2 hex chars = ~1/256 acceptance rate, enough to make random
 * guessing tedious without burdening genuine buyers.
 */
export const UNLOCK_CODE_HASH_PREFIX = 'a7';

/** Characters allowed in the body of an unlock code (Crockford-ish base32). */
const CODE_ALPHABET = /^[A-Z0-9]+$/;

export interface RedeemResult {
  ok: boolean;
  reason?: 'format' | 'checksum' | 'already_unlocked';
}

/**
 * Returns the per-install instance id, generating + persisting one if it
 * doesn't exist yet. Used as Stripe's `client_reference_id` so the seller
 * can map a Stripe purchase back to a specific extension install.
 */
export async function getOrCreateInstanceId(): Promise<string> {
  const data = await getStorage(['instance_id']);
  const existing = data.instance_id;
  if (typeof existing === 'string' && existing.length > 0) {
    return existing;
  }
  const fresh = crypto.randomUUID();
  await setStorage({ instance_id: fresh });
  return fresh;
}

/**
 * Builds the full Stripe Checkout URL with the instance id attached. The
 * instance id rides as `client_reference_id`, which Stripe forwards to the
 * seller's fulfillment webhook.
 */
export async function buildCheckoutUrl(
  baseUrl: string = STRIPE_PAYMENT_LINK
): Promise<string> {
  const id = await getOrCreateInstanceId();
  const url = new URL(baseUrl);
  url.searchParams.set('client_reference_id', id);
  return url.toString();
}

/**
 * Opens the Stripe Checkout URL in a new browser tab. Uses chrome.tabs
 * when available (no extra permission required for tabs.create) and falls
 * back to window.open for tests / non-extension contexts.
 */
export async function openCheckout(
  baseUrl: string = STRIPE_PAYMENT_LINK
): Promise<void> {
  const url = await buildCheckoutUrl(baseUrl);
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url });
    return;
  }
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url, '_blank', 'noopener');
  }
}

/**
 * Normalizes user input before validation: trims, uppercases, removes
 * spaces. Hyphens are preserved so the prefix check works.
 */
export function normalizeUnlockCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Returns true iff the code's body (the part after the prefix) is well
 * formed: at least 8 chars, only [A-Z0-9-]. Hyphens are decorative.
 */
export function isUnlockCodeWellFormed(code: string): boolean {
  if (!code.startsWith(UNLOCK_CODE_PREFIX)) return false;
  const body = code.slice(UNLOCK_CODE_PREFIX.length).replace(/-/g, '');
  if (body.length < 8) return false;
  return CODE_ALPHABET.test(body);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const view = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < view.length; i += 1) {
    const b = view[i];
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Local-only verification. The code is accepted iff
 *   sha256(normalized_code).startsWith(UNLOCK_CODE_HASH_PREFIX)
 * The seller's fulfillment script generates codes that satisfy this
 * (trivial loop) when issuing post-purchase.
 */
export async function validateUnlockCode(rawCode: string): Promise<boolean> {
  const code = normalizeUnlockCode(rawCode);
  if (!isUnlockCodeWellFormed(code)) return false;
  const hash = await sha256Hex(code);
  return hash.startsWith(UNLOCK_CODE_HASH_PREFIX);
}

/**
 * Validate the code and, on success, flip premium_unlocked=true in
 * chrome.storage.local. Idempotent: a second redemption of an already-
 * unlocked install returns ok: false with reason 'already_unlocked' so
 * the UI can show a distinct message.
 */
export async function redeemUnlockCode(rawCode: string): Promise<RedeemResult> {
  const code = normalizeUnlockCode(rawCode);
  if (!isUnlockCodeWellFormed(code)) {
    return { ok: false, reason: 'format' };
  }
  const valid = await validateUnlockCode(code);
  if (!valid) {
    return { ok: false, reason: 'checksum' };
  }
  const data = await getStorage(['premium_unlocked']);
  if (data.premium_unlocked === true) {
    return { ok: false, reason: 'already_unlocked' };
  }
  await unlockPremium();
  return { ok: true };
}
