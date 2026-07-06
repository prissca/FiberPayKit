/** Build and configure the Fastify server (routes, CORS, rate limit, errors). */
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { ApiError } from "./utils/errors.js";
import { healthRoutes } from "./routes/health.js";
import { merchantRoutes } from "./routes/merchants.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { checkoutRoutes } from "./routes/checkout.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { demoRoutes } from "./routes/demo.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
    // We keep the raw body so webhook receivers can verify signatures.
    bodyLimit: 1_000_000,
  }).withTypeProvider();

  // Capture raw body alongside parsed JSON (needed for signature verification).
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      (req as { rawBody?: string }).rawBody =
        typeof body === "string" ? body : body.toString();
      if (!body || (typeof body === "string" && body.trim() === "")) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(body as string));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
    allowList: (req) => req.url.startsWith("/health"),
  });

  // Consistent error envelope.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      reply.code(error.statusCode).send(error.toBody());
      return;
    }
    // Fastify validation / rate-limit / unexpected errors.
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode ?? 500;
    if (statusCode >= 500) request.log.error(error);
    reply.code(statusCode).send({
      error: {
        code: statusCode === 429 ? "rate_limited" : "internal_error",
        message: err.message ?? "Unexpected error",
      },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply
      .code(404)
      .send({ error: { code: "not_found", message: `No route ${request.url}` } });
  });

  // Routes.
  await app.register(healthRoutes);
  await app.register(merchantRoutes);
  await app.register(invoiceRoutes);
  await app.register(webhookRoutes);
  await app.register(dashboardRoutes);
  await app.register(checkoutRoutes);
  await app.register(demoRoutes);

  app.get("/", async () => ({
    name: "FiberPayKit API",
    version: "0.1.0",
    mode: config.FIBER_MODE,
    docs: "https://github.com/prissca/FiberPayKit#api-reference",
  }));

  return app;
}
