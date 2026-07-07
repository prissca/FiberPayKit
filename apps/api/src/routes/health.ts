import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { getCachedNodeInfo } from "../services/fiberStatusService.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    const { reachable, pubkey } = await getCachedNodeInfo();
    return {
      ok: true,
      mode: config.FIBER_MODE,
      fiberNode: { reachable, pubkey },
    };
  });

  // Liveness probe that never touches the Fiber node.
  app.get("/health/live", async () => ({ ok: true }));
}
