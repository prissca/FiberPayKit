/**
 * HMAC signing + API key / secret hashing utilities.
 *
 * - Webhook payloads are signed with HMAC-SHA256 over `${timestamp}.${rawBody}`.
 * - API keys and webhook secrets are stored hashed (SHA-256 with a server key).
 * - The webhook secret is additionally stored encrypted (AES-256-GCM) so the
 *   settings page can reveal it in the demo. In production you would not do
 *   this; you would show it once at creation only.
 */
import {
  createHmac,
  createHash,
  timingSafeEqual,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";

/** HMAC-SHA256 hex digest of `${timestamp}.${rawBody}`. */
export function signWebhookPayload(
  timestamp: number | string,
  rawBody: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

/** Build the `t=...,v1=...` signature header value. */
export function buildSignatureHeader(
  timestamp: number | string,
  rawBody: string,
  secret: string
): string {
  const v1 = signWebhookPayload(timestamp, rawBody, secret);
  return `t=${timestamp},v1=${v1}`;
}

/**
 * Hash an API key or secret for storage. Uses SHA-256 keyed with the server's
 * JWT_SECRET so a leaked DB alone can't be brute-forced without the app key.
 */
export function hashSecret(value: string, serverKey: string): string {
  return createHmac("sha256", serverKey).update(value).digest("hex");
}

/** Timing-safe comparison of two hex strings of equal length. */
export function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

function deriveKey(encryptionKey: string): Buffer {
  // Normalize any string into a 32-byte key.
  return createHash("sha256").update(encryptionKey).digest();
}

/** AES-256-GCM encrypt. Returns iv:tag:ciphertext (all base64). */
export function encryptSecret(plaintext: string, encryptionKey: string): string {
  const iv = randomBytes(12);
  const key = deriveKey(encryptionKey);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString(
    "base64"
  )}`;
}

/** AES-256-GCM decrypt of the format produced by {@link encryptSecret}. */
export function decryptSecret(payload: string, encryptionKey: string): string {
  const [ivB64, tagB64, ctB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Malformed encrypted secret");
  }
  const key = deriveKey(encryptionKey);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return pt.toString("utf8");
}
