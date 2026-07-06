/**
 * Seed a demo merchant with a deterministic API key + webhook secret so the
 * docs, cURL examples, and dashboard "just work" out of the box.
 *
 *   API key:        fpk_test_demo
 *   Webhook secret: whsec_demo_secret_do_not_use_in_prod
 *
 * Also registers a webhook endpoint pointing at the built-in demo receiver and
 * creates a couple of sample invoices via the mock Fiber client.
 */
import { PrismaClient } from "@prisma/client";
import { config } from "../src/config.js";
import { hashSecret, encryptSecret } from "../src/utils/hmac.js";
import { apiKeyPrefix, generateId } from "../src/utils/ids.js";
import { getMockFiberClient } from "../src/fiber/mockFiberClient.js";

const prisma = new PrismaClient();

const DEMO_MERCHANT_ID = "merch_demo0000000000000000";
const DEMO_API_KEY = "fpk_test_demo";
const DEMO_WEBHOOK_SECRET = "whsec_demo_secret_do_not_use_in_prod";

async function main(): Promise<void> {
  console.log("Seeding FiberPayKit demo data...");

  await prisma.merchant.upsert({
    where: { id: DEMO_MERCHANT_ID },
    update: {
      apiKeyHash: hashSecret(DEMO_API_KEY, config.JWT_SECRET),
      webhookSecretHash: hashSecret(DEMO_WEBHOOK_SECRET, config.JWT_SECRET),
      webhookSecretCipher: encryptSecret(
        DEMO_WEBHOOK_SECRET,
        config.ENCRYPTION_KEY
      ),
    },
    create: {
      id: DEMO_MERCHANT_ID,
      name: "Demo Store",
      email: "merchant@example.com",
      apiKeyHash: hashSecret(DEMO_API_KEY, config.JWT_SECRET),
      apiKeyPrefix: apiKeyPrefix(DEMO_API_KEY),
      webhookSecretHash: hashSecret(DEMO_WEBHOOK_SECRET, config.JWT_SECRET),
      webhookSecretCipher: encryptSecret(
        DEMO_WEBHOOK_SECRET,
        config.ENCRYPTION_KEY
      ),
    },
  });

  // Webhook endpoint -> built-in demo receiver.
  const endpointId = "we_demo00000000000000000";
  await prisma.webhookEndpoint.upsert({
    where: { id: endpointId },
    update: {},
    create: {
      id: endpointId,
      merchantId: DEMO_MERCHANT_ID,
      url: `${config.API_URL}/demo/webhook-receiver`,
      events: [
        "invoice.created",
        "invoice.paid",
        "invoice.expired",
        "invoice.failed",
        "invoice.canceled",
      ],
      status: "active",
    },
  });

  // Sample invoices (mock Fiber client) — only if none exist yet.
  const existing = await prisma.invoice.count({
    where: { merchantId: DEMO_MERCHANT_ID },
  });
  if (existing === 0) {
    const mock = getMockFiberClient();
    const samples = [
      { orderId: "ORDER-1001", amount: "100000000", currency: "CKB" },
      { orderId: "ORDER-1002", amount: "250000000", currency: "CKB" },
      { orderId: "ORDER-1003", amount: "500000000", currency: "RUSD" },
    ];
    for (const s of samples) {
      const id = generateId("inv");
      const fiber = await mock.createInvoice({
        amount: s.amount,
        currency: s.currency,
        expiry: 900,
        description: `Seed invoice ${s.orderId}`,
        referenceId: id,
      });
      await prisma.invoice.create({
        data: {
          id,
          merchantId: DEMO_MERCHANT_ID,
          orderId: s.orderId,
          amount: s.amount,
          currency: s.currency,
          description: `Seed invoice ${s.orderId}`,
          status: "open",
          fiberInvoiceAddress: fiber.invoiceAddress,
          fiberPaymentHash: fiber.paymentHash,
          fiberRawInvoice: fiber.raw as object,
          metadata: { source: "seed" },
          expiresAt: new Date(fiber.expiresAt),
        },
      });
    }
    console.log(`Created ${samples.length} sample invoices.`);
  }

  console.log("\nDemo merchant ready:");
  console.log(`  Merchant ID:    ${DEMO_MERCHANT_ID}`);
  console.log(`  API key:        ${DEMO_API_KEY}`);
  console.log(`  Webhook secret: ${DEMO_WEBHOOK_SECRET}`);
  console.log("\nUse the API key as: Authorization: Bearer fpk_test_demo\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
