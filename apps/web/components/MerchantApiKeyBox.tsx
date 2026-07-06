"use client";

import { CopyButton } from "./CopyButton";

export function MerchantApiKeyBox({
  apiKeyPrefix,
  webhookSecret,
}: {
  apiKeyPrefix: string;
  webhookSecret?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="label mb-1.5">API key</p>
        <div className="flex items-center gap-2">
          <code className="mono flex-1 rounded-lg border border-edge bg-black/30 px-3 py-2 text-cyan-soft">
            {apiKeyPrefix}
            {"•".repeat(16)}
          </code>
        </div>
        <p className="mt-1.5 text-xs text-[#5f6a8c]">
          The full key is shown only once, at creation (or in the seed output).
          Store it securely; regenerate if leaked.
        </p>
      </div>

      {webhookSecret && (
        <div>
          <p className="label mb-1.5">Webhook signing secret</p>
          <div className="flex items-center gap-2">
            <code className="mono flex-1 rounded-lg border border-edge bg-black/30 px-3 py-2">
              {webhookSecret}
            </code>
            <CopyButton value={webhookSecret} label="Copy" />
          </div>
          <p className="mt-1.5 text-xs text-[#5f6a8c]">
            Used to verify FiberPayKit-Signature headers with the SDK.
          </p>
        </div>
      )}
    </div>
  );
}
