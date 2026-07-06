/**
 * Fiber client factory. Returns the active FiberClient implementation based on
 * FIBER_MODE. All Fiber access in the app goes through this singleton so the
 * mock node's in-memory state is shared across routes and workers.
 */
import { config } from "../config.js";
import type { FiberClient } from "./types.js";
import { getMockFiberClient } from "./mockFiberClient.js";
import { FiberRpcClient } from "./fiberRpcClient.js";

let client: FiberClient | null = null;

export function getFiberClient(): FiberClient {
  if (client) return client;
  if (config.FIBER_MODE === "fiber-rpc") {
    client = new FiberRpcClient({
      rpcUrl: config.FIBER_RPC_URL,
      timeoutMs: config.FIBER_RPC_TIMEOUT_MS,
      fallbackAddress: config.FIBER_FALLBACK_ADDRESS,
      allowMpp: config.FIBER_ALLOW_MPP,
      allowTrampolineRouting: config.FIBER_ALLOW_TRAMPOLINE_ROUTING,
    });
  } else {
    client = getMockFiberClient();
  }
  return client;
}

export * from "./types.js";
