/** Merchant creation, API-key auth, and webhook-endpoint management. */
import type { Merchant, WebhookEndpoint } from "@prisma/client";
import { prisma } from "../db.js";
import { config } from "../config.js";
import {
  apiKeyPrefix,
  generateApiKey,
  generateId,
  generateWebhookSecret,
} from "../utils/ids.js";
import {
  decryptSecret,
  encryptSecret,
  hashSecret,
} from "../utils/hmac.js";
import type { CreateMerchantInput, WebhookEventType } from "@fiberpaykit/shared";
import { ApiError } from "../utils/errors.js";

export interface CreatedMerchant {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  webhookSecret: string;
  createdAt: string;
}

export async function createMerchant(
  input: CreateMerchantInput
): Promise<CreatedMerchant> {
  const existing = await prisma.merchant.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw ApiError.conflict("A merchant with that email already exists");
  }

  const apiKey = generateApiKey();
  const webhookSecret = generateWebhookSecret();
  const id = generateId("merch");

  await prisma.merchant.create({
    data: {
      id,
      name: input.name,
      email: input.email,
      apiKeyHash: hashSecret(apiKey, config.JWT_SECRET),
      apiKeyPrefix: apiKeyPrefix(apiKey),
      webhookSecretHash: hashSecret(webhookSecret, config.JWT_SECRET),
      webhookSecretCipher: encryptSecret(webhookSecret, config.ENCRYPTION_KEY),
    },
  });

  return {
    id,
    name: input.name,
    email: input.email,
    apiKey,
    webhookSecret,
    createdAt: new Date().toISOString(),
  };
}

/** Resolve a merchant from a bearer API key, or null if invalid. */
export async function authenticateApiKey(
  apiKey: string
): Promise<Merchant | null> {
  const hash = hashSecret(apiKey, config.JWT_SECRET);
  return prisma.merchant.findUnique({ where: { apiKeyHash: hash } });
}

export function getWebhookSecret(merchant: Merchant): string {
  return decryptSecret(merchant.webhookSecretCipher, config.ENCRYPTION_KEY);
}

export function serializeMerchant(merchant: Merchant) {
  return {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    apiKeyPrefix: merchant.apiKeyPrefix,
    createdAt: merchant.createdAt.toISOString(),
  };
}

export async function createWebhookEndpoint(
  merchantId: string,
  url: string,
  events: WebhookEventType[]
): Promise<WebhookEndpoint> {
  return prisma.webhookEndpoint.create({
    data: {
      id: generateId("we"),
      merchantId,
      url,
      events,
      status: "active",
    },
  });
}

export function serializeEndpoint(endpoint: WebhookEndpoint) {
  return {
    id: endpoint.id,
    url: endpoint.url,
    events: endpoint.events as WebhookEventType[],
    status: endpoint.status,
    createdAt: endpoint.createdAt.toISOString(),
  };
}
