/**
 * Zod validation schemas shared between the API (request validation) and the
 * SDK (input typing). Keep these the single source of truth for request shapes.
 */
import { z } from "zod";

export const currencySchema = z.enum(["CKB", "RUSD", "CUSTOM_UDT"]);

export const invoiceStatusSchema = z.enum([
  "open",
  "paid",
  "expired",
  "canceled",
  "failed",
]);

export const webhookEventTypeSchema = z.enum([
  "invoice.created",
  "invoice.open",
  "invoice.paid",
  "invoice.expired",
  "invoice.canceled",
  "invoice.failed",
  "webhook.delivery.failed",
  "webhook.delivery.succeeded",
]);

/** A stringified integer amount (base units). Never a float. */
export const amountStringSchema = z
  .string()
  .regex(/^\d+$/, "amount must be a non-negative integer string (base units)");

export const udtTypeScriptSchema = z.object({
  code_hash: z.string(),
  hash_type: z.enum(["type", "data", "data1", "data2"]),
  args: z.string(),
});

export const createMerchantSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
});
export type CreateMerchantInput = z.infer<typeof createMerchantSchema>;

export const createWebhookEndpointSchema = z.object({
  url: z.string().url(),
  events: z.array(webhookEventTypeSchema).min(1),
});
export type CreateWebhookEndpointInput = z.infer<
  typeof createWebhookEndpointSchema
>;

export const createInvoiceSchema = z.object({
  orderId: z.string().min(1).max(200),
  amount: amountStringSchema,
  currency: currencySchema.default("CKB"),
  description: z.string().max(500).optional(),
  expiresInSeconds: z.number().int().min(30).max(86_400).default(900),
  customer: z
    .object({
      email: z.string().email().optional(),
      name: z.string().max(200).optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  checkout: z
    .object({
      successUrl: z.string().url().optional(),
      cancelUrl: z.string().url().optional(),
    })
    .optional(),
  // Multi-asset fields (used when currency === "CUSTOM_UDT").
  udtTypeScript: udtTypeScriptSchema.optional(),
  displayAmount: z.string().optional(),
  settlementAsset: z.string().optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const listInvoicesQuerySchema = z.object({
  status: invoiceStatusSchema.optional(),
  currency: currencySchema.optional(),
  orderId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().max(300).optional(),
});
