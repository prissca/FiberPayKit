/**
 * API-key authentication for Fastify. Adds `requireMerchant` preHandler and a
 * typed `request.merchant`. Keys are provided as `Authorization: Bearer fpk_...`.
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Merchant } from "@prisma/client";
import { authenticateApiKey } from "../services/merchantService.js";
import { ApiError } from "../utils/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    merchant?: Merchant;
  }
}

export async function requireMerchant(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or malformed Authorization header");
  }
  const apiKey = header.slice("Bearer ".length).trim();
  const merchant = await authenticateApiKey(apiKey);
  if (!merchant) {
    throw ApiError.unauthorized("Invalid API key");
  }
  request.merchant = merchant;
}

/** Helper to get the authenticated merchant or throw. */
export function getMerchant(request: FastifyRequest): Merchant {
  if (!request.merchant) throw ApiError.unauthorized();
  return request.merchant;
}
