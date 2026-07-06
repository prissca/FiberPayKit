/**
 * Webhook signature verification for FiberPayKit.
 *
 * Signature header format:
 *   FiberPayKit-Signature: t=<unix_timestamp>,v1=<hex_hmac>
 *
 * Signed payload is `${timestamp}.${rawBody}` and is signed with the
 * merchant's webhook secret using HMAC-SHA256. Comparison is timing-safe.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent } from "./types.js";

export interface VerifyWebhookSignatureParams {
  /** The raw, unparsed request body string. Must be the exact bytes received. */
  rawBody: string;
  /** The full `FiberPayKit-Signature` header value. */
  signatureHeader: string;
  /** The merchant webhook secret (whsec_...). */
  secret: string;
  /**
   * Optional tolerance in seconds for replay protection. If provided, the
   * timestamp in the header must be within this many seconds of now.
   */
  toleranceSeconds?: number;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

/** Parse `t=...,v1=...` into its components. */
export function parseSignatureHeader(
  header: string
): { timestamp: number; v1: string } {
  const parts = header.split(",").map((p) => p.trim());
  let timestamp: number | undefined;
  let v1: string | undefined;
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t" && value) timestamp = Number(value);
    if (key === "v1" && value) v1 = value;
  }
  if (timestamp === undefined || Number.isNaN(timestamp) || !v1) {
    throw new WebhookVerificationError("Malformed signature header");
  }
  return { timestamp, v1 };
}

/** Compute the expected hex HMAC-SHA256 for a given timestamp + body. */
export function computeSignature(
  timestamp: number | string,
  rawBody: string,
  secret: string
): string {
  const signedPayload = `${timestamp}.${rawBody}`;
  return createHmac("sha256", secret).update(signedPayload).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify a FiberPayKit webhook signature and return the parsed event.
 * Throws {@link WebhookVerificationError} if the signature is invalid.
 */
export function verifyWebhookSignature(
  params: VerifyWebhookSignatureParams
): WebhookEvent {
  const { rawBody, signatureHeader, secret, toleranceSeconds } = params;
  if (!signatureHeader) {
    throw new WebhookVerificationError("Missing signature header");
  }
  const { timestamp, v1 } = parseSignatureHeader(signatureHeader);

  if (toleranceSeconds !== undefined) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      throw new WebhookVerificationError(
        "Signature timestamp outside of tolerance window"
      );
    }
  }

  const expected = computeSignature(timestamp, rawBody, secret);
  if (!safeEqualHex(expected, v1)) {
    throw new WebhookVerificationError("Signature mismatch");
  }

  try {
    return JSON.parse(rawBody) as WebhookEvent;
  } catch {
    throw new WebhookVerificationError("Body is not valid JSON");
  }
}
