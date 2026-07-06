import { describe, it, expect } from "vitest";
import {
  buildSignatureHeader,
  signWebhookPayload,
  hashSecret,
  safeCompareHex,
  encryptSecret,
  decryptSecret,
} from "./hmac.js";
import { verifyWebhookSignature } from "@fiberpaykit/sdk/webhook";

const secret = "whsec_abc";

describe("webhook signing", () => {
  it("produces a header the SDK can verify", () => {
    const body = JSON.stringify({ id: "evt_1", type: "invoice.paid" });
    const ts = Math.floor(Date.now() / 1000);
    const header = buildSignatureHeader(ts, body, secret);
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]+$/);

    // SDK verification of the exact header we generated must pass.
    expect(() =>
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: header,
        secret,
      })
    ).not.toThrow();
  });

  it("is deterministic for the same input", () => {
    const a = signWebhookPayload(100, "body", secret);
    const b = signWebhookPayload(100, "body", secret);
    expect(a).toBe(b);
  });
});

describe("hashSecret + safeCompareHex", () => {
  it("hashes deterministically and compares safely", () => {
    const h1 = hashSecret("fpk_test_demo", "server_key");
    const h2 = hashSecret("fpk_test_demo", "server_key");
    expect(safeCompareHex(h1, h2)).toBe(true);
    expect(safeCompareHex(h1, hashSecret("other", "server_key"))).toBe(false);
  });
});

describe("encrypt/decrypt secret", () => {
  it("round-trips through AES-256-GCM", () => {
    const key = "some_32_byte_ish_key_for_testing_only";
    const enc = encryptSecret("whsec_supersecret", key);
    expect(enc).not.toContain("whsec_supersecret");
    expect(decryptSecret(enc, key)).toBe("whsec_supersecret");
  });
});
