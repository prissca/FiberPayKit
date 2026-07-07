/**
 * Cached Fiber node status. In fiber-rpc mode getNodeInfo() is a network round
 * trip to the Fiber node, so we cache it briefly and share the result across
 * the /health and dashboard endpoints (both of which report node reachability).
 */
import { getFiberClient } from "../fiber/fiberClient.js";
import { cacheWrap, cacheKeys } from "../cache.js";

const NODE_INFO_TTL_SECONDS = 10;

export interface NodeStatus {
  reachable: boolean;
  pubkey: string | null;
}

export async function getCachedNodeInfo(): Promise<NodeStatus> {
  return cacheWrap(cacheKeys.nodeInfo(), NODE_INFO_TTL_SECONDS, async () => {
    try {
      const info = await getFiberClient().getNodeInfo();
      return { reachable: info.reachable, pubkey: info.pubkey };
    } catch {
      return { reachable: false, pubkey: null };
    }
  });
}
