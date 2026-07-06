import type { FastifyInstance } from "fastify";
import { createMerchantSchema } from "@fiberpaykit/shared";
import {
  createMerchant,
  serializeMerchant,
} from "../services/merchantService.js";
import { requireMerchant, getMerchant } from "../plugins/auth.js";
import { ApiError } from "../utils/errors.js";

export async function merchantRoutes(app: FastifyInstance): Promise<void> {
  // POST /v1/merchants — public (self-serve registration).
  app.post("/v1/merchants", async (request) => {
    const parsed = createMerchantSchema.safeParse(request.body);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid merchant body", parsed.error.flatten());
    }
    const merchant = await createMerchant(parsed.data);
    return {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      apiKey: merchant.apiKey, // shown ONCE
      webhookSecret: merchant.webhookSecret, // shown ONCE
      createdAt: merchant.createdAt,
    };
  });

  // GET /v1/merchant/me — authenticated.
  app.get(
    "/v1/merchant/me",
    { preHandler: requireMerchant },
    async (request) => {
      const merchant = getMerchant(request);
      return serializeMerchant(merchant);
    }
  );
}
