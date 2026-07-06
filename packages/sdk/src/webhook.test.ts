import { describe, it, expect } from "vitest";
import {
  verifyWebhookSignature,
  computeSignature,
  WebhookVerificationError,
} from "./webhook.js";

const secret = "whsec_test_secret";

function makeEvent() {
  return {
    id: "evt_123",
    type: "invoice.paid" as const,
    createdAt: "2026-07-06T12:20:00.000Z",
    data: {
      invoice: {
        id: "inv_123",
        orderId: "ORDER-1001",
        status: "paid" as const,
        amount: "100000000",
        currency: "CKB" as const,
        fiber: { paymentHash: "0xabc", invoiceAddress: "fiber_test_1" },
        metadata: { cartId: "cart_123" },
      },
    },
  };
}

describe("verifyWebhookSignature", () => {
  it("verifies a valid signature and returns the parsed event", () => {
    const rawBody = JSON.stringify(makeEvent());
    const timestamp = Math.floor(Date.now() / 1000);
    const v1 = computeSignature(timestamp, rawBody, secret);
    const header = `t=${timestamp},v1=${v1}`;

    const event = verifyWebhookSignature({
      rawBody,
      signatureHeader: header,
      secret,
    });
    expect(event.type).toBe("invoice.paid");
    expect(event.data.invoice.orderId).toBe("ORDER-1001");
  });

  it("throws on a tampered body", () => {
    const rawBody = JSON.stringify(makeEvent());
    const timestamp = Math.floor(Date.now() / 1000);
    const v1 = computeSignature(timestamp, rawBody, secret);
    const header = `t=${timestamp},v1=${v1}`;

    expect(() =>
      verifyWebhookSignature({
        rawBody: rawBody.replace("100000000", "999999999"),
        signatureHeader: header,
        secret,
      })
    ).toThrow(WebhookVerificationError);
  });

  it("throws on wrong secret", () => {
    const rawBody = JSON.stringify(makeEvent());
    const timestamp = Math.floor(Date.now() / 1000);
    const v1 = computeSignature(timestamp, rawBody, secret);
    const header = `t=${timestamp},v1=${v1}`;

    expect(() =>
      verifyWebhookSignature({
        rawBody,
        signatureHeader: header,
        secret: "whsec_wrong",
      })
    ).toThrow(WebhookVerificationError);
  });

  it("enforces the tolerance window when provided", () => {
    const rawBody = JSON.stringify(makeEvent());
    const oldTs = Math.floor(Date.now() / 1000) - 10_000;
    const v1 = computeSignature(oldTs, rawBody, secret);
    const header = `t=${oldTs},v1=${v1}`;

    expect(() =>
      verifyWebhookSignature({
        rawBody,
        signatureHeader: header,
        secret,
        toleranceSeconds: 300,
      })
    ).toThrow(/tolerance/);
  });

  it("throws on malformed header", () => {
    expect(() =>
      verifyWebhookSignature({
        rawBody: "{}",
        signatureHeader: "not-a-valid-header",
        secret,
      })
    ).toThrow(WebhookVerificationError);
  });
});
