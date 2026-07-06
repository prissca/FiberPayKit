/** Centralized, validated environment configuration for the API. */
import { z } from "zod";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load env files (root .env first, then apps/api/.env) if present. Uses Node's
// built-in loader so no extra dependency is required. Missing files are fine —
// docker-compose and CI provide env directly.
const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(here, "../../../.env"), // repo root
  resolve(here, "../../.env"), // apps/api
  resolve(process.cwd(), ".env"),
]) {
  try {
    if (existsSync(candidate) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(candidate);
    }
  } catch {
    // ignore malformed/duplicate loads
  }
}

const boolFromString = z
  .string()
  .transform((v) => v === "true" || v === "1")
  .pipe(z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().default(
    "postgresql://fiberpaykit:fiberpaykit@localhost:5432/fiberpaykit"
  ),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  API_PORT: z.coerce.number().int().default(4000),
  API_URL: z.string().default("http://localhost:4000"),
  WEB_URL: z.string().default("http://localhost:3000"),

  FIBER_MODE: z.enum(["mock", "fiber-rpc"]).default("mock"),
  FIBER_RPC_URL: z.string().default("http://127.0.0.1:8227"),
  FIBER_RPC_TIMEOUT_MS: z.coerce.number().int().default(10_000),
  FIBER_FALLBACK_ADDRESS: z.string().optional(),
  FIBER_ALLOW_MPP: boolFromString.default("false"),
  FIBER_ALLOW_TRAMPOLINE_ROUTING: boolFromString.default("false"),

  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().default(5),
  INVOICE_POLL_INTERVAL_MS: z.coerce.number().int().default(5000),

  JWT_SECRET: z.string().default("dev_only"),
  ENCRYPTION_KEY: z.string().default("dev_only_32_byte_key_0000000000000"),

  CORS_ORIGINS: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

// Prisma reads process.env.DATABASE_URL directly (not our parsed config), so
// make sure the resolved default is present for it too.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = parsed.DATABASE_URL;
}

export const config = {
  ...parsed,
  isMock: parsed.FIBER_MODE === "mock",
  corsOrigins: (() => {
    if (parsed.CORS_ORIGINS && parsed.CORS_ORIGINS.trim().length > 0) {
      return parsed.CORS_ORIGINS.split(",").map((s) => s.trim());
    }
    return [parsed.WEB_URL];
  })(),
};

export type AppConfig = typeof config;
