/** Prefixed, URL-safe ID generation for FiberPayKit resources. */
import { customAlphabet } from "nanoid";

// Lowercase alphanumerics — readable and shell-safe.
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 24);
const shortNano = customAlphabet(alphabet, 20);

export type IdPrefix =
  | "merch"
  | "inv"
  | "we"
  | "evt"
  | "whd"
  | "ish"
  | "pa"
  | "rw";

export function generateId(prefix: IdPrefix): string {
  return `${prefix}_${nano()}`;
}

/**
 * Generate a merchant API key. Format: fpk_test_<random>.
 * The full key is only ever returned once (at creation); we store a hash.
 */
export function generateApiKey(): string {
  return `fpk_test_${shortNano()}`;
}

/** Generate a webhook signing secret. Format: whsec_<random>. */
export function generateWebhookSecret(): string {
  return `whsec_${nano()}${shortNano()}`;
}

/** A short, non-sensitive prefix of the key for display in dashboards. */
export function apiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12);
}
