import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { getFiberClient } from "../fiber/fiberClient.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    let reachable = false;
    let pubkey: string | null = null;
    try {
      const info = await getFiberClient().getNodeInfo();
      reachable = info.reachable;
      pubkey = info.pubkey;
    } catch {
      reachable = false;
    }
    return {
      ok: true,
      mode: config.FIBER_MODE,
      fiberNode: { reachable, pubkey },
    };
  });

  // Liveness probe that never touches the Fiber node.
  app.get("/health/live", async () => ({ ok: true }));
}
