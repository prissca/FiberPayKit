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
        <p className="label mb-1">API key</p>
        <div className="flex items-center gap-2">
          <code className="mono flex-1 rounded-md bg-neutral-100 px-3 py-2">
            {apiKeyPrefix}
            {"•".repeat(16)}
          </code>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          The full key is shown only once, at creation (or in the seed output).
          Store it securely; regenerate if leaked.
        </p>
      </div>

      {webhookSecret && (
        <div>
          <p className="label mb-1">Webhook signing secret</p>
          <div className="flex items-center gap-2">
            <code className="mono flex-1 rounded-md bg-neutral-100 px-3 py-2">
              {webhookSecret}
            </code>
            <CopyButton value={webhookSecret} label="Copy" />
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Used to verify FiberPayKit-Signature headers with the SDK.
          </p>
        </div>
      )}
    </div>
  );
}
