const GITHUB_APP_WEBHOOK_CONFIG_URL = "https://api.github.com/app/hook/config";
const MAX_CONFIG_RESPONSE_BYTES = 32_768;

/**
 * Reconcile an already-owned App's callback, not its installation or permissions.
 * A successful PATCH is configuration evidence only, never a signed ping or a
 * successful chat round trip. See https://docs.github.com/en/rest/apps/webhooks.
 */
export async function resyncGitHubAppWebhook(input: {
  fetch: typeof globalThis.fetch;
  appToken: string;
  webhookUrl: string;
  webhookSecret: string;
}): Promise<void> {
  const webhookUrl = new URL(input.webhookUrl);
  if (
    webhookUrl.protocol !== "https:" ||
    webhookUrl.username ||
    webhookUrl.password ||
    webhookUrl.search ||
    webhookUrl.hash ||
    !input.webhookSecret
  ) {
    throw new Error("GitHub webhook configuration is incomplete");
  }

  let response: Response;
  try {
    response = await input.fetch(GITHUB_APP_WEBHOOK_CONFIG_URL, {
      method: "PATCH",
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${input.appToken}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({
        url: input.webhookUrl,
        content_type: "json",
        insecure_ssl: "0",
        secret: input.webhookSecret,
      }),
    });
  } catch {
    // A fetch error can embed request bodies, headers, or a proxy response.
    // Keep it out of endpoint health, the audit log, and the board response.
    throw new Error(
      "GitHub webhook configuration could not be confirmed. Reconnect to retry; repository access was not changed.",
    );
  }
  if (response.status !== 200) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error(
      `GitHub could not update this App's webhook (HTTP ${response.status}). Check that the App is active and reconnect.`,
    );
  }

  // GitHub can echo a masked secret and provider error bodies are untrusted.
  // Read a bounded response and return no provider body to callers or logs.
  let config: Record<string, unknown>;
  const reader = response.body?.getReader();
  try {
    if (!reader) throw new Error("Missing webhook configuration response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_CONFIG_RESPONSE_BYTES) {
        throw new Error("Oversized webhook configuration response");
      }
      chunks.push(chunk.value);
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid webhook configuration response");
    }
    config = parsed as Record<string, unknown>;
  } catch {
    await reader?.cancel().catch(() => undefined);
    throw new Error(
      "GitHub returned an unreadable webhook configuration. Reconnect to confirm the callback settings.",
    );
  } finally {
    reader?.releaseLock();
  }
  if (
    config.url !== input.webhookUrl ||
    config.content_type !== "json" ||
    (config.insecure_ssl !== "0" && config.insecure_ssl !== 0)
  ) {
    throw new Error(
      "GitHub did not confirm the expected secure Paperclip webhook. Reconnect to retry.",
    );
  }
}
