import { describe, it, expect } from "vitest";
import { MockFiberClient } from "./mockFiberClient.js";
import { normalizeFiberStatus } from "./types.js";

describe("MockFiberClient", () => {
  it("creates an OPEN invoice with realistic fields", async () => {
    const client = new MockFiberClient();
    const inv = await client.createInvoice({
      amount: "100000000",
      currency: "CKB",
      expiry: 900,
      description: "test",
    });
    expect(inv.status).toBe("OPEN");
    expect(inv.invoiceAddress).toMatch(/^fibt/);
    expect(inv.paymentHash).toMatch(/^0x/);
    expect(inv.amount).toBe("100000000");
    expect(new Date(inv.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("transitions OPEN -> PAID via markPaid and reports via getInvoice", async () => {
    const client = new MockFiberClient();
    const inv = await client.createInvoice({
      amount: "1",
      currency: "CKB",
      expiry: 900,
    });
    const before = await client.getInvoice({ paymentHash: inv.paymentHash });
    expect(before.status).toBe("OPEN");

    client.markPaid(inv.paymentHash);
    const after = await client.getInvoice({ paymentHash: inv.paymentHash });
    expect(after.status).toBe("PAID");
    expect(after.settledAt).toBeTruthy();
    expect(normalizeFiberStatus(after.status)).toBe("paid");
  });

  it("marks failed and expires", async () => {
    const client = new MockFiberClient();
    const a = await client.createInvoice({ amount: "1", currency: "CKB", expiry: 900 });
    client.markFailed(a.paymentHash);
    expect((await client.getInvoice({ paymentHash: a.paymentHash })).status).toBe(
      "FAILED"
    );

    const b = await client.createInvoice({ amount: "1", currency: "CKB", expiry: 900 });
    client.expire(b.paymentHash);
    expect((await client.getInvoice({ paymentHash: b.paymentHash })).status).toBe(
      "EXPIRED"
    );
  });

  it("exposes node info, channels, and peers", async () => {
    const client = new MockFiberClient();
    expect((await client.getNodeInfo()).reachable).toBe(true);
    expect((await client.listChannels()).length).toBeGreaterThan(0);
    expect((await client.listPeers()).length).toBeGreaterThan(0);
  });
});

describe("normalizeFiberStatus", () => {
  it("maps all Fiber statuses to internal statuses", () => {
    expect(normalizeFiberStatus("OPEN")).toBe("open");
    expect(normalizeFiberStatus("PAID")).toBe("paid");
    expect(normalizeFiberStatus("EXPIRED")).toBe("expired");
    expect(normalizeFiberStatus("CANCELED")).toBe("canceled");
    expect(normalizeFiberStatus("FAILED")).toBe("failed");
  });
});
